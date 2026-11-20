import { prisma } from '../config/prisma.js';
import { EXCLUDED_LEGACY_MODULES } from '../models/model.registry.js';

/**
 * Generate a URL/DB safe slug from a role name
 * e.g., "Sales Executive" -> "sales_executive"
 */
export function generateRoleSlug(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Count active (true) permissions across all modules for a role
 */
export function countActivePermissions(permissions = []) {
  if (!Array.isArray(permissions)) return 0;
  return permissions.reduce((count, p) => {
    let active = 0;
    if (p.canView) active++;
    if (p.canCreate) active++;
    if (p.canEdit) active++;
    if (p.canDelete) active++;
    if (p.canExport) active++;
    if (p.canApprove) active++;
    return count + active;
  }, 0);
}

/**
 * Format a Prisma Role object with userCount, activePermissionsCount, and relations
 */
export function formatRoleResponse(role) {
  if (!role) return null;
  const filteredPermissions = (role.permissions || []).filter(
    (p) => !EXCLUDED_LEGACY_MODULES.has(p.moduleId)
  );
  const activePermissionsCount = countActivePermissions(filteredPermissions);
  const users = role.users || [];

  return {
    id: role.id,
    name: role.name,
    slug: role.slug,
    description: role.description,
    isSystem: Boolean(role.isSystem),
    appType: role.appType,
    parentRoleId: role.parentRoleId || role.parentRole?.id || null,
    userCount: users.length,
    users: users,
    activePermissionsCount,
    parentRole: role.parentRole || null,
    childRoles: role.childRoles || [],
    permissions: filteredPermissions,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

/**
 * Log an Access Control Action to AccessAuditLog table
 */
export async function logAccessAudit({
  userId = null,
  userName = 'System Admin',
  action,
  targetType = 'Role',
  targetName = '',
  details = {},
  ipAddress = '127.0.0.1',
}) {
  try {
    return await prisma.accessAuditLog.create({
      data: {
        userId,
        userName,
        action,
        targetType,
        targetName,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        ipAddress,
      },
    });
  } catch (error) {
    console.error('[logAccessAudit Error]:', error.message);
    return null;
  }
}

export default {
  generateRoleSlug,
  countActivePermissions,
  formatRoleResponse,
  logAccessAudit,
};
