/**
 * Project Domain Utility Functions
 */

/**
 * Generate standardized Project ID (e.g. PRJ-1001)
 */
export function generateProjectId(totalCount = 0) {
  const nextNum = totalCount + 1;
  return nextNum < 100 ? `P${String(nextNum).padStart(3, '0')}` : `PRJ-${nextNum}`;
}

/**
 * Build Prisma WHERE query for Project search & filtering
 */
export function buildProjectFilterQuery(queryParams = {}) {
  const {
    search = '',
    status,
    priority,
    projectType,
    category,
    projectManagerId,
    client,
    manager,
    contactId,
  } = queryParams;

  const andConditions = [];

  if (contactId && contactId.trim() !== '') {
    andConditions.push({ contactId: contactId.trim() });
  }

  if (status && status !== 'All' && status.trim() !== '') {
    if (status === 'Active') {
      andConditions.push({ status: { in: ['Planning', 'In Progress', 'In Review'] } });
    } else {
      andConditions.push({ status: { equals: status.trim(), mode: 'insensitive' } });
    }
  }

  if (priority && priority !== 'All' && priority.trim() !== '') {
    andConditions.push({ priority: { equals: priority.trim(), mode: 'insensitive' } });
  }

  if (projectType && projectType !== 'All' && projectType.trim() !== '') {
    andConditions.push({ projectType: { equals: projectType.trim(), mode: 'insensitive' } });
  }

  if (category && category !== 'All' && category.trim() !== '') {
    andConditions.push({ category: { equals: category.trim(), mode: 'insensitive' } });
  }

  if (projectManagerId && projectManagerId !== 'All' && projectManagerId.trim() !== '') {
    andConditions.push({ projectManagerId: projectManagerId.trim() });
  }

  if (client && client !== 'All' && client.trim() !== '') {
    andConditions.push({ clientName: { equals: client.trim(), mode: 'insensitive' } });
  }

  if (manager && manager !== 'All' && manager.trim() !== '') {
    andConditions.push({ projectManagerName: { equals: manager.trim(), mode: 'insensitive' } });
  }

  if (search && search.trim() !== '') {
    const q = search.trim();
    andConditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { projectId: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
        { projectManagerName: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  return andConditions.length > 0 ? { AND: andConditions } : {};
}

/**
 * Format single project object for API response
 */
export function formatProjectResponse(project) {
  if (!project) return null;
  const modules = Array.isArray(project.modules) ? project.modules : [];
  let computedStatus = project.status;
  if (modules.length > 0) {
    const allModulesCompleted = modules.every((m) => {
      const isStatusDone = m.status === 'Completed';
      const isProgDone = parseInt(m.progress, 10) === 100;
      return isStatusDone || isProgDone;
    });
    if (allModulesCompleted) {
      computedStatus = 'Completed';
    } else {
      computedStatus = 'In Progress';
    }
  }

  return {
    ...project,
    status: computedStatus,
    progressPercent: `${project.progress || 0}%`,
    isOverdue: Boolean(
      project.targetEndDate &&
      new Date(project.targetEndDate) < new Date() &&
      computedStatus !== 'Completed' &&
      computedStatus !== 'Cancelled'
    ),
  };
}

export default {
  generateProjectId,
  buildProjectFilterQuery,
  formatProjectResponse,
};
