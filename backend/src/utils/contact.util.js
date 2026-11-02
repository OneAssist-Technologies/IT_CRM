/**
 * Contact Domain Utility Functions
 */

/**
 * Generate standardized Contact ID (e.g. CNT-1001)
 */
export function generateContactId(totalCount = 0) {
  return `CNT-${1000 + totalCount + 1}`;
}

/**
 * Build Prisma WHERE query for Contact search & filtering
 */
export function buildContactFilterQuery(queryParams = {}) {
  const {
    search = '',
    companyName,
    contactType,
    category,
    source,
    status,
    stage,
    qualificationStatus,
    priority,
    assignedTo,
    assignmentStatus,
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
    const s = source.trim();
    if (s.toLowerCase() === 'bulk import' || s.toLowerCase() === 'import') {
      andConditions.push({
        OR: [
          { source: { equals: 'Bulk Import', mode: 'insensitive' } },
          { source: { equals: 'Import', mode: 'insensitive' } },
        ],
      });
    } else {
      andConditions.push({ source: { equals: s, mode: 'insensitive' } });
    }
  }
  if (status && status !== 'All' && status.trim() !== '') {
    const s = status.trim();
    andConditions.push({
      OR: [
        { status: { equals: s, mode: 'insensitive' } },
        { qualificationStatus: { equals: s, mode: 'insensitive' } },
        ...(s.toLowerCase() === 'disqualified' || s.toLowerCase() === 'unqualified'
          ? [
              { qualificationStatus: { equals: 'Disqualified', mode: 'insensitive' } },
              { qualificationStatus: { equals: 'Unqualified', mode: 'insensitive' } },
            ]
          : []),
      ],
    });
  }
  if (stage && stage !== 'All' && stage.trim() !== '') {
    andConditions.push({ stage: { equals: stage.trim(), mode: 'insensitive' } });
  }
  if (qualificationStatus && qualificationStatus !== 'All' && qualificationStatus.trim() !== '') {
    andConditions.push({ qualificationStatus: { equals: qualificationStatus.trim(), mode: 'insensitive' } });
  }
  if (priority && priority !== 'All' && priority.trim() !== '') {
    andConditions.push({ priority: { equals: priority.trim(), mode: 'insensitive' } });
  }
  if (assignedTo && assignedTo !== 'All') {
    if (assignedTo.toLowerCase() === 'assigned') {
      andConditions.push({
        OR: [
          { assignmentStatus: 'Assigned' },
          { AND: [{ assignedTo: { not: null } }, { assignedTo: { not: '' } }, { assignedTo: { not: 'none' } }] },
        ],
      });
    } else if (assignedTo.toLowerCase() === 'unassigned') {
      andConditions.push({
        OR: [
          { assignmentStatus: 'Unassigned' },
          { assignmentStatus: null },
          { assignedTo: null },
          { assignedTo: '' },
          { assignedTo: 'none' },
        ],
      });
    } else {
      andConditions.push({
        OR: [
          { assignedTo: { equals: assignedTo, mode: 'insensitive' } },
          { assignedToName: { equals: assignedTo, mode: 'insensitive' } },
          { createdBy: { equals: assignedTo, mode: 'insensitive' } },
        ],
      });
    }
  }
  if (assignmentStatus && assignmentStatus !== 'All') {
    if (assignmentStatus === 'Unassigned') {
      andConditions.push({
        AND: [
          {
            OR: [
              { assignmentStatus: 'Unassigned' },
              { assignmentStatus: null },
              { assignedTo: null },
              { assignedTo: '' },
              { assignedTo: 'none' },
            ],
          },
          {
            status: { notIn: ['Qualified', 'qualified', 'Disqualified', 'disqualified', 'Unqualified', 'unqualified'] },
          },
          {
            OR: [
              { qualificationStatus: 'New' },
              { qualificationStatus: null },
              { qualificationStatus: '' },
            ],
          },
          {
            stage: { not: 'Qualification' },
          },
        ],
      });
    } else if (assignmentStatus === 'Assigned') {
      andConditions.push({
        OR: [
          { assignmentStatus: 'Assigned' },
          { stage: 'Qualification' },
          { status: { in: ['Qualified', 'qualified', 'Disqualified', 'disqualified', 'Unqualified', 'unqualified', 'Follow-up Required', 'Pending'] } },
          {
            qualificationStatus: {
              in: [
                'Qualified',
                'Follow-up Required',
                'Pending',
                'In Progress',
                'Disqualified',
                'Unqualified',
              ],
            },
          },
        ],
      });
    }
  }

  if (search && search.trim() !== '') {
    const q = search.trim();
    andConditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { contactId: { contains: q, mode: 'insensitive' } },
        { gstNumber: { contains: q, mode: 'insensitive' } },
        { cinNumber: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { internalReference: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  return andConditions.length > 0 ? { AND: andConditions } : {};
}

/**
 * Format single contact object for API response
 */
export function formatContactResponse(contact) {
  if (!contact) return null;
  const loc = contact.location || contact.city || contact.street || contact.address || null;
  const contactPriority = (contact.priority || contact.tagPriority || 'Medium').trim();
  return {
    ...contact,
    tagPriority: contactPriority,
    priority: contactPriority,
    location: loc,
    city: contact.city || loc,
    street: contact.street || loc,
    address: contact.address || loc,
    website: contact.website || contact.companyWebsite || null,
    companyWebsite: contact.companyWebsite || contact.website || null,
    displayCompany: contact.companyName || contact.profession || 'Individual',
    isAssigned: Boolean(contact.assignedTo && contact.assignedTo !== 'none'),
  };
}

export default {
  generateContactId,
  buildContactFilterQuery,
  formatContactResponse,
};
