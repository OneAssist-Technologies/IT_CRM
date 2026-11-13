export type AppType = 'admin' | 'manager' | 'sales_employee' | 'support' | 'custom';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';

export interface SystemModule {
  id: string;
  name: string;
  category: string;
  description: string;
  isSystem?: boolean;
}

export interface RolePermission {
  id?: string;
  roleId?: string;
  moduleId: string;
  moduleName: string;
  category: string;
  dataScope?: 'Own' | 'All';
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canApprove: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isSystem: boolean;
  appType: AppType;
  parentRoleId?: string | null;
  parentRole?: { id: string; name: string; slug: string } | null;
  childRoles?: { id: string; name: string; slug: string }[];
  userCount?: number;
  users?: { id: string; name: string; email: string; avatar?: string; department?: string }[];
  permissionsCount?: number;
  totalPossiblePermissions?: number;
  permissions: RolePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  department?: string | null;
  role: string;
  roleId?: string | null;
  roleRelation?: {
    id: string;
    name: string;
    slug: string;
    isSystem: boolean;
    appType: AppType;
    parentRoleId?: string | null;
    parentRole?: { id: string; name: string; slug: string } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessAuditLog {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  targetType: string;
  targetName?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface RoleFormData {
  name: string;
  description?: string;
  appType: AppType;
  parentRoleId?: string | null;
  permissions?: RolePermission[];
}

export interface UserPermissionsMap {
  [moduleId: string]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    export: boolean;
    approve: boolean;
    dataScope?: 'Own' | 'All';
  };
}

export interface MyPermissionsResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  role?: {
    id: string;
    name: string;
    slug: string;
    isSystem: boolean;
  };
  permissions: UserPermissionsMap;
  isSuperAdmin: boolean;
}
