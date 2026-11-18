import { prisma } from '../config/prisma.js';
import { delCache } from '../config/redis.js';
import { getDataScope } from '../middlewares/permission.middleware.js';

let isSyncingCompletedLeads = false;

/**
 * Generate Sequential Customer ID (e.g. CUST-1001) ensuring absolute uniqueness
 */
async function generateCustomerId() {
  const allCustomers = await prisma.customer.findMany({
    select: { customerId: true },
  });

  let maxNum = 1000;
  for (const c of allCustomers) {
    if (c.customerId) {
      const match = c.customerId.match(/CUST-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidateId = `CUST-${nextNum}`;

  while (await prisma.customer.findUnique({ where: { customerId: candidateId } })) {
    nextNum++;
    candidateId = `CUST-${nextNum}`;
  }

  return candidateId;
}

/**
 * Automatically sync Leads with Complete/Completed/Won status to Customers
 */
export async function syncCompletedLeads() {
  if (isSyncingCompletedLeads) return;
  isSyncingCompletedLeads = true;

  try {
    const completedLeads = await prisma.lead.findMany({
      where: {
        status: {
          in: ['Complete', 'Completed', 'Won', 'complete', 'completed', 'won'],
        },
      },
    });

    for (const lead of completedLeads) {
      const orConditions = [
        { notes: { contains: `(${lead.leadId})` } },
      ];
      if (lead.email && lead.email.trim()) {
        orConditions.push({ email: { equals: lead.email.trim(), mode: 'insensitive' } });
      }
      if (lead.phone && lead.phone.trim().length >= 7) {
        orConditions.push({ phone: { equals: lead.phone.trim() } });
      }
      if (lead.companyName && lead.companyName.trim()) {
        orConditions.push({ companyName: { equals: lead.companyName.trim(), mode: 'insensitive' } });
      }

      let existing = await prisma.customer.findFirst({
        where: { OR: orConditions },
      });

      // Attempt to look up matching Contact for dynamic budget and firmographic profile
      let matchedContact = null;
      if (lead.email || lead.phone) {
        matchedContact = await prisma.contact.findFirst({
          where: {
            OR: [
              ...(lead.email && lead.email.trim() ? [{ email: { equals: lead.email.trim(), mode: 'insensitive' } }] : []),
              ...(lead.phone && lead.phone.trim().length >= 7 ? [{ phone: { equals: lead.phone.trim() } }] : []),
            ],
          },
        });
      }

      // Dynamically resolve contractValue from contact's estimatedBudget if present
      let dynamicContractValue = 0;
      if (matchedContact && matchedContact.estimatedBudget) {
        dynamicContractValue = parseFloat(matchedContact.estimatedBudget) || 0;
      }

      // Dynamically determine customerTier based on employeeCount, turnover, or company scale
      let dynamicTier = 'Mid-Market';
      if (matchedContact) {
        if (matchedContact.employeeCount === '500+' || (matchedContact.annualTurnover && matchedContact.annualTurnover.includes('Cr'))) {
          dynamicTier = 'Enterprise';
        } else if (matchedContact.employeeCount === '1-10' || matchedContact.contactType === 'Individual') {
          dynamicTier = 'Startup';
        } else if (matchedContact.companyName) {
          dynamicTier = 'Enterprise';
        }
      } else if (lead.companyName) {
        dynamicTier = 'Enterprise';
      }

      const requirementInfo = lead.category === 'Product'
        ? `Products: ${(lead.productList || []).join(', ') || 'Software Products'}`
        : `Services: ${(lead.serviceList || []).join(', ') || 'IT Services'}`;
      const notesContent = `Converted from Completed Lead (${lead.leadId}) | Category: ${lead.category || 'Service'} (${requirementInfo})`;

      if (!existing) {
        let created = false;
        let attempts = 0;
        while (!created && attempts < 5) {
          attempts++;
          const custId = await generateCustomerId();
          try {
            await prisma.customer.create({
              data: {
                customerId: custId,
                companyName: lead.companyName || lead.name,
                contactPerson: lead.name,
                email: lead.email ? lead.email.trim() : null,
                phone: lead.phone ? lead.phone.trim() : '',
                designation: lead.designation || lead.profession || 'Client Representative',
                industry: lead.category === 'Product' ? 'Software & Products' : 'Technology & IT Services',
                customerTier: dynamicTier,
                status: lead.status || 'Complete',
                address: lead.address || (matchedContact ? matchedContact.address : null),
                city: matchedContact?.registeredState || null,
                gstNumber: matchedContact?.gstNumber || null,
                panNumber: matchedContact?.companyPan || null,
                website: matchedContact?.companyWebsite || null,
                contractValue: dynamicContractValue,
                accountManager: matchedContact?.assignedToName || lead.assignedToName || 'Unassigned',
                accountManagerId: matchedContact?.assignedTo || lead.assignedTo || null,
                notes: notesContent,
              },
            });
            created = true;
          } catch (createErr) {
            if (createErr.code === 'P2002') {
              // Check if customer already exists now from a concurrent operation
              existing = await prisma.customer.findFirst({ where: { OR: orConditions } });
              if (existing) {
                created = true;
                break;
              }
              // Otherwise candidate customerId conflicted, loop and retry next candidate
              continue;
            }
            throw createErr;
          }
        }
      } else {
        await prisma.customer.update({
          where: { id: existing.id },
          data: {
            companyName: lead.companyName || lead.name,
            contactPerson: lead.name,
            email: lead.email ? lead.email.trim() : existing.email,
            phone: lead.phone ? lead.phone.trim() : existing.phone,
            designation: lead.designation || lead.profession || existing.designation,
            address: lead.address || existing.address,
            status: existing.status || 'Active',
            accountManager: existing.accountManager && existing.accountManager !== 'Santhosh C' && existing.accountManager !== 'Unassigned'
              ? existing.accountManager
              : (matchedContact?.assignedToName || lead.assignedToName || 'Unassigned'),
            accountManagerId: existing.accountManagerId || matchedContact?.assignedTo || lead.assignedTo || null,
            notes: notesContent,
          },
        });
      }
    }
  } catch (err) {
    console.error('Error syncing completed leads to customers:', err);
  } finally {
    isSyncingCompletedLeads = false;
  }
}

/**
 * Resolves employee data filtering rules for Customer module
 */
export async function resolveCustomerEmployeeFilter(currentUser) {
  if (!currentUser) {
    return {
      isEmployee: true,
      ids: [],
      names: [],
      filter: { id: '__none__' },
      allowedCustomerIds: [],
    };
  }

  const roleUpper = String(currentUser.role || '').toUpperCase().trim();
  const emailLower = String(currentUser.email || '').toLowerCase().trim();

  // 1. Super Admin / Admin check
  if (
    roleUpper === 'SUPER_ADMIN' ||
    roleUpper === 'SUPER ADMIN' ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'ADMINISTRATOR' ||
    roleUpper === 'MANAGEMENT' ||
    emailLower === 'sandy@gmail.com' ||
    emailLower === 'sandyy@gmail.com'
  ) {
    return { isEmployee: false, filter: null, allowedCustomerIds: null };
  }

  // 2. Check role slug in Role table if roleId exists
  if (currentUser.roleId) {
    try {
      const roleRecord = await prisma.role.findUnique({
        where: { id: currentUser.roleId },
        select: { slug: true, appType: true },
      });
      if (roleRecord?.slug === 'super_admin' || roleRecord?.slug === 'admin') {
        return { isEmployee: false, filter: null, allowedCustomerIds: null };
      }
    } catch (_) {}
  }

  // 3. User is an Employee -> Find matching employee record
  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        ...(currentUser.email ? [{ email: { equals: currentUser.email, mode: 'insensitive' } }] : []),
        ...(currentUser.name ? [{ name: { equals: currentUser.name, mode: 'insensitive' } }] : []),
        ...(currentUser.id ? [{ id: currentUser.id }] : []),
      ],
    },
  });

  const ids = new Set();
  const names = new Set();

  if (currentUser.id) ids.add(currentUser.id);
  if (currentUser.name) names.add(currentUser.name.trim());

  if (emp) {
    if (emp.id) ids.add(emp.id);
    if (emp.empCode) ids.add(emp.empCode);
    if (emp.name) names.add(emp.name.trim());
  }

  const idList = Array.from(ids);
  const nameList = Array.from(names);

  // 4. Find all leads assigned to this employee
  const orLead = [];
  idList.forEach((id) => orLead.push({ assignedTo: id }));
  nameList.forEach((name) => {
    orLead.push({ assignedToName: { equals: name, mode: 'insensitive' } });
    orLead.push({ assignedTo: { equals: name, mode: 'insensitive' } });
  });

  let assignedLeads = [];
  try {
    assignedLeads = await prisma.lead.findMany({
      where: orLead.length > 0 ? { OR: orLead } : { id: '__none__' },
      select: { id: true, leadId: true, companyName: true, email: true, phone: true },
    });
  } catch (_) {}

  // 5. Find all contacts assigned to this employee
  const orContact = [];
  idList.forEach((id) => orContact.push({ assignedTo: id }));
  nameList.forEach((name) => {
    orContact.push({ assignedToName: { equals: name, mode: 'insensitive' } });
    orContact.push({ assignedTo: { equals: name, mode: 'insensitive' } });
  });

  let assignedContacts = [];
  try {
    assignedContacts = await prisma.contact.findMany({
      where: orContact.length > 0 ? { OR: orContact } : { id: '__none__' },
      select: { id: true, contactId: true, companyName: true, email: true, phone: true },
    });
  } catch (_) {}

  // 6. Build Customer scoping conditions
  const or = [];

  // Direct match on accountManagerId
  idList.forEach((id) => {
    or.push({ accountManagerId: id });
    or.push({ accountManagerId: { equals: id, mode: 'insensitive' } });
    or.push({ accountManager: id });
  });

  // Direct match on accountManager name
  nameList.forEach((name) => {
    or.push({ accountManager: { equals: name, mode: 'insensitive' } });
  });

  // Converted lead references in notes: "(LED-1015)"
  assignedLeads.forEach((l) => {
    if (l.leadId) {
      or.push({ notes: { contains: `(${l.leadId})` } });
    }
  });

  // Matching companyName/email/phone from assigned leads or contacts,
  // ONLY if accountManager is not assigned to a different person
  const notOtherPersonCheck = {
    OR: [
      { accountManager: null },
      { accountManager: 'Unassigned' },
      { accountManager: '' },
      ...nameList.map((n) => ({ accountManager: { equals: n, mode: 'insensitive' } })),
      ...idList.map((id) => ({ accountManagerId: id })),
    ],
  };

  const leadOrConditions = [];
  assignedLeads.forEach((l) => {
    if (l.companyName && l.companyName.trim()) {
      leadOrConditions.push({ companyName: { equals: l.companyName.trim(), mode: 'insensitive' } });
    }
    if (l.email && l.email.trim()) {
      leadOrConditions.push({ email: { equals: l.email.trim(), mode: 'insensitive' } });
    }
    if (l.phone && l.phone.trim().length >= 7) {
      leadOrConditions.push({ phone: { equals: l.phone.trim() } });
    }
  });

  assignedContacts.forEach((c) => {
    if (c.companyName && c.companyName.trim()) {
      leadOrConditions.push({ companyName: { equals: c.companyName.trim(), mode: 'insensitive' } });
    }
    if (c.email && c.email.trim()) {
      leadOrConditions.push({ email: { equals: c.email.trim(), mode: 'insensitive' } });
    }
    if (c.phone && c.phone.trim().length >= 7) {
      leadOrConditions.push({ phone: { equals: c.phone.trim() } });
    }
  });

  if (leadOrConditions.length > 0) {
    or.push({
      AND: [
        { OR: leadOrConditions },
        notOtherPersonCheck,
      ],
    });
  }

  const filter = or.length > 0 ? { OR: or } : { id: '__none__' };

  // Fetch allowed customer IDs for fast sub-resource checks
  let allowedCustomerIds = [];
  try {
    const accessible = await prisma.customer.findMany({
      where: filter,
      select: { id: true, customerId: true },
    });
    allowedCustomerIds = accessible.flatMap((c) => [c.id, c.customerId]);
  } catch (_) {}

  return {
    isEmployee: true,
    employee: emp,
    ids: idList,
    names: nameList,
    filter,
    allowedCustomerIds,
  };
}

export function canEmployeeAccessCustomer(customer, empScope) {
  if (!empScope || !empScope.isEmployee) return true;
  if (!customer) return false;
  if (empScope.allowedCustomerIds && (empScope.allowedCustomerIds.includes(customer.id) || empScope.allowedCustomerIds.includes(customer.customerId))) {
    return true;
  }
  const mgrId = customer.accountManagerId || '';
  const mgrName = (customer.accountManager || '').toLowerCase().trim();
  if (mgrId && empScope.ids.includes(mgrId)) return true;
  if (mgrId && empScope.names.some((n) => n.toLowerCase() === mgrId.toLowerCase())) return true;
  if (mgrName && empScope.names.some((n) => n.toLowerCase() === mgrName)) return true;
  return false;
}

/**
 * 1. List customers with search, filter, sorting, pagination
 */
export async function getCustomersService(queryParams = {}, currentUser = null) {
  await syncCompletedLeads();
  const {
    search = '',
    status = '',
    customerTier = '',
    industry = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 50,
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const andConditions = [];

  // 1. Employee Scoping
  if (currentUser) {
    const empScope = await resolveCustomerEmployeeFilter(currentUser);
    if (empScope.isEmployee) {
      andConditions.push(empScope.filter);
    }
  }

  // 2. Search Term
  if (search && search.trim()) {
    const term = search.trim();
    andConditions.push({
      OR: [
        { companyName: { contains: term, mode: 'insensitive' } },
        { contactPerson: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { customerId: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { accountManager: { contains: term, mode: 'insensitive' } },
      ],
    });
  }

  // 3. Status filter
  if (status && status !== 'all') {
    andConditions.push({ status: { equals: status, mode: 'insensitive' } });
  }

  // 4. Customer Tier filter
  if (customerTier && customerTier !== 'all') {
    andConditions.push({ customerTier: { equals: customerTier, mode: 'insensitive' } });
  }

  // 5. Industry filter
  if (industry && industry !== 'all') {
    andConditions.push({ industry: { equals: industry, mode: 'insensitive' } });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const validSortFields = ['createdAt', 'updatedAt', 'companyName', 'contactPerson', 'contractValue', 'status', 'customerTier'];
  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const finalSortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { [finalSortBy]: finalSortOrder },
      skip,
      take: limitNum,
    }),
  ]);

  return {
    data: customers,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * 2. Get Customer Stats Summary
 */
export async function getCustomerStatsService(currentUser = null) {
  await syncCompletedLeads();
  const andConditions = [];

  if (currentUser) {
    const empScope = await resolveCustomerEmployeeFilter(currentUser);
    if (empScope.isEmployee) {
      andConditions.push(empScope.filter);
    }
  }

  const baseWhere = andConditions.length > 0 ? { AND: andConditions } : {};

  const [total, active, onboarding, enterprise, allCustomers] = await Promise.all([
    prisma.customer.count({ where: baseWhere }),
    prisma.customer.count({ where: { ...baseWhere, status: { equals: 'Active', mode: 'insensitive' } } }),
    prisma.customer.count({ where: { ...baseWhere, status: { equals: 'Onboarding', mode: 'insensitive' } } }),
    prisma.customer.count({ where: { ...baseWhere, customerTier: { equals: 'Enterprise', mode: 'insensitive' } } }),
    prisma.customer.findMany({ where: baseWhere, select: { contractValue: true } }),
  ]);

  const totalContractValue = allCustomers.reduce((acc, c) => acc + (c.contractValue || 0), 0);

  return {
    total,
    active,
    onboarding,
    enterprise,
    totalContractValue,
  };
}

/**
 * 3. Get Single Customer by ID
 */
export async function getCustomerByIdService(id, currentUser = null) {
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [{ id }, { customerId: id }],
    },
  });

  if (!customer) {
    const error = new Error('Customer not found');
    error.status = 404;
    throw error;
  }

  if (currentUser) {
    const empScope = await resolveCustomerEmployeeFilter(currentUser);
    if (empScope.isEmployee && !canEmployeeAccessCustomer(customer, empScope)) {
      const error = new Error('Access denied. You can only view customers assigned to you.');
      error.status = 403;
      throw error;
    }
  }

  return customer;
}

/**
 * 4. Create New Customer
 */
export async function createCustomerService(data, currentUser = null) {
  const customerId = data.customerId || (await generateCustomerId());

  let accountManager = data.accountManager || null;
  let accountManagerId = data.accountManagerId || null;

  if (currentUser) {
    const empScope = await resolveCustomerEmployeeFilter(currentUser);
    if (empScope.isEmployee) {
      if (!accountManager || accountManager === 'Unassigned') {
        accountManager = empScope.employee?.name || currentUser.name || null;
      }
      if (!accountManagerId) {
        accountManagerId = empScope.employee?.id || currentUser.id || null;
      }
    }
  }

  const newCustomer = await prisma.customer.create({
    data: {
      customerId,
      companyName: data.companyName.trim(),
      contactPerson: data.contactPerson.trim(),
      email: data.email ? data.email.toLowerCase().trim() : null,
      phone: data.phone.trim(),
      designation: data.designation || null,
      industry: data.industry || 'Technology & IT Services',
      customerTier: data.customerTier || 'Mid-Market',
      status: data.status || 'Active',
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      gstNumber: data.gstNumber ? data.gstNumber.toUpperCase().trim() : null,
      panNumber: data.panNumber ? data.panNumber.toUpperCase().trim() : null,
      website: data.website || null,
      contractValue: typeof data.contractValue === 'number' ? data.contractValue : parseFloat(data.contractValue) || 0,
      accountManager,
      accountManagerId,
      notes: data.notes || null,
    },
  });

  await delCache('crm:dashboard:stats').catch(() => {});
  return newCustomer;
}

/**
 * 5. Update Customer
 */
export async function updateCustomerService(id, updateData, currentUser = null) {
  const existing = await prisma.customer.findFirst({
    where: { OR: [{ id }, { customerId: id }] },
  });

  if (!existing) {
    const error = new Error('Customer not found');
    error.status = 404;
    throw error;
  }

  if (currentUser) {
    const empScope = await resolveCustomerEmployeeFilter(currentUser);
    if (empScope.isEmployee && !canEmployeeAccessCustomer(existing, empScope)) {
      const error = new Error('Access denied. You can only update customers assigned to you.');
      error.status = 403;
      throw error;
    }
  }

  const payload = { ...updateData };
  if (payload.contractValue !== undefined) {
    payload.contractValue = typeof payload.contractValue === 'number' ? payload.contractValue : parseFloat(payload.contractValue) || 0;
  }
  if (payload.gstNumber) {
    payload.gstNumber = payload.gstNumber.toUpperCase().trim();
  }
  if (payload.panNumber) {
    payload.panNumber = payload.panNumber.toUpperCase().trim();
  }

  const updated = await prisma.customer.update({
    where: { id: existing.id },
    data: payload,
  });

  await delCache('crm:dashboard:stats').catch(() => {});
  return updated;
}

/**
 * 6. Delete Customer
 */
export async function deleteCustomerService(id, currentUser = null) {
  const existing = await prisma.customer.findFirst({
    where: { OR: [{ id }, { customerId: id }] },
  });

  if (!existing) {
    const error = new Error('Customer not found');
    error.status = 404;
    throw error;
  }

  if (currentUser) {
    const empScope = await resolveCustomerEmployeeFilter(currentUser);
    if (empScope.isEmployee && !canEmployeeAccessCustomer(existing, empScope)) {
      const error = new Error('Access denied. You can only delete customers assigned to you.');
      error.status = 403;
      throw error;
    }
  }

  await prisma.customer.delete({
    where: { id: existing.id },
  });

  await delCache('crm:dashboard:stats').catch(() => {});
  return { message: `Customer ${existing.companyName} (${existing.customerId}) deleted successfully.` };
}
