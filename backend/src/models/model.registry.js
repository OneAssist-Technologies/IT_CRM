import { prisma } from '../config/prisma.js';

/**
 * Exact System Modules Registry for this IT CRM Application
 * Matches the sidebar navigation 1:1
 */
export const SYSTEM_MODULES = [
  // 1. Main Navigation
  {
    id: 'dashboard',
    name: 'Dashboard',
    category: 'Main Navigation',
    description: 'Executive analytics, revenue, KPIs, and overview charts.',
  },
  {
    id: 'employee_dashboard',
    name: 'Employee Dashboard',
    category: 'Main Navigation',
    description: 'Personal employee dashboard, assigned tasks, leads, and operational workflow.',
  },
  {
    id: 'employee_management',
    name: 'Employee Management',
    category: 'Main Navigation',
    description: 'Staff directory, onboarding, designations, and employee records.',
  },
  {
    id: 'contacts',
    name: 'Contacts',
    category: 'Main Navigation',
    description: 'Customer profiles, contact details, and account ownership.',
  },
  {
    id: 'leads',
    name: 'Leads',
    category: 'Main Navigation',
    description: 'Prospect pipeline, lead stages, and qualification workflows.',
  },
  {
    id: 'scheduled_meetings',
    name: 'Meetings',
    category: 'Main Navigation',
    description: 'Date-wise scheduled client and team meetings, employee creator tracking, and timings.',
  },
  {
    id: 'call_logs',
    name: 'Call Logs',
    category: 'Main Navigation',
    description: 'Telephony records, call durations, notes, and follow-ups.',
  },
  {
    id: 'customers',
    name: 'Customers',
    category: 'Main Navigation',
    description: 'Client company directories, accounts, and relationship history.',
  },
  {
    id: 'projects',
    name: 'Projects Management',
    category: 'Main Navigation',
    description: 'Client project delivery, sprints, milestones, and task SLAs.',
  },
  {
    id: 'activity_timeline',
    name: 'Activity Timeline',
    category: 'Main Navigation',
    description: 'Chronological timeline of all CRM activities across leads, customers, and deals.',
  },

  // 2. Administration & Security
  {
    id: 'access_control',
    name: 'Access Control & RBAC',
    category: 'Administration & Security',
    description: 'Role-Based Access Control, permissions matrix, and role hierarchy.',
  },
  {
    id: 'settings',
    name: 'Settings & Master Catalog',
    category: 'Administration & Security',
    description: 'Company profile, project & module catalog templates, CRM pipeline presets, and system configurations.',
  },
];

export const MODULE_CATEGORIES = [
  'Main Navigation',
  'Administration & Security',
  'Custom Modules',
];

// Obsolete / legacy template module IDs to exclude from display
export const EXCLUDED_LEGACY_MODULES = new Set([
  'calendar',
  'daily_working_plan',
  'distributor_dashboard',
  'client_visits',
  'daily_reports',
  'beat_planning',
  'attendance',
  'shift_details',
  'area_dashboard',
  'leave_management',
  'deals',
  'companies',
  'audit_logs',
  'employees', // aliased to employee_management
  'calls', // aliased to call_logs
  'projects_management', // aliased to projects
  'meetings', // aliased to scheduled_meetings
  'rbac', // aliased to access_control
  'billing', // standalone billing module excluded from sidebar/rbac
  'negotiations',
  'invoices',
]);

/**
 * Fetch active IT CRM modules (System Modules + any user-created Custom Modules)
 */
export async function getDynamicModules() {
  const dbPermissions = await prisma.rolePermission.findMany({
    select: {
      moduleId: true,
      moduleName: true,
      category: true,
    },
    distinct: ['moduleId'],
  });

  const modulesMap = new Map();
  SYSTEM_MODULES.forEach((m) => modulesMap.set(m.id, { ...m, isSystem: true }));

  // Only include user-created custom modules, ignore obsolete legacy template modules
  dbPermissions.forEach((p) => {
    if (!modulesMap.has(p.moduleId) && !EXCLUDED_LEGACY_MODULES.has(p.moduleId)) {
      modulesMap.set(p.moduleId, {
        id: p.moduleId,
        name: p.moduleName || p.moduleId,
        category: p.category || 'Custom Modules',
        description: `Custom module: ${p.moduleName || p.moduleId}`,
        isSystem: false,
      });
    }
  });

  return Array.from(modulesMap.values());
}

/**
 * Dynamically fetch all distinct categories
 */
export async function getDynamicCategories() {
  const modules = await getDynamicModules();
  return Array.from(new Set(modules.map((m) => m.category))).filter(Boolean);
}

export const getSystemModules = () => SYSTEM_MODULES;

export default {
  SYSTEM_MODULES,
  MODULE_CATEGORIES,
  getSystemModules,
  getDynamicModules,
  getDynamicCategories,
};
