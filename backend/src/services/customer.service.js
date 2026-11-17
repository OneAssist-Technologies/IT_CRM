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
            accountManager: existing.accountManager && existing.accountManager !== 'Santhosh C'
              ? existing.accountManager
              : (matchedContact?.assignedToName || lead.assignedToName || 'Unassigned'),
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

  const where = {};

  const roleUpper = String(currentUser?.role || '').toUpperCase().trim();
  const isAdmin =
    !currentUser ||
    roleUpper === 'SUPER_ADMIN' ||
    roleUpper === 'SUPER ADMIN' ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'MANAGEMENT' ||
    String(currentUser?.email || '').toLowerCase().trim() === 'sandy@gmail.com';

  const scope = currentUser ? await getDataScope(currentUser, 'customers') : 'All';
  const isAllScope = scope === 'All' || isAdmin;

  const userMatchConditions =
    !isAllScope && (currentUser?.id || currentUser?.name)
      ? [
          ...(currentUser.id ? [{ accountManagerId: currentUser.id }] : []),
          ...(currentUser.name ? [{ accountManager: { equals: currentUser.name, mode: 'insensitive' } }] : []),
        ]
      : null;

  if (search && search.trim()) {
    const term = search.trim();
    const searchConditions = [
      { companyName: { contains: term, mode: 'insensitive' } },
      { contactPerson: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } },
      { customerId: { contains: term, mode: 'insensitive' } },
      { city: { contains: term, mode: 'insensitive' } },
    ];

    if (userMatchConditions && userMatchConditions.length > 0) {
      where.AND = [
        { OR: searchConditions },
        { OR: userMatchConditions },
      ];
    } else {
      where.OR = searchConditions;
    }
  } else if (userMatchConditions && userMatchConditions.length > 0) {
    where.OR = userMatchConditions;
  }

  if (status && status !== 'all') {
    where.status = { equals: status, mode: 'insensitive' };
  }

  if (customerTier && customerTier !== 'all') {
    where.customerTier = { equals: customerTier, mode: 'insensitive' };
  }

  if (industry && industry !== 'all') {
    where.industry = { equals: industry, mode: 'insensitive' };
  }

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
  const roleUpper = String(currentUser?.role || '').toUpperCase().trim();
  const isAdmin =
    !currentUser ||
    roleUpper === 'SUPER_ADMIN' ||
    roleUpper === 'SUPER ADMIN' ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'MANAGEMENT' ||
    String(currentUser?.email || '').toLowerCase().trim() === 'sandy@gmail.com';

  const scope = currentUser ? await getDataScope(currentUser, 'customers') : 'All';
  const isAllScope = scope === 'All' || isAdmin;

  const baseWhere = {};
  if (!isAllScope && (currentUser?.id || currentUser?.name)) {
    baseWhere.OR = [
      ...(currentUser.id ? [{ accountManagerId: currentUser.id }] : []),
      ...(currentUser.name ? [{ accountManager: { equals: currentUser.name, mode: 'insensitive' } }] : []),
    ];
  }

  const [total, active, onboarding, enterprise, allCustomers] = await Promise.all([
    prisma.customer.count({ where: baseWhere }),
    prisma.customer.count({ where: { ...baseWhere, status: 'Active' } }),
    prisma.customer.count({ where: { ...baseWhere, status: 'Onboarding' } }),
    prisma.customer.count({ where: { ...baseWhere, customerTier: 'Enterprise' } }),
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
export async function getCustomerByIdService(id) {
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

  return customer;
}

/**
 * 4. Create New Customer
 */
export async function createCustomerService(data) {
  const customerId = data.customerId || (await generateCustomerId());

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
      accountManager: data.accountManager || null,
      accountManagerId: data.accountManagerId || null,
      notes: data.notes || null,
    },
  });

  await delCache('crm:dashboard:stats').catch(() => {});
  return newCustomer;
}

/**
 * 5. Update Customer
 */
export async function updateCustomerService(id, updateData) {
  const existing = await prisma.customer.findFirst({
    where: { OR: [{ id }, { customerId: id }] },
  });

  if (!existing) {
    const error = new Error('Customer not found');
    error.status = 404;
    throw error;
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
export async function deleteCustomerService(id) {
  const existing = await prisma.customer.findFirst({
    where: { OR: [{ id }, { customerId: id }] },
  });

  if (!existing) {
    const error = new Error('Customer not found');
    error.status = 404;
    throw error;
  }

  await prisma.customer.delete({
    where: { id: existing.id },
  });

  await delCache('crm:dashboard:stats').catch(() => {});
  return { message: `Customer ${existing.companyName} (${existing.customerId}) deleted successfully.` };
}
