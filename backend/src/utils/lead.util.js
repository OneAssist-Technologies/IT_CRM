/**
 * Lead Domain Utility Functions
 */

/**
 * Generate standardized Lead ID (e.g. LED-1001)
 */
export function generateLeadId(totalCount = 0) {
  return `LED-${1000 + totalCount + 1}`;
}

/**
 * Build Prisma WHERE query for Lead search & filtering
 */
export function buildLeadFilterQuery(queryParams = {}) {
  const {
    search = '',
    companyName,
    contactType,
    category,
    source,
    status,
    stage,
  } = queryParams;

  const andConditions = [];

  if (companyName && companyName !== 'All' && companyName.trim() !== '') {
    andConditions.push({ companyName: { equals: companyName.trim(), mode: 'insensitive' } });
  }
  if (contactType && contactType !== 'All' && contactType.trim() !== '') {
    andConditions.push({ contactType: { equals: contactType.trim(), mode: 'insensitive' } });
  }
  if (category && category !== 'All' && category.trim() !== '') {
    andConditions.push({ category: { equals: category.trim(), mode: 'insensitive' } });
  }
  if (source && source !== 'All' && source.trim() !== '') {
    andConditions.push({ source: { equals: source.trim(), mode: 'insensitive' } });
  }
  if (status && status !== 'All' && status.trim() !== '') {
    const s = status.trim();
    if (s.toLowerCase() === 'in progress' || s.toLowerCase() === 'in_progress') {
      andConditions.push({
        status: { in: ['In Progress', 'Contacted', 'Qualified', 'Active'] },
      });
    } else if (
      s.toLowerCase() === 'completed' ||
      s.toLowerCase() === 'complete' ||
      s.toLowerCase() === 'won'
    ) {
      andConditions.push({
        status: { in: ['Completed', 'Complete', 'Won', 'Closed Won'] },
      });
    } else {
      andConditions.push({ status: { equals: s, mode: 'insensitive' } });
    }
  }
  const priorityFilter = queryParams.priority || queryParams.tag;
  if (priorityFilter && priorityFilter !== 'All' && priorityFilter.trim() !== '') {
    andConditions.push({ priority: { equals: priorityFilter.trim(), mode: 'insensitive' } });
  }
  if (stage && stage !== 'All' && stage.trim() !== '') {
    andConditions.push({ stage: { equals: stage.trim(), mode: 'insensitive' } });
  }
  if (queryParams.assignedTo && queryParams.assignedTo !== 'All' && queryParams.assignedTo.trim() !== '') {
    const a = queryParams.assignedTo.trim();
    if (a.toLowerCase() === 'unassigned') {
      andConditions.push({
        OR: [{ assignedTo: null }, { assignedTo: '' }],
      });
    } else {
      andConditions.push({
        OR: [
          { assignedTo: a },
          { assignedToName: { equals: a, mode: 'insensitive' } },
        ],
      });
    }
  }
  if (queryParams.createdBy && queryParams.createdBy !== 'All' && queryParams.createdBy.trim() !== '') {
    const c = queryParams.createdBy.trim();
    andConditions.push({
      OR: [
        { createdBy: c },
        { createdByName: { equals: c, mode: 'insensitive' } },
      ],
    });
  }

  if (search && search.trim() !== '') {
    const q = search.trim();
    andConditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { leadId: { contains: q, mode: 'insensitive' } },
        { profession: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  return andConditions.length > 0 ? { AND: andConditions } : {};
}

/**
 * Format single lead object for API response
 */
export function formatLeadResponse(lead) {
  if (!lead) return null;
  return {
    ...lead,
    priority: lead.priority || lead.tagPriority || lead.tag || 'Medium',
    tag: lead.priority || lead.tagPriority || lead.tag || 'Medium',
    tagPriority: lead.priority || lead.tagPriority || lead.tag || 'Medium',
    displayCompany: lead.companyName || lead.profession || 'Individual',
  };
}

/**
 * Generate sequential Negotiation ID (e.g. NEG-1001)
 */
export async function generateNegotiationId(prismaInstance) {
  const client = prismaInstance;
  if (!client) {
    return `NEG-${1000 + Math.floor(Math.random() * 900) + 1}`;
  }
  const latest = await client.negotiation.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { negotiationId: true },
  });

  if (!latest || !latest.negotiationId) {
    return 'NEG-1001';
  }

  const match = latest.negotiationId.match(/\d+$/);
  if (match) {
    const nextNum = parseInt(match[0], 10) + 1;
    return `NEG-${nextNum}`;
  }

  const count = await client.negotiation.count();
  return `NEG-${1000 + count + 1}`;
}

/**
 * Format Negotiation object for API response
 */
export function formatNegotiationResponse(record) {
  if (!record) return null;
  return {
    ...record,
    quotedAmount: Number(record.quotedAmount) || 0,
    expectedFinalAmount: Number(record.expectedFinalAmount) || 0,
    discountPercentage: Number(record.discountPercentage) || 0,
    discountAmount: Number(record.discountAmount) || 0,
    discussionHistory: Array.isArray(record.discussionHistory)
      ? record.discussionHistory
      : [],
  };
}

/**
 * Generate sequential Contract ID (e.g. CNT-2026-1001)
 */
export async function generateContractId(prismaInstance) {
  const client = prismaInstance;
  const year = new Date().getFullYear();
  if (!client) {
    return `CNT-${year}-${1000 + Math.floor(Math.random() * 900) + 1}`;
  }
  const latest = await client.contract.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { contractId: true },
  });

  if (!latest || !latest.contractId) {
    return `CNT-${year}-1001`;
  }

  const match = latest.contractId.match(/\d+$/);
  if (match) {
    const nextNum = parseInt(match[0], 10) + 1;
    return `CNT-${year}-${nextNum}`;
  }

  const count = await client.contract.count();
  return `CNT-${year}-${1000 + count + 1}`;
}

/**
 * Format Contract object for API response
 */
export function formatContractResponse(record) {
  if (!record) return null;
  return {
    ...record,
    contractValue: Number(record.contractValue) || 0,
    discountAmount: Number(record.discountAmount) || 0,
    taxAmount: Number(record.taxAmount) || 0,
    taxRate: Number(record.taxRate) || 18.0,
    taxIncluded: Boolean(record.taxIncluded),
    finalContractAmount: Number(record.finalContractAmount) || 0,
    advancePaymentValue: Number(record.advancePaymentValue) || 0,
    advancePaymentAmount: Number(record.advancePaymentAmount) || 0,
    licenseQuantity: Number(record.licenseQuantity) || 1,
    attachments: Array.isArray(record.attachments) ? record.attachments : [],
    documentVersions: Array.isArray(record.documentVersions) ? record.documentVersions : [],
    productDetails: Array.isArray(record.productDetails) ? record.productDetails : [],
  };
}

/**
 * Build Prisma WHERE query for Contract search & filtering
 */
export function buildContractFilterQuery(queryParams = {}) {
  const {
    search = '',
    leadId,
    contactId,
    quotationId,
    status,
    contractType,
    approvalStatus,
    signatureStatus,
    assignedTo,
    date,
    startDate,
    endDate,
  } = queryParams;

  const andConditions = [];

  if (leadId && leadId !== 'All' && leadId !== 'ALL' && leadId.trim() !== '') {
    andConditions.push({ leadId: leadId.trim() });
  }

  if (contactId && contactId !== 'All' && contactId !== 'ALL' && contactId.trim() !== '') {
    andConditions.push({ contactId: contactId.trim() });
  }

  if (quotationId && quotationId !== 'All' && quotationId !== 'ALL' && quotationId.trim() !== '') {
    andConditions.push({ quotationId: quotationId.trim() });
  }

  if (assignedTo && assignedTo !== 'All' && assignedTo !== 'ALL' && assignedTo.trim() !== '') {
    andConditions.push({ assignedTo: assignedTo.trim() });
  }

  if (status && status !== 'All' && status !== 'ALL' && status.trim() !== '') {
    andConditions.push({ status: { equals: status.trim(), mode: 'insensitive' } });
  }

  if (contractType && contractType !== 'All' && contractType !== 'ALL' && contractType.trim() !== '') {
    andConditions.push({ contractType: { equals: contractType.trim(), mode: 'insensitive' } });
  }

  if (approvalStatus && approvalStatus !== 'All' && approvalStatus !== 'ALL' && approvalStatus.trim() !== '') {
    andConditions.push({ approvalStatus: { equals: approvalStatus.trim(), mode: 'insensitive' } });
  }

  if (signatureStatus && signatureStatus !== 'All' && signatureStatus !== 'ALL' && signatureStatus.trim() !== '') {
    andConditions.push({ signatureStatus: { equals: signatureStatus.trim(), mode: 'insensitive' } });
  }

  if (date && date.trim() !== '') {
    andConditions.push({ contractDate: date.trim() });
  }

  if (startDate && startDate.trim() !== '') {
    andConditions.push({ contractDate: { gte: startDate.trim() } });
  }

  if (endDate && endDate.trim() !== '') {
    andConditions.push({ contractDate: { lte: endDate.trim() } });
  }

  if (search && search.trim() !== '') {
    const q = search.trim();
    andConditions.push({
      OR: [
        { contractId: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
        { leadName: { contains: q, mode: 'insensitive' } },
        { projectName: { contains: q, mode: 'insensitive' } },
        { assignedToName: { contains: q, mode: 'insensitive' } },
        { quotationNumber: { contains: q, mode: 'insensitive' } },
        { proposalNumber: { contains: q, mode: 'insensitive' } },
        { negotiationNumber: { contains: q, mode: 'insensitive' } },
        { scopeOfWork: { contains: q, mode: 'insensitive' } },
        { deliverables: { contains: q, mode: 'insensitive' } },
        { acceptanceCriteria: { contains: q, mode: 'insensitive' } },
        { responsibilities: { contains: q, mode: 'insensitive' } },
        { specialConditions: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  return andConditions.length > 0 ? { AND: andConditions } : {};
}
