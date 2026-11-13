import { prisma } from '../config/prisma.js';
import { getCache, setCache, delCache } from '../config/redis.js';
import { io } from '../utils/socket.js';
import { PROJECT_MODULE } from '../models/project.model.js';
import { generateProjectId, buildProjectFilterQuery, formatProjectResponse } from '../utils/project.util.js';
import { recordActivity } from './activity.service.js';

/**
 * Scope projects by user (Super Admin sees all, Employees only see projects created by them)
 */
async function resolveProjectScopeFilter(currentUser) {
  if (!currentUser) return null;
  const roleUpper = String(currentUser.role || '').toUpperCase();
  if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN') {
    return null; // Super Admin sees all projects
  }

  if (currentUser.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { roleRelation: true },
    });
    if (dbUser?.roleRelation?.slug?.toLowerCase() === 'super_admin') {
      return null;
    }
  }

  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        ...(currentUser.email ? [{ email: { equals: currentUser.email, mode: 'insensitive' } }] : []),
        ...(currentUser.name ? [{ name: { equals: currentUser.name, mode: 'insensitive' } }] : []),
      ],
    },
  });

  const orConditions = [];
  const identifiers = [currentUser.name, currentUser.email, emp?.name].filter(Boolean);
  for (const ident of identifiers) {
    orConditions.push({ createdBy: { equals: ident, mode: 'insensitive' } });
  }
  if (currentUser.id) orConditions.push({ createdBy: currentUser.id });
  if (emp?.id) orConditions.push({ createdBy: emp.id });

  return orConditions.length > 0 ? { OR: orConditions } : { createdBy: currentUser.id };
}

/**
 * 1. List Projects with pagination, search, sorting, filters, and Redis caching
 */
export async function getProjectsService(queryParams = {}, currentUser = null) {
  const {
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Cache key based on user and query params
  const userScopeKey = currentUser?.id || 'all';
  const cacheKey = `crm:projects:list:${userScopeKey}:${JSON.stringify(queryParams)}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (_) {}

  const where = buildProjectFilterQuery(queryParams);

  const scopeFilter = await resolveProjectScopeFilter(currentUser);
  if (scopeFilter) {
    where.AND = where.AND || [];
    where.AND.push(scopeFilter);
  }

  const validSortFields = ['createdAt', 'updatedAt', 'name', 'progress', 'status', 'priority', 'startDate', 'targetEndDate', 'estimatedBudget'];
  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const finalSortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  // Synchronize status for projects with modules: Incomplete modules -> 'In Progress', All complete -> 'Completed'
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "Project"
      SET "status" = 'In Progress'
      WHERE "status" = 'Completed'
        AND "modules" IS NOT NULL
        AND jsonb_array_length("modules") > 0
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements("modules") elem
          WHERE (elem->>'status' IS DISTINCT FROM 'Completed')
            AND (elem->>'progress' IS NULL OR (elem->>'progress')::int < 100)
        );
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE "Project"
      SET "status" = 'Completed', "progress" = 100
      WHERE "status" = 'In Progress'
        AND "modules" IS NOT NULL
        AND jsonb_array_length("modules") > 0
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements("modules") elem
          WHERE (elem->>'status' IS DISTINCT FROM 'Completed')
            AND (elem->>'progress' IS NULL OR (elem->>'progress')::int < 100)
        );
    `);
  } catch (_) {}

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { [finalSortBy]: finalSortOrder },
      skip,
      take: limitNum,
    }),
  ]);

  const result = {
    data: projects.map((p) =>
      formatProjectResponse({
        ...p,
        modules: Array.isArray(p.modules) ? p.modules : [],
      })
    ),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };

  try {
    await setCache(cacheKey, result, 60);
  } catch (_) {}

  return result;
}

/**
 * 2. Get Single Project Details
 */
export async function getProjectByIdService(id) {
  const project = await prisma.project.findFirst({
    where: {
      OR: [{ id }, { projectId: id }],
    },
  });

  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  // Auto-resolve contact details from prisma.contact if clientEmail or clientPhone missing, or by contactId
  let clientEmail = project.clientEmail || '';
  let clientPhone = project.clientPhone || '';
  let contactId = project.contactId || '';
  let contact = null;

  if (contactId) {
    contact = await prisma.contact.findFirst({
      where: {
        OR: [{ id: contactId }, { contactId: contactId }],
      },
    });
  }

  if (!contact && project.clientName) {
    const clientMatch = project.clientName.match(/^(.*?)\s*\((.*?)\)$/);
    const comp = (clientMatch ? clientMatch[1] : project.clientName).trim();
    const person = (clientMatch ? clientMatch[2] : '').trim();

    const searchConditions = [];
    if (comp) {
      searchConditions.push({ companyName: { contains: comp, mode: 'insensitive' } });
      searchConditions.push({ name: { contains: comp, mode: 'insensitive' } });
    }
    if (person) {
      searchConditions.push({ name: { contains: person, mode: 'insensitive' } });
      searchConditions.push({ companyName: { contains: person, mode: 'insensitive' } });
    }

    if (searchConditions.length > 0) {
      contact = await prisma.contact.findFirst({
        where: { OR: searchConditions },
      });
    }
  }

  if (contact) {
    if (!clientEmail && contact.email) clientEmail = contact.email;
    if (!clientPhone && contact.phone) clientPhone = contact.phone;
    if (!contactId && contact.id) contactId = contact.id;

    if (!project.clientEmail || !project.clientPhone || !project.contactId) {
      prisma.project.update({
        where: { id: project.id },
        data: {
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          contactId: contactId || undefined,
        },
      }).catch(() => {});
    }
  }

  // Fetch full team members metadata
  let teamDetails = [];
  if (project.teamMembers && project.teamMembers.length > 0) {
    teamDetails = await prisma.employee.findMany({
      where: {
        id: { in: project.teamMembers },
      },
      select: {
        id: true,
        name: true,
        empCode: true,
        designation: true,
        department: true,
        email: true,
      },
    });
  }

  // Fetch modules from PostgreSQL
  let modules = [];
  try {
    const rawMod = await prisma.$queryRawUnsafe(
      `SELECT "modules" FROM "Project" WHERE "id" = $1`,
      project.id
    );
    if (rawMod && rawMod[0] && Array.isArray(rawMod[0].modules)) {
      modules = rawMod[0].modules;
    }
  } catch (e) {}

  return {
    data: {
      ...formatProjectResponse({
        ...project,
        clientEmail,
        clientPhone,
        contactId,
      }),
      modules,
      teamDetails,
      contactDetails: contact
        ? {
            id: contact.id,
            contactId: contact.contactId,
            name: contact.name,
            companyName: contact.companyName,
            email: contact.email,
            phone: contact.phone,
          }
        : null,
    },
  };
}

/**
 * 3. Get Project KPI Stats with Redis Caching and single groupBy aggregation
 */
export async function getProjectStatsService(currentUser = null) {
  const scopeFilter = await resolveProjectScopeFilter(currentUser);
  const userScopeKey = currentUser?.id || 'all';
  const cacheKey = `crm:projects:stats:${userScopeKey}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (_) {}

  const whereClause = scopeFilter ? scopeFilter : {};

  // Auto-sync status so stats group counts reflect module completion accurately
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "Project"
      SET "status" = 'In Progress'
      WHERE "status" = 'Completed'
        AND "modules" IS NOT NULL
        AND jsonb_array_length("modules") > 0
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements("modules") elem
          WHERE (elem->>'status' IS DISTINCT FROM 'Completed')
            AND (elem->>'progress' IS NULL OR (elem->>'progress')::int < 100)
        );
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE "Project"
      SET "status" = 'Completed', "progress" = 100
      WHERE "status" = 'In Progress'
        AND "modules" IS NOT NULL
        AND jsonb_array_length("modules") > 0
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements("modules") elem
          WHERE (elem->>'status' IS DISTINCT FROM 'Completed')
            AND (elem->>'progress' IS NULL OR (elem->>'progress')::int < 100)
        );
    `);
  } catch (_) {}

  const [statusGroups, budgetAggregate] = await Promise.all([
    prisma.project.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { _all: true },
    }),
    prisma.project.aggregate({
      where: whereClause,
      _sum: {
        estimatedBudget: true,
        actualCost: true,
      },
    }),
  ]);

  const statusCounts = {
    'In Progress': 0,
    'Planning': 0,
    'In Review': 0,
    'Completed': 0,
    'On Hold': 0,
  };

  let total = 0;
  statusGroups.forEach((g) => {
    const s = g.status || 'Planning';
    const c = g._count?._all || 0;
    total += c;
    if (statusCounts[s] !== undefined) {
      statusCounts[s] += c;
    }
  });

  const inProgress = statusCounts['In Progress'];
  const planning = statusCounts['Planning'];
  const inReview = statusCounts['In Review'];
  const completed = statusCounts['Completed'];
  const onHold = statusCounts['On Hold'];

  const result = {
    stats: {
      total,
      inProgress,
      planning,
      inReview,
      completed,
      onHold,
      active: inProgress + planning + inReview,
      totalBudget: budgetAggregate._sum.estimatedBudget || 0,
      totalCost: budgetAggregate._sum.actualCost || 0,
    },
  };

  try {
    await setCache(cacheKey, result, 60);
  } catch (_) {}

  return result;
}

/**
 * 4. Get Project Dropdown Metadata (Employees, Contacts, Options) with Redis Caching
 */
export async function getProjectMetadataService() {
  const cacheKey = 'crm:projects:metadata';
  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (_) {}

  const [employees, contacts] = await Promise.all([
    prisma.employee.findMany({
      select: { id: true, name: true, empCode: true, department: true, designation: true },
    }),
    prisma.contact.findMany({
      select: { id: true, contactId: true, name: true, companyName: true, email: true, phone: true },
    }),
  ]);

  const result = {
    data: {
      employees,
      contacts,
      statuses: PROJECT_MODULE.statuses,
      priorities: PROJECT_MODULE.priorities,
      projectTypes: PROJECT_MODULE.projectTypes,
      categories: PROJECT_MODULE.categories,
    },
  };

  try {
    await setCache(cacheKey, result, 300);
  } catch (_) {}

  return result;
}

/**
 * 5. Create Project
 */
export async function createProjectService(body, user) {
  const {
    name,
    description,
    contactId,
    clientName,
    clientEmail,
    clientPhone,
    projectType = 'Fixed Price',
    category = 'Full-Stack Web Development',
    projectManagerId,
    teamMembers = [],
    status = 'Planning',
    priority = 'Medium',
    progress = 0,
    estimatedBudget,
    actualCost,
    startDate,
    targetEndDate,
    actualEndDate,
    figmaUrl,
    githubUrl,
    liveUrl,
  } = body;

  if (!name || !name.trim()) {
    const error = new Error('Project name is required.');
    error.status = 400;
    throw error;
  }

  if (!clientName || !clientName.trim()) {
    const error = new Error('Client name is required.');
    error.status = 400;
    throw error;
  }

  const projectId = body.projectId && body.projectId.trim() ? body.projectId.trim().toUpperCase() : await getNextProjectId();

  let finalProjectManagerName = (body.projectManagerName || body.projectManagerId || '').trim() || null;
  let finalProjectManagerId = (body.projectManagerId || body.projectManagerName || '').trim() || null;

  if (finalProjectManagerId && finalProjectManagerId !== 'none') {
    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: finalProjectManagerId },
          { empCode: finalProjectManagerId },
          { name: { equals: finalProjectManagerName || finalProjectManagerId, mode: 'insensitive' } },
        ],
      },
    });
    if (emp) {
      finalProjectManagerId = emp.id;
      finalProjectManagerName = emp.name;
    }
  } else {
    finalProjectManagerId = null;
    finalProjectManagerName = null;
  }

  let finalClientEmail = clientEmail || null;
  let finalClientPhone = clientPhone || null;
  let finalContactId = contactId || null;

  if (!finalClientEmail || !finalClientPhone || !finalContactId) {
    let matchedContact = null;
    if (finalContactId) {
      matchedContact = await prisma.contact.findFirst({
        where: { OR: [{ id: finalContactId }, { contactId: finalContactId }] },
      });
    }
    if (!matchedContact && clientName) {
      const clientMatch = clientName.match(/^(.*?)\s*\((.*?)\)$/);
      const comp = (clientMatch ? clientMatch[1] : clientName).trim();
      const person = (clientMatch ? clientMatch[2] : '').trim();

      const searchConditions = [];
      if (comp) {
        searchConditions.push({ companyName: { contains: comp, mode: 'insensitive' } });
        searchConditions.push({ name: { contains: comp, mode: 'insensitive' } });
      }
      if (person) {
        searchConditions.push({ name: { contains: person, mode: 'insensitive' } });
        searchConditions.push({ companyName: { contains: person, mode: 'insensitive' } });
      }
      if (searchConditions.length > 0) {
        matchedContact = await prisma.contact.findFirst({ where: { OR: searchConditions } });
      }
    }
    if (matchedContact) {
      if (!finalClientEmail && matchedContact.email) finalClientEmail = matchedContact.email;
      if (!finalClientPhone && matchedContact.phone) finalClientPhone = matchedContact.phone;
      if (!finalContactId && matchedContact.id) finalContactId = matchedContact.id;
    }
  }

  const newProject = await prisma.project.create({
    data: {
      projectId,
      name: name.trim(),
      description: description || null,
      contactId: finalContactId,
      clientName: clientName.trim(),
      clientEmail: finalClientEmail,
      clientPhone: finalClientPhone,
      projectType,
      category,
      projectManagerId: finalProjectManagerId,
      projectManagerName: finalProjectManagerName,
      teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
      status,
      priority,
      progress: Math.min(100, Math.max(0, parseInt(progress, 10) || 0)),
      estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null,
      actualCost: actualCost ? parseFloat(actualCost) : null,
      startDate: startDate || null,
      targetEndDate: targetEndDate || null,
      actualEndDate: actualEndDate || null,
      figmaUrl: figmaUrl || null,
      githubUrl: githubUrl || null,
      liveUrl: liveUrl || null,
      modules: Array.isArray(body.modules) ? body.modules : [],
      createdBy: user?.name || 'System Admin',
    },
  });

  await delCache('crm:projects:*');

  if (io) {
    io.emit('project_created', newProject);
  }

  // Automatically record activity in timeline
  try {
    await recordActivity({
      type: 'progress',
      title: 'Project Handover',
      description: `Handover completed - Assigned to ${newProject.projectManagerName || 'Development Team'}`,
      customerName: newProject.clientName,
      entityId: newProject.id,
      entityType: 'Project',
      entityNumber: newProject.projectId,
      status: newProject.status || 'In Progress',
      performedBy: newProject.projectManagerName || user?.name || 'Deepak V',
      activityDate: newProject.startDate || new Date().toISOString().slice(0, 10),
    });
  } catch (_) {}

  return {
    message: `Project '${newProject.name}' (${newProject.projectId}) created successfully!`,
    data: formatProjectResponse(newProject),
  };
}

/**
 * 6. Update Project
 */
export async function updateProjectService(id, body, user) {
  const existing = await prisma.project.findFirst({
    where: { OR: [{ id }, { projectId: id }] },
  });

  if (!existing) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  let projectManagerName = existing.projectManagerName;
  let projectManagerId = existing.projectManagerId;

  if (body.projectManagerName !== undefined || body.projectManagerId !== undefined) {
    const candidate = (body.projectManagerName || body.projectManagerId || '').trim();
    if (candidate && candidate !== 'none') {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: candidate },
            { empCode: candidate },
            { name: { equals: candidate, mode: 'insensitive' } },
          ],
        },
      });
      if (emp) {
        projectManagerId = emp.id;
        projectManagerName = emp.name;
      } else {
        projectManagerId = candidate;
        projectManagerName = candidate;
      }
    } else {
      projectManagerId = null;
      projectManagerName = null;
    }
  }

  const modulesToCheck = body.modules !== undefined ? body.modules : existing.modules;
  const cleanModulesForUpdate = Array.isArray(modulesToCheck) ? modulesToCheck : [];
  let calculatedStatus = body.status !== undefined ? body.status : existing.status;
  let calculatedProgress = body.progress !== undefined ? body.progress : existing.progress;

  if (cleanModulesForUpdate.length > 0) {
    const allModulesCompleted = cleanModulesForUpdate.every((m) => {
      const isStatusDone = m.status === 'Completed';
      const isProgDone = parseInt(m.progress, 10) === 100;
      return isStatusDone || isProgDone;
    });

    if (allModulesCompleted) {
      calculatedStatus = 'Completed';
      calculatedProgress = 100;
    } else {
      calculatedStatus = 'In Progress';
    }
  }

  const updated = await prisma.project.update({
    where: { id: existing.id },
    data: {
      ...(body.name && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.contactId !== undefined && { contactId: body.contactId }),
      ...(body.clientName && { clientName: body.clientName.trim() }),
      ...(body.clientEmail !== undefined && { clientEmail: body.clientEmail }),
      ...(body.clientPhone !== undefined && { clientPhone: body.clientPhone }),
      ...(body.projectType !== undefined && { projectType: body.projectType }),
      ...(body.category !== undefined && { category: body.category }),
      ...((body.projectManagerId !== undefined || body.projectManagerName !== undefined) && {
        projectManagerId,
        projectManagerName,
      }),
      ...(body.teamMembers !== undefined && {
        teamMembers: Array.isArray(body.teamMembers) ? body.teamMembers : [],
      }),
      status: calculatedStatus,
      ...(body.priority !== undefined && { priority: body.priority }),
      progress: Math.min(100, Math.max(0, parseInt(calculatedProgress, 10) || 0)),
      ...(body.estimatedBudget !== undefined && {
        estimatedBudget: body.estimatedBudget ? parseFloat(body.estimatedBudget) : null,
      }),
      ...(body.actualCost !== undefined && {
        actualCost: body.actualCost ? parseFloat(body.actualCost) : null,
      }),
      ...(body.startDate !== undefined && { startDate: body.startDate }),
      ...(body.targetEndDate !== undefined && { targetEndDate: body.targetEndDate }),
      ...(body.actualEndDate !== undefined && { actualEndDate: body.actualEndDate }),
      ...(body.figmaUrl !== undefined && { figmaUrl: body.figmaUrl }),
      ...(body.githubUrl !== undefined && { githubUrl: body.githubUrl }),
      ...(body.liveUrl !== undefined && { liveUrl: body.liveUrl }),
      ...(Array.isArray(body.modules) && { modules: body.modules }),
    },
  });

  await delCache('crm:projects:*');

  if (io) {
    io.emit('project_updated', updated);
  }

  return {
    message: 'Project updated successfully',
    data: formatProjectResponse(updated),
  };
}

/**
 * 7. Delete Project
 */
export async function deleteProjectService(id, user) {
  const existing = await prisma.project.findFirst({
    where: { OR: [{ id }, { projectId: id }] },
  });

  if (!existing) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  await prisma.project.delete({
    where: { id: existing.id },
  });

  await delCache('crm:projects:*');

  if (io) {
    io.emit('project_deleted', { id: existing.id, projectId: existing.projectId });
  }

  return {
    message: `Project '${existing.name}' (${existing.projectId}) deleted successfully!`,
  };
}

/**
 * Safely generate the next Project ID without collision
 */
export async function getNextProjectId() {
  const allProjects = await prisma.project.findMany({
    select: { projectId: true },
  });
  let maxNum = 0;
  for (const p of allProjects) {
    if (p.projectId) {
      const match = p.projectId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  let nextNum = maxNum + 1;
  let candidateId = nextNum < 100 ? `P${String(nextNum).padStart(3, '0')}` : `PRJ-${nextNum}`;
  while (await prisma.project.findUnique({ where: { projectId: candidateId } })) {
    nextNum++;
    candidateId = nextNum < 100 ? `P${String(nextNum).padStart(3, '0')}` : `PRJ-${nextNum}`;
  }
  return candidateId;
}

/**
 * 8. Update Project Modules & End-to-End Tracking
 */
export async function updateProjectModulesService(id, modules, user) {
  const existing = await prisma.project.findFirst({
    where: { OR: [{ id }, { projectId: id }] },
  });

  if (!existing) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  const cleanModules = Array.isArray(modules) ? modules : [];

  // Auto calculate overall project progress from modules
  let overallProgress = existing.progress;
  if (cleanModules.length > 0) {
    const totalProg = cleanModules.reduce((acc, m) => acc + (parseInt(m.progress, 10) || 0), 0);
    overallProgress = Math.round(totalProg / cleanModules.length);
  }

  let projectStatus = existing.status;
  if (cleanModules.length > 0) {
    const allModulesCompleted = cleanModules.every((m) => {
      const isStatusDone = m.status === 'Completed';
      const isProgDone = parseInt(m.progress, 10) === 100;
      return isStatusDone || isProgDone;
    });

    if (allModulesCompleted) {
      projectStatus = 'Completed';
      overallProgress = 100;
    } else {
      // Until all tasks/modules are complete, status MUST be 'In Progress'
      projectStatus = 'In Progress';
    }
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "Project" SET "modules" = $1::jsonb, "progress" = $2, "status" = $3 WHERE "id" = $4`,
    JSON.stringify(cleanModules),
    overallProgress,
    projectStatus,
    existing.id
  );

  // Synchronize any support ticket tasks linked to these modules back to support_ticket_tasks table
  try {
    for (const m of cleanModules) {
      const descMatch = (m.description || '').match(/\[Ticket\s+([A-Za-z0-9\-]+)\]/i);
      const ticketRef = m.ticketNumber || m.ticketId || (descMatch ? descMatch[1] : null);
      const refMatch = (m.name || '').match(/^(TSK-\d+)/i) || (m.name || '').match(/(TSK-\d+)/i);
      const taskRefNumber = m.taskRefNumber || (refMatch ? refMatch[1] : null);

      if (ticketRef && taskRefNumber) {
        let taskStatus = 'Pending';
        if (m.status === 'Completed' || parseInt(m.progress, 10) >= 100) {
          taskStatus = 'Completed';
        } else if (m.status === 'In Progress' || parseInt(m.progress, 10) > 0) {
          taskStatus = 'In Progress';
        }

        await prisma.$executeRawUnsafe(
          `UPDATE support_ticket_tasks
           SET status = $1, updated_at = NOW()
           WHERE (ticket_id IN (SELECT id FROM support_tickets WHERE ticket_number = $2 OR id::text = $2))
             AND (ref_number = $3 OR id::text = $3)`,
          taskStatus,
          ticketRef,
          taskRefNumber
        );
      }
    }
  } catch (syncErr) {
    console.warn('[updateProjectModulesService] Error syncing to support_ticket_tasks:', syncErr);
  }

  const updatedProject = await getProjectByIdService(existing.id);

  await delCache('crm:projects:*');

  if (io) {
    io.emit('project_updated', updatedProject.data);
  }

  return {
    message: 'Project modules updated successfully',
    data: updatedProject.data,
  };
}

export default {
  getProjectsService,
  getProjectByIdService,
  getProjectStatsService,
  getProjectMetadataService,
  createProjectService,
  updateProjectService,
  deleteProjectService,
  getNextProjectId,
  updateProjectModulesService,
};
