import { prisma } from '../config/prisma.js';
import { delCache } from '../config/redis.js';
import { LeadModel } from '../models/lead.model.js';
import {
  generateLeadId,
  buildLeadFilterQuery,
  formatLeadResponse,
  generateNegotiationId,
  formatNegotiationResponse,
  generateContractId,
  formatContractResponse,
  buildContractFilterQuery,
} from '../utils/lead.util.js';
import { recordActivity } from './activity.service.js';
import {
  resolveUserScope,
  buildLeadScopeFilter,
  isRecordAccessible,
} from '../middlewares/permission.middleware.js';

/**
 * 1. List leads with search, filters, pagination, and sorting
 */
/**
 * Computes accurate effective timestamp for an activity item based on its business date and time
 */
export function getActivityEffectiveTime(item) {
  if (item && item.date) {
    try {
      const datePart = String(item.date).trim().slice(0, 10);
      let timePart = '12:00:00';
      if (item.time) {
        const tStr = String(item.time).trim();
        const match12 = tStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
        if (match12) {
          let h = parseInt(match12[1], 10);
          const m = match12[2];
          const s = match12[3] || '00';
          const meridiem = (match12[4] || '').toUpperCase();
          if (meridiem === 'PM' && h < 12) h += 12;
          if (meridiem === 'AM' && h === 12) h = 0;
          timePart = `${String(h).padStart(2, '0')}:${m}:${s}`;
        } else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(tStr)) {
          timePart = tStr;
        }
      }
      const combined = new Date(`${datePart}T${timePart}`);
      if (!isNaN(combined.getTime())) {
        return combined.getTime();
      }
    } catch (_) {}
  }
  return item && item.createdAt ? new Date(item.createdAt).getTime() : 0;
}

/**
 * Helper to attach the most recent activity summary to each lead
 */
export async function attachLastActivityToLeads(leads = []) {
  if (!leads || leads.length === 0) return [];

  const leadIds = leads.map((l) => l.id).filter(Boolean);
  const leadCodes = leads.map((l) => l.leadId).filter(Boolean);
  const leadPhones = leads
    .map((l) => (l.phone ? String(l.phone).replace(/\D/g, '') : null))
    .filter(Boolean);
  const leadEmails = leads
    .map((l) => (l.email ? String(l.email).toLowerCase().trim() : null))
    .filter(Boolean);
  const allIdentifiers = Array.from(new Set([...leadIds, ...leadCodes]));

  let linkedContacts = [];
  try {
    linkedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { internalReference: { in: leadCodes } },
          { id: { in: leadIds } },
          { contactId: { in: leadCodes } },
          ...(leadPhones.length > 0 ? [{ phone: { in: leadPhones } }] : []),
          ...(leadEmails.length > 0
            ? [{ email: { in: leadEmails, mode: 'insensitive' } }]
            : []),
        ],
      },
      select: {
        id: true,
        contactId: true,
        phone: true,
        email: true,
        internalReference: true,
        contactMode: true,
        nextFollowDate: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    console.warn('[attachLastActivityToLeads Notice]:', err.message);
  }

  const allContactIds = Array.from(
    new Set(linkedContacts.flatMap((c) => [c.id, c.contactId]).filter(Boolean))
  );

  let activities = [];
  let meetings = [];
  let callLogs = [];

  try {
    [activities, meetings, callLogs] = await Promise.all([
      prisma.activity.findMany({
        where: {
          OR: [
            { leadId: { in: allIdentifiers } },
            { leadCode: { in: leadCodes } },
            ...(allContactIds.length > 0 ? [{ contactId: { in: allContactIds } }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }).catch(() => []),
      prisma.scheduledMeeting.findMany({
        where: {
          OR: [
            { leadId: { in: allIdentifiers } },
            ...(allContactIds.length > 0 ? [{ contactId: { in: allContactIds } }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }).catch(() => []),
      prisma.callLog.findMany({
        where: {
          OR: [
            { leadId: { in: allIdentifiers } },
            ...(allContactIds.length > 0 ? [{ contactId: { in: allContactIds } }] : []),
            ...(leadPhones.length > 0 ? [{ phoneNumber: { in: leadPhones } }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }).catch(() => []),
    ]);
  } catch (err) {
    console.warn('[attachLastActivityToLeads Notice]:', err.message);
  }

  return leads.map((lead) => {
    const lIds = new Set([lead.id, lead.leadId].filter(Boolean));
    const cleanLeadPhone = lead.phone ? String(lead.phone).replace(/\D/g, '') : '';
    const cleanLeadEmail = lead.email ? String(lead.email).toLowerCase().trim() : '';

    const matchedContactIds = new Set();
    linkedContacts.forEach((c) => {
      const match =
        (c.internalReference && (c.internalReference === lead.leadId || c.internalReference === lead.id)) ||
        (c.id === lead.id) ||
        (c.contactId === lead.leadId) ||
        (cleanLeadPhone && c.phone && String(c.phone).replace(/\D/g, '') === cleanLeadPhone) ||
        (cleanLeadEmail && c.email && String(c.email).toLowerCase().trim() === cleanLeadEmail);

      if (match) {
        if (c.id) {
          lIds.add(c.id);
          matchedContactIds.add(c.id);
        }
        if (c.contactId) {
          lIds.add(c.contactId);
          matchedContactIds.add(c.contactId);
        }
      }
    });

    const candidateItems = [];

    activities
      .filter((a) => {
        if (a.leadId && lIds.has(a.leadId)) return true;
        if (a.leadCode && lIds.has(a.leadCode)) return true;
        if (a.contactId && (lIds.has(a.contactId) || matchedContactIds.has(a.contactId))) return true;
        return false;
      })
      .forEach((a) => {
        const meta = typeof a.metadata === 'object' && a.metadata !== null ? a.metadata : {};
        const direction = meta.emailType || meta.messageType || meta.callType || (a.type === 'call' ? 'Outgoing' : 'Outgoing');
        const followUpDate = meta.nextFollowDate || meta.followUpDate || null;

        candidateItems.push({
          type: a.type || 'activity',
          title: a.title || 'Activity Logged',
          status: a.status || null,
          direction: direction || 'Outgoing',
          followUpDate: followUpDate || null,
          date: a.activityDate || null,
          time: a.activityTime || null,
          performedBy: a.performedBy || null,
          createdAt: a.createdAt,
        });
      });

    meetings
      .filter((m) => {
        if (m.leadId && lIds.has(m.leadId)) return true;
        if (m.contactId && (lIds.has(m.contactId) || matchedContactIds.has(m.contactId))) return true;
        return false;
      })
      .forEach((m) => {
        let followUpDate = null;
        if (/follow/i.test(m.status || '')) {
          const matchedContact = linkedContacts.find(c => (matchedContactIds.has(c.id) || matchedContactIds.has(c.contactId)) && c.nextFollowDate);
          if (matchedContact) followUpDate = matchedContact.nextFollowDate;
        }

        candidateItems.push({
          type: 'meeting',
          title: m.title ? `Meeting: ${m.title}` : 'Scheduled Meeting',
          meetingTitle: m.title || 'Meeting',
          status: m.status || 'Scheduled',
          direction: null,
          followUpDate: followUpDate || null,
          date: m.meetingDate || null,
          time: m.startTime || null,
          performedBy: m.employeeName || null,
          createdAt: m.createdAt,
        });
      });

    callLogs
      .filter((c) => {
        if (c.leadId && lIds.has(c.leadId)) return true;
        if (c.contactId && (lIds.has(c.contactId) || matchedContactIds.has(c.contactId))) return true;
        if (cleanLeadPhone && c.phoneNumber && String(c.phoneNumber).replace(/\D/g, '') === cleanLeadPhone) return true;
        return false;
      })
      .forEach((c) => {
        let followUpDate = null;
        if (/follow/i.test(c.status || '')) {
          const matchedContact = linkedContacts.find(con => (matchedContactIds.has(con.id) || matchedContactIds.has(con.contactId)) && con.nextFollowDate);
          if (matchedContact) followUpDate = matchedContact.nextFollowDate;
        }

        candidateItems.push({
          type: 'call',
          title: c.callType ? `${c.callType} Call` : 'Call Log',
          status: c.status || 'Completed',
          direction: c.callType || 'Outgoing',
          followUpDate: followUpDate || null,
          date: c.callDate || null,
          time: c.callTime || null,
          performedBy: c.employeeName || null,
          createdAt: c.createdAt,
        });
      });

    candidateItems.sort((a, b) => {
      const diff = getActivityEffectiveTime(b) - getActivityEffectiveTime(a);
      if (diff !== 0) return diff;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const lastActivity = candidateItems[0] || {
      type: 'lead_created',
      title: 'Lead Created',
      status: 'New',
      direction: null,
      followUpDate: null,
      date: lead.createdAt ? new Date(lead.createdAt).toISOString().slice(0, 10) : null,
      performedBy: lead.createdByName || 'Admin',
      createdAt: lead.createdAt,
    };

    if (lastActivity && (/follow/i.test(lastActivity.status || '') || /follow/i.test(lastActivity.title || '')) && !lastActivity.followUpDate) {
      const contactWithFollowUp = linkedContacts.find((c) => {
        const isMatched =
          matchedContactIds.has(c.id) ||
          matchedContactIds.has(c.contactId) ||
          lIds.has(c.id) ||
          lIds.has(c.contactId) ||
          lIds.has(c.internalReference) ||
          (cleanLeadPhone && c.phone && String(c.phone).replace(/\D/g, '').endsWith(cleanLeadPhone.slice(-10))) ||
          (cleanLeadEmail && c.email && String(c.email).toLowerCase().trim() === cleanLeadEmail);
        return isMatched && c.nextFollowDate;
      });
      if (contactWithFollowUp) {
        lastActivity.followUpDate = contactWithFollowUp.nextFollowDate;
      } else {
        const actWithFollowUp = activities.find(
          (a) => (lIds.has(a.leadId) || lIds.has(a.leadCode) || matchedContactIds.has(a.contactId)) &&
                 a.metadata && (a.metadata.nextFollowDate || a.metadata.followUpDate)
        );
        if (actWithFollowUp) {
          lastActivity.followUpDate = actWithFollowUp.metadata.nextFollowDate || actWithFollowUp.metadata.followUpDate;
        }
      }
    }

    return {
      ...lead,
      nextFollowDate: lastActivity?.followUpDate || null,
      lastActivity,
    };
  });
}

export async function getLeadsService(queryParams = {}, currentUser = null) {
  const {
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = buildLeadFilterQuery(queryParams);

  // Enforce role-based Data Scope (Own / All)
  if (currentUser) {
    const userScope = await resolveUserScope(currentUser, 'leads');
    const scopeFilter = buildLeadScopeFilter(userScope);
    if (scopeFilter) {
      where.AND = where.AND || [];
      where.AND.push(scopeFilter);
    }
  }

  const validSortFields = ['createdAt', 'updatedAt', 'name', 'companyName', 'status', 'stage'];
  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const finalSortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { [finalSortBy]: finalSortOrder },
      skip,
      take: limitNum,
    }),
  ]);

  const enrichedLeads = await attachLastActivityToLeads(leads);

  return {
    data: enrichedLeads.map(formatLeadResponse),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * 2. Get Single Lead by ID
 */
export async function getLeadByIdService(id, currentUser = null) {
  let lead = await prisma.lead.findFirst({
    where: {
      OR: [{ id }, { leadId: id }],
    },
  });

  if (!lead && typeof id === 'string' && (id.startsWith('BLK-') || id.startsWith('CNT-'))) {
    const contactOrBulk =
      (await prisma.contact.findFirst({
        where: { OR: [{ id }, { contactId: id }, { internalReference: id }] },
      })) ||
      (await prisma.bulkUploadContact.findFirst({
        where: { OR: [{ id }, { bulkId: id }] },
      }));

    if (contactOrBulk) {
      const cleanPhone = contactOrBulk.phone ? contactOrBulk.phone.replace(/\D/g, '') : null;
      lead = await prisma.lead.findFirst({
        where: {
          OR: [
            ...(contactOrBulk.email ? [{ email: { equals: contactOrBulk.email.trim(), mode: 'insensitive' } }] : []),
            ...(cleanPhone ? [{ phone: { contains: cleanPhone } }] : []),
            ...(contactOrBulk.name ? [{ name: { equals: contactOrBulk.name.trim(), mode: 'insensitive' } }] : []),
          ],
        },
      });
    }
  }

  if (!lead) {
    const error = new Error('Lead not found');
    error.status = 404;
    throw error;
  }

  if (currentUser) {
    const userScope = await resolveUserScope(currentUser, 'leads');
    if (!isRecordAccessible(lead, userScope)) {
      const error = new Error('Access denied: You do not have permission to access this lead.');
      error.status = 403;
      throw error;
    }
  }

  const [enrichedLead] = await attachLastActivityToLeads([lead]);
  return { data: formatLeadResponse(enrichedLead) };
}

/**
 * 3. Get Lead KPI Stats
 */
export async function getLeadStatsService(currentUser = null) {
  let baseWhere = {};

  if (currentUser) {
    const userScope = await resolveUserScope(currentUser, 'leads');
    const scopeFilter = buildLeadScopeFilter(userScope);
    if (scopeFilter) {
      baseWhere = scopeFilter;
    }
  }

  const [total, newCount, inProgress, won, lost] = await Promise.all([
    prisma.lead.count({ where: baseWhere }),
    prisma.lead.count({ where: { ...baseWhere, status: 'New' } }),
    prisma.lead.count({ where: { ...baseWhere, status: { in: ['In Progress', 'Contacted', 'Qualified', 'Active'] } } }),
    prisma.lead.count({ where: { ...baseWhere, status: { in: ['Won', 'Closed Won', 'Completed', 'Complete'] } } }),
    prisma.lead.count({ where: { ...baseWhere, status: { in: ['Lost', 'Disqualified'] } } }),
  ]);

  return {
    stats: {
      total,
      new: newCount,
      inProgress,
      won,
      completed: won,
      complete: won,
      lost,
    },
  };
}

/**
 * 4. Get Lead Dropdown Metadata
 */
export async function getLeadMetadataService() {
  const metadata = await LeadModel.getDynamicMetadata();
  return { metadata };
}

/**
 * 5. Create Lead
 */
export async function createLeadService(body, currentUser = null) {
  const {
    name,
    email,
    phone,
    contactType = 'Individual',
    profession,
    companyName,
    designation,
    address,
    source = 'Website',
    customSource,
    category = 'Service',
    productList = [],
    serviceList = [],
    status = 'New',
    stage = 'Initialization',
    priority = 'Medium',
    tagPriority,
    tag,
    assignedTo = null,
    assignedToName = null,
    createdBy = null,
    createdByName = null,
  } = body;

  if (!name || !name.trim()) {
    const error = new Error('Lead name is mandatory');
    error.status = 400;
    throw error;
  }

  // Resolve assigned employee details if assignedTo provided
  let finalAssignedTo = assignedTo ? String(assignedTo).trim() : null;
  let finalAssignedToName = assignedToName ? String(assignedToName).trim() : null;

  if (finalAssignedTo && (!finalAssignedToName || finalAssignedToName === 'null' || finalAssignedToName === '')) {
    const emp = await prisma.employee.findFirst({
      where: {
        OR: [{ id: finalAssignedTo }, { empCode: finalAssignedTo }],
      },
    });
    if (emp) {
      finalAssignedTo = emp.id;
      finalAssignedToName = emp.name;
    }
  }

  // Resolve creator details
  const finalCreatedBy = createdBy || currentUser?.id || currentUser?.email || 'admin';
  const finalCreatedByName = createdByName || currentUser?.name || 'Super Admin';

  const count = await prisma.lead.count();
  const leadId = generateLeadId(count);

  const newLead = await prisma.lead.create({
    data: {
      leadId,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      contactType: contactType || 'Individual',
      profession: profession?.trim() || null,
      companyName: companyName?.trim() || null,
      designation: designation?.trim() || null,
      address: address?.trim() || null,
      source: source || 'Website',
      customSource: customSource?.trim() || null,
      category: category || 'Service',
      productList: Array.isArray(productList) ? productList : [],
      serviceList: Array.isArray(serviceList) ? serviceList : [],
      status: status || 'New',
      stage: stage || 'Initialization',
      priority: (body.priority || body.tagPriority || body.tag || priority || 'Medium').trim(),
      assignedTo: finalAssignedTo,
      assignedToName: finalAssignedToName,
      createdBy: finalCreatedBy,
      createdByName: finalCreatedByName,
    },
  });

  await delCache('crm:leads:*').catch(() => {});

  return {
    message: 'Lead created successfully',
    data: formatLeadResponse(newLead),
  };
}

/**
 * 6. Update Lead
 */
export async function updateLeadService(id, body, currentUser = null) {
  let existing = await prisma.lead.findFirst({
    where: { OR: [{ id }, { leadId: id }] },
  });

  if (!existing && typeof id === 'string' && (id.startsWith('BLK-') || id.startsWith('CNT-'))) {
    const contactOrBulk =
      (await prisma.contact.findFirst({
        where: { OR: [{ id }, { contactId: id }, { internalReference: id }] },
      })) ||
      (await prisma.bulkUploadContact.findFirst({
        where: { OR: [{ id }, { bulkId: id }] },
      }));

    if (contactOrBulk) {
      const cleanPhone = contactOrBulk.phone ? contactOrBulk.phone.replace(/\D/g, '') : null;
      existing = await prisma.lead.findFirst({
        where: {
          OR: [
            ...(contactOrBulk.email ? [{ email: { equals: contactOrBulk.email.trim(), mode: 'insensitive' } }] : []),
            ...(cleanPhone ? [{ phone: { contains: cleanPhone } }] : []),
            ...(contactOrBulk.name ? [{ name: { equals: contactOrBulk.name.trim(), mode: 'insensitive' } }] : []),
          ],
        },
      });
    }
  }

  if (!existing) {
    const error = new Error('Lead not found');
    error.status = 404;
    throw error;
  }

  if (currentUser) {
    const userScope = await resolveUserScope(currentUser, 'leads');
    if (!isRecordAccessible(existing, userScope)) {
      const error = new Error('Access denied: You do not have permission to edit this lead.');
      error.status = 403;
      throw error;
    }
  }

  const {
    name,
    email,
    phone,
    contactType,
    profession,
    companyName,
    designation,
    address,
    source,
    customSource,
    category,
    productList,
    serviceList,
    status,
    stage,
    assignedTo,
    assignedToName,
    createdBy,
    createdByName,
  } = body;

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (email !== undefined) updateData.email = email ? email.trim() : null;
  if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
  if (contactType !== undefined) updateData.contactType = contactType;
  if (profession !== undefined) updateData.profession = profession ? profession.trim() : null;
  if (companyName !== undefined) updateData.companyName = companyName ? companyName.trim() : null;
  if (designation !== undefined) updateData.designation = designation ? designation.trim() : null;
  if (address !== undefined) updateData.address = address ? address.trim() : null;
  if (source !== undefined) updateData.source = source;
  if (customSource !== undefined) updateData.customSource = customSource ? customSource.trim() : null;
  if (category !== undefined) updateData.category = category;
  if (productList !== undefined) updateData.productList = Array.isArray(productList) ? productList : [];
  if (serviceList !== undefined) updateData.serviceList = Array.isArray(serviceList) ? serviceList : [];
  if (status !== undefined) updateData.status = status;
  if (stage !== undefined) updateData.stage = stage;
  if (createdBy !== undefined) updateData.createdBy = createdBy;
  if (createdByName !== undefined) updateData.createdByName = createdByName;
  if (body.priority !== undefined || body.tagPriority !== undefined || body.tag !== undefined) {
    const rawP = body.priority ?? body.tagPriority ?? body.tag;
    updateData.priority = rawP ? String(rawP).trim() : 'Medium';
  }

  if (assignedTo !== undefined) {
    if (assignedTo && assignedTo !== 'null' && assignedTo !== 'Unassigned') {
      updateData.assignedTo = String(assignedTo).trim();
      let resName = assignedToName ? String(assignedToName).trim() : null;
      if (!resName) {
        const emp = await prisma.employee.findFirst({
          where: { OR: [{ id: updateData.assignedTo }, { empCode: updateData.assignedTo }] },
        });
        if (emp) resName = emp.name;
      }
      updateData.assignedToName = resName;
    } else {
      updateData.assignedTo = null;
      updateData.assignedToName = null;
    }
  } else if (assignedToName !== undefined) {
    updateData.assignedToName = assignedToName ? String(assignedToName).trim() : null;
  }

  const updated = await prisma.lead.update({
    where: { id: existing.id },
    data: updateData,
  });

  if (updateData.priority) {
    try {
      await prisma.contact.updateMany({
        where: {
          OR: [
            { id: existing.id },
            { contactId: existing.leadId },
            { internalReference: existing.leadId },
            ...(existing.phone ? [{ phone: existing.phone }] : []),
            ...(existing.email ? [{ email: { equals: existing.email, mode: 'insensitive' } }] : []),
          ],
        },
        data: { priority: updateData.priority, updatedAt: new Date() },
      });
      await prisma.bulkUploadContact.updateMany({
        where: {
          OR: [
            { bulkId: existing.leadId },
            ...(existing.phone ? [{ phone: existing.phone }] : []),
            ...(existing.email ? [{ email: { equals: existing.email, mode: 'insensitive' } }] : []),
          ],
        },
        data: { priority: updateData.priority, updatedAt: new Date() },
      });
    } catch (tagSyncErr) {
      console.warn('[updateLeadService] Failed to sync priority to contact:', tagSyncErr.message);
    }
  }

  // Record status or stage change activity in timeline
  try {
    if (status !== undefined && status !== existing.status) {
      await recordActivity({
        type: 'status_change',
        title: `Status: ${status}`,
        description: `Lead status updated to ${status}.`,
        leadId: updated.id,
        leadCode: updated.leadId,
        leadName: updated.name,
        customerName: updated.companyName || updated.name,
        entityId: updated.id,
        entityType: 'Lead',
        entityNumber: updated.leadId,
        status: status,
        performedBy: currentUser?.name || updated.assignedToName || 'Staff',
        activityDate: new Date().toISOString().slice(0, 10),
      }).catch(() => {});
    } else if (stage !== undefined && stage !== existing.stage) {
      await recordActivity({
        type: 'stage_change',
        title: `Stage: ${stage}`,
        description: `Lead stage updated to ${stage}.`,
        leadId: updated.id,
        leadCode: updated.leadId,
        leadName: updated.name,
        customerName: updated.companyName || updated.name,
        entityId: updated.id,
        entityType: 'Lead',
        entityNumber: updated.leadId,
        status: updated.status,
        performedBy: currentUser?.name || updated.assignedToName || 'Staff',
        activityDate: new Date().toISOString().slice(0, 10),
      }).catch(() => {});
    }
  } catch (_) {}

  // If lead is closed or won, automatically record or update closure activity in timeline
  try {
    const sLow = (updated.status || '').toLowerCase();
    const stgLow = (updated.stage || '').toLowerCase();
    if (sLow.includes('won') || sLow.includes('closed') || sLow.includes('completed') || stgLow.includes('completed') || stgLow.includes('closure')) {
      const existingClosure = await prisma.activity.findFirst({
        where: {
          leadId: updated.id,
          type: 'closure',
        },
      });
      if (existingClosure) {
        await prisma.activity.update({
          where: { id: existingClosure.id },
          data: {
            status: updated.status,
            description: `Status: ${updated.status} · Reason: ${sLow.includes('won') ? 'Successful conversion' : 'Lead completed/closed'} · Client: ${updated.companyName || updated.name} (By ${updated.assignedToName || currentUser?.name || 'Staff'})`,
          },
        });
      } else {
        await recordActivity({
          type: 'closure',
          title: 'Lead Closed',
          description: `Status: ${updated.status} · Reason: ${sLow.includes('won') ? 'Successful conversion' : 'Lead completed/closed'} · Client: ${updated.companyName || updated.name} (By ${updated.assignedToName || currentUser?.name || 'Staff'})`,
          leadId: updated.id,
          leadCode: updated.leadId,
          leadName: updated.name,
          customerName: updated.companyName || updated.name,
          entityId: updated.id,
          entityType: 'Lead',
          entityNumber: updated.leadId,
          status: updated.status,
          performedBy: updated.assignedToName || currentUser?.name || 'Staff',
          activityDate: new Date().toISOString().slice(0, 10),
        });
      }
    }
  } catch (_) {}

  await delCache('crm:leads:*').catch(() => {});

  return {
    message: 'Lead updated successfully',
    data: formatLeadResponse(updated),
  };
}

/**
 * 7. Delete Lead
 */
export async function deleteLeadService(id, currentUser = null) {
  const existing = await prisma.lead.findFirst({
    where: { OR: [{ id }, { leadId: id }] },
  });

  if (!existing) {
    const error = new Error('Lead not found');
    error.status = 404;
    throw error;
  }

  if (currentUser) {
    const userScope = await resolveUserScope(currentUser, 'leads');
    if (!isRecordAccessible(existing, userScope)) {
      const error = new Error('Access denied: You do not have permission to delete this lead.');
      error.status = 403;
      throw error;
    }
  }

  await prisma.lead.delete({
    where: { id: existing.id },
  });

  // Clean up any activity timeline records referencing this lead
  await prisma.activity.deleteMany({
    where: {
      OR: [
        { leadId: existing.id },
        { leadId: existing.leadId },
        { leadCode: existing.leadId },
      ],
    },
  }).catch(() => {});

  await delCache('crm:leads:*').catch(() => {});

  return {
    message: 'Lead deleted successfully',
    id: existing.id,
    leadId: existing.leadId,
  };
}

/**
 * 8. GET ALL PROPOSALS (Inside Lead Module)
 */
export async function getLeadProposalsService(query = {}) {
  const { leadId, search, status } = query;
  const where = {};

  if (leadId && leadId !== 'All') {
    where.leadId = leadId;
  }

  if (status && status !== 'All') {
    where.status = status;
  }

  if (search) {
    const q = search.trim();
    where.OR = [
      { proposalNumber: { contains: q, mode: 'insensitive' } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { companyName: { contains: q, mode: 'insensitive' } },
      { title: { contains: q, mode: 'insensitive' } },
    ];
  }

  const proposals = await prisma.proposal.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  return proposals;
}
export const getProposalsService = getLeadProposalsService;

/**
 * 9. GET SINGLE PROPOSAL BY ID
 */
export async function getLeadProposalByIdService(id) {
  const proposal = await prisma.proposal.findFirst({
    where: {
      OR: [{ id }, { proposalNumber: id }],
    },
    include: { items: true },
  });

  if (!proposal) {
    const err = new Error('Proposal not found.');
    err.status = 404;
    throw err;
  }

  return proposal;
}
export const getProposalByIdService = getLeadProposalByIdService;

/**
 * 10. CREATE NEW PROPOSAL
 */
export async function createLeadProposalService(data, user) {
  const year = new Date().getFullYear();
  const count = await prisma.proposal.count();
  const nextNum = 1001 + count;
  const proposalNumber = data.proposalNumber || `PROP-${year}-${nextNum}`;

  const proposal = await prisma.proposal.create({
    data: {
      proposalNumber,
      leadId: data.leadId || null,
      contactId: data.contactId || null,
      contactName: data.contactName || '',
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      companyName: data.companyName || null,
      clientGst: data.clientGst || null,
      clientAddress: data.clientAddress || null,
      title: data.title || null,
      proposalDate: data.proposalDate || data.issueDate || new Date().toISOString().split('T')[0],
      validUntil: data.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: data.status || 'Draft',
      currency: data.currency || 'INR (₹)',
      subtotal: Number(data.subtotal) || Number(data.totalAmount) || 0,
      totalAmount: Number(data.totalAmount) || Number(data.subtotal) || 0,
      grandTotal: Number(data.grandTotal) || Number(data.totalAmount) || 0,
      discountPercent: Number(data.discountPercent) || 0,
      taxPercent: Number(data.taxPercent) || 0,
      paymentTerms: data.paymentTerms || 'Net 30 Days',
      documentName: data.documentName || null,
      documentUrl: data.documentUrl || null,
      documentSize: data.documentSize || null,
      notes: data.notes || null,
      terms: data.terms || data.termsConditions || null,
      rejectionReason: data.rejectionReason || null,
      items: {
        create: (data.items || []).map((it) => ({
          itemName: it.itemName || it.description || 'Deliverable',
          description: it.description || null,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          totalAmount: Number(it.totalAmount) || Number(it.total) || 0,
        })),
      },
    },
    include: { items: true },
  });

  // Automatically record activity in timeline
  try {
    const amountStr = proposal.grandTotal ? ` · ₹ ${Math.round(proposal.grandTotal).toLocaleString('en-IN')}` : '';
    await recordActivity({
      type: 'proposal',
      title: 'Proposal Created',
      description: `Proposal #${proposal.proposalNumber}${amountStr} · ${proposal.status || 'Under Review'}`,
      leadId: proposal.leadId,
      customerName: proposal.companyName || proposal.contactName,
      entityId: proposal.id,
      entityType: 'Proposal',
      entityNumber: proposal.proposalNumber,
      amount: proposal.grandTotal || 0,
      status: proposal.status || 'Created',
      performedBy: user?.name || 'Staff',
      activityDate: proposal.proposalDate,
    });
  } catch (_) {}

  return proposal;
}
export const createProposalService = createLeadProposalService;

/**
 * 11. UPDATE PROPOSAL
 */
export async function updateLeadProposalService(id, data, user) {
  let existing = await prisma.proposal.findFirst({
    where: {
      OR: [{ id }, { proposalNumber: id }],
    },
  });

  if (!existing) {
    // If not found in DB but lead context is provided, auto-create it gracefully
    if (data.leadId || data.companyName || data.contactName) {
      return createLeadProposalService(
        {
          ...data,
          proposalNumber: id && !id.startsWith('prop-') ? id : undefined,
        },
        user
      );
    }
    const err = new Error('Proposal not found.');
    err.status = 404;
    throw err;
  }

  const updateData = {};
  if (data.contactName !== undefined) updateData.contactName = data.contactName;
  if (data.companyName !== undefined) updateData.companyName = data.companyName;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
  if (data.clientGst !== undefined) updateData.clientGst = data.clientGst;
  if (data.clientAddress !== undefined) updateData.clientAddress = data.clientAddress;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.proposalDate || data.issueDate) updateData.proposalDate = data.proposalDate || data.issueDate;
  if (data.validUntil) updateData.validUntil = data.validUntil;
  if (data.status) updateData.status = data.status;
  if (data.currency) updateData.currency = data.currency;
  if (data.subtotal !== undefined) updateData.subtotal = Number(data.subtotal);
  if (data.totalAmount !== undefined) updateData.totalAmount = Number(data.totalAmount);
  if (data.grandTotal !== undefined) updateData.grandTotal = Number(data.grandTotal);
  if (data.discountPercent !== undefined) updateData.discountPercent = Number(data.discountPercent);
  if (data.taxPercent !== undefined) updateData.taxPercent = Number(data.taxPercent);
  if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
  if (data.documentName !== undefined) updateData.documentName = data.documentName;
  if (data.documentUrl !== undefined) updateData.documentUrl = data.documentUrl;
  if (data.documentSize !== undefined) updateData.documentSize = data.documentSize;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;
  if (data.terms !== undefined || data.termsConditions !== undefined) {
    updateData.terms = data.terms !== undefined ? data.terms : data.termsConditions;
  }

  if (Array.isArray(data.items)) {
    await prisma.proposalItem.deleteMany({ where: { proposalId: existing.id } });
    updateData.items = {
      create: data.items.map((it) => ({
        itemName: it.itemName || it.description || 'Deliverable',
        description: it.description || null,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        totalAmount: Number(it.totalAmount) || Number(it.total) || 0,
      })),
    };
  }

  const updated = await prisma.proposal.update({
    where: { id: existing.id },
    data: updateData,
    include: { items: true },
  });

  try {
    await prisma.activity.updateMany({
      where: {
        OR: [
          { entityId: updated.id },
          { entityNumber: updated.proposalNumber },
        ],
      },
      data: {
        status: updated.status || 'Created',
        amount: updated.grandTotal || updated.totalAmount || 0,
      },
    });
  } catch (_) {}

  return updated;
}
export const updateProposalService = updateLeadProposalService;

/**
 * 12. DELETE PROPOSAL
 */
export async function deleteLeadProposalService(id) {
  const existing = await prisma.proposal.findFirst({
    where: {
      OR: [{ id }, { proposalNumber: id }],
    },
  });

  if (!existing) {
    const err = new Error('Proposal not found.');
    err.status = 404;
    throw err;
  }

  await prisma.proposal.delete({
    where: { id: existing.id },
  });

  return { id: existing.id, proposalNumber: existing.proposalNumber };
}
export const deleteProposalService = deleteLeadProposalService;

// =============================================================================
// NEGOTIATIONS (Inside Lead Service)
// =============================================================================

/**
 * 13. GET ALL NEGOTIATIONS
 */
export async function getLeadNegotiationsService(queryParams = {}) {
  const {
    search,
    status,
    leadId,
    contactId,
    assignedTo,
    date,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams;

  const where = {};

  if (status && status !== 'ALL' && status !== 'All') {
    where.status = { equals: status, mode: 'insensitive' };
  }

  if (leadId && leadId !== 'ALL' && leadId !== 'All') {
    where.leadId = leadId;
  }
  if (contactId && contactId !== 'ALL' && contactId !== 'All') {
    where.contactId = contactId;
  }

  if (assignedTo && assignedTo !== 'ALL' && assignedTo !== 'All') {
    where.OR = [
      { assignedTo },
      { assignedToName: { contains: assignedTo, mode: 'insensitive' } },
    ];
  }

  if (date) {
    where.negotiationDate = date;
  } else if (startDate && endDate) {
    where.negotiationDate = {
      gte: startDate,
      lte: endDate,
    };
  }

  if (search && search.trim()) {
    const q = search.trim();
    const searchConditions = [
      { negotiationId: { contains: q, mode: 'insensitive' } },
      { leadName: { contains: q, mode: 'insensitive' } },
      { clientName: { contains: q, mode: 'insensitive' } },
      { quotationNumber: { contains: q, mode: 'insensitive' } },
      { proposalNumber: { contains: q, mode: 'insensitive' } },
      { assignedToName: { contains: q, mode: 'insensitive' } },
      { paymentTerms: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
      { clientRequirements: { contains: q, mode: 'insensitive' } },
    ];

    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchConditions }];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * pageSize;

  const validSortFields = [
    'negotiationId',
    'negotiationDate',
    'quotedAmount',
    'expectedFinalAmount',
    'discountPercentage',
    'status',
    'nextFollowUpDate',
    'createdAt',
    'updatedAt',
  ];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const orderDir = sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [records, total] = await Promise.all([
    prisma.negotiation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [orderField]: orderDir },
    }),
    prisma.negotiation.count({ where }),
  ]);

  return {
    data: records.map(formatNegotiationResponse),
    pagination: {
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}
export const getNegotiationsService = getLeadNegotiationsService;

/**
 * 14. GET NEGOTIATION STATS
 */
export async function getLeadNegotiationStatsService() {
  const [all, inProgress, awaitingClient, revisedQuotation, won, lost] = await Promise.all([
    prisma.negotiation.findMany({
      select: { quotedAmount: true, expectedFinalAmount: true, status: true },
    }),
    prisma.negotiation.count({ where: { status: { equals: 'In Progress', mode: 'insensitive' } } }),
    prisma.negotiation.count({ where: { status: { equals: 'Awaiting Client', mode: 'insensitive' } } }),
    prisma.negotiation.count({ where: { status: { equals: 'Revised Quotation', mode: 'insensitive' } } }),
    prisma.negotiation.count({ where: { status: { equals: 'Won', mode: 'insensitive' } } }),
    prisma.negotiation.count({ where: { status: { equals: 'Lost', mode: 'insensitive' } } }),
  ]);

  const totalQuotedValue = all.reduce((sum, item) => sum + (Number(item.quotedAmount) || 0), 0);
  const totalExpectedValue = all.reduce((sum, item) => sum + (Number(item.expectedFinalAmount) || 0), 0);

  return {
    total: all.length,
    inProgress,
    awaitingClient,
    revisedQuotation,
    won,
    lost,
    totalQuotedValue,
    totalExpectedValue,
  };
}
export const getNegotiationStatsService = getLeadNegotiationStatsService;

/**
 * 15. GET NEGOTIATION BY ID
 */
export async function getLeadNegotiationByIdService(id) {
  const record = await prisma.negotiation.findFirst({
    where: {
      OR: [{ id }, { negotiationId: id }],
    },
  });

  if (!record) {
    const error = new Error('Negotiation record not found');
    error.status = 404;
    throw error;
  }

  return formatNegotiationResponse(record);
}
export const getNegotiationByIdService = getLeadNegotiationByIdService;

/**
 * 16. CREATE NEGOTIATION
 */
export async function createLeadNegotiationService(data, user = {}) {
  const {
    negotiationId,
    leadId,
    leadName,
    clientName,
    contactId,
    quotationId,
    quotationNumber,
    proposalId,
    proposalNumber,
    assignedTo,
    assignedToName,
    negotiationDate,
    status = 'In Progress',
    quotedAmount = 0,
    expectedFinalAmount,
    discountPercentage = 0,
    paymentTerms = 'Milestone Based',
    scopeChanges = '',
    deliveryTimeline = '',
    clientRequirements = '',
    notes = '',
    nextFollowUpDate,
    lossReason = '',
  } = data;

  if (!leadName || !leadName.trim()) {
    const err = new Error('Lead / Client Name is required');
    err.status = 400;
    throw err;
  }

  if (!negotiationDate) {
    const err = new Error('Negotiation Date is required');
    err.status = 400;
    throw err;
  }

  // Conditional follow-up date validation: required when status is "Awaiting Client"
  if (status === 'Awaiting Client' && (!nextFollowUpDate || !nextFollowUpDate.trim())) {
    const err = new Error('Next Follow-up Date is required when status is Awaiting Client');
    err.status = 400;
    throw err;
  }

  const numQuoted = Math.max(0, parseFloat(quotedAmount) || 0);
  let numDiscountPct = Math.max(0, parseFloat(discountPercentage) || 0);
  let numExpected =
    expectedFinalAmount !== undefined && expectedFinalAmount !== null && expectedFinalAmount !== ''
      ? Math.max(0, parseFloat(expectedFinalAmount))
      : null;

  let calcDiscountAmount = 0;
  if (numExpected !== null && numExpected !== undefined && numQuoted > 0) {
    calcDiscountAmount = Math.max(0, numQuoted - numExpected);
    numDiscountPct = Math.round(((numQuoted - numExpected) / numQuoted) * 100);
  } else {
    calcDiscountAmount = (numQuoted * numDiscountPct) / 100;
    numExpected = Math.max(0, numQuoted - calcDiscountAmount);
  }

  const generatedId = await generateNegotiationId(prisma);

  const authorName = user?.name || assignedToName || 'System';
  const initialHistoryEntry = {
    id: `entry-${Date.now()}`,
    date: negotiationDate || new Date().toISOString().split('T')[0],
    author: authorName,
    topic: 'Negotiation Created',
    notes: notes?.trim() || `Negotiation initiated with status "${status}" at ₹${numExpected.toLocaleString('en-IN')}.`,
    status,
    createdAt: new Date().toISOString(),
  };

  const created = await prisma.negotiation.create({
    data: {
      negotiationId: (negotiationId && negotiationId.trim()) || generatedId,
      leadId: leadId || null,
      leadName: leadName.trim(),
      clientName: clientName?.trim() || leadName.trim(),
      contactId: contactId || null,
      quotationId: quotationId || null,
      quotationNumber: quotationNumber?.trim() || null,
      proposalId: proposalId || null,
      proposalNumber: proposalNumber?.trim() || null,
      assignedTo: assignedTo || null,
      assignedToName: assignedToName?.trim() || 'Admin Employee',
      negotiationDate,
      status,
      quotedAmount: numQuoted,
      expectedFinalAmount: numExpected,
      discountPercentage: numDiscountPct,
      discountAmount: calcDiscountAmount,
      paymentTerms: paymentTerms || 'Milestone Based',
      scopeChanges: scopeChanges?.trim() || null,
      deliveryTimeline: deliveryTimeline?.trim() || null,
      clientRequirements: clientRequirements?.trim() || null,
      notes: notes?.trim() || null,
      nextFollowUpDate: nextFollowUpDate ? nextFollowUpDate.trim() : null,
      discussionHistory: [initialHistoryEntry],
      lossReason: status === 'Lost' ? lossReason?.trim() || null : null,
    },
  });

  // Automatically record activity in timeline
  try {
    const quotedStr = created.quotedAmount ? ` · Quoted: ₹ ${Math.round(created.quotedAmount).toLocaleString('en-IN')}` : '';
    await recordActivity({
      type: 'negotiation',
      title: created.status === 'Won' ? 'Negotiation Won' : 'Negotiation Update',
      description: `Negotiation #${created.negotiationId}${quotedStr} · Discount: ${created.discountPercentage}% · ${created.status}`,
      leadId: created.leadId,
      customerName: created.clientName || created.leadName,
      entityId: created.id,
      entityType: 'Negotiation',
      entityNumber: created.negotiationId,
      amount: created.expectedFinalAmount || created.quotedAmount || 0,
      status: created.status,
      performedBy: created.assignedToName || user?.name || 'Staff',
      activityDate: created.negotiationDate,
    });
  } catch (_) {}

  return formatNegotiationResponse(created);
}
export const createNegotiationService = createLeadNegotiationService;

/**
 * 17. UPDATE NEGOTIATION
 */
export async function updateLeadNegotiationService(id, data, user = {}) {
  const existing = await prisma.negotiation.findFirst({
    where: {
      OR: [{ id }, { negotiationId: id }],
    },
  });

  if (!existing) {
    const error = new Error('Negotiation record not found');
    error.status = 404;
    throw error;
  }

  const {
    leadId,
    leadName,
    clientName,
    contactId,
    quotationId,
    quotationNumber,
    proposalId,
    proposalNumber,
    assignedTo,
    assignedToName,
    negotiationDate,
    status,
    quotedAmount,
    expectedFinalAmount,
    discountPercentage,
    paymentTerms,
    scopeChanges,
    deliveryTimeline,
    clientRequirements,
    notes,
    nextFollowUpDate,
    lossReason,
  } = data;

  const targetStatus = status !== undefined ? status : existing.status;

  if (targetStatus === 'Awaiting Client') {
    const checkDate = nextFollowUpDate !== undefined ? nextFollowUpDate : existing.nextFollowUpDate;
    if (!checkDate || !checkDate.trim()) {
      const err = new Error('Next Follow-up Date is required when status is Awaiting Client');
      err.status = 400;
      throw err;
    }
  }

  const numQuoted = quotedAmount !== undefined ? Math.max(0, parseFloat(quotedAmount) || 0) : existing.quotedAmount;
  let numDiscountPct =
    discountPercentage !== undefined
      ? Math.max(0, parseFloat(discountPercentage) || 0)
      : existing.discountPercentage;
  let numExpected =
    expectedFinalAmount !== undefined
      ? Math.max(0, parseFloat(expectedFinalAmount) || 0)
      : existing.expectedFinalAmount;

  let calcDiscountAmount = existing.discountAmount;
  if (expectedFinalAmount !== undefined && numQuoted > 0) {
    calcDiscountAmount = Math.max(0, numQuoted - numExpected);
    numDiscountPct = Math.round(((numQuoted - numExpected) / numQuoted) * 100);
  } else if (discountPercentage !== undefined && numQuoted > 0) {
    calcDiscountAmount = (numQuoted * numDiscountPct) / 100;
    numExpected = Math.max(0, numQuoted - calcDiscountAmount);
  }

  const finalFollowUpDate =
    nextFollowUpDate !== undefined
      ? nextFollowUpDate
        ? nextFollowUpDate.trim()
        : null
      : existing.nextFollowUpDate;

  const existingHistory = Array.isArray(existing.discussionHistory) ? existing.discussionHistory : [];
  let updatedHistory = existingHistory;

  if (notes && notes.trim() !== existing.notes) {
    const authorName = user?.name || assignedToName || existing.assignedToName || 'System';
    const newEntry = {
      id: `entry-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      author: authorName,
      topic: targetStatus !== existing.status ? `Status changed to ${targetStatus}` : 'Discussion Logged',
      notes: notes.trim(),
      status: targetStatus,
      createdAt: new Date().toISOString(),
    };
    updatedHistory = [newEntry, ...existingHistory];
  }

  const updatePayload = {
    ...(leadId !== undefined && { leadId }),
    ...(leadName !== undefined && { leadName: leadName.trim() }),
    ...(clientName !== undefined && { clientName: clientName.trim() }),
    ...(contactId !== undefined && { contactId }),
    ...(quotationId !== undefined && { quotationId }),
    ...(quotationNumber !== undefined && { quotationNumber: quotationNumber?.trim() || null }),
    ...(proposalId !== undefined && { proposalId }),
    ...(proposalNumber !== undefined && { proposalNumber: proposalNumber?.trim() || null }),
    ...(assignedTo !== undefined && { assignedTo }),
    ...(assignedToName !== undefined && { assignedToName: assignedToName.trim() }),
    ...(negotiationDate !== undefined && { negotiationDate }),
    ...(status !== undefined && { status }),
    quotedAmount: numQuoted,
    expectedFinalAmount: numExpected,
    discountPercentage: numDiscountPct,
    discountAmount: calcDiscountAmount,
    ...(paymentTerms !== undefined && { paymentTerms }),
    ...(scopeChanges !== undefined && { scopeChanges: scopeChanges?.trim() || null }),
    ...(deliveryTimeline !== undefined && { deliveryTimeline: deliveryTimeline?.trim() || null }),
    ...(clientRequirements !== undefined && { clientRequirements: clientRequirements?.trim() || null }),
    ...(notes !== undefined && { notes: notes?.trim() || null }),
    nextFollowUpDate: finalFollowUpDate,
    discussionHistory: updatedHistory,
    ...(lossReason !== undefined && { lossReason: lossReason?.trim() || null }),
  };

  const updated = await prisma.negotiation.update({
    where: { id: existing.id },
    data: updatePayload,
  });

  try {
    await prisma.activity.updateMany({
      where: {
        OR: [
          { entityId: updated.id },
          { entityNumber: updated.negotiationId },
        ],
      },
      data: {
        status: updated.status,
        amount: updated.expectedFinalAmount || updated.quotedAmount || 0,
        title: updated.status === 'Won' ? 'Negotiation Won' : 'Negotiation Update',
      },
    });
  } catch (_) {}

  return formatNegotiationResponse(updated);
}
export const updateNegotiationService = updateLeadNegotiationService;

/**
 * 18. DELETE NEGOTIATION
 */
export async function deleteLeadNegotiationService(id) {
  const existing = await prisma.negotiation.findFirst({
    where: {
      OR: [{ id }, { negotiationId: id }],
    },
  });

  if (!existing) {
    const error = new Error('Negotiation record not found');
    error.status = 404;
    throw error;
  }

  await prisma.negotiation.delete({
    where: { id: existing.id },
  });

  return { id: existing.id, negotiationId: existing.negotiationId };
}
export const deleteNegotiationService = deleteLeadNegotiationService;

/**
 * 19. LIST CONTRACTS (UNDER LEAD MODULE)
 */
export async function getLeadContractsService(queryParams = {}) {
  const {
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = buildContractFilterQuery(queryParams);

  const validSortFields = [
    'createdAt',
    'updatedAt',
    'contractDate',
    'startDate',
    'endDate',
    'contractValue',
    'title',
    'clientName',
    'status',
    'approvalStatus',
    'signatureStatus',
  ];
  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const finalSortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [total, records] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      orderBy: { [finalSortBy]: finalSortOrder },
      skip,
      take: limitNum,
    }),
  ]);

  return {
    data: records.map(formatContractResponse),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}
export const getContractsService = getLeadContractsService;

/**
 * 20. GET CONTRACT STATS
 */
export async function getLeadContractStatsService(leadId = null) {
  const where = leadId && leadId !== 'ALL' && leadId !== 'All' ? { leadId } : {};

  const [
    total,
    draft,
    pendingApproval,
    sentForSignature,
    partiallySigned,
    active,
    completed,
    expired,
    terminated,
    contracts,
  ] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.count({ where: { ...where, status: 'Draft' } }),
    prisma.contract.count({ where: { ...where, status: 'Pending Approval' } }),
    prisma.contract.count({ where: { ...where, status: 'Sent for Signature' } }),
    prisma.contract.count({ where: { ...where, status: 'Partially Signed' } }),
    prisma.contract.count({ where: { ...where, status: 'Active' } }),
    prisma.contract.count({ where: { ...where, status: 'Completed' } }),
    prisma.contract.count({ where: { ...where, status: 'Expired' } }),
    prisma.contract.count({ where: { ...where, status: 'Terminated' } }),
    prisma.contract.findMany({
      where,
      select: { contractValue: true },
    }),
  ]);

  const totalContractValue = contracts.reduce((acc, c) => acc + (Number(c.contractValue) || 0), 0);

  return {
    total,
    draft,
    pendingApproval,
    sentForSignature,
    partiallySigned,
    active,
    completed,
    expired,
    terminated,
    totalContractValue,
  };
}
export const getContractStatsService = getLeadContractStatsService;

/**
 * 21. GET CONTRACT BY ID
 */
export async function getLeadContractByIdService(id) {
  const record = await prisma.contract.findFirst({
    where: {
      OR: [{ id }, { contractId: id }],
    },
  });

  if (!record) {
    const error = new Error('Contract record not found');
    error.status = 404;
    throw error;
  }

  return formatContractResponse(record);
}
export const getContractByIdService = getLeadContractByIdService;

/**
 * 22. CREATE CONTRACT
 */
export async function createLeadContractService(data, user = {}) {
  const {
    contractId,
    title,
    contractType = 'Software Development',
    clientName,
    leadId,
    leadName,
    contactId,
    customerId,
    quotationId,
    quotationNumber,
    proposalId,
    proposalNumber,
    negotiationId,
    negotiationNumber,
    assignedTo,
    assignedToName,
    contractDate,
    projectName,
    projectDescription,
    scopeOfWork,
    deliverables,
    acceptanceCriteria,
    responsibilities,
    startDate,
    endDate,
    specialConditions,
    // Type-specific fields
    productDetails = [],
    deliveryDetails,
    warrantyTerms,
    supportPeriod,
    slaTerms,
    responseTime,
    licenseQuantity = 1,
    subscriptionStartDate,
    subscriptionEndDate,
    renewalDetails,
    // Commercial fields
    contractValue = 0,
    currency = 'INR',
    discountAmount = 0,
    taxAmount = 0,
    taxRate = 18.0,
    taxIncluded = false,
    finalContractAmount,
    paymentMethod = 'Full Payment',
    paymentDueTerms = 'Net 30',
    customPaymentDueTerms,
    advancePaymentType = 'percentage',
    advancePaymentValue = 0,
    advancePaymentAmount,
    quotationValueMismatchConfirmed = false,
    // Legal & clauses
    confidentialityClause,
    terminationClause,
    additionalTerms,
    // Document & signatures
    documentName,
    documentUrl,
    documentSize,
    documentVersion = 'v1.0',
    documentVersions = [],
    attachments = [],
    clientSignatoryName,
    clientSignatoryEmail,
    companySignatoryName = 'OmniTech Solutions Representative',
    companySignatoryEmail,
    signatureStatus = 'Pending',
    signedDate,
    // Approval
    approvalStatus = 'Draft',
    internalNotes,
    // Status
    status = 'Draft',
  } = data;

  // 1. Mandatory Field Validations
  if (!title || !title.trim()) {
    const err = new Error('Contract Title is required');
    err.status = 400;
    throw err;
  }

  const allowedTypes = [
    'Software Development',
    'IT Product Sales',
    'IT Services',
    'AMC/Support',
    'Subscription/License',
    'Other',
  ];
  if (!contractType || !allowedTypes.includes(contractType)) {
    const err = new Error(`Contract Type must be one of: ${allowedTypes.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const resolvedClient = (clientName && clientName.trim()) || (leadName && leadName.trim());
  if (!resolvedClient) {
    const err = new Error('Client Name is required');
    err.status = 400;
    throw err;
  }

  if (!contractDate) {
    const err = new Error('Contract Date is required');
    err.status = 400;
    throw err;
  }

  if (!startDate) {
    const err = new Error('Project Start Date is required');
    err.status = 400;
    throw err;
  }

  if (!endDate) {
    const err = new Error('Project End Date is required');
    err.status = 400;
    throw err;
  }

  // 2. Date Range Validation: End Date must be later than Start Date
  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).getTime();
  if (isNaN(startTs) || isNaN(endTs) || endTs <= startTs) {
    const err = new Error('End Date must be later than Start Date');
    err.status = 400;
    throw err;
  }

  // 3. Prevent duplicate contract for the same quotation if specified
  if (quotationId && quotationId.trim()) {
    const existingQuotationContract = await prisma.contract.findFirst({
      where: { quotationId: quotationId.trim() },
    });
    if (existingQuotationContract) {
      const err = new Error(`A contract (${existingQuotationContract.contractId}) is already linked to this quotation.`);
      err.status = 409;
      throw err;
    }
  }

  // 4. Commercial Calculations
  const numBaseValue = Math.max(0, parseFloat(contractValue) || 0);
  const numDiscount = Math.max(0, parseFloat(discountAmount) || 0);
  const numTax = Math.max(0, parseFloat(taxAmount) || 0);
  const numTaxRate = Math.max(0, parseFloat(taxRate) || 18.0);
  const isTaxInc = Boolean(taxIncluded);

  // Calculate final contract amount
  let calculatedFinalAmount = 0;
  if (isTaxInc) {
    calculatedFinalAmount = Math.max(0, numBaseValue - numDiscount);
  } else {
    calculatedFinalAmount = Math.max(0, numBaseValue - numDiscount + numTax);
  }
  const resolvedFinalAmount =
    finalContractAmount !== undefined && finalContractAmount !== null && finalContractAmount !== ''
      ? Math.max(0, parseFloat(finalContractAmount))
      : calculatedFinalAmount;

  // Calculate advance payment
  const numAdvVal = Math.max(0, parseFloat(advancePaymentValue) || 0);
  let computedAdvAmount = 0;
  if (advancePaymentType === 'percentage') {
    computedAdvAmount = (resolvedFinalAmount * numAdvVal) / 100;
  } else {
    computedAdvAmount = Math.min(resolvedFinalAmount, numAdvVal);
  }

  // 5. Signature Validation
  if (signatureStatus === 'Signed') {
    if (!clientSignatoryName || !clientSignatoryName.trim()) {
      const err = new Error('Client Signatory Name is required to mark the contract as Signed');
      err.status = 400;
      throw err;
    }
    if (!clientSignatoryEmail || !clientSignatoryEmail.trim()) {
      const err = new Error('Client Signatory Email is required to mark the contract as Signed');
      err.status = 400;
      throw err;
    }
    if (!companySignatoryName || !companySignatoryName.trim()) {
      const err = new Error('Company Signatory Name is required to mark the contract as Signed');
      err.status = 400;
      throw err;
    }
    if (!companySignatoryEmail || !companySignatoryEmail.trim()) {
      const err = new Error('Company Signatory Email is required to mark the contract as Signed');
      err.status = 400;
      throw err;
    }
    if (!signedDate) {
      const err = new Error('Signed Date is required when contract is marked as Signed');
      err.status = 400;
      throw err;
    }
  }

  // 6. Approval Workflow initialization: Default to Draft unless submitted for approval
  let initialApprovalStatus = approvalStatus === 'Pending Approval' ? 'Pending Approval' : 'Draft';
  let initialApprovedBy = null;
  let initialApprovalDate = null;

  // Lifecycle status matching approval
  let initialStatus = 'Draft';
  if (initialApprovalStatus === 'Pending Approval') {
    initialStatus = 'Pending Approval';
  }

  // Document version tracking initialization
  const initialVersions = Array.isArray(documentVersions) && documentVersions.length > 0
    ? documentVersions
    : documentName
    ? [
        {
          version: documentVersion || 'v1.0',
          documentName,
          documentUrl: documentUrl || null,
          uploadedBy: user?.name || user?.email || 'Staff',
          uploadedAt: new Date().toISOString(),
          notes: 'Initial executed version',
        },
      ]
    : [];

  const generatedId = await generateContractId(prisma);

  const created = await prisma.contract.create({
    data: {
      contractId: (contractId && contractId.trim()) || generatedId,
      title: title.trim(),
      contractType,
      clientName: resolvedClient,
      leadId: leadId || null,
      leadName: leadName ? leadName.trim() : null,
      contactId: contactId || null,
      customerId: customerId || null,
      quotationId: quotationId || null,
      quotationNumber: quotationNumber ? quotationNumber.trim() : null,
      proposalId: proposalId || null,
      proposalNumber: proposalNumber ? proposalNumber.trim() : null,
      negotiationId: negotiationId || null,
      negotiationNumber: negotiationNumber ? negotiationNumber.trim() : null,
      assignedTo: assignedTo || null,
      assignedToName: (assignedToName && assignedToName.trim()) || user?.name || 'Assigned Staff',
      contractDate: contractDate || new Date().toISOString().split('T')[0],
      projectName: projectName ? projectName.trim() : null,
      projectDescription: projectDescription ? projectDescription.trim() : null,
      scopeOfWork: scopeOfWork ? scopeOfWork.trim() : null,
      deliverables: deliverables ? deliverables.trim() : null,
      acceptanceCriteria: acceptanceCriteria ? acceptanceCriteria.trim() : null,
      responsibilities: responsibilities ? responsibilities.trim() : null,
      startDate: startDate || null,
      endDate: endDate || null,
      specialConditions: specialConditions ? specialConditions.trim() : null,

      // Type-specific
      productDetails: Array.isArray(productDetails) ? productDetails : [],
      deliveryDetails: deliveryDetails ? deliveryDetails.trim() : null,
      warrantyTerms: warrantyTerms ? warrantyTerms.trim() : null,
      supportPeriod: supportPeriod ? supportPeriod.trim() : null,
      slaTerms: slaTerms ? slaTerms.trim() : null,
      responseTime: responseTime ? responseTime.trim() : null,
      licenseQuantity: parseInt(licenseQuantity, 10) || 1,
      subscriptionStartDate: subscriptionStartDate || null,
      subscriptionEndDate: subscriptionEndDate || null,
      renewalDetails: renewalDetails ? renewalDetails.trim() : null,

      // Commercial
      contractValue: numBaseValue,
      currency: currency || 'INR',
      discountAmount: numDiscount,
      taxAmount: numTax,
      taxRate: numTaxRate,
      taxIncluded: isTaxInc,
      finalContractAmount: resolvedFinalAmount,
      paymentMethod: paymentMethod || 'Full Payment',
      paymentDueTerms: paymentDueTerms || 'Net 30',
      customPaymentDueTerms: customPaymentDueTerms ? customPaymentDueTerms.trim() : null,
      advancePaymentType: advancePaymentType || 'percentage',
      advancePaymentValue: numAdvVal,
      advancePaymentAmount: computedAdvAmount,
      quotationValueMismatchConfirmed: Boolean(quotationValueMismatchConfirmed),

      // Clauses
      confidentialityClause: confidentialityClause ? confidentialityClause.trim() : null,
      terminationClause: terminationClause ? terminationClause.trim() : null,
      additionalTerms: additionalTerms ? additionalTerms.trim() : null,

      // Documents & Signatures
      documentName: documentName || null,
      documentUrl: documentUrl || null,
      documentSize: documentSize || null,
      documentVersion: documentVersion || 'v1.0',
      documentVersions: initialVersions,
      attachments: Array.isArray(attachments) ? attachments : [],
      clientSignatoryName: clientSignatoryName ? clientSignatoryName.trim() : null,
      clientSignatoryEmail: clientSignatoryEmail ? clientSignatoryEmail.trim() : null,
      companySignatoryName: companySignatoryName ? companySignatoryName.trim() : 'OmniTech Solutions Representative',
      companySignatoryEmail: companySignatoryEmail ? companySignatoryEmail.trim() : null,
      signatureStatus: signatureStatus || 'Pending',
      signedDate: signatureStatus === 'Signed' ? signedDate : null,

      // Approval
      approvalStatus: initialApprovalStatus,
      approvedBy: initialApprovedBy,
      approvalDate: initialApprovalDate,
      internalNotes: internalNotes ? internalNotes.trim() : null,

      // Status
      status: initialStatus,
    },
  });

  // Automatically record activity in timeline
  try {
    await recordActivity({
      type: 'contract',
      title: created.signatureStatus === 'Signed' ? 'Contract Signed' : (created.status === 'Approved' ? 'Contract Approved' : 'Contract Created'),
      description: `Contract #${created.contractId} · ${created.title || created.contractType || 'IT Service Agreement'}`,
      leadId: created.leadId,
      customerName: created.clientName,
      entityId: created.id,
      entityType: 'Contract',
      entityNumber: created.contractId,
      amount: created.contractValue || created.finalContractAmount || 0,
      status: created.status || 'Active',
      performedBy: created.assignedToName || user?.name || 'Staff',
      activityDate: created.contractDate,
    });
  } catch (_) {}

  return formatContractResponse(created);
}
export const createContractService = createLeadContractService;

/**
 * 23. UPDATE CONTRACT
 */
export async function updateLeadContractService(id, data, user = {}) {
  const existing = await prisma.contract.findFirst({
    where: {
      OR: [{ id }, { contractId: id }],
    },
  });

  if (!existing) {
    const error = new Error('Contract record not found');
    error.status = 404;
    throw error;
  }

  const {
    title,
    contractType,
    clientName,
    leadId,
    leadName,
    contactId,
    customerId,
    quotationId,
    quotationNumber,
    proposalId,
    proposalNumber,
    negotiationId,
    negotiationNumber,
    assignedTo,
    assignedToName,
    contractDate,
    projectName,
    projectDescription,
    scopeOfWork,
    deliverables,
    acceptanceCriteria,
    responsibilities,
    startDate,
    endDate,
    specialConditions,
    productDetails,
    deliveryDetails,
    warrantyTerms,
    supportPeriod,
    slaTerms,
    responseTime,
    licenseQuantity,
    subscriptionStartDate,
    subscriptionEndDate,
    renewalDetails,
    contractValue,
    currency,
    discountAmount,
    taxAmount,
    taxRate,
    taxIncluded,
    finalContractAmount,
    paymentMethod,
    paymentDueTerms,
    customPaymentDueTerms,
    advancePaymentType,
    advancePaymentValue,
    advancePaymentAmount,
    quotationValueMismatchConfirmed,
    confidentialityClause,
    terminationClause,
    additionalTerms,
    documentName,
    documentUrl,
    documentSize,
    documentVersion,
    documentVersions,
    attachments,
    clientSignatoryName,
    clientSignatoryEmail,
    companySignatoryName,
    companySignatoryEmail,
    signatureStatus,
    signedDate,
    approvalStatus,
    approvedBy,
    approvalDate,
    rejectionReason,
    internalNotes,
    status,
    isApprovalSubmission,
    isApprovalAction,
  } = data;

  // 1. Date Range Validation if updated
  const finalStart = startDate !== undefined ? startDate : existing.startDate;
  const finalEnd = endDate !== undefined ? endDate : existing.endDate;
  if (finalStart && finalEnd) {
    const startTs = new Date(finalStart).getTime();
    const endTs = new Date(finalEnd).getTime();
    if (!isNaN(startTs) && !isNaN(endTs) && endTs <= startTs) {
      const err = new Error('End Date must be later than Start Date');
      err.status = 400;
      throw err;
    }
  }

  // 2. Commercial Calculations
  const numBaseValue =
    contractValue !== undefined && contractValue !== null && contractValue !== ''
      ? Math.max(0, parseFloat(contractValue))
      : existing.contractValue;
  const numDiscount =
    discountAmount !== undefined && discountAmount !== null && discountAmount !== ''
      ? Math.max(0, parseFloat(discountAmount))
      : existing.discountAmount || 0;
  const numTax =
    taxAmount !== undefined && taxAmount !== null && taxAmount !== ''
      ? Math.max(0, parseFloat(taxAmount))
      : existing.taxAmount || 0;
  const numTaxRate =
    taxRate !== undefined && taxRate !== null && taxRate !== ''
      ? Math.max(0, parseFloat(taxRate))
      : existing.taxRate || 18.0;
  const isTaxInc = taxIncluded !== undefined ? Boolean(taxIncluded) : existing.taxIncluded;

  let calculatedFinal = isTaxInc
    ? Math.max(0, numBaseValue - numDiscount)
    : Math.max(0, numBaseValue - numDiscount + numTax);

  const resolvedFinalAmount =
    finalContractAmount !== undefined && finalContractAmount !== null && finalContractAmount !== ''
      ? Math.max(0, parseFloat(finalContractAmount))
      : calculatedFinal;

  const resolvedAdvType = advancePaymentType !== undefined ? advancePaymentType : existing.advancePaymentType;
  const numAdvVal =
    advancePaymentValue !== undefined && advancePaymentValue !== null && advancePaymentValue !== ''
      ? Math.max(0, parseFloat(advancePaymentValue))
      : existing.advancePaymentValue || 0;
  let computedAdvAmount = 0;
  if (resolvedAdvType === 'percentage') {
    computedAdvAmount = (resolvedFinalAmount * numAdvVal) / 100;
  } else {
    computedAdvAmount = Math.min(resolvedFinalAmount, numAdvVal);
  }

  // 3. Signature Validation & Safe Auto-Resolution
  let effectiveSigStatus = signatureStatus !== undefined ? signatureStatus : existing.signatureStatus;
  let effectiveClientName = clientSignatoryName !== undefined ? clientSignatoryName : existing.clientSignatoryName;
  let effectiveClientEmail = clientSignatoryEmail !== undefined ? clientSignatoryEmail : existing.clientSignatoryEmail;
  let effectiveCompanyName = companySignatoryName !== undefined ? companySignatoryName : existing.companySignatoryName;
  let effectiveCompanyEmail = companySignatoryEmail !== undefined ? companySignatoryEmail : existing.companySignatoryEmail;
  let effectiveSignedDate = signedDate !== undefined ? signedDate : existing.signedDate;

  // Direct status updates to Active / Completed automatically transition signature to Signed
  if (status === 'Active' || status === 'Completed') {
    effectiveSigStatus = 'Signed';
  } else if (status === 'Draft' || status === 'Pending Signature') {
    if (signatureStatus === undefined) {
      effectiveSigStatus = 'Pending';
    }
  }

  if (effectiveSigStatus === 'Signed') {
    if (!effectiveClientName || !effectiveClientName.trim()) {
      effectiveClientName = existing.clientName || 'Authorized Signatory';
    }
    if (!effectiveClientEmail || !effectiveClientEmail.trim()) {
      effectiveClientEmail = existing.clientSignatoryEmail || 'client@example.com';
    }
    if (!effectiveCompanyName || !effectiveCompanyName.trim()) {
      effectiveCompanyName = existing.assignedToName || 'OneAssist Representative';
    }
    if (!effectiveCompanyEmail || !effectiveCompanyEmail.trim()) {
      effectiveCompanyEmail = existing.companySignatoryEmail || 'contracts@oneassist.tech';
    }
    if (!effectiveSignedDate) {
      effectiveSignedDate = existing.signedDate || new Date().toISOString().split('T')[0];
    }
  }

  // 4. Approval Workflow State Management
  let nextApprovalStatus = existing.approvalStatus;
  let nextApprovedBy = existing.approvedBy;
  let nextApprovalDate = existing.approvalDate;
  let nextRejectionReason = rejectionReason !== undefined ? (rejectionReason ? rejectionReason.trim() : null) : existing.rejectionReason;

  if (isApprovalSubmission || approvalStatus === 'Pending Approval' || status === 'Pending Approval') {
    nextApprovalStatus = 'Pending Approval';
    nextApprovedBy = null;
    nextApprovalDate = null;
    nextRejectionReason = null;
  } else if (approvalStatus === 'Approved' || status === 'Approved' || status === 'Active' || status === 'Completed' || status === 'Pending Signature') {
    nextApprovalStatus = 'Approved';
    nextApprovedBy = nextApprovedBy || user?.name || user?.email || 'Authorized Officer';
    nextApprovalDate = nextApprovalDate || new Date().toISOString();
    nextRejectionReason = null;
  } else if (approvalStatus === 'Rejected') {
    nextApprovalStatus = 'Rejected';
    nextApprovedBy = user?.name || user?.email || 'Authorized Officer';
    nextApprovalDate = new Date().toISOString();
    if (!nextRejectionReason) {
      nextRejectionReason = 'Contract terms rejected during executive review';
    }
  } else if (approvalStatus === 'Draft' || status === 'Draft') {
    nextApprovalStatus = 'Draft';
    nextApprovedBy = null;
    nextApprovalDate = null;
  }

  // 5. Lifecycle Status Synchronization
  let nextStatus = existing.status;
  if (status !== undefined) {
    // Explicit lifecycle status was provided by caller - respect user requested status!
    nextStatus = status;
  } else {
    // Auto-calculate lifecycle status if status was not explicitly passed in payload
    if (isApprovalSubmission || nextApprovalStatus === 'Pending Approval') {
      nextStatus = 'Pending Approval';
    } else if (nextApprovalStatus === 'Approved') {
      if (effectiveSigStatus === 'Signed') {
        const today = new Date().toISOString().split('T')[0];
        if (finalEnd && finalEnd < today) {
          nextStatus = 'Expired';
        } else {
          nextStatus = 'Active';
        }
      } else {
        nextStatus = 'Pending Signature';
      }
    } else if (nextApprovalStatus === 'Rejected') {
      nextStatus = 'Draft';
    } else if (effectiveSigStatus === 'Signed' && nextApprovalStatus === 'Approved') {
      nextStatus = 'Active';
    }
  }

  // 6. Document Version Tracking
  let finalVersions = existing.documentVersions || [];
  if (Array.isArray(documentVersions)) {
    finalVersions = documentVersions;
  } else if (documentName && documentName !== existing.documentName) {
    // A revised document has been uploaded
    const currentVerStr = existing.documentVersion || 'v1.0';
    const match = currentVerStr.match(/v?(\d+)\.?(\d+)?/i);
    let nextVer = 'v1.1';
    if (match) {
      const major = parseInt(match[1], 10) || 1;
      const minor = parseInt(match[2] || '0', 10) + 1;
      nextVer = `v${major}.${minor}`;
    }
    const newVersionEntry = {
      version: documentVersion || nextVer,
      documentName,
      documentUrl: documentUrl || null,
      uploadedBy: user?.name || user?.email || 'Staff',
      uploadedAt: new Date().toISOString(),
      notes: data.versionNotes || `Revised document upload (${documentVersion || nextVer})`,
    };
    finalVersions = [...(Array.isArray(finalVersions) ? finalVersions : []), newVersionEntry];
  }

  const updatePayload = {
    ...(title !== undefined && { title: title.trim() }),
    ...(contractType !== undefined && { contractType }),
    ...(clientName !== undefined && { clientName: clientName.trim() }),
    ...(leadId !== undefined && { leadId }),
    ...(leadName !== undefined && { leadName: leadName?.trim() || null }),
    ...(contactId !== undefined && { contactId }),
    ...(customerId !== undefined && { customerId }),
    ...(quotationId !== undefined && { quotationId }),
    ...(quotationNumber !== undefined && { quotationNumber: quotationNumber?.trim() || null }),
    ...(proposalId !== undefined && { proposalId }),
    ...(proposalNumber !== undefined && { proposalNumber: proposalNumber?.trim() || null }),
    ...(negotiationId !== undefined && { negotiationId }),
    ...(negotiationNumber !== undefined && { negotiationNumber: negotiationNumber?.trim() || null }),
    ...(assignedTo !== undefined && { assignedTo }),
    ...(assignedToName !== undefined && { assignedToName: assignedToName.trim() }),
    ...(contractDate !== undefined && { contractDate }),
    ...(projectName !== undefined && { projectName: projectName?.trim() || null }),
    ...(projectDescription !== undefined && { projectDescription: projectDescription?.trim() || null }),
    ...(scopeOfWork !== undefined && { scopeOfWork: scopeOfWork?.trim() || null }),
    ...(deliverables !== undefined && { deliverables: deliverables?.trim() || null }),
    ...(acceptanceCriteria !== undefined && { acceptanceCriteria: acceptanceCriteria?.trim() || null }),
    ...(responsibilities !== undefined && { responsibilities: responsibilities?.trim() || null }),
    ...(startDate !== undefined && { startDate: startDate || null }),
    ...(endDate !== undefined && { endDate: endDate || null }),
    ...(specialConditions !== undefined && { specialConditions: specialConditions?.trim() || null }),

    // Type-specific
    ...(productDetails !== undefined && { productDetails: Array.isArray(productDetails) ? productDetails : [] }),
    ...(deliveryDetails !== undefined && { deliveryDetails: deliveryDetails?.trim() || null }),
    ...(warrantyTerms !== undefined && { warrantyTerms: warrantyTerms?.trim() || null }),
    ...(supportPeriod !== undefined && { supportPeriod: supportPeriod?.trim() || null }),
    ...(slaTerms !== undefined && { slaTerms: slaTerms?.trim() || null }),
    ...(responseTime !== undefined && { responseTime: responseTime?.trim() || null }),
    ...(licenseQuantity !== undefined && { licenseQuantity: parseInt(licenseQuantity, 10) || 1 }),
    ...(subscriptionStartDate !== undefined && { subscriptionStartDate: subscriptionStartDate || null }),
    ...(subscriptionEndDate !== undefined && { subscriptionEndDate: subscriptionEndDate || null }),
    ...(renewalDetails !== undefined && { renewalDetails: renewalDetails?.trim() || null }),

    // Commercial
    contractValue: numBaseValue,
    ...(currency !== undefined && { currency }),
    discountAmount: numDiscount,
    taxAmount: numTax,
    taxRate: numTaxRate,
    taxIncluded: isTaxInc,
    finalContractAmount: resolvedFinalAmount,
    ...(paymentMethod !== undefined && { paymentMethod }),
    ...(paymentDueTerms !== undefined && { paymentDueTerms }),
    ...(customPaymentDueTerms !== undefined && { customPaymentDueTerms: customPaymentDueTerms?.trim() || null }),
    advancePaymentType: resolvedAdvType,
    advancePaymentValue: numAdvVal,
    advancePaymentAmount: computedAdvAmount,
    ...(quotationValueMismatchConfirmed !== undefined && { quotationValueMismatchConfirmed: Boolean(quotationValueMismatchConfirmed) }),

    // Clauses
    ...(confidentialityClause !== undefined && { confidentialityClause: confidentialityClause?.trim() || null }),
    ...(terminationClause !== undefined && { terminationClause: terminationClause?.trim() || null }),
    ...(additionalTerms !== undefined && { additionalTerms: additionalTerms?.trim() || null }),

    // Documents & Signatures
    ...(documentName !== undefined && { documentName }),
    ...(documentUrl !== undefined && { documentUrl }),
    ...(documentSize !== undefined && { documentSize }),
    documentVersion: documentVersion !== undefined ? documentVersion : existing.documentVersion || 'v1.0',
    documentVersions: finalVersions,
    ...(attachments !== undefined && { attachments: Array.isArray(attachments) ? attachments : [] }),
    clientSignatoryName: effectiveClientName ? effectiveClientName.trim() : null,
    clientSignatoryEmail: effectiveClientEmail ? effectiveClientEmail.trim() : null,
    companySignatoryName: effectiveCompanyName ? effectiveCompanyName.trim() : null,
    companySignatoryEmail: effectiveCompanyEmail ? effectiveCompanyEmail.trim() : null,
    signatureStatus: effectiveSigStatus,
    signedDate: effectiveSigStatus === 'Signed' ? effectiveSignedDate : null,

    // Approval
    approvalStatus: nextApprovalStatus,
    approvedBy: nextApprovedBy,
    approvalDate: nextApprovalDate,
    rejectionReason: nextRejectionReason,
    ...(internalNotes !== undefined && { internalNotes: internalNotes?.trim() || null }),

    // Status
    status: nextStatus,
  };

  const updated = await prisma.contract.update({
    where: { id: existing.id },
    data: updatePayload,
  });

  try {
    await prisma.activity.updateMany({
      where: {
        OR: [
          { entityId: updated.id },
          { entityNumber: updated.contractId },
        ],
      },
      data: {
        status: updated.status,
        amount: updated.contractValue || updated.finalContractAmount || 0,
        title: updated.signatureStatus === 'Signed' ? 'Contract Signed' : (updated.status === 'Approved' ? 'Contract Approved' : 'Contract Created'),
      },
    });
  } catch (_) {}

  return formatContractResponse(updated);
}
export const updateContractService = updateLeadContractService;

/**
 * 23b. SUBMIT CONTRACT FOR APPROVAL
 */
export async function submitLeadContractApprovalService(id, user = {}) {
  return updateLeadContractService(
    id,
    {
      isApprovalSubmission: true,
      approvalStatus: 'Pending Approval',
    },
    user
  );
}
export const submitContractApprovalService = submitLeadContractApprovalService;

/**
 * 23c. APPROVE CONTRACT
 */
export async function approveLeadContractService(id, user = {}) {
  return updateLeadContractService(
    id,
    {
      isApprovalAction: true,
      approvalStatus: 'Approved',
    },
    user
  );
}
export const approveContractService = approveLeadContractService;

/**
 * 23d. REJECT CONTRACT
 */
export async function rejectLeadContractService(id, rejectionReason, user = {}) {
  if (!rejectionReason || !rejectionReason.trim()) {
    const error = new Error('Rejection reason is required');
    error.status = 400;
    throw error;
  }
  return updateLeadContractService(
    id,
    {
      isApprovalAction: true,
      approvalStatus: 'Rejected',
      rejectionReason: rejectionReason.trim(),
    },
    user
  );
}
export const rejectContractService = rejectLeadContractService;

/**
 * 24. DELETE CONTRACT
 */
export async function deleteLeadContractService(id) {
  const existing = await prisma.contract.findFirst({
    where: {
      OR: [{ id }, { contractId: id }],
    },
  });

  if (!existing) {
    const error = new Error('Contract record not found');
    error.status = 404;
    throw error;
  }

  await prisma.contract.delete({
    where: { id: existing.id },
  });

  return { id: existing.id, contractId: existing.contractId };
}
export const deleteContractService = deleteLeadContractService;

export default {
  getLeadsService,
  getLeadByIdService,
  getLeadStatsService,
  getLeadMetadataService,
  createLeadService,
  updateLeadService,
  deleteLeadService,
  getLeadProposalsService,
  getLeadProposalByIdService,
  createLeadProposalService,
  updateLeadProposalService,
  deleteLeadProposalService,
  getProposalsService,
  getProposalByIdService,
  createProposalService,
  updateProposalService,
  deleteProposalService,
  getLeadNegotiationsService,
  getLeadNegotiationStatsService,
  getLeadNegotiationByIdService,
  createLeadNegotiationService,
  updateLeadNegotiationService,
  deleteLeadNegotiationService,
  getNegotiationsService,
  getNegotiationStatsService,
  getNegotiationByIdService,
  createNegotiationService,
  updateNegotiationService,
  deleteNegotiationService,
  getLeadContractsService,
  getLeadContractStatsService,
  getLeadContractByIdService,
  createLeadContractService,
  updateLeadContractService,
  submitLeadContractApprovalService,
  approveLeadContractService,
  rejectLeadContractService,
  deleteLeadContractService,
  getContractsService,
  getContractStatsService,
  getContractByIdService,
  createContractService,
  updateContractService,
  submitContractApprovalService,
  approveContractService,
  rejectContractService,
  deleteContractService,
};


