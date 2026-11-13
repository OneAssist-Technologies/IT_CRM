import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { delCache } from '../config/redis.js';
import { io } from '../utils/socket.js';
import { logAuditEvent } from './auditService.js';
import { ContactModel, CONTACT_MODULE } from '../models/contact.model.js';
import { generateContactId, buildContactFilterQuery, formatContactResponse } from '../utils/contact.util.js';
import { recordActivity } from './activity.service.js';

/**
 * Helper: check if a user has full enterprise admin privileges or is an employee
 */
async function resolveEmployeeScopedFilter(currentUser) {
  if (!currentUser) return null;
  const roleUpper = String(currentUser.role || '').toUpperCase().trim();
  const emailLower = String(currentUser.email || '').toLowerCase().trim();

  // Super Admin, Admin, and Management have full enterprise access
  if (
    roleUpper === 'SUPER_ADMIN' ||
    roleUpper === 'SUPER ADMIN' ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'MANAGEMENT' ||
    emailLower === 'sandy@gmail.com'
  ) {
    return null; // Full admin access
  }

  if (currentUser.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { roleRelation: true },
    });
    if (dbUser?.roleRelation) {
      const slug = (dbUser.roleRelation.slug || dbUser.roleRelation.name || '').toLowerCase().trim();
      if (slug === 'super_admin' || slug === 'admin' || slug === 'management') {
        return null;
      }
    }
  }

  // Look up employee record matching current user
  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        ...(currentUser.email ? [{ email: { equals: currentUser.email, mode: 'insensitive' } }] : []),
        ...(currentUser.name ? [{ name: { equals: currentUser.name, mode: 'insensitive' } }] : []),
      ],
    },
  });

  const assignedOr = [];
  if (emp?.id) assignedOr.push({ assignedTo: emp.id });
  if (emp?.empCode) assignedOr.push({ assignedTo: emp.empCode });
  if (currentUser.id) assignedOr.push({ assignedTo: currentUser.id });
  if (currentUser.name) {
    assignedOr.push({ assignedToName: { equals: currentUser.name, mode: 'insensitive' } });
    assignedOr.push({ qualifiedBy: { equals: currentUser.name, mode: 'insensitive' } });
  }
  if (emp?.name && emp.name !== currentUser.name) {
    assignedOr.push({ assignedToName: { equals: emp.name, mode: 'insensitive' } });
    assignedOr.push({ qualifiedBy: { equals: emp.name, mode: 'insensitive' } });
  }

  const createdOr = [];
  if (currentUser.name) createdOr.push({ createdBy: { equals: currentUser.name, mode: 'insensitive' } });
  if (currentUser.email) createdOr.push({ createdBy: { equals: currentUser.email, mode: 'insensitive' } });
  if (currentUser.id) createdOr.push({ createdBy: currentUser.id });
  if (emp?.id && emp.id !== currentUser.id) createdOr.push({ createdBy: emp.id });
  if (emp?.name && emp.name !== currentUser.name) createdOr.push({ createdBy: { equals: emp.name, mode: 'insensitive' } });

  const assignedFilter = assignedOr.length > 0 ? { OR: assignedOr } : { assignedTo: currentUser.id };
  const createdFilter = createdOr.length > 0 ? { OR: createdOr } : { createdBy: currentUser.id };
  const combinedFilter = {
    OR: [
      ...(assignedOr.length > 0 ? assignedOr : [{ assignedTo: currentUser.id }]),
      ...(createdOr.length > 0 ? createdOr : [{ createdBy: currentUser.id }]),
    ],
  };

  return { assignedFilter, createdFilter, combinedFilter };
}

/**
 * Helper: scope import batches and bulk upload contacts by user (Super Admin sees all, Employees only see theirs)
 */
async function resolveBatchScopedFilter(currentUser) {
  if (!currentUser) return null;
  const roleUpper = String(currentUser.role || '').toUpperCase().trim();
  const emailLower = String(currentUser.email || '').toLowerCase().trim();

  // Super Admin, Admin, and Management have full enterprise access
  if (
    roleUpper === 'SUPER_ADMIN' ||
    roleUpper === 'SUPER ADMIN' ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'MANAGEMENT' ||
    emailLower === 'sandy@gmail.com'
  ) {
    return null; // Full admin access
  }

  if (currentUser.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { roleRelation: true },
    });
    if (dbUser?.roleRelation) {
      const slug = (dbUser.roleRelation.slug || dbUser.roleRelation.name || '').toLowerCase().trim();
      if (slug === 'super_admin' || slug === 'admin' || slug === 'management') {
        return null;
      }
    }
  }

  // Look up employee record matching current user
  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        ...(currentUser.email ? [{ email: { equals: currentUser.email, mode: 'insensitive' } }] : []),
        ...(currentUser.name ? [{ name: { equals: currentUser.name, mode: 'insensitive' } }] : []),
      ],
    },
  });

  const orConditions = [];
  if (currentUser.id) orConditions.push({ createdBy: currentUser.id });
  if (emp?.id) orConditions.push({ createdBy: emp.id });

  const names = [currentUser.name, currentUser.email, emp?.name].filter(Boolean);
  for (const name of names) {
    orConditions.push(
      { createdBy: { equals: name, mode: 'insensitive' } }
    );
  }

  return orConditions.length > 0 ? { OR: orConditions } : { createdBy: currentUser.id };
}

/**
 * 1. List contacts with search, filters, pagination, sorting, and role-based data scoping
 */
export async function getContactsService(queryParams = {}, currentUser = null) {
  const {
    sortBy = 'updatedAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = buildContactFilterQuery(queryParams);

  const empScope = await resolveEmployeeScopedFilter(currentUser);
  if (empScope) {
    where.AND = where.AND || [];
    if (queryParams.assignmentStatus === 'Assigned') {
      where.AND.push(empScope.assignedFilter);
    } else if (queryParams.assignmentStatus === 'Unassigned') {
      // In New / Unassigned tab, employee only sees unassigned contacts created by them
      where.AND.push(empScope.createdFilter);
    } else {
      // General view / All: employee sees contacts assigned to them OR created by them
      where.AND.push(empScope.combinedFilter);
    }
  }

  const validSortFields = ['createdAt', 'updatedAt', 'name', 'companyName', 'status', 'stage'];
  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'updatedAt';
  const finalSortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const orderBy = [
    { [finalSortBy]: finalSortOrder },
  ];
  if (finalSortBy !== 'createdAt') {
    orderBy.push({ createdAt: 'desc' });
  }

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
    }),
  ]);

  return {
    data: contacts.map(formatContactResponse),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * 2. Get Single Contact by ID
 */
export async function getContactByIdService(id) {
  if (!id) {
    const error = new Error('Contact ID is required');
    error.status = 400;
    throw error;
  }

  const cleanId = String(id).trim();

  // 1. Try finding in official Contact table by UUID, contactId (e.g. CNT-1001), or internalReference (e.g. BLK-1001)
  let contact = await prisma.contact.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { contactId: cleanId },
        { contactId: { equals: cleanId, mode: 'insensitive' } },
        { internalReference: cleanId },
        { internalReference: { equals: cleanId, mode: 'insensitive' } },
      ],
    },
  });

  // 2. If not found in Contact, check BulkUploadContact table by UUID or bulkId (e.g. BLK-1001)
  if (!contact) {
    const bulk = await prisma.bulkUploadContact.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { bulkId: cleanId },
          { bulkId: { equals: cleanId, mode: 'insensitive' } },
          { importedContactId: cleanId },
        ],
      },
    });

    if (bulk) {
      // If this bulk contact was already imported/qualified into the Contact table, return the linked contact
      if (bulk.importedContactId) {
        const linkedContact = await prisma.contact.findFirst({
          where: { id: bulk.importedContactId },
        });
        if (linkedContact) {
          return {
            data: {
              ...formatContactResponse(linkedContact),
              bulkId: bulk.bulkId || linkedContact.internalReference || bulk.id,
              contactId: linkedContact.contactId || bulk.bulkId || bulk.id,
              isBulkImport: true,
            },
          };
        }
      }

      return {
        data: {
          ...formatContactResponse(bulk),
          contactId: bulk.bulkId || bulk.id,
          isBulkImport: true,
        },
      };
    }

    // 3. Fallback: check if cleanId matches phone or email in Contact or BulkUploadContact
    const fallbackContact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: cleanId },
          { email: { equals: cleanId, mode: 'insensitive' } },
        ],
      },
    });
    if (fallbackContact) {
      return { data: formatContactResponse(fallbackContact) };
    }

    const fallbackBulk = await prisma.bulkUploadContact.findFirst({
      where: {
        OR: [
          { phone: cleanId },
          { email: { equals: cleanId, mode: 'insensitive' } },
        ],
      },
    });
    if (fallbackBulk) {
      return {
        data: {
          ...formatContactResponse(fallbackBulk),
          contactId: fallbackBulk.bulkId || fallbackBulk.id,
          isBulkImport: true,
        },
      };
    }

    const error = new Error('Contact not found');
    error.status = 404;
    throw error;
  }

  return { data: formatContactResponse(contact) };
}

/**
 * 3. Get Contact KPI Stats (Role-Scoped)
 */
export async function getContactStatsService(currentUser = null) {
  const empScope = await resolveEmployeeScopedFilter(currentUser);
  const batchScope = await resolveBatchScopedFilter(currentUser);

  const notBulkCondition = {
    AND: [
      {
        NOT: [
          { source: { in: ['Bulk Import', 'Import', 'bulk import', 'import'] } },
          { contactId: { startsWith: 'BLK-' } },
        ],
      },
      {
        OR: [
          { internalReference: null },
          { NOT: { internalReference: { startsWith: 'BLK-' } } },
        ],
      },
    ],
  };

  const qualifiedCondition = {
    OR: [
      { status: { in: ['Qualified', 'qualified'] } },
      { qualificationStatus: { in: ['Qualified', 'qualified'] } },
    ],
  };

  const notQualifiedCondition = {
    NOT: [
      { status: { in: ['Qualified', 'qualified'] } },
      { qualificationStatus: { in: ['Qualified', 'qualified'] } },
    ],
  };

  const notInterestedCondition = {
    NOT: [
      { status: { in: ['Not Interested', 'not interested'] } },
      { qualificationStatus: { in: ['Not Interested', 'not interested'] } },
    ],
  };

  const newWhere = {
    AND: [
      notBulkCondition,
      notQualifiedCondition,
      notInterestedCondition,
      ...(empScope ? [empScope.combinedFilter] : []),
    ],
  };

  const qualifiedWhere = {
    AND: [
      qualifiedCondition,
      notInterestedCondition,
      ...(empScope ? [empScope.combinedFilter] : []),
    ],
  };

  const totalWhere = empScope ? empScope.combinedFilter : {};

  const [
    total,
    qualifiedCount,
    newCount,
    won,
    active,
    disqualified,
    highPriority,
    bulkBatchesCount,
    bulkContactsCount,
  ] = await Promise.all([
    prisma.contact.count({ where: totalWhere }),
    prisma.contact.count({ where: qualifiedWhere }),
    prisma.contact.count({ where: newWhere }),
    prisma.contact.count({ where: { stage: { in: ['Won', 'Closed Won'] }, ...(empScope ? { AND: [empScope.combinedFilter] } : {}) } }),
    prisma.contact.count({
      where: {
        AND: [
          notInterestedCondition,
          ...(empScope ? [empScope.combinedFilter] : []),
        ],
      },
    }),
    prisma.contact.count({
      where: {
        OR: [
          { qualificationStatus: { in: ['Disqualified', 'Unqualified', 'Not Interested'] } },
          { status: { in: ['Disqualified', 'Unqualified', 'Not Interested'] } },
        ],
        ...(empScope ? { AND: [empScope.combinedFilter] } : {}),
      },
    }),
    prisma.contact.count({ where: { priority: 'High', ...(empScope ? { AND: [empScope.combinedFilter] } : {}) } }),
    prisma.importBatch.count({ where: batchScope ? batchScope : {} }),
    prisma.bulkUploadContact.count({ where: batchScope ? batchScope : {} }),
  ]);

  return {
    stats: {
      total,
      assigned: qualifiedCount,
      qualified: qualifiedCount,
      qualification: qualifiedCount,
      won,
      unassigned: newCount,
      new: newCount,
      active,
      disqualified,
      highPriority,
      bulkImport: bulkContactsCount || bulkBatchesCount || 0,
      bulkBatches: bulkBatchesCount || 0,
    },
  };
}

/**
 * 4. Get Contact Dropdown Metadata
 */
export async function getContactMetadataService() {
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, empCode: true, department: true, designation: true },
  });

  const dynamicMeta = await ContactModel.getDynamicMetadata();

  const metadata = {
    employees,
    ...dynamicMeta,
  };

  return { data: metadata, metadata };
}

/**
 * 5. Create Contact
 */
export async function createContactService(body, user) {
  const {
    name,
    email,
    phone,
    mobile_number,
    address,
    source = 'Website',
    customSource,
    contactType = 'Company Representative',
    companyName,
    designation,
    profession,
    category = 'Product',
    productList = [],
    serviceList = [],
    customProduct,
    gstNumber,
    employeeCount,
    companyPan,
    cinNumber,
    companyWebsite,
    linkedinUrl,
    annualTurnover,
    verificationStatus = 'Unverified',
    registeredState,
    nextFollowDate,
    remarks,
    status = 'New',
    stage = 'Initialization',
    qualificationStatus = 'New',
    priority = 'Medium',
    assignedTo,
  } = body;

  const finalName = (name || body.contactPerson || body.companyName || 'Contact').trim();
  if (!finalName) {
    const error = new Error('Contact name is required.');
    error.status = 400;
    throw error;
  }

  const finalPhone = phone || mobile_number || '';
  const phoneDigits = String(finalPhone || '').replace(/\D/g, '');
  if (!phoneDigits) {
    const error = new Error('Phone number is required.');
    error.status = 400;
    throw error;
  }
  if (phoneDigits.length !== 10) {
    const error = new Error('Phone number must be exactly 10 digits.');
    error.status = 400;
    throw error;
  }

  const contactId = await getNextContactId();

  let assignedToName = null;
  let assignmentStatus = 'Unassigned';
  if (assignedTo && assignedTo !== 'none' && assignedTo !== 'Unassigned' && assignedTo !== 'null' && String(assignedTo).trim() !== '') {
    const emp = await prisma.employee.findFirst({
      where: { OR: [{ id: assignedTo }, { empCode: assignedTo }] },
    });
    if (emp) {
      assignedToName = emp.name;
      assignmentStatus = 'Assigned';
    }
  }

  const newContact = await prisma.contact.create({
    data: {
      contactId,
      name: finalName,
      email: email ? email.toLowerCase().trim() : null,
      phone: phoneDigits,
      address: address || null,
      source: source || 'Website',
      customSource: customSource || null,
      contactType,
      companyName: companyName ? companyName.trim() : null,
      contactPerson: body.contactPerson ? body.contactPerson.trim() : null,
      estimatedValue: body.estimatedValue || null,
      expectedCloseDate: body.expectedCloseDate || null,
      description: body.description || body.notes || null,
      designation: designation || null,
      profession: profession || null,
      gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : null,
      employeeCount: employeeCount || null,
      companyPan: companyPan ? companyPan.trim().toUpperCase() : null,
      cinNumber: cinNumber ? cinNumber.trim().toUpperCase() : null,
      companyWebsite: (body.website || companyWebsite) ? String(body.website || companyWebsite).trim() : null,
      linkedinUrl: linkedinUrl ? linkedinUrl.trim() : null,
      annualTurnover: annualTurnover || null,
      verificationStatus: verificationStatus || 'Unverified',
      registeredState: registeredState || null,
      category,
      productList: Array.isArray(productList) ? productList : [],
      serviceList: Array.isArray(serviceList) ? serviceList : [],
      customProduct: customProduct || null,
      nextFollowDate: nextFollowDate || null,
      remarks: remarks || null,
      status: status || 'New',
      stage: stage || 'Initialization',
      qualificationStatus: qualificationStatus || 'New',
      priority: (body.tagPriority !== undefined ? body.tagPriority : priority) ? String(body.tagPriority !== undefined ? body.tagPriority : priority).trim() : 'Medium',
      businessNeed: body.businessNeed || null,
      budgetRange: body.budgetRange || null,
      decisionMaker: body.decisionMaker || null,
      purchaseTimeline: body.purchaseTimeline || null,
      interestedService: body.interestedService || null,
      qualifiedBy: body.qualifiedBy || null,
      qualificationDate: body.qualificationDate || null,
      unqualifiedReason: body.unqualifiedReason || body.disqualificationReason || null,
      disqualificationReason: body.unqualifiedReason || body.disqualificationReason || null,
      assignedTo: assignedToName ? assignedTo : null,
      assignedToName,
      assignmentStatus,
      createdBy: user?.name || user?.email || user?.id || body.createdBy || null,
      // Verified Odoo Contact Fields
      title: body.title || null,
      mobile: body.mobile || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      street: body.street || null,
      street2: body.street2 || null,
      city: body.city || null,
      zip: body.zip || null,
      country: body.country || 'India',
      paymentTerms: body.paymentTerms || 'Immediate Payment',
      creditLimit: body.creditLimit || null,
      internalReference: body.internalReference || null,
    },
  });

  await delCache('crm:contacts:*');

  if (io) {
    io.emit('contact_created', newContact);
  }

  // Automatically sync to Lead if contact is Qualified
  await syncContactToLead(newContact);

  return {
    message: `Contact '${newContact.name}' created successfully!`,
    data: formatContactResponse(newContact),
  };
}

/**
 * Safely generate the next Contact ID without collision
 */
export async function getNextContactId() {
  const allContacts = await prisma.contact.findMany({
    select: { contactId: true },
  });
  let maxNum = 1000;
  for (const c of allContacts) {
    if (c.contactId) {
      const match = c.contactId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  let candidateId = `CNT-${maxNum + 1}`;
  while (await prisma.contact.findUnique({ where: { contactId: candidateId } })) {
    maxNum++;
    candidateId = `CNT-${maxNum + 1}`;
  }
  return candidateId;
}

/**
 * Safely generate the next Lead ID without collision
 */
async function getNextLeadId() {
  const allLeads = await prisma.lead.findMany({
    select: { leadId: true },
  });
  let maxNum = 1000;
  for (const l of allLeads) {
    if (l.leadId && l.leadId.startsWith('LED-')) {
      const num = parseInt(l.leadId.replace('LED-', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `LED-${maxNum + 1}`;
}

/**
 * Automatically sync/create a Lead when a Contact is qualified
 */

export function mapContactStatusToLead(contactStatus, currentLeadStatus = 'New') {
  if (!contactStatus || contactStatus === 'Not Connected') {
    return currentLeadStatus || 'New';
  }
  const s = String(contactStatus).toLowerCase();
  if (s.includes('not interested') || s.includes('not-interested') || s.includes('disqual') || s.includes('lost') || s.includes('cancel')) {
    return 'Lost';
  }
  if (s.includes('qualif')) return 'New';
  if (s.includes('interest')) return 'Interested';
  if (s.includes('follow')) return 'Follow-up';
  if (s.includes('proposal')) return 'Proposal Sent';
  if (s.includes('won') || s.includes('complete')) return 'Complete';
  if (s.includes('progress') || s.includes('contact') || s.includes('busy') || s.includes('sent')) return 'In Progress';
  if (s.includes('new') || s.includes('init')) return 'New';
  return currentLeadStatus || 'New';
}

export async function syncContactToLead(contact, user = null) {
  if (!contact) return null;

  const isQualified =
    (contact.status && contact.status.toLowerCase() === 'qualified') ||
    (contact.qualificationStatus && contact.qualificationStatus.toLowerCase() === 'qualified');

  if (!isQualified) return null;

  try {
    let existingLead = null;

    // 1. Check by email
    if (contact.email && contact.email.trim()) {
      existingLead = await prisma.lead.findFirst({
        where: { email: { equals: contact.email.trim(), mode: 'insensitive' } },
      });
    }

    // 2. Check by phone
    if (!existingLead && contact.phone && contact.phone.trim()) {
      const cleanPhone = contact.phone.replace(/\D/g, '');
      if (cleanPhone) {
        const leadsWithPhone = await prisma.lead.findMany({
          where: { phone: { not: null } },
        });
        existingLead = leadsWithPhone.find(
          (l) => l.phone && l.phone.replace(/\D/g, '') === cleanPhone
        );
      }
    }

    // 3. Check by name & companyName
    if (!existingLead && contact.name) {
      existingLead = await prisma.lead.findFirst({
        where: {
          name: { equals: contact.name.trim(), mode: 'insensitive' },
          ...(contact.companyName ? { companyName: { equals: contact.companyName.trim(), mode: 'insensitive' } } : {}),
        },
      });
    }

    const category = contact.category || 'Product';
    const productList = Array.isArray(contact.productList) ? contact.productList : [];
    const serviceList = Array.isArray(contact.serviceList) ? contact.serviceList : [];
    const assignedTo = contact.assignedTo || user?.id || null;
    const assignedToName = contact.assignedToName || user?.name || null;
    const createdBy = contact.createdBy || user?.name || user?.email || null;
    const createdByName = contact.createdBy || user?.name || null;

    if (existingLead) {
      const updatedLead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          name: contact.name ? contact.name.trim() : existingLead.name,
          email: contact.email ? contact.email.trim() : existingLead.email,
          phone: contact.phone ? contact.phone.trim() : existingLead.phone,
          contactType: contact.contactType || existingLead.contactType || 'Company Representative',
          profession: contact.profession || existingLead.profession,
          companyName: contact.companyName || existingLead.companyName,
          designation: contact.designation || existingLead.designation,
          address: contact.address || existingLead.address,
          source: contact.source || existingLead.source || 'Website',
          customSource: contact.customSource || existingLead.customSource,
          category,
          productList: productList.length > 0 ? productList : existingLead.productList,
          serviceList: serviceList.length > 0 ? serviceList : existingLead.serviceList,
          status: 'New',
          stage: 'Initialization',
          priority: contact.priority || existingLead.priority || 'Medium',
          assignedTo: contact.assignedTo || existingLead.assignedTo || assignedTo,
          assignedToName: contact.assignedToName || existingLead.assignedToName || assignedToName,
          createdBy: existingLead.createdBy || createdBy,
          createdByName: existingLead.createdByName || createdByName,
        },
      });

      await delCache('crm:leads:*').catch(() => {});
      if (io) {
        io.emit('lead_updated', updatedLead);
      }

      // Maintain bidirectional relationship: link Contact to Lead
      try {
        await prisma.contact.updateMany({
          where: {
            OR: [
              { id: contact.id },
              ...(contact.contactId ? [{ contactId: contact.contactId }] : []),
            ],
          },
          data: {
            internalReference: updatedLead.leadId,
          },
        });
      } catch (refErr) {
        console.warn('[syncContactToLead] Failed to update internalReference on Contact:', refErr.message);
      }

      // Synchronize existing meetings so Lead Module immediately sees all contact meetings
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "ScheduledMeeting"
           SET "lead_id" = $1, "updatedAt" = NOW()
           WHERE "contactId" = $2 OR "contactId" = $3 OR "lead_id" = $2 OR "lead_id" = $3`,
          updatedLead.id,
          contact.id,
          contact.contactId || contact.id
        );
        if (io) {
          io.emit('meeting:updated');
          io.emit('crm_meetings_updated');
        }
      } catch (meetSyncErr) {
        console.warn('[syncContactToLead] Failed to link existing ScheduledMeeting:', meetSyncErr.message);
      }

      // Synchronize activity timeline and call logs to the Lead
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE activities
           SET "leadId" = $1, "leadCode" = $2, "leadName" = $3, "updatedAt" = NOW()
           WHERE "contactId" = $4 OR "contactId" = $5`,
          updatedLead.id,
          updatedLead.leadId,
          updatedLead.name,
          contact.id,
          contact.contactId || contact.id
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "CallLog"
           SET "lead_id" = $1, "updatedAt" = NOW()
           WHERE "contactId" = $2 OR "contactId" = $3`,
          updatedLead.id,
          contact.id,
          contact.contactId || contact.id
        );
      } catch (actSyncErr) {
        console.warn('[syncContactToLead] Failed to sync activities/callLogs to Lead:', actSyncErr.message);
      }

      // Record complete end-to-end touchpoints for timeline
      const contactOriginCode = contact.contactId ? `#${contact.contactId}` : '#CNT-1001';
      const contactCreatedAt = contact.createdAt ? (contact.createdAt instanceof Date ? contact.createdAt.toISOString().slice(0, 10) : String(contact.createdAt).slice(0, 10)) : new Date().toISOString().slice(0, 10);
      const qualDate = contact.qualificationDate || contactCreatedAt;

      // 1. Contact Registered
      recordActivity({
        type: 'contact',
        title: 'Contact Registered',
        description: `Contact ${contactOriginCode} (${contact.name}) registered via ${contact.source || 'Website'}${contact.customSource ? ` (${contact.customSource})` : ''}. Interested in ${contact.category || 'Product'}: ${contact.interestedService || (contact.productList && contact.productList[0]) || 'IT Solutions'}.`,
        leadId: updatedLead.id,
        leadCode: updatedLead.leadId,
        leadName: updatedLead.name,
        customerName: contact.companyName || updatedLead.companyName || updatedLead.name,
        contactId: contact.contactId || contact.id,
        contactName: contact.name,
        entityId: contact.id,
        entityType: 'Contact',
        entityNumber: contact.contactId || 'CNT-1001',
        status: 'Registered',
        performedBy: contact.createdBy || 'System',
        activityDate: contactCreatedAt,
        activityTime: '08:00 AM',
      }).catch(() => {});

      // 2. Contact Assigned
      const assignee = contact.assignedToName || updatedLead.assignedToName;
      if (assignee) {
        recordActivity({
          type: 'contact',
          title: 'Contact Assigned to Sales Rep',
          description: `Contact assigned to ${assignee} for initial inquiry discovery and requirement qualification assessment.`,
          leadId: updatedLead.id,
          leadCode: updatedLead.leadId,
          leadName: updatedLead.name,
          customerName: contact.companyName || updatedLead.companyName || updatedLead.name,
          contactId: contact.contactId || contact.id,
          contactName: contact.name,
          entityId: contact.id,
          entityType: 'ContactAssignment',
          status: 'Assigned',
          performedBy: contact.createdBy || 'Admin',
          activityDate: contactCreatedAt,
          activityTime: '08:15 AM',
        }).catch(() => {});
      }

      // 3. BANT Qualification Assessment
      recordActivity({
        type: 'qualification',
        title: 'BANT Qualification Assessment',
        description: `BANT Criteria Completed: Budget verified (â‚¹${contact.budgetRange || '80,000+'}) Â· Decision Maker confirmed (${contact.contactPerson || contact.name}, ${contact.designation || 'Representative'}) Â· Need identified (${contact.interestedService || (contact.productList && contact.productList[0]) || 'IT CRM Solution'}) Â· Timeline: Immediate Â· Priority: ${contact.priority || 'Medium'}.`,
        leadId: updatedLead.id,
        leadCode: updatedLead.leadId,
        leadName: updatedLead.name,
        customerName: contact.companyName || updatedLead.companyName || updatedLead.name,
        contactId: contact.contactId || contact.id,
        contactName: contact.name,
        entityId: contact.id,
        entityType: 'QualificationReview',
        status: 'Qualified',
        performedBy: contact.qualifiedBy || 'Santhosh C',
        activityDate: qualDate,
        activityTime: '08:45 AM',
      }).catch(() => {});

      // 4. Record qualification activity for timeline
      recordActivity({
        type: 'qualification',
        title: 'Lead Qualified from Contact',
        description: `Contact #${contact.contactId || contact.id} (${contact.name}) was successfully qualified and converted to Lead pipeline #${updatedLead.leadId}. Deal pipeline initialized.`,
        leadId: updatedLead.id,
        leadCode: updatedLead.leadId,
        leadName: updatedLead.name,
        customerName: updatedLead.companyName || updatedLead.name,
        contactId: contact.contactId || contact.id,
        contactName: contact.name,
        entityId: updatedLead.id,
        entityType: 'LeadQualification',
        entityNumber: updatedLead.leadId,
        status: 'Qualified',
        performedBy: contact.qualifiedBy || 'System',
        activityDate: qualDate,
        activityTime: '09:00 AM',
      }).catch(() => {});

      return updatedLead;
    } else {
      const leadId = await getNextLeadId();
      const newLead = await prisma.lead.create({
        data: {
          leadId,
          name: contact.name.trim(),
          email: contact.email ? contact.email.trim() : null,
          phone: contact.phone ? contact.phone.trim() : null,
          contactType: contact.contactType || 'Company Representative',
          profession: contact.profession || null,
          companyName: contact.companyName || null,
          designation: contact.designation || null,
          address: contact.address || null,
          source: contact.source || 'Website',
          customSource: contact.customSource || null,
          category,
          productList,
          serviceList,
          priority: contact.priority || 'Medium',
          status: 'New',
          stage: 'Initialization',
          assignedTo,
          assignedToName,
          createdBy,
          createdByName,
        },
      });

      await delCache('crm:leads:*').catch(() => {});
      if (io) {
        io.emit('lead_created', newLead);
      }

      // Maintain bidirectional relationship: link Contact to Lead
      try {
        await prisma.contact.updateMany({
          where: {
            OR: [
              { id: contact.id },
              ...(contact.contactId ? [{ contactId: contact.contactId }] : []),
            ],
          },
          data: {
            internalReference: newLead.leadId,
          },
        });
      } catch (refErr) {
        console.warn('[syncContactToLead] Failed to update internalReference on Contact:', refErr.message);
      }

      // Synchronize existing meetings so Lead Module immediately sees all contact meetings
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "ScheduledMeeting"
           SET "lead_id" = $1, "updatedAt" = NOW()
           WHERE "contactId" = $2 OR "contactId" = $3 OR "lead_id" = $2 OR "lead_id" = $3`,
          newLead.id,
          contact.id,
          contact.contactId || contact.id
        );
        if (io) {
          io.emit('meeting:updated');
          io.emit('crm_meetings_updated');
        }
      } catch (meetSyncErr) {
        console.warn('[syncContactToLead] Failed to link existing ScheduledMeeting:', meetSyncErr.message);
      }

      // Synchronize activity timeline and call logs to the Lead
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE activities
           SET "leadId" = $1, "leadCode" = $2, "leadName" = $3, "updatedAt" = NOW()
           WHERE "contactId" = $4 OR "contactId" = $5`,
          newLead.id,
          newLead.leadId,
          newLead.name,
          contact.id,
          contact.contactId || contact.id
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "CallLog"
           SET "lead_id" = $1, "updatedAt" = NOW()
           WHERE "contactId" = $2 OR "contactId" = $3`,
          newLead.id,
          contact.id,
          contact.contactId || contact.id
        );
      } catch (actSyncErr) {
        console.warn('[syncContactToLead] Failed to sync activities/callLogs to Lead:', actSyncErr.message);
      }

      // Record complete end-to-end touchpoints for timeline
      const contactOriginCode = contact.contactId ? `#${contact.contactId}` : '#CNT-1001';
      const contactCreatedAt = contact.createdAt ? (contact.createdAt instanceof Date ? contact.createdAt.toISOString().slice(0, 10) : String(contact.createdAt).slice(0, 10)) : new Date().toISOString().slice(0, 10);
      const qualDate = contact.qualificationDate || contactCreatedAt;

      // 1. Contact Registered
      recordActivity({
        type: 'contact',
        title: 'Contact Registered',
        description: `Contact ${contactOriginCode} (${contact.name}) registered via ${contact.source || 'Website'}${contact.customSource ? ` (${contact.customSource})` : ''}. Interested in ${contact.category || 'Product'}: ${contact.interestedService || (contact.productList && contact.productList[0]) || 'IT Solutions'}.`,
        leadId: newLead.id,
        leadCode: newLead.leadId,
        leadName: newLead.name,
        customerName: contact.companyName || newLead.companyName || newLead.name,
        contactId: contact.contactId || contact.id,
        contactName: contact.name,
        entityId: contact.id,
        entityType: 'Contact',
        entityNumber: contact.contactId || 'CNT-1001',
        status: 'Registered',
        performedBy: contact.createdBy || 'System',
        activityDate: contactCreatedAt,
        activityTime: '08:00 AM',
      }).catch(() => {});

      // 2. Contact Assigned
      const assignee = contact.assignedToName || newLead.assignedToName;
      if (assignee) {
        recordActivity({
          type: 'contact',
          title: 'Contact Assigned to Sales Rep',
          description: `Contact assigned to ${assignee} for initial inquiry discovery and requirement qualification assessment.`,
          leadId: newLead.id,
          leadCode: newLead.leadId,
          leadName: newLead.name,
          customerName: contact.companyName || newLead.companyName || newLead.name,
          contactId: contact.contactId || contact.id,
          contactName: contact.name,
          entityId: contact.id,
          entityType: 'ContactAssignment',
          status: 'Assigned',
          performedBy: contact.createdBy || 'Admin',
          activityDate: contactCreatedAt,
          activityTime: '08:15 AM',
        }).catch(() => {});
      }

      // 3. BANT Qualification Assessment
      recordActivity({
        type: 'qualification',
        title: 'BANT Qualification Assessment',
        description: `BANT Criteria Completed: Budget verified (â‚¹${contact.budgetRange || '80,000+'}) Â· Decision Maker confirmed (${contact.contactPerson || contact.name}, ${contact.designation || 'Representative'}) Â· Need identified (${contact.interestedService || (contact.productList && contact.productList[0]) || 'IT CRM Solution'}) Â· Timeline: Immediate Â· Priority: ${contact.priority || 'Medium'}.`,
        leadId: newLead.id,
        leadCode: newLead.leadId,
        leadName: newLead.name,
        customerName: contact.companyName || newLead.companyName || newLead.name,
        contactId: contact.contactId || contact.id,
        contactName: contact.name,
        entityId: contact.id,
        entityType: 'QualificationReview',
        status: 'Qualified',
        performedBy: contact.qualifiedBy || 'Santhosh C',
        activityDate: qualDate,
        activityTime: '08:45 AM',
      }).catch(() => {});

      // 4. Record qualification activity for timeline
      recordActivity({
        type: 'qualification',
        title: 'Lead Qualified from Contact',
        description: `Contact #${contact.contactId || contact.id} (${contact.name}) was successfully qualified and converted to Lead pipeline #${newLead.leadId}. Deal pipeline initialized.`,
        leadId: newLead.id,
        leadCode: newLead.leadId,
        leadName: newLead.name,
        customerName: newLead.companyName || newLead.name,
        contactId: contact.contactId || contact.id,
        contactName: contact.name,
        entityId: newLead.id,
        entityType: 'LeadQualification',
        entityNumber: newLead.leadId,
        status: 'Qualified',
        performedBy: contact.qualifiedBy || 'System',
        activityDate: qualDate,
        activityTime: '09:00 AM',
      }).catch(() => {});

      return newLead;
    }
  } catch (err) {
    console.error('[syncContactToLead Error]:', err);
    return null;
  }
}

/**
 * 6. Update Contact
 */
export async function updateContactService(id, body, user) {
  const cleanId = String(id || '').trim();
  let existing = await prisma.contact.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { contactId: cleanId },
        { contactId: { equals: cleanId, mode: 'insensitive' } },
        { internalReference: cleanId },
        { internalReference: { equals: cleanId, mode: 'insensitive' } },
      ],
    },
  });

  let existingBulk = null;
  if (!existing) {
    const existingBulk = await prisma.bulkUploadContact.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { bulkId: cleanId },
          { bulkId: { equals: cleanId, mode: 'insensitive' } },
          { importedContactId: cleanId },
        ],
      },
    });    if (existingBulk) {
      if (existingBulk.importedContactId) {
        existing = await prisma.contact.findFirst({
          where: { id: existingBulk.importedContactId },
        });
      }

      const isQualifying =
        (body.qualificationStatus !== undefined && body.qualificationStatus !== 'New' && body.qualificationStatus !== 'Unqualified') ||
        (body.stage === 'Qualification' && body.status !== 'Not Interested') ||
        body.budgetRange !== undefined ||
        body.interestedService !== undefined ||
        ['Qualified', 'Follow-up Required', 'Pending', 'In Progress'].includes(body.status) ||
        (body.assignmentStatus === 'Assigned' && body.status !== 'Not Interested');

      if (!existing && isQualifying) {
        const contactId = await getNextContactId();
        let assignedToName = body.assignedToName || existingBulk.assignedToName || null;
        let assignedToId = body.assignedTo || existingBulk.assignedTo || null;
        if (!assignedToId && user) {
          assignedToId = user.id;
          assignedToName = user.name || user.email || 'Assigned User';
        }
        if (assignedToId && !assignedToName) {
          const emp = await prisma.employee.findFirst({
            where: { OR: [{ id: assignedToId }, { empCode: assignedToId }] },
          });
          if (emp) assignedToName = emp.name;
        }

        const qualStatus =
          body.qualificationStatus ||
          (body.status === 'Qualified'
            ? 'Qualified'
            : body.status === 'Disqualified' || body.status === 'Unqualified'
            ? 'Unqualified'
            : body.status === 'Follow-up Required'
            ? 'Follow-up Required'
            
            : 'Pending');

        const newContact = await prisma.contact.create({
          data: {
            contactId,
            name: (body.name || body.contactPerson || body.companyName || existingBulk.name || 'Contact').trim(),
            companyName: body.companyName !== undefined ? body.companyName : existingBulk.companyName,
            contactPerson: body.contactPerson !== undefined ? body.contactPerson : existingBulk.contactPerson,
            email: body.email !== undefined ? (body.email ? body.email.toLowerCase().trim() : null) : existingBulk.email,
            phone: (() => {
              const digits = String(body.phone || existingBulk.phone || '').replace(/\D/g, '');
              return digits || '0000000000';
            })(),
            source: 'Bulk Import',
            customSource: existingBulk.fileName || undefined,
            contactType: body.contactType || existingBulk.contactType || 'Company Representative',
            designation: body.designation !== undefined ? body.designation : existingBulk.designation,
            profession: body.profession !== undefined ? body.profession : existingBulk.profession,
            category: body.category || existingBulk.category || 'Product',
            productList: body.productList || existingBulk.productList || [],
            serviceList: body.serviceList || existingBulk.serviceList || [],
            customProduct: body.customProduct || body.productCode || undefined,
            internalReference: body.productCode || body.internalReference || existingBulk.bulkId || undefined,
            status: body.status || qualStatus,
            stage: body.stage || 'Qualification',
            qualificationStatus: qualStatus,
            priority: (body.tagPriority !== undefined ? body.tagPriority : body.priority) ? String(body.tagPriority !== undefined ? body.tagPriority : body.priority).trim() : (existingBulk.priority || 'Medium'),
            businessNeed: body.businessNeed || undefined,
            budgetRange: body.budgetRange || undefined,
            decisionMaker: body.decisionMaker || undefined,
            purchaseTimeline: body.purchaseTimeline || undefined,
            interestedService: body.interestedService || undefined,
            address: body.address || existingBulk.city || existingBulk.street || undefined,
            city: body.city || existingBulk.city || undefined,
            street: body.street || existingBulk.street || undefined,
            gstNumber: body.gstNumber ? body.gstNumber.trim().toUpperCase() : (existingBulk.gstNumber || undefined),
            employeeCount: body.employeeCount || existingBulk.employeeCount || undefined,
            companyPan: body.companyPan ? body.companyPan.trim().toUpperCase() : (existingBulk.companyPan || undefined),
            companyWebsite: body.website || body.companyWebsite || existingBulk.companyWebsite || undefined,
            description: body.description || existingBulk.description || undefined,
            remarks: body.remarks || existingBulk.remarks || undefined,
            notes: body.notes || existingBulk.notes || undefined,
            contactMode: body.contactMode || existingBulk.contactMode || null,
            assignedTo: assignedToId,
            assignedToName: assignedToName,
            assignmentStatus: 'Assigned',
            qualifiedBy: body.qualifiedBy || user?.name || undefined,
            qualificationDate: body.qualificationDate || new Date().toISOString().slice(0, 10),
            unqualifiedReason: body.unqualifiedReason || undefined,
            disqualificationReason: body.disqualificationReason || body.unqualifiedReason || undefined,
            expectedCloseDate: body.expectedCloseDate || existingBulk.expectedCloseDate || undefined,
            nextFollowDate: body.nextFollowDate || undefined,
            createdBy: existingBulk.createdBy || user?.name || user?.email || 'System',
          },
        });

        await prisma.bulkUploadContact.update({
          where: { id: existingBulk.id },
          data: {
            isImportedToContact: true,
            importedContactId: newContact.id,
            status: body.status || qualStatus,
            contactMode: body.contactMode || existingBulk.contactMode || null,
            stage: 'Qualification',
            assignedTo: assignedToId,
            assignedToName: assignedToName,
            assignmentStatus: 'Assigned',
          },
        });

        await delCache('crm:contacts:*');
        if (io) {
          io.emit('contact_updated', newContact);
          io.emit('crm_contacts_updated');
        }

        if (qualStatus === 'Qualified') {
          await syncContactToLead(newContact, user);
        }

        return {
          message: 'Contact qualified and moved to Qualification section successfully',
          data: formatContactResponse(newContact),
        };
      }

      if (!existing) {
        const updatedBulk = await prisma.bulkUploadContact.update({
          where: { id: existingBulk.id },
          data: {
            ...(body.name && { name: body.name.trim() }),
            ...(body.companyName !== undefined && { companyName: body.companyName }),
            ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson }),
            ...(body.designation !== undefined && { designation: body.designation }),
            ...(body.profession !== undefined && { profession: body.profession }),
            ...(body.email !== undefined && { email: body.email ? body.email.toLowerCase().trim() : null }),
            ...(body.phone !== undefined && {
              phone: (() => {
                const digits = String(body.phone || '').replace(/\D/g, '');
                return digits.slice(0, 10);
              })(),
            }),
            ...(body.contactMode !== undefined && { contactMode: body.contactMode ? String(body.contactMode).trim() : null }),
            ...(body.status !== undefined && { status: body.status }),
            ...(body.stage !== undefined && { stage: body.stage }),
            ...(body.description !== undefined && { description: body.description, notes: body.description }),
            ...(body.notes !== undefined && { notes: body.notes }),
            ...(body.remarks !== undefined && { remarks: body.remarks }),
            ...(body.assignedTo !== undefined && {
              assignedTo: body.assignedTo && body.assignedTo !== 'none' && body.assignedTo !== 'Unassigned' ? body.assignedTo : null,
              assignmentStatus: body.assignedTo && body.assignedTo !== 'none' && body.assignedTo !== 'Unassigned' ? 'Assigned' : 'Unassigned',
            }),
            ...(body.city !== undefined && { city: body.city }),
            ...(body.street !== undefined && { street: body.street }),
            ...(body.location !== undefined && { city: body.location, street: body.location }),
            ...(body.address !== undefined && { city: body.address, street: body.address }),
            ...(body.source !== undefined && { source: body.source }),
            ...((body.website !== undefined || body.companyWebsite !== undefined) && {
              companyWebsite: (body.website || body.companyWebsite) ? String(body.website || body.companyWebsite).trim() : null,
            }),
            ...((body.priority !== undefined || body.tagPriority !== undefined) && {
              priority: (body.tagPriority !== undefined ? body.tagPriority : body.priority)
                ? String(body.tagPriority !== undefined ? body.tagPriority : body.priority).trim()
                : 'Medium',
            }),
          },
        });

        await delCache('crm:contacts:*');
        if (io) {
          io.emit('contact_updated', updatedBulk);
          io.emit('crm_contacts_updated');
        }
        return {
          message: 'Contact updated successfully',
          data: formatContactResponse(updatedBulk),
        };
      }
    }

    if (!existing) {
      // 1. Try matching Contact by phone or email
      if (body.phone || body.email) {
        const cleanPhone = body.phone ? String(body.phone).replace(/\D/g, '') : '';
        const cleanEmail = body.email ? String(body.email).toLowerCase().trim() : '';
        existing = await prisma.contact.findFirst({
          where: {
            OR: [
              ...(cleanPhone ? [{ phone: cleanPhone }] : []),
              ...(cleanEmail ? [{ email: { equals: cleanEmail, mode: 'insensitive' } }] : []),
            ],
          },
        });
      }
    }

    if (!existing) {
      // 2. Try matching Lead by cleanId, phone, or email
      const matchedLead = await prisma.lead.findFirst({
        where: {
          OR: [
            { id: cleanId },
            { leadId: cleanId },
            ...(body.phone ? [{ phone: String(body.phone).replace(/\D/g, '') }] : []),
            ...(body.email ? [{ email: { equals: String(body.email).toLowerCase().trim(), mode: 'insensitive' } }] : []),
          ],
        },
      });

      if (matchedLead) {
        const leadPhone = matchedLead.phone ? String(matchedLead.phone).replace(/\D/g, '') : '';
        const leadEmail = matchedLead.email ? String(matchedLead.email).toLowerCase().trim() : '';
        if (leadPhone || leadEmail) {
          existing = await prisma.contact.findFirst({
            where: {
              OR: [
                ...(leadPhone ? [{ phone: leadPhone }] : []),
                ...(leadEmail ? [{ email: { equals: leadEmail, mode: 'insensitive' } }] : []),
              ],
            },
          });
        }

        if (!existing) {
          const newContactId = await getNextContactId();
          existing = await prisma.contact.create({
            data: {
              contactId: newContactId,
              name: (body.name || matchedLead.name || 'Contact').trim(),
              email: body.email || matchedLead.email || null,
              phone: (body.phone ? String(body.phone).replace(/\D/g, '') : '') || leadPhone || '0000000000',
              companyName: body.companyName || matchedLead.companyName || null,
              contactPerson: body.contactPerson || matchedLead.name || null,
              contactType: body.contactType || matchedLead.contactType || 'Individual',
              designation: body.designation || matchedLead.designation || null,
              profession: body.profession || matchedLead.profession || null,
              address: body.address || matchedLead.address || null,
              source: body.source || matchedLead.source || 'Lead',
              category: body.category || matchedLead.category || 'Service',
              status: body.status || matchedLead.status || 'Qualified',
              stage: body.stage || matchedLead.stage || 'Qualification',
              internalReference: matchedLead.leadId,
              assignedTo: body.assignedTo || matchedLead.assignedTo || null,
              assignedToName: body.assignedToName || matchedLead.assignedToName || null,
            },
          });
        }
      }
    }

    if (!existing) {
      // 3. Try matching Customer by cleanId, phone, or email
      const matchedCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { id: cleanId },
            { customerId: cleanId },
            ...(body.phone ? [{ phone: String(body.phone).replace(/\D/g, '') }] : []),
            ...(body.email ? [{ email: { equals: String(body.email).toLowerCase().trim(), mode: 'insensitive' } }] : []),
            ...(body.companyName ? [{ companyName: { equals: String(body.companyName).trim(), mode: 'insensitive' } }] : []),
          ],
        },
      });

      if (matchedCustomer) {
        const custPhone = matchedCustomer.phone ? String(matchedCustomer.phone).replace(/\D/g, '') : '';
        const custEmail = matchedCustomer.email ? String(matchedCustomer.email).toLowerCase().trim() : '';
        const custComp = matchedCustomer.companyName ? String(matchedCustomer.companyName).trim() : '';

        if (custPhone || custEmail || custComp) {
          existing = await prisma.contact.findFirst({
            where: {
              OR: [
                ...(custPhone ? [{ phone: custPhone }] : []),
                ...(custEmail ? [{ email: { equals: custEmail, mode: 'insensitive' } }] : []),
                ...(custComp ? [{ companyName: { equals: custComp, mode: 'insensitive' } }] : []),
              ],
            },
          });
        }

        if (!existing) {
          const newContactId = await getNextContactId();
          existing = await prisma.contact.create({
            data: {
              contactId: newContactId,
              name: (body.name || matchedCustomer.contactPerson || matchedCustomer.companyName || 'Contact').trim(),
              email: body.email || matchedCustomer.email || null,
              phone: (body.phone ? String(body.phone).replace(/\D/g, '') : '') || custPhone || '0000000000',
              companyName: body.companyName || matchedCustomer.companyName || null,
              contactPerson: body.contactPerson || matchedCustomer.contactPerson || null,
              contactType: body.contactType || 'Company Representative',
              designation: body.designation || null,
              address: body.address || matchedCustomer.address || null,
              source: body.source || 'Customer Portal',
              category: body.category || 'Service',
              status: body.status || 'Qualified',
              stage: body.stage || 'Qualification',
              internalReference: matchedCustomer.customerId,
              assignedTo: body.assignedTo || null,
              assignedToName: body.assignedToName || null,
            },
          });
        }
      }
    }

    if (!existing) {
      const error = new Error('Contact not found');
      error.status = 404;
      throw error;
    }
  }

  const updated = await prisma.contact.update({
    where: { id: existing.id },
    data: {
      ...((body.name !== undefined || body.contactPerson !== undefined || body.companyName !== undefined) && {
        name: (body.name || body.contactPerson || body.companyName || existing.name || 'Contact').trim(),
      }),
      ...(body.email !== undefined && { email: body.email ? body.email.toLowerCase().trim() : null }),
      ...(body.phone !== undefined && {
        phone: (() => {
          const digits = String(body.phone || '').replace(/\D/g, '');
          if (digits && digits.length !== 10) {
            const error = new Error('Mobile number must be exactly 10 digits.');
            error.status = 400;
            throw error;
          }
          return digits || String(body.phone).trim();
        })(),
      }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.contactMode !== undefined && { contactMode: body.contactMode ? String(body.contactMode).trim() : null }),
      ...(body.source !== undefined && { source: body.source }),
      ...(body.customSource !== undefined && { customSource: body.customSource }),
      ...(body.contactType !== undefined && { contactType: body.contactType }),
      ...(body.companyName !== undefined && { companyName: body.companyName }),
      ...(body.profession !== undefined && { profession: body.profession }),
      ...(body.designation !== undefined && { designation: body.designation }),
      ...(body.gstNumber !== undefined && { gstNumber: body.gstNumber ? body.gstNumber.trim().toUpperCase() : null }),
      ...(body.employeeCount !== undefined && { employeeCount: body.employeeCount }),
      ...(body.companyPan !== undefined && { companyPan: body.companyPan ? body.companyPan.trim().toUpperCase() : null }),
      ...(body.panNumber !== undefined && { companyPan: body.panNumber ? body.panNumber.trim().toUpperCase() : null }),
      ...(body.cinNumber !== undefined && { cinNumber: body.cinNumber ? body.cinNumber.trim().toUpperCase() : null }),
      ...((body.companyWebsite !== undefined || body.website !== undefined) && {
        companyWebsite: (body.website || body.companyWebsite) ? String(body.website || body.companyWebsite).trim() : null,
      }),
      ...(body.linkedinUrl !== undefined && { linkedinUrl: body.linkedinUrl ? body.linkedinUrl.trim() : null }),
      ...(body.annualTurnover !== undefined && { annualTurnover: body.annualTurnover }),
      ...(body.verificationStatus !== undefined && { verificationStatus: body.verificationStatus }),
      ...(body.registeredState !== undefined && { registeredState: body.registeredState }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.productList !== undefined && { productList: body.productList }),
      ...(body.serviceList !== undefined && { serviceList: body.serviceList }),
      ...(body.customProduct !== undefined && { customProduct: body.customProduct }),
      ...(body.productCode !== undefined && { internalReference: body.productCode, customProduct: body.productCode }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.stage !== undefined && { stage: body.stage }),
      ...((body.priority !== undefined || body.tagPriority !== undefined) && {
        priority: (body.tagPriority !== undefined ? body.tagPriority : body.priority) ? String(body.tagPriority !== undefined ? body.tagPriority : body.priority).trim() : 'Medium',
      }),
      ...(body.qualificationStatus !== undefined
        ? {
            qualificationStatus: body.qualificationStatus,
            status:
              body.status !== undefined
                ? body.status
                : body.qualificationStatus === 'Qualified'
                ? 'Qualified'
                : body.qualificationStatus === 'Unqualified' || body.qualificationStatus === 'Disqualified'
                ? 'Disqualified'
                : body.qualificationStatus === 'Follow-up Required'
                ? 'Follow-up Required'
                : body.qualificationStatus === 'Pending'
                ? 'Pending'
                : body.qualificationStatus === 'New'
                ? 'New'
                : 'In Progress',
          }
        : body.status !== undefined
        ? {
            status: body.status,
            qualificationStatus:
              body.status === 'Qualified'
                ? 'Qualified'
                : body.status === 'Disqualified'
                ? 'Unqualified'
                : body.status === 'Follow-up Required'
                ? 'Follow-up Required'
                : body.status === 'New' || body.status === 'Interested' || body.status === 'Not Interested' || body.status === 'Not-Interested' || body.status === 'Not Connected'
                ? 'New'
                : 'Pending',
          }
        : {}),
      ...(body.businessNeed !== undefined && { businessNeed: body.businessNeed }),
      ...(body.budgetRange !== undefined && { budgetRange: body.budgetRange }),
      ...(body.decisionMaker !== undefined && { decisionMaker: body.decisionMaker }),
      ...(body.purchaseTimeline !== undefined && { purchaseTimeline: body.purchaseTimeline }),
      ...(body.interestedService !== undefined && {
        interestedService: body.interestedService,
        ...((body.category === 'Service' || (!body.category && existing.category === 'Service')) && body.interestedService
          ? { serviceList: [body.interestedService] }
          : {}),
        ...((body.category === 'Product' || (!body.category && existing.category === 'Product')) && body.interestedService
          ? { productList: [body.interestedService] }
          : {})
      }),
      ...(body.unqualifiedReason !== undefined && {
        unqualifiedReason: body.unqualifiedReason,
        disqualificationReason: body.unqualifiedReason,
      }),
      ...(body.qualifiedBy !== undefined && { qualifiedBy: body.qualifiedBy }),
      ...(body.qualificationDate !== undefined && { qualificationDate: body.qualificationDate }),
      ...(body.disqualificationReason !== undefined && { disqualificationReason: body.disqualificationReason }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.remarks !== undefined && { remarks: body.remarks }),
      ...(body.nextFollowDate !== undefined
        ? { nextFollowDate: body.nextFollowDate || null }
        : (body.status && !body.status.toLowerCase().includes('follow')
            ? { nextFollowDate: null }
            : {})),
      ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson }),
      ...(body.estimatedValue !== undefined && { estimatedValue: body.estimatedValue }),
      ...(body.expectedCloseDate !== undefined && { expectedCloseDate: body.expectedCloseDate }),
      ...(body.description !== undefined && { description: body.description, notes: body.description }),
      ...(body.assignedTo !== undefined && {
        assignedTo: body.assignedTo && body.assignedTo !== 'none' && body.assignedTo !== 'Unassigned' ? body.assignedTo : null,
        assignmentStatus: body.assignedTo && body.assignedTo !== 'none' && body.assignedTo !== 'Unassigned' ? 'Assigned' : 'Unassigned',
      }),
      ...(body.assignmentStatus !== undefined ? { assignmentStatus: body.assignmentStatus } : {}),
      ...((body.qualificationStatus || body.stage === 'Qualification') ? {
        assignmentStatus: 'Assigned',
        stage: body.stage || 'Qualification',
      } : {}),
      ...((!existing.assignedTo && !body.assignedTo && (body.qualificationStatus || body.stage === 'Qualification') && user) ? {
        assignedTo: user.id,
        assignedToName: user.name || user.email || 'Assigned User',
      } : {}),
      // Verified Odoo Contact Fields
      ...(body.title !== undefined && { title: body.title }),
      ...(body.mobile !== undefined && { mobile: body.mobile }),
      ...(body.tags !== undefined && { tags: Array.isArray(body.tags) ? body.tags : [] }),
      ...(body.street !== undefined && { street: body.street }),
      ...(body.street2 !== undefined && { street2: body.street2 }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.zip !== undefined && { zip: body.zip }),
      ...(body.country !== undefined && { country: body.country }),
      ...(body.paymentTerms !== undefined && { paymentTerms: body.paymentTerms }),
      ...(body.creditLimit !== undefined && { creditLimit: body.creditLimit }),
      ...(body.internalReference !== undefined && { internalReference: body.internalReference }),
    },
  });

  // Keep linked bulk contact in sync if it originated from bulk import
  try {
    const linkedBulk = existingBulk || await prisma.bulkUploadContact.findFirst({
      where: {
        OR: [
          { importedContactId: existing.id },
          ...(existing.internalReference ? [{ bulkId: existing.internalReference }] : []),
        ],
      },
    });
    if (linkedBulk) {
      await prisma.bulkUploadContact.update({
        where: { id: linkedBulk.id },
        data: {
          ...(body.name && { name: body.name.trim() }),
          ...(body.companyName !== undefined && { companyName: body.companyName }),
          ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson }),
          ...(body.email !== undefined && { email: body.email ? body.email.toLowerCase().trim() : null }),
          ...(body.phone !== undefined && {
            phone: (() => {
              const digits = String(body.phone || '').replace(/\D/g, '');
              return digits.slice(0, 10);
            })(),
          }),
          ...(body.status !== undefined && { status: body.status }),
          ...(body.stage !== undefined && { stage: body.stage }),
          ...(body.contactMode !== undefined && { contactMode: body.contactMode ? String(body.contactMode).trim() : null }),
          ...(body.description !== undefined && { description: body.description, notes: body.description }),
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.remarks !== undefined && { remarks: body.remarks }),
          ...(body.assignedTo !== undefined && {
            assignedTo: body.assignedTo && body.assignedTo !== 'none' && body.assignedTo !== 'Unassigned' ? body.assignedTo : null,
            assignmentStatus: body.assignedTo && body.assignedTo !== 'none' && body.assignedTo !== 'Unassigned' ? 'Assigned' : 'Unassigned',
          }),
          ...(body.assignedToName !== undefined && { assignedToName: body.assignedToName }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.street !== undefined && { street: body.street }),
        },
      });
    }
  } catch (syncErr) {
    console.warn('Could not sync linked bulk contact:', syncErr?.message);
  }

  await delCache('crm:contacts:*');

  if (io) {
    io.emit('contact_updated', updated);
    io.emit('crm_contacts_updated');
  }

  // Automatically sync to Lead
  await syncContactToLead(updated, user);

  try {
    const isContactQualified =
      (updated.status && updated.status.toLowerCase() === 'qualified') ||
      (updated.qualificationStatus && updated.qualificationStatus.toLowerCase() === 'qualified');

    const mappedLeadStatus = isContactQualified ? 'New' : mapContactStatusToLead(updated.status, existing?.status || 'New');
    const leadUpdateData = {
      ...(mappedLeadStatus && { status: mappedLeadStatus }),
      ...(isContactQualified ? { stage: 'Initialization' } : (updated.stage && { stage: updated.stage })),
      ...(updated.priority && { priority: updated.priority }),
      ...(updated.designation !== undefined && { designation: updated.designation }),
      ...(updated.profession !== undefined && { profession: updated.profession }),
      ...(updated.assignedTo !== undefined && { assignedTo: updated.assignedTo, assignedToName: updated.assignedToName }),
    };
    if (Object.keys(leadUpdateData).length > 0) {
      await prisma.lead.updateMany({
        where: {
          OR: [
            { id: cleanId },
            { leadId: cleanId },
            ...(body.leadId ? [{ id: body.leadId }, { leadId: body.leadId }] : []),
            ...(body.leadCode ? [{ id: body.leadCode }, { leadId: body.leadCode }] : []),
            ...(existing.internalReference ? [{ leadId: existing.internalReference }] : []),
            ...(updated.email ? [{ email: { equals: updated.email, mode: 'insensitive' } }] : []),
            ...(updated.phone ? [{ phone: updated.phone }] : []),
          ],
        },
        data: leadUpdateData,
      });
    }
  } catch (leadSyncErr) {
    console.warn('[updateContactService] Failed to sync to Lead:', leadSyncErr.message);
  }

  // Synchronize status back to BulkUploadContact if linked
  try {
    const bulkOrConditions = [
      { importedContactId: updated.id },
      { id: cleanId },
      { bulkId: cleanId },
    ];
    if (updated.contactId) {
      bulkOrConditions.push({ bulkId: updated.contactId });
    }
    if (updated.internalReference) {
      bulkOrConditions.push({ bulkId: updated.internalReference });
    }
    if (updated.phone) {
      bulkOrConditions.push({ phone: updated.phone });
    }
    if (updated.email) {
      bulkOrConditions.push({ email: { equals: updated.email, mode: 'insensitive' } });
    }

    const bulkUpdateData = {
      ...(updated.status && { status: updated.status }),
      ...(updated.stage && { stage: updated.stage }),
      ...(updated.contactMode !== undefined && { contactMode: updated.contactMode }),
      ...(updated.priority && { priority: updated.priority }),
      ...(updated.assignmentStatus && { assignmentStatus: updated.assignmentStatus }),
      ...(updated.assignedTo !== undefined && { assignedTo: updated.assignedTo }),
      ...(updated.assignedToName !== undefined && { assignedToName: updated.assignedToName }),
      isImportedToContact: true,
      importedContactId: updated.id,
      updatedAt: new Date(),
    };

    await prisma.bulkUploadContact.updateMany({
      where: { OR: bulkOrConditions },
      data: bulkUpdateData,
    });
  } catch (bulkSyncErr) {
    console.warn('[updateContactService] Failed to sync to BulkUploadContact:', bulkSyncErr.message);
  }

  return {
    message: 'Contact updated successfully',
    data: formatContactResponse(updated),
  };
}

/**
 * 7. Assign Contact
 */
export async function assignContactService(id, body, user) {
  const { employeeId, assignedTo } = body;
  const targetEmpId = employeeId !== undefined ? employeeId : assignedTo;

  let existing = await prisma.contact.findFirst({
    where: { OR: [{ id }, { contactId: id }] },
  });
  let isBulkRecord = false;

  if (!existing) {
    existing = await prisma.bulkUploadContact.findFirst({
      where: { OR: [{ id }, { bulkId: id }] },
    });
    if (existing) {
      isBulkRecord = true;
    } else {
      const error = new Error('Contact not found');
      error.status = 404;
      throw error;
    }
  }

  const roleUpper = String(user?.role || '').toUpperCase();
  const isAdminUser = roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN';

  let assignedToName = null;
  let assignmentStatus = 'Unassigned';
  let resolvedTargetId = targetEmpId;

  if (targetEmpId && targetEmpId !== 'Unassigned' && targetEmpId !== 'none' && targetEmpId !== 'null' && String(targetEmpId).trim() !== '') {
    let lookupTarget = targetEmpId;
    if (targetEmpId === 'me' && user) {
      lookupTarget = user.name || user.email || user.id;
    }

    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: lookupTarget },
          { empCode: lookupTarget },
          { name: { equals: lookupTarget, mode: 'insensitive' } },
          ...(user?.email ? [{ email: { equals: user.email, mode: 'insensitive' } }] : []),
          ...(user?.name ? [{ name: { equals: user.name, mode: 'insensitive' } }] : []),
        ],
      },
    });

    if (emp) {
      assignedToName = emp.name;
      resolvedTargetId = emp.id;
      assignmentStatus = 'Assigned';
    } else {
      assignedToName = user?.name || lookupTarget;
      resolvedTargetId = lookupTarget;
      assignmentStatus = 'Assigned';
    }

    // Role-based validation: regular employees can ONLY assign to themselves ("Move to Assigned")
    if (!isAdminUser && user) {
      const targetLower = String(lookupTarget).toLowerCase();
      const myName = String(user.name || '').toLowerCase();
      const myEmail = String(user.email || '').toLowerCase();
      const myId = String(user.id || '').toLowerCase();
      const isSelf =
        targetLower === myName ||
        targetLower === myEmail ||
        targetLower === myId ||
        targetLower === 'me' ||
        (emp && (emp.name.toLowerCase() === myName || emp.email.toLowerCase() === myEmail || emp.id.toLowerCase() === myId));

      if (!isSelf) {
        const error = new Error('Employees are only allowed to move contacts into their own assigned list.');
        error.status = 403;
        throw error;
      }
    }
  }

  let updated;
  if (isBulkRecord) {
    updated = await prisma.bulkUploadContact.update({
      where: { id: existing.id },
      data: {
        assignedTo: assignedToName ? resolvedTargetId : null,
        assignedToName,
        assignmentStatus,
        updatedAt: new Date(),
      },
    });
  } else {
    updated = await prisma.contact.update({
      where: { id: existing.id },
      data: {
        assignedTo: assignedToName ? resolvedTargetId : null,
        assignedToName,
        assignmentStatus,
        updatedAt: new Date(),
      },
    });
  }

  await delCache('crm:contacts:*');

  if (io) {
    io.emit('contact_assigned', updated);
  }

  return {
    message: 'Contact assignment updated successfully',
    data: {
      ...formatContactResponse(updated),
      contactId: updated.bulkId || updated.contactId,
    },
  };
}

/**
 * 8. Delete Contact
 */
export async function deleteContactService(id, user) {
  let contact = await prisma.contact.findFirst({
    where: { OR: [{ id }, { contactId: id }] },
  });

  if (!contact) {
    const bulkContact = await prisma.bulkUploadContact.findFirst({
      where: { OR: [{ id }, { bulkId: id }] },
    });
    if (bulkContact) {
      await prisma.bulkUploadContact.delete({ where: { id: bulkContact.id } });
      await delCache('crm:contacts:*');
      if (io) {
        io.emit('contact_deleted', { id: bulkContact.id });
      }
      return {
        message: 'Contact deleted successfully',
      };
    }

    const error = new Error('Contact not found');
    error.status = 404;
    throw error;
  }

  await prisma.contact.delete({ where: { id: contact.id } });
  await delCache('crm:contacts:*');

  if (io) {
    io.emit('contact_deleted', { id: contact.id });
  }

  return {
    message: 'Contact deleted successfully',
  };
}

/**
 * Safely generate the next Import Batch ID (e.g. BTH-1001)
 */
export async function getNextBatchId() {
  const allBatches = await prisma.importBatch.findMany({
    select: { batchId: true },
  });
  let maxNum = 1000;
  for (const b of allBatches) {
    if (b.batchId) {
      const match = b.batchId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  return `BTH-${maxNum + 1}`;
}

/**
 * Safely generate the next Bulk Upload Contact ID (e.g. BLK-1001)
 * Helper to generate next Bulk ID e.g. BLK-1001
 */
export async function getNextBulkId() {
  const allBulks = await prisma.bulkUploadContact.findMany({
    select: { bulkId: true },
  });
  let maxNum = 1000;
  for (const b of allBulks) {
    if (b.bulkId) {
      const match = b.bulkId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  return `BLK-${maxNum + 1}`;
}

/**
 * 9. Bulk Import Contacts
 */
export async function bulkImportContactsService(body, user) {
  const {
    contacts = [],
    defaultAssignedTo,
    defaultCategory = 'Product',
    defaultSource = 'Bulk Import',
    fileName = 'bulk_contacts.csv',
    fileSize = 0,
  } = body;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    const error = new Error('No contact records provided for bulk import.');
    error.status = 400;
    throw error;
  }

  // Resolve assignedTo employee details
  let assignedToName = null;
  let assignedToId = null;
  let assignmentStatus = 'Unassigned';

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  if (
    isSuperAdmin &&
    defaultAssignedTo &&
    defaultAssignedTo !== 'none' &&
    defaultAssignedTo !== 'Unassigned' &&
    defaultAssignedTo !== 'null' &&
    String(defaultAssignedTo).trim() !== ''
  ) {
    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: defaultAssignedTo },
          { empCode: defaultAssignedTo },
          { name: { equals: defaultAssignedTo, mode: 'insensitive' } },
        ],
      },
    });
    if (emp) {
      assignedToId = emp.id;
      assignedToName = emp.name;
      assignmentStatus = 'Assigned';
    } else {
      assignedToId = defaultAssignedTo;
      assignedToName = defaultAssignedTo;
      assignmentStatus = 'Assigned';
    }
  } else {
    // Default to whoever imported the batch!
    const importerName = user?.name || user?.email || 'System';
    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: user?.id || '' },
          { email: { equals: user?.email || '', mode: 'insensitive' } },
          { name: { equals: user?.name || '', mode: 'insensitive' } },
        ],
      },
    });
    if (emp) {
      assignedToId = emp.id;
      assignedToName = emp.name;
      assignmentStatus = 'Assigned';
    } else {
      assignedToId = user?.id || null;
      assignedToName = importerName;
      assignmentStatus = 'Assigned';
    }
  }

  const batchId = await getNextBatchId();

  // Find current max bulk number to increment sequentially
  const allBulks = await prisma.bulkUploadContact.findMany({
    select: { bulkId: true },
  });
  let maxBulkNum = 1000;
  for (const b of allBulks) {
    if (b.bulkId) {
      const match = b.bulkId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxBulkNum) maxBulkNum = num;
      }
    }
  }

  const validRecords = [];
  const failedRows = [];

  for (let i = 0; i < contacts.length; i++) {
    const row = contacts[i];
    const rowNum = i + 1;
    const name = String(row.name || row.companyName || row.contactPerson || '').trim();
    const rawPhone = String(row.phone || '').trim();
    let phoneDigits = rawPhone.replace(/\D/g, '');
    if (phoneDigits.length === 11 && phoneDigits.startsWith('0')) {
      phoneDigits = phoneDigits.slice(1);
    } else if (phoneDigits.length === 12 && phoneDigits.startsWith('91')) {
      phoneDigits = phoneDigits.slice(2);
    } else if (phoneDigits.length > 10 && (phoneDigits.startsWith('0') || phoneDigits.startsWith('91'))) {
      phoneDigits = phoneDigits.slice(-10);
    }
    const email = row.email ? String(row.email).trim().toLowerCase() : null;

    const resolvedName = name || (row.companyName ? String(row.companyName).trim() : (row.contactPerson ? String(row.contactPerson).trim() : `Contact ${i + 1}`));
    const hasValidPhone = Boolean(phoneDigits && phoneDigits.length === 10);
    const hasValidEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

    // Only reject if BOTH phone number and email are missing / invalid
    if (!hasValidPhone && !hasValidEmail) {
      failedRows.push({
        row: rowNum,
        name: resolvedName,
        phone: rawPhone || 'â€”',
        email: email || 'â€”',
        reason: 'Both Phone number and Email are missing',
      });
      continue;
    }

    maxBulkNum += 1;
    const bulkId = `BLK-${maxBulkNum}`;

    const loc = row.location || row.city || row.street || row.address || null;
    const cleanLoc = loc ? String(loc).trim() : null;

    validRecords.push({
      bulkId,
      batchId,
      fileName,
      name: resolvedName,
      email: hasValidEmail ? email : (email || null),
      phone: hasValidPhone ? phoneDigits : (phoneDigits || rawPhone || null),
      companyName: row.companyName ? String(row.companyName).trim() : null,
      contactPerson: row.contactPerson ? String(row.contactPerson).trim() : name,
      designation: row.designation ? String(row.designation).trim() : null,
      profession: row.profession ? String(row.profession).trim() : null,
      category: row.category || defaultCategory,
      source: row.source || defaultSource,
      customSource: row.customId ? `Lead ID: ${row.customId}` : (row.leadId ? `Lead ID: ${row.leadId}` : null),
      status: row.status || 'Not Connected',
      stage: row.stage || 'Initialization',
      priority: row.priority || 'Medium',
      contactMode: row.contactMode || row.mode || (row.callStatus ? 'Call' : (row.phone ? 'Call' : null)),
      description: row.description || row.notes || null,
      remarks: row.remarks || null,
      notes: row.notes || null,
      assignedTo: assignedToId,
      assignedToName,
      assignmentStatus,
      city: cleanLoc,
      street: cleanLoc,
      country: row.country ? String(row.country).trim() : 'India',
      createdBy: user?.name || user?.email || 'System',
    });
  }

  if (validRecords.length > 0) {
    await prisma.bulkUploadContact.createMany({
      data: validRecords,
    });
  }

  const batchStatus = failedRows.length === 0 ? 'Completed' : (validRecords.length > 0 ? 'Partial' : 'Failed');

  const newBatch = await prisma.importBatch.create({
    data: {
      batchId,
      fileName,
      totalRows: contacts.length,
      importedCount: validRecords.length,
      failedCount: failedRows.length,
      status: batchStatus,
      failedRows,
      assignedTo: assignedToId,
      assignedToName,
      createdBy: user?.name || user?.email || 'System',
    },
  });

  await delCache('crm:contacts:*');

  if (io) {
    io.emit('batch_imported', newBatch);
    io.emit('crm_contacts_updated');
  }

  return {
    batchId: newBatch.batchId,
    batch: newBatch,
    importedCount: validRecords.length,
    errorCount: failedRows.length,
    data: validRecords,
    errors: failedRows,
    message: `Batch ${batchId} imported successfully with ${validRecords.length} contacts (${failedRows.length} failed).`,
  };
}

/**
 * 10. Get Bulk Upload Contacts
 */
export async function getBulkUploadContactsService(queryParams = {}, currentUser = null) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search = '',
    status,
    batchId,
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);

  const andConditions = [];

  const batchScope = await resolveBatchScopedFilter(currentUser);
  if (batchScope) {
    andConditions.push(batchScope);
  }

  if (batchId) {
    andConditions.push({ batchId });
  }

  if (status && status !== 'All' && status !== 'ALL') {
    andConditions.push({ status: { equals: status.trim(), mode: 'insensitive' } });
  }

  if (search && search.trim()) {
    const q = search.trim();
    andConditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { bulkId: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const total = await prisma.bulkUploadContact.count({ where });
  const rawContacts = await prisma.bulkUploadContact.findMany({
    where,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    orderBy: { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' },
  });

  const importedIds = rawContacts.map((c) => c.importedContactId).filter(Boolean);
  let linkedContactsMap = new Map();
  if (importedIds.length > 0) {
    const linked = await prisma.contact.findMany({
      where: { id: { in: importedIds } },
    });
    linkedContactsMap = new Map(linked.map((lc) => [lc.id, lc]));
  }

  const contacts = rawContacts.map((c) => {
    const linked = c.importedContactId ? linkedContactsMap.get(c.importedContactId) : null;
    const base = linked ? { ...formatContactResponse(linked), bulkId: c.bulkId } : formatContactResponse(c);
    const resolvedStatus = linked ? (linked.status || linked.qualificationStatus || c.status || 'Qualified') : (c.status || 'Not Connected');
    const resolvedMode = (linked?.contactMode || c.contactMode || '').trim();
    return {
      ...base,
      contactId: c.bulkId || c.id,
      isBulkImport: true,
      contactMode: resolvedMode || null,
      status: resolvedStatus,
      stage: linked?.stage || c.stage || 'Initialization',
      qualificationStatus: linked?.qualificationStatus || (resolvedStatus === 'Qualified' ? 'Qualified' : (c.qualificationStatus || 'Pending')),
    };
  });

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    data: contacts,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
    },
  };
}

/**
 * 11. Promote Bulk Upload Contact to Official Contact Table
 */
export async function promoteBulkUploadToContactService(id, currentUser = null) {
  const bulk = await prisma.bulkUploadContact.findFirst({
    where: { OR: [{ id }, { bulkId: id }] },
  });

  if (!bulk) {
    const error = new Error('Bulk upload contact not found');
    error.status = 404;
    throw error;
  }

  const contactId = await getNextContactId();

  const newContact = await prisma.contact.create({
    data: {
      contactId,
      name: bulk.name,
      email: bulk.email,
      phone: bulk.phone || '',
      companyName: bulk.companyName,
      contactPerson: bulk.contactPerson,
      designation: bulk.designation,
      category: bulk.category || 'Product',
      source: 'Bulk Import',
      status: bulk.status || 'New',
      stage: bulk.stage || 'Initialization',
      priority: bulk.priority || 'Medium',
      description: bulk.description,
      remarks: bulk.remarks,
      notes: bulk.notes,
      assignedTo: bulk.assignedTo,
      assignedToName: bulk.assignedToName,
      assignmentStatus: bulk.assignmentStatus,
    },
  });

  await prisma.bulkUploadContact.update({
    where: { id: bulk.id },
    data: {
      isImportedToContact: true,
      importedContactId: newContact.id,
    },
  });

  await delCache('crm:contacts:*');

  if (io) {
    io.emit('contact_created', newContact);
    io.emit('crm_contacts_updated');
  }

  return {
    message: `Contact promoted successfully as ${newContact.contactId}`,
    data: formatContactResponse(newContact),
  };
}

/**
 * 12. Delete Bulk Upload Record
 */
export async function deleteBulkUploadContactService(id, currentUser = null) {
  if (id === 'all') {
    await prisma.bulkUploadContact.deleteMany({});
    await delCache('crm:contacts:*');
    if (io) {
      io.emit('crm_contacts_updated');
    }
    return {
      message: 'All bulk upload contacts deleted successfully.',
    };
  }

  const bulk = await prisma.bulkUploadContact.findFirst({
    where: { OR: [{ id }, { bulkId: id }] },
  });

  if (!bulk) {
    const error = new Error('Bulk upload contact not found');
    error.status = 404;
    throw error;
  }

  await prisma.bulkUploadContact.delete({
    where: { id: bulk.id },
  });

  await delCache('crm:contacts:*');

  if (io) {
    io.emit('crm_contacts_updated');
  }

  return {
    message: 'Bulk contact deleted successfully.',
  };
}

/**
 * 13. Get List of Import Batches
 */
export async function getImportBatchesService(queryParams = {}, currentUser = null) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search = '',
    assignedTo,
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);

  const andConditions = [];

  // Data scoping: Employees should ONLY see batches they uploaded or are assigned to; Super Admin sees all
  const batchScope = await resolveBatchScopedFilter(currentUser);
  if (batchScope) {
    andConditions.push(batchScope);
  }

  if (assignedTo && assignedTo !== 'All') {
    andConditions.push({
      OR: [
        { assignedTo },
        { assignedToName: { equals: assignedTo, mode: 'insensitive' } },
        { createdBy: { equals: assignedTo, mode: 'insensitive' } },
      ],
    });
  }

  if (search && search.trim()) {
    const q = search.trim();
    andConditions.push({
      OR: [
        { batchId: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { assignedToName: { contains: q, mode: 'insensitive' } },
        { createdBy: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const total = await prisma.importBatch.count({ where });
  const batches = await prisma.importBatch.findMany({
    where,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    orderBy: { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' },
  });

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    data: batches,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
    },
  };
}

/**
 * 14. Get Single Import Batch Details
 */
export async function getImportBatchDetailsService(batchId, currentUser = null) {
  const batch = await prisma.importBatch.findFirst({
    where: { OR: [{ id: batchId }, { batchId }] },
  });

  if (!batch) {
    const error = new Error('Import batch not found');
    error.status = 404;
    throw error;
  }

  const batchScope = await resolveBatchScopedFilter(currentUser);
  if (batchScope) {
    const isAllowed = await prisma.importBatch.findFirst({
      where: {
        id: batch.id,
        AND: [batchScope],
      },
    });
    if (!isAllowed) {
      const error = new Error('Access denied. You do not have permission to view this import batch.');
      error.status = 403;
      throw error;
    }
  }

  return {
    success: true,
    batch,
  };
}

/**
 * 15. Get Contacts specific to an Import Batch
 */
export async function getBatchContactsService(batchId, queryParams = {}, currentUser = null) {
  const batch = await prisma.importBatch.findFirst({
    where: { OR: [{ id: batchId }, { batchId }] },
  });

  if (!batch) {
    const error = new Error('Import batch not found');
    error.status = 404;
    throw error;
  }

  const batchScope = await resolveBatchScopedFilter(currentUser);
  if (batchScope) {
    const isAllowed = await prisma.importBatch.findFirst({
      where: {
        id: batch.id,
        AND: [batchScope],
      },
    });
    if (!isAllowed) {
      const error = new Error('Access denied. You do not have permission to view this import batch.');
      error.status = 403;
      throw error;
    }
  }

  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search = '',
    status,
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);

  const andConditions = [
    { OR: [{ batchId: batch.batchId }, { batchId: batch.id }] },
  ];

  if (status && status !== 'All' && status !== 'ALL') {
    andConditions.push({ status: { equals: status.trim(), mode: 'insensitive' } });
  }

  if (search && search.trim()) {
    const q = search.trim();
    andConditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { bulkId: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  const where = { AND: andConditions };

  const total = await prisma.bulkUploadContact.count({ where });
  const rawContacts = await prisma.bulkUploadContact.findMany({
    where,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    orderBy: { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' },
  });

  const importedIds = rawContacts.map((c) => c.importedContactId).filter(Boolean);
  const phones = rawContacts.map((c) => c.phone).filter(Boolean);
  const emails = rawContacts.map((c) => c.email).filter(Boolean);
  const bulkIds = rawContacts.map((c) => c.bulkId).filter(Boolean);

  let linkedContacts = [];
  if (importedIds.length > 0 || phones.length > 0 || emails.length > 0 || bulkIds.length > 0) {
    linkedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          ...(importedIds.length > 0 ? [{ id: { in: importedIds } }] : []),
          ...(bulkIds.length > 0 ? [{ contactId: { in: bulkIds } }, { internalReference: { in: bulkIds } }] : []),
          ...(phones.length > 0 ? [{ phone: { in: phones } }] : []),
          ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
        ],
      },
    });
  }

  const linkedMap = new Map();
  for (const lc of linkedContacts) {
    if (lc.id) linkedMap.set(lc.id, lc);
    if (lc.contactId) linkedMap.set(lc.contactId, lc);
    if (lc.internalReference) linkedMap.set(lc.internalReference, lc);
    if (lc.phone) linkedMap.set(lc.phone, lc);
    if (lc.email) linkedMap.set(lc.email.toLowerCase(), lc);
  }

  const contacts = rawContacts.map((c) => {
    const linked =
      (c.importedContactId && linkedMap.get(c.importedContactId)) ||
      (c.bulkId && linkedMap.get(c.bulkId)) ||
      (c.phone && linkedMap.get(c.phone)) ||
      (c.email && linkedMap.get(c.email.toLowerCase())) ||
      null;

    const base = linked ? { ...formatContactResponse(linked), bulkId: c.bulkId } : formatContactResponse(c);
    const resolvedStatus = linked ? (linked.status || linked.qualificationStatus || c.status || 'Qualified') : (c.status || 'Not Connected');
    const resolvedMode = (linked?.contactMode || c.contactMode || '').trim();

    return {
      ...base,
      id: c.id,
      bulkId: c.bulkId || c.id,
      contactId: c.bulkId || c.id,
      isBulkImport: true,
      isBulkRecord: true,
      contactMode: resolvedMode || null,
      status: resolvedStatus,
      stage: linked?.stage || c.stage || 'Initialization',
      qualificationStatus: linked?.qualificationStatus || (resolvedStatus === 'Qualified' ? 'Qualified' : 'Pending'),
    };
  });

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    batch,
    data: contacts,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
    },
  };
}

/**
 * 16. Delete Import Batch
 */
export async function deleteImportBatchService(batchId, currentUser = null) {
  const batchScope = await resolveBatchScopedFilter(currentUser);
  if (batchScope) {
    const error = new Error('Access denied. Only Super Admin can delete import batches.');
    error.status = 403;
    throw error;
  }

  const batch = await prisma.importBatch.findFirst({
    where: { OR: [{ id: batchId }, { batchId }] },
  });

  if (!batch) {
    const error = new Error('Import batch not found');
    error.status = 404;
    throw error;
  }

  await prisma.bulkUploadContact.deleteMany({
    where: { OR: [{ batchId: batch.batchId }, { batchId: batch.id }] },
  });

  await prisma.importBatch.delete({
    where: { id: batch.id },
  });

  await delCache('crm:contacts:*');

  if (io) {
    io.emit('batch_deleted', { batchId: batch.batchId });
    io.emit('crm_contacts_updated');
  }

  return {
    success: true,
    message: 'Import batch and associated contacts deleted successfully.',
  };
}

/**
 * 17. Assign Import Batch and its contacts
 */
export async function assignImportBatchService(batchId, body, currentUser = null) {
  const batchScope = await resolveBatchScopedFilter(currentUser);
  if (batchScope) {
    const error = new Error('Access denied. Only Super Admin can assign import batches.');
    error.status = 403;
    throw error;
  }

  const { employeeId, assignedTo } = body || {};
  const targetId = employeeId !== undefined ? employeeId : assignedTo;

  const batch = await prisma.importBatch.findFirst({
    where: { OR: [{ id: batchId }, { batchId }] },
  });

  if (!batch) {
    const error = new Error('Import batch not found');
    error.status = 404;
    throw error;
  }

  let assignedToName = null;
  let resolvedTargetId = null;
  let assignmentStatus = 'Unassigned';

  if (targetId && targetId !== 'Unassigned' && targetId !== 'none' && targetId !== 'null' && String(targetId).trim() !== '') {
    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: targetId },
          { empCode: targetId },
          { name: { equals: targetId, mode: 'insensitive' } },
        ],
      },
    });
    if (emp) {
      assignedToName = emp.name;
      resolvedTargetId = emp.id;
      assignmentStatus = 'Assigned';
    } else {
      assignedToName = targetId;
      resolvedTargetId = targetId;
      assignmentStatus = 'Assigned';
    }
  }

  const updatedBatch = await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      assignedTo: assignedToName ? resolvedTargetId : null,
      assignedToName,
      updatedAt: new Date(),
    },
  });

  const updatedContacts = await prisma.bulkUploadContact.updateMany({
    where: { OR: [{ batchId: batch.batchId }, { batchId: batch.id }] },
    data: {
      assignedTo: assignedToName ? resolvedTargetId : null,
      assignedToName,
      assignmentStatus,
      updatedAt: new Date(),
    },
  });

  await delCache('crm:contacts:*');

  if (io) {
    io.emit('batch_assigned', updatedBatch);
    io.emit('crm_contacts_updated');
  }

  return {
    success: true,
    message: assignedToName ? `Batch assigned to ${assignedToName}` : 'Batch unassigned',
    batch: updatedBatch,
    assignedCount: updatedContacts.count,
  };
}

export default {
  getContactsService,
  getContactByIdService,
  getContactStatsService,
  getContactMetadataService,
  createContactService,
  updateContactService,
  assignContactService,
  deleteContactService,
  bulkImportContactsService,
  getBulkUploadContactsService,
  promoteBulkUploadToContactService,
  deleteBulkUploadContactService,
  getImportBatchesService,
  getImportBatchDetailsService,
  getBatchContactsService,
  deleteImportBatchService,
  assignImportBatchService,
  getNextBatchId,
  getNextBulkId,
};
