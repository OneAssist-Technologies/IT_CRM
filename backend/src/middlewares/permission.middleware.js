import { prisma } from '../config/prisma.js';
import { getCache, setCache } from '../config/redis.js';

/**
 * Fetch and cache user permissions
 */
export async function getUserPermissions(user) {
  if (!user || !user.id) return null;

  const cacheKey = `crm:perms:${user.id}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      roleRelation: {
        include: {
          permissions: true,
        },
      },
    },
  });

  if (!dbUser?.roleRelation) {
    const isUserSuperAdmin =
      dbUser?.role === 'SUPER_ADMIN' ||
      user.role === 'SUPER_ADMIN';

    if (isUserSuperAdmin) {
      const adminRole = await prisma.role.findFirst({
        where: {
          OR: [
            { slug: 'super_admin' },
            { name: { equals: 'Super Admin', mode: 'insensitive' } },
            { slug: 'admin' },
            { name: { equals: 'Admin', mode: 'insensitive' } },
          ],
        },
        include: { permissions: true },
      });

      const permsMap = {};
      const allModules = [
        'dashboard',
        'employee_dashboard',
        'leads',
        'negotiations',
        'negotiation',
        'contacts',
        'customers',
        'projects',
        'tasks',
        'meetings',
        'scheduled_meetings',
        'call_logs',
        'billing',
        'invoices',
        'quotations',
        'contracts',
        'employee_management',
        'access_control',
        'settings',
        'myprofile',
        'company_profile',
        'calendar',
        'project_catalog',
        'activity_timeline',
        'support_tickets',
        'tickets',
        'activities',
      ];
      allModules.forEach((mod) => {
        permsMap[mod] = {
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true,
          approve: true,
          dataScope: 'All',
        };
      });

      if (adminRole?.permissions) {
        adminRole.permissions.forEach((p) => {
          permsMap[p.moduleId] = {
            view: true,
            create: true,
            edit: true,
            delete: true,
            export: true,
            approve: true,
            dataScope: p.dataScope || 'All',
            view: p.moduleId === 'access_control' ? true : p.canView,
            create: p.moduleId === 'access_control' ? true : p.canCreate,
            edit: p.moduleId === 'access_control' ? true : p.canEdit,
            delete: p.moduleId === 'access_control' ? true : p.canDelete,
            export: p.moduleId === 'access_control' ? true : p.canExport,
            approve: p.moduleId === 'access_control' ? true : p.canApprove,
          };
        });
      }

      const result = {
        role: adminRole
          ? {
              id: adminRole.id,
              name: adminRole.name,
              slug: adminRole.slug,
              isSystem: Boolean(adminRole.isSystem),
            }
          : {
              id: 'super-admin-role',
              name: 'Super Admin',
              slug: 'super_admin',
              isSystem: true,
            },
        permissions: permsMap,
        isSuperAdmin: true,
      };

      await setCache(cacheKey, result, 3600);
      return result;
    } else {
      // Find matching role or fallback to default staff role for non-admin user
      const rawRole = (dbUser?.role || user.role || '').trim();
      const cleanRole = rawRole.toLowerCase();

      let matchedSlug = null;
      if (cleanRole === 'so' || cleanRole.includes('sales oficer') || cleanRole.includes('sales officer')) {
        matchedSlug = cleanRole.includes('madurai') ? 'so_madurai' : 'so';
      } else if (cleanRole.includes('madurai')) {
        matchedSlug = 'so_madurai';
      } else if (cleanRole.includes('sales executive') || cleanRole.includes('sales exec') || cleanRole === 'se') {
        matchedSlug = 'sales_executive';
      } else if (cleanRole.includes('asm') || cleanRole.includes('cbe')) {
        matchedSlug = 'asm_cbe';
      } else if (cleanRole.includes('manage')) {
        matchedSlug = 'management';
      } else if (cleanRole.includes('admin')) {
        matchedSlug = 'admin';
      }

      const orConditions = [
        { name: { equals: rawRole || 'SO', mode: 'insensitive' } },
        { slug: { equals: (rawRole || 'so').toLowerCase().replace(/[\s-]+/g, '_'), mode: 'insensitive' } },
      ];
      if (matchedSlug) {
        orConditions.unshift({ slug: matchedSlug });
      }

      let candidateRole = await prisma.role.findFirst({
        where: { OR: orConditions },
        include: { permissions: true },
      });

      // If still not matched, fallback to first non-system staff role in DB
      if (!candidateRole) {
        candidateRole = await prisma.role.findFirst({
          where: { isSystem: false },
          orderBy: { createdAt: 'asc' },
          include: { permissions: true },
        }) || await prisma.role.findFirst({
          orderBy: { createdAt: 'asc' },
          include: { permissions: true },
        });
      }

      if (candidateRole) {
        dbUser.roleRelation = candidateRole;
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: candidateRole.id },
        }).catch(() => {});
      }
    }
  }

  const role = dbUser?.roleRelation;
  const permsMap = {};
  const isSuperAdmin =
    role?.slug === 'super_admin' ||
    dbUser?.role === 'SUPER_ADMIN' ||
    user?.role === 'SUPER_ADMIN';

  const isAdminOrSuper = isSuperAdmin || role?.slug === 'admin' || role?.appType === 'admin';
  const defaultScope = isAdminOrSuper ? 'All' : 'Own';

  if (role?.permissions) {
    role.permissions.forEach((p) => {
      permsMap[p.moduleId] = {
        view: isSuperAdmin ? true : p.canView,
        create: isSuperAdmin ? true : p.canCreate,
        edit: isSuperAdmin ? true : p.canEdit,
        delete: isSuperAdmin ? true : p.canDelete,
        export: isSuperAdmin ? true : p.canExport,
        approve: isSuperAdmin ? true : p.canApprove,
        dataScope: p.dataScope || defaultScope,
        view: isSuperAdmin && p.moduleId === 'access_control' ? true : p.canView,
        create: isSuperAdmin && p.moduleId === 'access_control' ? true : p.canCreate,
        edit: isSuperAdmin && p.moduleId === 'access_control' ? true : p.canEdit,
        delete: isSuperAdmin && p.moduleId === 'access_control' ? true : p.canDelete,
        export: isSuperAdmin && p.moduleId === 'access_control' ? true : p.canExport,
        approve: isSuperAdmin && p.moduleId === 'access_control' ? true : p.canApprove,
      };
    });

    // Backward compatibility: If 'settings' exists in DB permissions, inherit for sub-modules if not explicitly set
    if (permsMap['settings']) {
      ['myprofile', 'company_profile', 'calendar', 'project_catalog'].forEach((subMod) => {
        if (!permsMap[subMod]) {
          permsMap[subMod] = { ...permsMap['settings'] };
        }
      });
    }
  }

  // Base Guarantee: Every active CRM user always has personal access to employee_dashboard, calendar, & attendance unless explicitly configured
  if (!isSuperAdmin) {
    if (!permsMap['employee_dashboard'] || !permsMap['employee_dashboard'].view) {
      permsMap['employee_dashboard'] = {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: false,
        approve: false,
        dataScope: 'Own',
      };
    }
    // Only default calendar if it has not been configured
    if (permsMap['calendar'] === undefined) {
      permsMap['calendar'] = {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: false,
        approve: false,
        dataScope: 'Own',
      };
    }
    // Only default myprofile if it has not been configured
    if (permsMap['myprofile'] === undefined) {
      permsMap['myprofile'] = {
        view: true,
        create: false,
        edit: true,
        delete: false,
        export: false,
        approve: false,
        dataScope: 'Own',
      };
    }
    if (!permsMap['attendance'] || !permsMap['attendance'].view) {
      permsMap['attendance'] = {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: false,
        approve: false,
        dataScope: 'Own',
      };
    }
  }

  const result = {
    role: role
      ? {
          id: role.id,
          name: role.name,
          slug: role.slug,
          isSystem: role.isSystem,
        }
      : {
          name: dbUser?.role || 'Staff',
          slug: 'custom',
        },
    permissions: permsMap,
    isSuperAdmin,
  };

  await setCache(cacheKey, result, 3600);
  return result;
}

/**
 * Express Middleware: Authorize by Module & Action
 */
export function authorizePermission(moduleId, action = 'view') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      if (req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      const userPerms = await getUserPermissions(req.user);
      if (!userPerms) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Unable to resolve user permissions.',
        });
      }

      if (userPerms.isSuperAdmin) {
        return next();
      }

      // Check requested module or fallback to leads/deals for billing/invoices
      const modulesToCheck = Array.isArray(moduleId) ? [...moduleId] : [moduleId];
      if (modulesToCheck.includes('billing') || modulesToCheck.includes('invoices')) {
        modulesToCheck.push('billing', 'invoices', 'leads', 'deals');
      }

      let hasAccess = false;
      for (const mod of modulesToCheck) {
        const modulePerms = userPerms.permissions?.[mod];
        if (modulePerms && modulePerms[action]) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: `Access denied: You do not have '${action}' permission for '${Array.isArray(moduleId) ? moduleId.join('/') : moduleId}'.`,
          requiredPermission: { module: moduleId, action },
        });
      }

      next();
    } catch (error) {
      console.error('[Authorize Permission Error]', error);
      return res.status(500).json({ success: false, message: 'Internal authorization error.' });
    }
  };
}

/**
 * Get configured data scope ('Own' or 'All') for a user in a specific module
 */
export async function getDataScope(user, moduleId = 'contacts') {
  if (!user) return 'Own';
  const roleUpper = String(user.role || '').toUpperCase();
  if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN') return 'All';

  const userPerms = await getUserPermissions(user);
  if (!userPerms) return 'Own';
  if (userPerms.isSuperAdmin) return 'All';

  const normalizeMap = {
    contacts: ['contacts'],
    leads: ['leads'],
    meetings: ['meetings', 'scheduled_meetings'],
    scheduled_meetings: ['scheduled_meetings', 'meetings'],
    calls: ['calls', 'call_logs'],
    call_logs: ['call_logs', 'calls'],
    customers: ['customers', 'companies'],
    companies: ['companies', 'customers'],
    projects: ['projects', 'projects_management'],
    projects_management: ['projects_management', 'projects'],
    activity_timeline: ['activity_timeline', 'activity', 'activities'],
    activity: ['activity', 'activity_timeline', 'activities'],
    activities: ['activities', 'activity_timeline', 'activity'],
    support_tickets: ['support_tickets', 'tickets'],
    tickets: ['tickets', 'support_tickets'],
    project_catalog: ['project_catalog', 'settings'],
    calendar: ['calendar', 'settings'],
    myprofile: ['myprofile', 'settings'],
    company_profile: ['company_profile', 'settings'],
  };

  const candidates = normalizeMap[moduleId.toLowerCase()] || [moduleId];
  for (const mod of candidates) {
    const configuredScope = userPerms.permissions?.[mod]?.dataScope;
    if (configuredScope) return configuredScope;
  }
  const roleSlug = userPerms.role?.slug?.toLowerCase();
  const appType = userPerms.role?.appType?.toLowerCase();
  if (roleSlug === 'admin' || roleSlug === 'super_admin' || appType === 'admin') {
    return 'All';
  }

  // Lead module access for employees is strictly scoped to assigned leads
  if (moduleId === 'leads') {
    return 'Own';
  }

  const configuredScope = userPerms.permissions?.[moduleId]?.dataScope;
  if (configuredScope) return configuredScope;

  return 'Own';
}

/**
 * Resolve user identity details and scope context for database querying
 */
export async function resolveUserScope(user, moduleId = 'contacts') {
  if (!user) {
    return {
      scope: 'Own',
      isAll: false,
      ids: [],
      names: [],
      emails: [],
      batchIds: [],
    };
  }

  const scope = await getDataScope(user, moduleId);
  if (scope === 'All') {
    return {
      scope: 'All',
      isAll: true,
      user,
    };
  }

  // Resolve matching employee record for the user
  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        ...(user.email ? [{ email: { equals: user.email, mode: 'insensitive' } }] : []),
        ...(user.name ? [{ name: { equals: user.name, mode: 'insensitive' } }] : []),
        ...(user.id ? [{ id: user.id }] : []),
      ],
    },
  });

  const ids = new Set();
  const names = new Set();
  const emails = new Set();

  if (user.id) ids.add(user.id);
  if (user.name) names.add(user.name.toLowerCase());
  if (user.email) emails.add(user.email.toLowerCase());

  if (emp) {
    if (emp.id) ids.add(emp.id);
    if (emp.empCode) ids.add(emp.empCode);
    if (emp.name) names.add(emp.name.toLowerCase());
    if (emp.email) emails.add(emp.email.toLowerCase());
  }

  // Also prefetch batch IDs imported by this user to grant imported contact visibility
  const userBatches = await prisma.importBatch.findMany({
    where: {
      OR: [
        ...Array.from(ids).map(id => ({ createdBy: id })),
        ...Array.from(names).map(name => ({ createdBy: { equals: name, mode: 'insensitive' } })),
        ...Array.from(emails).map(email => ({ createdBy: { equals: email, mode: 'insensitive' } })),
      ],
    },
    select: { batchId: true },
  });
  const batchIds = userBatches.map(b => b.batchId).filter(Boolean);

  return {
    scope: 'Own',
    isAll: false,
    user,
    employee: emp,
    ids: Array.from(ids),
    names: Array.from(names),
    emails: Array.from(emails),
    batchIds,
  };
}

/**
 * Build Prisma WHERE filter for Contacts based on user scope
 */
export function buildContactScopeFilter(userScope) {
  if (!userScope || userScope.isAll) return null;

  const { ids, names, emails, batchIds = [] } = userScope;
  const or = [];

  // 1. Created by user
  ids.forEach(id => or.push({ createdBy: id }));
  names.forEach(name => or.push({ createdBy: { equals: name, mode: 'insensitive' } }));
  emails.forEach(email => or.push({ createdBy: { equals: email, mode: 'insensitive' } }));

  // 2. Assigned to user / employee
  ids.forEach(id => or.push({ assignedTo: id }));
  names.forEach(name => or.push({ assignedToName: { equals: name, mode: 'insensitive' } }));

  // 3. Imported by user (via batch)
  if (batchIds.length > 0) {
    or.push({ batchId: { in: batchIds } });
  }

  return or.length > 0 ? { OR: or } : { id: '__none__' };
}

/**
 * Build Prisma WHERE filter for BulkUploadContact based on user scope
 */
export function buildBulkContactScopeFilter(userScope) {
  if (!userScope || userScope.isAll) return null;

  const { ids, names, emails, batchIds = [] } = userScope;
  const or = [];

  // 1. Created / imported by user
  ids.forEach(id => or.push({ createdBy: id }));
  names.forEach(name => or.push({ createdBy: { equals: name, mode: 'insensitive' } }));
  emails.forEach(email => or.push({ createdBy: { equals: email, mode: 'insensitive' } }));

  // 2. Assigned to user / employee
  ids.forEach(id => or.push({ assignedTo: id }));
  names.forEach(name => or.push({ assignedToName: { equals: name, mode: 'insensitive' } }));

  // 3. Batch membership
  if (batchIds.length > 0) {
    or.push({ batchId: { in: batchIds } });
  }

  return or.length > 0 ? { OR: or } : { id: '__none__' };
}

/**
 * Build Prisma WHERE filter for ImportBatch based on user scope
 */
export function buildImportBatchScopeFilter(userScope) {
  if (!userScope || userScope.isAll) return null;

  const { ids, names, emails } = userScope;
  const or = [];

  ids.forEach(id => or.push({ createdBy: id }));
  names.forEach(name => or.push({ createdBy: { equals: name, mode: 'insensitive' } }));
  emails.forEach(email => or.push({ createdBy: { equals: email, mode: 'insensitive' } }));

  ids.forEach(id => or.push({ assignedTo: id }));
  names.forEach(name => or.push({ assignedToName: { equals: name, mode: 'insensitive' } }));

  return or.length > 0 ? { OR: or } : { id: '__none__' };
}

/**
 * Build Prisma WHERE filter for Leads based on user scope
 */
export function buildLeadScopeFilter(userScope) {
  if (!userScope || userScope.isAll) return null;

  const { ids, names } = userScope;
  const or = [];

  // Filter leads strictly by assigned employee / assigned owner
  ids.forEach(id => or.push({ assignedTo: id }));
  names.forEach(name => {
    or.push({ assignedToName: { equals: name, mode: 'insensitive' } });
    or.push({ assignedTo: { equals: name, mode: 'insensitive' } });
  });

  return or.length > 0 ? { OR: or } : { id: '__none__' };
}

/**
 * Check if a single record is accessible to the user
 */
export function isRecordAccessible(record, userScope) {
  if (!userScope || userScope.isAll) return true;
  if (!record) return false;

  const { ids, names, emails, batchIds = [] } = userScope;

  const recordCreated = (record.createdBy || '').toLowerCase();
  const recordCreatedName = (record.createdByName || '').toLowerCase();
  const recordAssigned = record.assignedTo || '';
  const recordAssignedName = (record.assignedToName || '').toLowerCase();
  const recordBatchId = record.batchId || '';

  if (recordCreated) {
    if (ids.includes(record.createdBy)) return true;
    if (names.includes(recordCreated)) return true;
    if (emails.includes(recordCreated)) return true;
  }

  if (recordCreatedName) {
    if (names.includes(recordCreatedName)) return true;
  }

  if (recordAssigned) {
    if (ids.includes(recordAssigned)) return true;
    if (names.includes(recordAssigned.toLowerCase())) return true;
  }

  if (recordAssignedName) {
    if (names.includes(recordAssignedName)) return true;
  }

  if (recordBatchId && batchIds.includes(recordBatchId)) {
    return true;
  }

  return false;
}

export default {
  getUserPermissions,
  authorizePermission,
  getDataScope,
  resolveUserScope,
  buildContactScopeFilter,
  buildBulkContactScopeFilter,
  buildImportBatchScopeFilter,
  buildLeadScopeFilter,
  isRecordAccessible,
};
