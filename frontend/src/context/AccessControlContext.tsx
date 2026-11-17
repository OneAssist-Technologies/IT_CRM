import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Role,
  SystemModule,
  UserWithRole,
  AccessAuditLog,
  RoleFormData,
  MyPermissionsResponse,
  PermissionAction,
} from '../types/accessControl';
import { accessControlService } from '../services/accessControlService';
import { useCRM } from './CRMContext';

interface AccessControlContextType {
  roles: Role[];
  selectedRole: Role | null;
  setSelectedRole: (role: Role | null) => void;
  systemModules: SystemModule[];
  users: UserWithRole[];
  auditLogs: AccessAuditLog[];
  myPermissions: MyPermissionsResponse | null;
  permissionsLoaded: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;

  // Permission Checker Functions
  can: (moduleId: string, action?: PermissionAction) => boolean;
  canView: (moduleId: string) => boolean;
  canCreate: (moduleId: string) => boolean;
  canEdit: (moduleId: string) => boolean;
  canDelete: (moduleId: string) => boolean;
  canExport: (moduleId: string) => boolean;
  canApprove: (moduleId: string) => boolean;
  getDataScope: (moduleId: string) => 'Own' | 'All';

  // CRUD & Management Actions
  fetchRoles: () => Promise<void>;
  fetchUsers: (params?: { search?: string; roleId?: string; department?: string }) => Promise<void>;
  fetchAuditLogs: (params?: { action?: string; targetType?: string }) => Promise<void>;
  fetchMyPermissions: () => Promise<void>;
  createRole: (data: RoleFormData) => Promise<{ success: boolean; role?: Role; message?: string }>;
  updateRole: (id: string, data: Partial<RoleFormData>) => Promise<{ success: boolean; role?: Role; message?: string }>;
  cloneRole: (id: string, newName: string, description?: string) => Promise<{ success: boolean; role?: Role; message?: string }>;
  deleteRole: (
    id: string,
    reassignToRoleId?: string
  ) => Promise<{ success: boolean; message?: string; requiresReassignment?: boolean; assignedUserCount?: number }>;
  assignUserRole: (userId: string, roleId: string) => Promise<{ success: boolean; message?: string }>;
  bulkAssignUserRoles: (userIds: string[], roleId: string) => Promise<{ success: boolean; message?: string }>;
  createModule: (data: { name: string; category?: string; description?: string }) => Promise<{ success: boolean; module?: SystemModule; message?: string }>;
}

const DEFAULT_SYSTEM_MODULES: SystemModule[] = [
  // 1. Main Navigation
  { id: 'dashboard', name: 'Dashboard', category: 'Main Navigation', description: 'Executive analytics, revenue, KPIs, and overview charts.' },
  { id: 'employee_dashboard', name: 'Employee Dashboard', category: 'Main Navigation', description: 'Personal employee dashboard, assigned tasks, leads, and operational workflow.' },
  { id: 'employee_management', name: 'Employee Management', category: 'Main Navigation', description: 'Staff directory, onboarding, designations, and employee records.' },
  { id: 'contacts', name: 'Contacts', category: 'Main Navigation', description: 'Customer profiles, contact details, and account ownership.' },
  { id: 'leads', name: 'Leads', category: 'Main Navigation', description: 'Prospect pipeline, lead stages, and qualification workflows.' },
  { id: 'scheduled_meetings', name: 'Meetings', category: 'Main Navigation', description: 'Date-wise scheduled client and team meetings, employee creator tracking, and timings.' },
  { id: 'call_logs', name: 'Call Logs', category: 'Main Navigation', description: 'Activity logs including Calls, WhatsApp messages, Emails, and Other interactions.' },
  { id: 'customers', name: 'Customers', category: 'Main Navigation', description: 'Client company directories, accounts, and relationship history.' },
  { id: 'projects', name: 'Projects Management', category: 'Main Navigation', description: 'Client project delivery, sprints, milestones, and task SLAs.' },
  { id: 'activity_timeline', name: 'Activity Timeline', category: 'Main Navigation', description: 'Chronological timeline of all CRM activities across leads, customers, and deals.' },
  { id: 'support_tickets', name: 'Support Tickets', category: 'Main Navigation', description: 'Customer support tickets, SLA tracking, investigation, and multi-channel resolution.' },

  // 2. Administration & Security
  { id: 'access_control', name: 'Access Control', category: 'Administration & Security', description: 'Role-Based Access Control, permissions matrix, and role hierarchy.' },
  { id: 'settings', name: 'Settings & Master Data', category: 'Administration & Security', description: 'Company profile, project & module catalog templates, CRM pipeline presets, and system configurations.' },
  { id: 'myprofile', name: 'My Profile', category: 'Administration & Security', description: 'Personal user profile, account credentials, and password settings.', parentId: 'settings' },
  { id: 'company_profile', name: 'Company Profile', category: 'Administration & Security', description: 'Company registration details, corporate branding, GSTIN, and organization settings.', parentId: 'settings' },
  { id: 'calendar', name: 'Calendar & Reminders', category: 'Administration & Security', description: 'Personal and organizational calendar, event scheduling, and reminder alerts.', parentId: 'settings' },
  { id: 'project_catalog', name: 'Project Catalog', category: 'Administration & Security', description: 'Master projects catalog, deliverables scope, pricing presets, and module templates.', parentId: 'settings' },
];

export const DEFAULT_ACCESS_CONTROL_VALUE: AccessControlContextType = {
  roles: [],
  selectedRole: null,
  setSelectedRole: () => {},
  systemModules: DEFAULT_SYSTEM_MODULES,
  users: [],
  auditLogs: [],
  myPermissions: null,
  permissionsLoaded: false,
  isSuperAdmin: false,
  loading: false,
  saving: false,
  error: null,
  can: () => false,
  canView: () => false,
  canCreate: () => false,
  canEdit: () => false,
  canDelete: () => false,
  canExport: () => false,
  canApprove: () => false,
  getDataScope: () => 'All',
  fetchRoles: async () => {},
  fetchUsers: async () => {},
  fetchAuditLogs: async () => {},
  fetchMyPermissions: async () => {},
  createRole: async () => ({ success: false }),
  updateRole: async () => ({ success: false }),
  cloneRole: async () => ({ success: false }),
  deleteRole: async () => ({ success: false }),
  assignUserRole: async () => ({ success: false }),
  bulkAssignUserRoles: async () => ({ success: false }),
  createModule: async () => ({ success: false }),
};

const AccessControlContext = createContext<AccessControlContextType>(DEFAULT_ACCESS_CONTROL_VALUE);

export const AccessControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated, isAuthChecking, activeNav } = useCRM();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [systemModules, setSystemModules] = useState<SystemModule[]>(DEFAULT_SYSTEM_MODULES);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AccessAuditLog[]>([]);
  const [myPermissions, setMyPermissions] = useState<MyPermissionsResponse | null>(() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
      if (!token) return null;
      const saved = localStorage.getItem('crm_my_permissions');
      if (saved) {
        const parsed = JSON.parse(saved);
        const userSaved = localStorage.getItem('crm_user');
        const parsedUser = userSaved ? JSON.parse(userSaved) : null;
        if (parsed && parsedUser && parsed.user?.id === parsedUser.id) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [permissionsLoaded, setPermissionsLoaded] = useState<boolean>(() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
      return Boolean(token && localStorage.getItem('crm_my_permissions'));
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPublicPage = Boolean(
    activeNav === 'signup' ||
      activeNav === 'login' ||
      activeNav === 'reset-password' ||
      (typeof window !== 'undefined' &&
        (window.location.pathname.includes('/signup') ||
          window.location.pathname.includes('/login') ||
          window.location.pathname.includes('/reset-password')))
  );

  const hasValidToken = () => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('crm_token');
    return Boolean(token && token.trim() && token !== 'null' && token !== 'undefined');
  };

  // Session / User Switch Cleanup
  useEffect(() => {
    if (!hasValidToken() || !isAuthenticated || isPublicPage || !currentUser?.id) {
      setRoles([]);
      setUsers([]);
      setAuditLogs([]);
      if (!hasValidToken() || !isAuthenticated || isPublicPage) {
        setMyPermissions(null);
        setPermissionsLoaded(false);
        try {
          localStorage.removeItem('crm_my_permissions');
        } catch {}
      }
    }
  }, [isAuthenticated, isPublicPage, currentUser?.id]);

  // 1. Fetch My Permissions
  const fetchMyPermissions = useCallback(async () => {
    if (!hasValidToken() || !isAuthenticated || isAuthChecking || isPublicPage) return;
    try {
      const res = await accessControlService.getMyPermissions();
      if (res.success && res.data) {
        setMyPermissions(res.data);
        setPermissionsLoaded(true);
        try {
          localStorage.setItem('crm_my_permissions', JSON.stringify(res.data));
        } catch {}
      }
    } catch {
      setPermissionsLoaded(true);
    }
  }, [isAuthenticated, isAuthChecking, isPublicPage]);

  // Permission Checkers
  const isUserMatchingPermissions = Boolean(
    currentUser?.id && myPermissions?.user?.id && currentUser.id === myPermissions.user.id
  );

  const roleSlugStr = (
    (isUserMatchingPermissions ? myPermissions?.role?.slug || myPermissions?.role?.name : '') ||
    currentUser?.role ||
    ''
  ).toLowerCase().trim();

  const roleUpper = String(currentUser?.role || '').toUpperCase().trim();
  const isExplicitEmployee = Boolean(
    roleUpper &&
      roleUpper !== 'SUPER_ADMIN' &&
      roleUpper !== 'SUPER ADMIN' &&
      roleUpper !== 'ADMIN' &&
      roleUpper !== 'MANAGEMENT'
  );

  // True Super Admin gets bypass from verified server permissions, user profile or sandy@gmail.com (when not explicitly an employee role)
  const isSuperAdmin = Boolean(
    isAuthenticated &&
      !isPublicPage &&
      !isExplicitEmployee &&
      (roleUpper === 'SUPER_ADMIN' ||
        roleUpper === 'SUPER ADMIN' ||
        (currentUser?.email && currentUser.email.toLowerCase() === 'sandy@gmail.com') ||
        (isUserMatchingPermissions && myPermissions?.isSuperAdmin) ||
        (isUserMatchingPermissions && roleSlugStr === 'super_admin'))
  );

  const hasAccessControlAccess = Boolean(
    isAuthenticated &&
      !isPublicPage &&
      (isSuperAdmin ||
        (isUserMatchingPermissions &&
          Boolean(
            myPermissions?.permissions?.['access_control']?.view ||
            (myPermissions?.permissions?.['access_control'] as any)?.canView
          )))
  );

  // 2. Fetch Roles & Modules
  const fetchRoles = useCallback(async () => {
    if (!hasValidToken() || !isAuthenticated || isAuthChecking || isPublicPage || !hasAccessControlAccess) return;
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, modulesRes] = await Promise.all([
        accessControlService.getRoles(),
        accessControlService.getModules(),
      ]);

      // Populate system modules
      const filterLegacy = (mods: SystemModule[]) =>
        mods.filter((m) => m.id !== 'negotiations' && m.id !== 'invoices');

      if (modulesRes.success && modulesRes.modules && modulesRes.modules.length > 0) {
        setSystemModules(filterLegacy(modulesRes.modules));
      } else if (rolesRes.success && rolesRes.systemModules && rolesRes.systemModules.length > 0) {
        setSystemModules(filterLegacy(rolesRes.systemModules));
      }

      if (rolesRes.success && rolesRes.roles) {
        setRoles(rolesRes.roles);
        setSelectedRole((prev) => {
          if (prev) {
            const matched = rolesRes.roles!.find((r) => r.id === prev.id);
            return matched || rolesRes.roles![0] || null;
          }
          return rolesRes.roles![0] || null;
        });
      } else {
        setError(rolesRes.message || 'Failed to fetch roles');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isAuthChecking, isPublicPage, hasAccessControlAccess]);

  // 3. Fetch Users
  const fetchUsers = useCallback(
    async (params?: { search?: string; roleId?: string; department?: string }) => {
      if (!hasValidToken() || !isAuthenticated || isAuthChecking || isPublicPage || !hasAccessControlAccess) return;
      const res = await accessControlService.getUsers(params);
      if (res.success && res.users) {
        setUsers(res.users);
      }
    },
    [isAuthenticated, isAuthChecking, isPublicPage, hasAccessControlAccess]
  );

  // 4. Fetch Audit Logs
  const fetchAuditLogs = useCallback(
    async (params?: { action?: string; targetType?: string }) => {
      if (!hasValidToken() || !isAuthenticated || isAuthChecking || isPublicPage || !hasAccessControlAccess) return;
      const res = await accessControlService.getAuditLogs(params);
      if (res.success && res.logs) {
        setAuditLogs(res.logs);
      }
    },
    [isAuthenticated, isAuthChecking, isPublicPage, hasAccessControlAccess]
  );

  useEffect(() => {
    if (!hasValidToken() || !isAuthenticated || isAuthChecking || isPublicPage) return;
    fetchMyPermissions();
  }, [fetchMyPermissions, currentUser?.id, isAuthenticated, isAuthChecking, isPublicPage]);

  useEffect(() => {
    if (!hasValidToken() || !isAuthenticated || isAuthChecking || isPublicPage || !hasAccessControlAccess) return;
    // Only load full management dataset if user is actively on access-control or employee management page
    if (activeNav === 'access-control' || activeNav === 'employees' || activeNav === 'add-employee') {
      fetchRoles();
      fetchUsers();
      if (activeNav === 'access-control') {
        fetchAuditLogs();
      }
    }
  }, [hasAccessControlAccess, activeNav, fetchRoles, fetchUsers, fetchAuditLogs, isAuthenticated, isAuthChecking, isPublicPage]);

  useEffect(() => {
    const handlePermsUpdated = () => {
      if (!hasValidToken() || !isAuthenticated || isAuthChecking || isPublicPage) return;
      fetchMyPermissions();
      if (hasAccessControlAccess && (activeNav === 'access-control' || activeNav === 'employees' || activeNav === 'add-employee')) {
        fetchRoles();
      }
    };
    window.addEventListener('crm_permissions_updated', handlePermsUpdated);
    return () => {
      window.removeEventListener('crm_permissions_updated', handlePermsUpdated);
    };
  }, [hasAccessControlAccess, activeNav, fetchMyPermissions, fetchRoles, isAuthenticated, isAuthChecking, isPublicPage]);

  const can = useCallback(
    (moduleId: string, action: PermissionAction = 'view'): boolean => {
      // Alias mapping between sidebar IDs, route names, and DB keys
      const normalizeMap: Record<string, string[]> = {
        dashboard: ['dashboard'],
        employee_dashboard: ['employee_dashboard', 'employee-dashboard'],
        'employee-dashboard': ['employee_dashboard', 'employee-dashboard'],
        employee_management: ['employee_management', 'employees'],
        employees: ['employees', 'employee_management'],
        contacts: ['contacts'],
        leads: ['leads'],
        scheduled_meetings: ['scheduled_meetings', 'meetings'],
        meetings: ['meetings', 'scheduled_meetings'],
        call_logs: ['call_logs', 'activity_logs', 'calls'],
        activity_logs: ['activity_logs', 'call_logs', 'calls'],
        calls: ['calls', 'call_logs', 'activity_logs'],
        customers: ['customers', 'companies'],
        companies: ['companies', 'customers'],
        projects: ['projects', 'projects_management'],
        projects_management: ['projects_management', 'projects'],
        activity_timeline: ['activity_timeline', 'activities'],
        activities: ['activity_timeline', 'activities'],
        access_control: ['access_control', 'rbac'],
        rbac: ['rbac', 'access_control'],
        settings: ['settings', 'myprofile', 'company_profile', 'calendar', 'project_catalog'],
        myprofile: ['myprofile', 'profile', 'settings'],
        profile: ['profile', 'myprofile', 'settings'],
        company_profile: ['company_profile', 'company', 'settings'],
        company: ['company', 'company_profile', 'settings'],
        calendar: ['calendar', 'settings'],
        project_catalog: ['project_catalog', 'projects_catalog', 'master_catalog', 'settings'],
        projects_catalog: ['projects_catalog', 'project_catalog', 'master_catalog', 'settings'],
      };

      const candidates = normalizeMap[moduleId] || [moduleId];

      // If user has permissions loaded from backend, check the explicit permission
      if (myPermissions?.permissions) {
        for (const key of candidates) {
          const p = myPermissions.permissions[key];
          if (p) {
            const val =
              action === 'view'
                ? (p.view !== undefined ? p.view : (p as any).canView)
                : action === 'create'
                ? (p.create !== undefined ? p.create : (p as any).canCreate)
                : action === 'edit'
                ? (p.edit !== undefined ? p.edit : (p as any).canEdit)
                : action === 'delete'
                ? (p.delete !== undefined ? p.delete : (p as any).canDelete)
                : action === 'export'
                ? (p.export !== undefined ? p.export : (p as any).canExport)
                : action === 'approve'
                ? (p.approve !== undefined ? p.approve : (p as any).canApprove)
                : (p as any)[action];

            if (val !== undefined) {
              return Boolean(val);
            }
          }
        }
      }

      // If no explicit permission entry was found and user is Super Admin, grant access
      if (isSuperAdmin) return true;

      // Base guarantee: employee_dashboard is always accessible to any authenticated employee
      if (moduleId === 'employee_dashboard' || moduleId === 'employee-dashboard') {
        return true;
      }

      // If permissions are not yet loaded and no cache exists, do not block or flip screen during initial render
      if (!permissionsLoaded) {
        return true;
      }

      return false;
    },
    [isSuperAdmin, myPermissions, permissionsLoaded]
  );

  const canView = useCallback((moduleId: string) => can(moduleId, 'view'), [can]);
  const canCreate = useCallback((moduleId: string) => can(moduleId, 'create'), [can]);
  const canEdit = useCallback((moduleId: string) => can(moduleId, 'edit'), [can]);
  const canDelete = useCallback((moduleId: string) => can(moduleId, 'delete'), [can]);
  const canExport = useCallback((moduleId: string) => can(moduleId, 'export'), [can]);
  const canApprove = useCallback((moduleId: string) => can(moduleId, 'approve'), [can]);

  const getDataScope = useCallback(
    (moduleId: string): 'Own' | 'All' => {
      if (isSuperAdmin) return 'All';
      const cleanMod = moduleId.toLowerCase().trim();
      const normalizeMap: Record<string, string[]> = {
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

      const candidates = normalizeMap[cleanMod] || [cleanMod];
      for (const key of candidates) {
        const perm = myPermissions?.permissions?.[key];
        if (perm && (perm as any).dataScope) {
          return (perm as any).dataScope;
        }
      }

      if (['admin', 'super_admin'].includes(roleSlugStr)) return 'All';
      return 'Own';
    },
    [isSuperAdmin, myPermissions, roleSlugStr]
  );

  // Actions
  const createRole = async (data: RoleFormData) => {
    setSaving(true);
    const res = await accessControlService.createRole(data);
    setSaving(false);
    if (res.success && res.role) {
      await fetchRoles();
      setSelectedRole(res.role);
    }
    return res;
  };

  const updateRole = async (id: string, data: Partial<RoleFormData>) => {
    setSaving(true);
    const res = await accessControlService.updateRole(id, data);
    setSaving(false);
    if (res.success && res.role) {
      await fetchRoles();
      setSelectedRole(res.role);
      await fetchMyPermissions();
    }
    return res;
  };

  const cloneRole = async (id: string, newName: string, description?: string) => {
    setSaving(true);
    const res = await accessControlService.cloneRole(id, newName, description);
    setSaving(false);
    if (res.success && res.role) {
      await fetchRoles();
      setSelectedRole(res.role);
    }
    return res;
  };

  const deleteRole = async (id: string, reassignToRoleId?: string) => {
    setSaving(true);
    const res = await accessControlService.deleteRole(id, reassignToRoleId);
    setSaving(false);
    if (res.success) {
      await fetchRoles();
      await fetchUsers();
    }
    return res;
  };

  const assignUserRole = async (userId: string, roleId: string) => {
    setSaving(true);
    const res = await accessControlService.assignUserRole(userId, roleId);
    setSaving(false);
    if (res.success) {
      await fetchUsers();
      await fetchRoles();
    }
    return res;
  };

  const bulkAssignUserRoles = async (userIds: string[], roleId: string) => {
    setSaving(true);
    const res = await accessControlService.bulkAssignUserRoles(userIds, roleId);
    setSaving(false);
    if (res.success) {
      await fetchUsers();
      await fetchRoles();
    }
    return res;
  };

  const createModule = async (data: { name: string; category?: string; description?: string }) => {
    setSaving(true);
    const res = await accessControlService.createModule(data);
    setSaving(false);
    if (res.success && res.module) {
      await fetchRoles();
    }
    return res;
  };

  return (
    <AccessControlContext.Provider
      value={{
        roles,
        selectedRole,
        setSelectedRole,
        systemModules,
        users,
        auditLogs,
        myPermissions,
        permissionsLoaded,
        isSuperAdmin,
        loading,
        saving,
        error,
        can,
        canView,
        canCreate,
        canEdit,
        canDelete,
        canExport,
        canApprove,
        getDataScope,
        fetchRoles,
        fetchUsers,
        fetchAuditLogs,
        fetchMyPermissions,
        createRole,
        updateRole,
        cloneRole,
        deleteRole,
        assignUserRole,
        bulkAssignUserRoles,
        createModule,
      }}
    >
      {children}
    </AccessControlContext.Provider>
  );
};

export const useAccessControl = () => {
  const context = useContext(AccessControlContext);
  return context || DEFAULT_ACCESS_CONTROL_VALUE;
};

export const usePermissions = () => {
  const access = useAccessControl();
  return {
    can: access.can || (() => true),
    canView: access.canView || (() => true),
    canCreate: access.canCreate || (() => true),
    canEdit: access.canEdit || (() => true),
    canDelete: access.canDelete || (() => true),
    canExport: access.canExport || (() => true),
    canApprove: access.canApprove || (() => true),
    getDataScope: access.getDataScope || (() => 'All'),
    isSuperAdmin: access.isSuperAdmin ?? true,
    myPermissions: access.myPermissions,
    permissionsLoaded: access.permissionsLoaded ?? true,
  };
};

export default AccessControlContext;
