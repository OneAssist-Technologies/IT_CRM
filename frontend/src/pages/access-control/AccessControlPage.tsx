import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  TextInput,
  Select,
  Modal,
  Textarea,
  Avatar,
  Collapse,
  Switch,
  SegmentedControl,
  UnstyledButton,
  ScrollArea,
  ActionIcon,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconShield,
  IconShieldLock,
  IconUsers,
  IconSitemap,
  IconPlus,
  IconSearch,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconLock,
  IconWorld,
  IconMail,
  IconPhone,
  IconLayoutGrid,
  IconUser,
  IconBuildingStore,
  IconCalendar,
  IconClipboardList,
  IconSettings,
  IconClockCheck,
  IconClock,
  IconChartBar,
  IconCalendarOff,
  IconAddressBook,
  IconBuilding,
  IconFlame,
  IconBriefcase,
  IconFolders,
  IconMapPin,
  IconFileText,
  IconRoute,
  IconHistory,
  IconTrash,
  IconDeviceFloppy,
  IconCheck,
  IconX,
  IconSparkles,
  IconGitBranch,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAccessControl } from '../../context/AccessControlContext';
import { Role, RolePermission, UserWithRole, AppType } from '../../types/accessControl';

interface TreeNodeData {
  role: Role;
  children: TreeNodeData[];
  level: number;
}

interface DynamicTreeNodeProps {
  node: TreeNodeData;
  users: UserWithRole[];
  allRoles: Role[];
  onSelectRole: (role: Role) => void;
  onEditHierarchy: (role: Role) => void;
  isDark: boolean;
}

const DynamicTreeNode: React.FC<DynamicTreeNodeProps> = ({
  node,
  users,
  allRoles,
  onSelectRole,
  onEditHierarchy,
  isDark,
}) => {
  const { role, children, level } = node;
  const memberCount = users.filter((u) => u.roleId === role.id || u.role?.toUpperCase() === role.slug.toUpperCase()).length;

  // Dynamic gradient based on hierarchy level and role attributes
  const getGradientByLevel = (lvl: number, appType: string) => {
    if (lvl === 0) {
      return {
        bg: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', // Deep Indigo / Purple
        shadow: '0 10px 25px rgba(99, 102, 241, 0.35)',
      };
    }
    if (lvl === 1 || appType === 'manager') {
      return {
        bg: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)', // Emerald / Teal
        shadow: '0 10px 25px rgba(13, 148, 136, 0.35)',
      };
    }
    if (lvl === 2) {
      return {
        bg: 'linear-gradient(135deg, #D97706 0%, #EA580C 100%)', // Vibrant Amber / Orange
        shadow: '0 8px 24px rgba(234, 88, 12, 0.35)',
      };
    }
    return {
      bg: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', // Sky Blue / Cyan
      shadow: '0 8px 20px rgba(2, 132, 199, 0.3)',
    };
  };

  const styleConfig = getGradientByLevel(level, role.appType);
  const lineColor = isDark ? '#475569' : '#CBD5E1';

  return (
    <Stack align="center" gap={0} style={{ position: 'relative' }}>
      {/* Node Card */}
      <Paper
        p="md"
        radius="16px"
        onClick={() => onSelectRole(role)}
        style={{
          background: styleConfig.bg,
          color: '#FFFFFF',
          textAlign: 'center',
          minWidth: 180,
          cursor: 'pointer',
          boxShadow: styleConfig.shadow,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          userSelect: 'none',
          zIndex: 3,
          position: 'relative',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      >
        <Group justify="center" align="center" gap={6} wrap="nowrap">
          <Text fw={800} size={level === 0 ? '14px' : '13px'} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
            {role.name}
          </Text>
          {role.slug !== 'super_admin' && (
            <ActionIcon
              size="xs"
              variant="transparent"
              c="white"
              style={{ opacity: 0.85 }}
              title="Change reporting parent role"
              onClick={(e) => {
                e.stopPropagation();
                onEditHierarchy(role);
              }}
            >
              <IconGitBranch size={13} />
            </ActionIcon>
          )}
        </Group>
        <Text size="11px" style={{ opacity: 0.88, marginTop: 2 }}>
          {memberCount} member{memberCount === 1 ? '' : 's'}
        </Text>
      </Paper>

      {/* Children branches if any */}
      {children.length > 0 && (
        <>
          {/* Vertical line down from parent */}
          <Box style={{ width: 2, height: 28, background: lineColor, flexShrink: 0 }} />

          {children.length === 1 ? (
            // Single child: Direct vertical connection
            <DynamicTreeNode
              node={children[0]}
              users={users}
              allRoles={allRoles}
              onSelectRole={onSelectRole}
              onEditHierarchy={onEditHierarchy}
              isDark={isDark}
            />
          ) : (
            // Multiple children: Horizontal connector bar and branch drops
            <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <Box
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: '40px',
                  position: 'relative',
                  paddingTop: 18,
                }}
              >
                {children.map((child, idx) => (
                  <Box
                    key={child.role.id}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    {/* Vertical drop into this child */}
                    <Box
                      style={{
                        position: 'absolute',
                        top: -18,
                        width: 2,
                        height: 18,
                        background: lineColor,
                      }}
                    />

                    {/* Horizontal branch line segments */}
                    {idx === 0 && (
                      <Box
                        style={{
                          position: 'absolute',
                          top: -18,
                          left: '50%',
                          right: '-20px',
                          height: 2,
                          background: lineColor,
                        }}
                      />
                    )}
                    {idx === children.length - 1 && (
                      <Box
                        style={{
                          position: 'absolute',
                          top: -18,
                          right: '50%',
                          left: '-20px',
                          height: 2,
                          background: lineColor,
                        }}
                      />
                    )}
                    {idx > 0 && idx < children.length - 1 && (
                      <Box
                        style={{
                          position: 'absolute',
                          top: -18,
                          left: '-20px',
                          right: '-20px',
                          height: 2,
                          background: lineColor,
                        }}
                      />
                    )}

                    <DynamicTreeNode
                      node={child}
                      users={users}
                      allRoles={allRoles}
                      onSelectRole={onSelectRole}
                      onEditHierarchy={onEditHierarchy}
                      isDark={isDark}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Stack>
  );
};

export const AccessControlPage: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const {
    roles,
    selectedRole,
    setSelectedRole,
    systemModules,
    users,
    loading,
    saving,
    fetchRoles,
    fetchUsers,
    createRole,
    updateRole,
    deleteRole,
    assignUserRole,
    createModule,
  } = useAccessControl();

  // Active top tab: 'perms' | 'team' | 'tree'
  const [activeTab, setActiveTabState] = useState<'perms' | 'team' | 'tree'>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get('tab');
      if (tab === 'perms' || tab === 'team' || tab === 'tree') return tab;
      const saved = localStorage.getItem('crm_access_control_tab');
      if (saved === 'perms' || saved === 'team' || saved === 'tree') return saved as any;
    }
    return 'perms';
  });

  const setActiveTab = (tab: 'perms' | 'team' | 'tree') => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_access_control_tab', tab);
      const url = new URL(window.location.href);
      if (tab === 'perms') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  // Fresh load on mount to immediately view roles and users without page refresh
  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, [fetchRoles, fetchUsers]);

  // Search in Perms Sidebar
  const [roleSearch, setRoleSearch] = useState('');

  // Team Filter Tab ('all' | 'assigned' | 'unassigned') & Search
  const [teamFilter, setTeamFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [teamSearch, setTeamSearch] = useState('');

  // Collapsed categories state (CategoryName -> boolean)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Local permissions state for live optimistic switches
  const [localPermissions, setLocalPermissions] = useState<Record<string, RolePermission>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Add Role Modal
  const [addRoleModalOpen, setAddRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleAppType, setNewRoleAppType] = useState<AppType>('manager');
  const [newRoleParentId, setNewRoleParentId] = useState<string>('');
  const [templateRoleId, setTemplateRoleId] = useState<string>('');

  // Add Custom Module Modal
  const [addModuleModalOpen, setAddModuleModalOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleCategory, setNewModuleCategory] = useState('Custom Modules');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [creatingModule, setCreatingModule] = useState(false);

  // Track expanded roles accordion in Perms tab
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

  // Auto-select first role if none selected (closed by default)
  useEffect(() => {
    if (!selectedRole && roles.length > 0) {
      setSelectedRole(roles[0]);
    }
  }, [roles, selectedRole, setSelectedRole]);

  // Handle Create Module submit
  const handleCreateModuleSubmit = async () => {
    if (!newModuleName.trim()) return;
    setCreatingModule(true);
    const res = await createModule({
      name: newModuleName.trim(),
      category: newModuleCategory.trim() || 'Custom Modules',
      description: newModuleDesc.trim(),
    });
    setCreatingModule(false);
    if (res.success) {
      setAddModuleModalOpen(false);
      setNewModuleName('');
      setNewModuleDesc('');
    }
  };

  // Synchronize selectedRole permissions to local state
  useEffect(() => {
    if (selectedRole && selectedRole.permissions) {
      const map: Record<string, RolePermission> = {};
      const isSuperOrAdmin = selectedRole.slug === 'admin' || selectedRole.slug === 'super_admin';
      selectedRole.permissions.forEach((p) => {
        map[p.moduleId] = {
          ...p,
          dataScope: p.dataScope || (isSuperOrAdmin ? 'All' : 'Own'),
        };
      });
      // Ensure all system modules exist in map
      systemModules.forEach((m) => {
        if (!map[m.id]) {
          map[m.id] = {
            moduleId: m.id,
            moduleName: m.name,
            category: m.category,
            dataScope: isSuperOrAdmin ? 'All' : 'Own',
            canView: isSuperOrAdmin,
            canCreate: isSuperOrAdmin,
            canEdit: isSuperOrAdmin,
            canDelete: isSuperOrAdmin,
            canExport: isSuperOrAdmin,
            canApprove: isSuperOrAdmin,
          };
        } else if (!map[m.id].dataScope) {
          map[m.id].dataScope = isSuperOrAdmin ? 'All' : 'Own';
        }
      });
      setLocalPermissions(map);
      setHasUnsavedChanges(false);
    }
  }, [selectedRole?.id, systemModules]);

  // Group system modules dynamically by Category & order strictly matching the sidebar
  const categories = useMemo(() => {
    const map = new Map<string, typeof systemModules>();
    const sidebarOrder = [
      'dashboard',
      'employee_dashboard',
      'employee_management',
      'contacts',
      'leads',
      'scheduled_meetings',
      'call_logs',
      'customers',
      'projects',
      'activity_timeline',
      'access_control',
      'settings',
    ];

    systemModules
      .filter((mod) => mod.id !== 'negotiations' && mod.id !== 'invoices')
      .forEach((mod) => {
        const cat = mod.category || 'Main Navigation';
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(mod);
      });

    const categoryOrder = ['Main Navigation', 'Administration & Security', 'Custom Modules'];

    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const idxA = categoryOrder.indexOf(a);
        const idxB = categoryOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      })
      .map(([cat, mods]) => {
        const sortedMods = [...mods].sort((a, b) => {
          const idxA = sidebarOrder.indexOf(a.id);
          const idxB = sidebarOrder.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
        return [cat, sortedMods] as [string, typeof systemModules];
      });
  }, [systemModules]);

  // Filtered roles in Perms tab
  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const q = roleSearch.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, roleSearch]);

  // Live toggle of module permission switch
  const handleToggleModule = (moduleId: string) => {
    if (!selectedRole) return;

    const isSuperOrAdmin = selectedRole.slug === 'admin' || selectedRole.slug === 'super_admin';
    const current = localPermissions[moduleId] || {
      moduleId,
      moduleName: moduleId,
      category: 'Main Navigation',
      dataScope: isSuperOrAdmin ? 'All' : 'Own',
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
      canApprove: false,
    };

    const nextState = !current.canView;

    const updatedPerm: RolePermission = {
      ...current,
      dataScope: current.dataScope || (isSuperOrAdmin ? 'All' : 'Own'),
      canView: nextState,
      canCreate: nextState,
      canEdit: nextState,
      canDelete: nextState && selectedRole.appType === 'admin',
      canExport: nextState,
      canApprove: nextState && ['admin', 'manager'].includes(selectedRole.appType),
    };

    // Optimistic local update
    const updatedMap = {
      ...localPermissions,
      [moduleId]: updatedPerm,
    };

    // Keep aliases in sync
    if (moduleId === 'employee_management') {
      updatedMap['employees'] = { ...updatedPerm, moduleId: 'employees' };
    }
    if (moduleId === 'customers') {
      updatedMap['companies'] = { ...updatedPerm, moduleId: 'companies' };
    }
    if (moduleId === 'call_logs') {
      updatedMap['calls'] = { ...updatedPerm, moduleId: 'calls' };
    }
    if (moduleId === 'scheduled_meetings') {
      updatedMap['meetings'] = { ...updatedPerm, moduleId: 'meetings' };
    }
    if (moduleId === 'projects') {
      updatedMap['projects_management'] = { ...updatedPerm, moduleId: 'projects_management' };
    }

    setLocalPermissions(updatedMap);
    setHasUnsavedChanges(true);
  };

  // Change data scope ('Own' | 'All') for scoped modules (e.g. Contacts, Leads)
  const handleDataScopeChange = (moduleId: string, scope: 'Own' | 'All') => {
    if (!selectedRole) return;

    const current = localPermissions[moduleId] || {
      moduleId,
      moduleName: moduleId,
      category: 'Main Navigation',
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canExport: true,
      canApprove: false,
    };

    const updatedPerm: RolePermission = {
      ...current,
      dataScope: scope,
    };

    const updatedMap = {
      ...localPermissions,
      [moduleId]: updatedPerm,
    };

    setLocalPermissions(updatedMap);
    setHasUnsavedChanges(true);
  };

  // Quick Action: Enable All Modules
  const handleSelectAllModules = () => {
    if (!selectedRole) return;
    const updatedMap: Record<string, RolePermission> = { ...localPermissions };
    const isSuper = selectedRole.slug === 'super_admin';
    systemModules.forEach((mod) => {
      const isSuperOrAdmin = isSuper || selectedRole.slug === 'admin';
      const current = updatedMap[mod.id] || {
        moduleId: mod.id,
        moduleName: mod.name,
        category: mod.category || 'Main Navigation',
        dataScope: isSuperOrAdmin ? 'All' : 'Own',
      };
      updatedMap[mod.id] = {
        ...current,
        dataScope: current.dataScope || (isSuperOrAdmin ? 'All' : 'Own'),
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: isSuper || selectedRole.appType === 'admin',
        canExport: true,
        canApprove: isSuper || ['admin', 'manager'].includes(selectedRole.appType),
      };
    });
    if (updatedMap['employee_management']) updatedMap['employees'] = { ...updatedMap['employee_management'], moduleId: 'employees' };
    if (updatedMap['customers']) updatedMap['companies'] = { ...updatedMap['customers'], moduleId: 'companies' };
    if (updatedMap['call_logs']) updatedMap['calls'] = { ...updatedMap['call_logs'], moduleId: 'calls' };
    if (updatedMap['scheduled_meetings']) updatedMap['meetings'] = { ...updatedMap['scheduled_meetings'], moduleId: 'meetings' };
    if (updatedMap['projects']) updatedMap['projects_management'] = { ...updatedMap['projects'], moduleId: 'projects_management' };

    setLocalPermissions(updatedMap);
    setHasUnsavedChanges(true);
  };

  // Quick Action: Disable All Modules
  const handleDeselectAllModules = () => {
    if (!selectedRole) return;
    const updatedMap: Record<string, RolePermission> = { ...localPermissions };
    systemModules.forEach((mod) => {
      if (selectedRole.slug === 'super_admin' && mod.id === 'access_control') return;
      const current = updatedMap[mod.id] || {
        moduleId: mod.id,
        moduleName: mod.name,
        category: mod.category || 'Main Navigation',
      };
      updatedMap[mod.id] = {
        ...current,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canApprove: false,
      };
    });
    if (updatedMap['employee_management']) updatedMap['employees'] = { ...updatedMap['employee_management'], moduleId: 'employees', canView: false };
    if (updatedMap['customers']) updatedMap['companies'] = { ...updatedMap['customers'], moduleId: 'companies', canView: false };
    if (updatedMap['call_logs']) updatedMap['calls'] = { ...updatedMap['call_logs'], moduleId: 'calls', canView: false };
    if (updatedMap['scheduled_meetings']) updatedMap['meetings'] = { ...updatedMap['scheduled_meetings'], moduleId: 'meetings', canView: false };
    if (updatedMap['projects']) updatedMap['projects_management'] = { ...updatedMap['projects'], moduleId: 'projects_management', canView: false };

    setLocalPermissions(updatedMap);
    setHasUnsavedChanges(true);
  };

  // Explicit Save Permissions Handler
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSavingPermissions(true);
    try {
      const permissionsArray = Object.values(localPermissions);
      const res = await updateRole(selectedRole.id, { permissions: permissionsArray });
      if (res.success) {
        setHasUnsavedChanges(false);
        notifications.show({
          title: 'Permissions Saved!',
          message: `Module access for "${selectedRole.name}" updated successfully. Only enabled modules will be visible to users with this role.`,
          color: 'teal',
          icon: <IconCheck size={18} />,
          autoClose: 3500,
        });
        window.dispatchEvent(new CustomEvent('crm_permissions_updated'));
      } else {
        notifications.show({
          title: 'Failed to Save',
          message: res.message || 'Could not save permissions',
          color: 'red',
          icon: <IconX size={18} />,
        });
      }
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.message || 'An error occurred while saving permissions',
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setSavingPermissions(false);
    }
  };

  // Toggle category collapse
  const toggleCategoryCollapse = (catName: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  // Create new role submit (Simple: Role Name & Reporting Manager)
  const handleCreateRoleSubmit = async () => {
    const defaultSuperAdminId = roles.find((r) => r.slug === 'super_admin')?.id || null;
    const chosenParentId = newRoleParentId === 'ROOT' ? null : (newRoleParentId || defaultSuperAdminId);
    const parentRole = roles.find((r) => r.id === chosenParentId);
    const parentName = parentRole ? parentRole.name : 'Direct to Board';

    const res = await createRole({
      name: newRoleName.trim(),
      description: `Reports to ${parentName}`,
      appType: 'manager',
      parentRoleId: chosenParentId,
    });

    if (res.success) {
      setAddRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleParentId('');
      setTemplateRoleId('');
    }
  };

  // Delete custom role handler
  const handleDeleteRole = async (roleId: string, roleName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const role = roles.find((r) => r.id === roleId);
    if (role?.slug === 'super_admin' || role?.isSystem) {
      notifications.show({
        title: 'Cannot Delete System Role',
        message: 'Super Admin is the core system role and cannot be deleted.',
        color: 'red',
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete role "${roleName}"?`)) return;

    const res = await deleteRole(roleId);
    if (res.success) {
      notifications.show({
        title: 'Role Deleted',
        message: `Role "${roleName}" has been successfully deleted.`,
        color: 'teal',
      });
      const remaining = roles.filter((r) => r.id !== roleId);
      if (remaining.length > 0) {
        setSelectedRole(remaining[0]);
      } else {
        setSelectedRole(null);
      }
    } else {
      notifications.show({
        title: 'Failed to delete role',
        message: res.message || 'Error deleting role',
        color: 'red',
      });
    }
  };

  // Quick initial avatar letter
  const getRoleInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'R';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Dynamic user counts & filter
  const totalAssignedCount = users.filter((u) => u.roleId || u.role).length;
  const totalUnassignedCount = users.filter((u) => !u.roleId && !u.role).length;

  // Filtered users for Team tab
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Filter tab
      if (teamFilter === 'assigned' && !u.roleId && !u.role) return false;
      if (teamFilter === 'unassigned' && (u.roleId || u.role)) return false;

      // Search query
      if (!teamSearch.trim()) return true;
      const q = teamSearch.toLowerCase();
      const roleName = u.roleRelation?.name || u.role || '';
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        roleName.toLowerCase().includes(q)
      );
    });
  }, [users, teamFilter, teamSearch]);

  // Group filtered users by Role dynamically
  const usersGroupedByRole = useMemo(() => {
    const map = new Map<string, { role: Role | null; roleName: string; users: UserWithRole[] }>();

    // Initialize all existing roles so they appear in order
    roles.forEach((r) => {
      map.set(r.id, { role: r, roleName: r.name, users: [] });
    });

    const unassignedUsers: UserWithRole[] = [];

    filteredUsers.forEach((u) => {
      const rId = u.roleId || (roles.find((r) => r.slug.toUpperCase() === u.role?.toUpperCase())?.id);
      if (rId && map.has(rId)) {
        map.get(rId)!.users.push(u);
      } else {
        unassignedUsers.push(u);
      }
    });

    const list = Array.from(map.values()).filter((g) => g.users.length > 0 || !teamSearch);
    if (unassignedUsers.length > 0) {
      list.push({ role: null, roleName: 'Unassigned Members', users: unassignedUsers });
    }
    return list;
  }, [roles, filteredUsers, teamSearch]);

  // 100% Dynamic Hierarchical Role Tree Data Builder
  const roleTree = useMemo(() => {
    if (roles.length === 0) return [];

    const nodeMap = new Map<string, TreeNodeData>();
    roles.forEach((r) => {
      nodeMap.set(r.id, { role: r, children: [], level: 0 });
    });

    const roots: TreeNodeData[] = [];

    roles.forEach((r) => {
      const node = nodeMap.get(r.id)!;
      const pId = r.parentRoleId || r.parentRole?.id;
      if (pId && nodeMap.has(pId) && pId !== r.id) {
        const parent = nodeMap.get(pId)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Recursively assign hierarchy depth levels (cycle-safe with visited set)
    const assignLevels = (node: TreeNodeData, currentLevel: number, visited = new Set<string>()) => {
      if (visited.has(node.role.id)) return;
      visited.add(node.role.id);
      node.level = currentLevel;
      node.children.forEach((c) => assignLevels(c, currentLevel + 1, visited));
    };

    // Sort roots: Admin / System roles first
    roots.sort((a, b) => {
      if (a.role.slug === 'admin' || a.role.slug === 'super_admin') return -1;
      if (b.role.slug === 'admin' || b.role.slug === 'super_admin') return 1;
      return (b.role.isSystem ? 1 : 0) - (a.role.isSystem ? 1 : 0);
    });

    roots.forEach((root) => assignLevels(root, 0));
    return roots;
  }, [roles]);

  // Hierarchy Management & Node details modals
  const [hierarchyModalRole, setHierarchyModalRole] = useState<Role | null>(null);
  const [targetParentId, setTargetParentId] = useState<string>('');
  const [updatingHierarchy, setUpdatingHierarchy] = useState(false);
  const [manageHierarchyModalOpen, setManageHierarchyModalOpen] = useState(false);
  const [nodeDetailsRole, setNodeDetailsRole] = useState<Role | null>(null);

  // Prevent circular hierarchy: find all descendants of a role
  const getDescendantRoleIds = (roleId: string, allRoles: Role[]): Set<string> => {
    const descendants = new Set<string>();
    const findChildren = (id: string) => {
      allRoles.forEach((r) => {
        const pId = r.parentRoleId || r.parentRole?.id;
        if (pId === id && !descendants.has(r.id)) {
          descendants.add(r.id);
          findChildren(r.id);
        }
      });
    };
    findChildren(roleId);
    return descendants;
  };

  const getValidParentsForRole = (targetRole: Role) => {
    const descendants = getDescendantRoleIds(targetRole.id, roles);
    return roles.filter((r) => r.id !== targetRole.id && !descendants.has(r.id));
  };

  const handleUpdateRoleParent = async (roleId: string, newParentId: string | null) => {
    try {
      setUpdatingHierarchy(true);
      const targetRole = roles.find((r) => r.id === roleId);
      const parentRole = roles.find((r) => r.id === newParentId);
      const parentLabel = parentRole ? parentRole.name : 'Top-Level (Direct to Board)';

      const res = await updateRole(roleId, {
        name: targetRole?.name,
        parentRoleId: newParentId || null,
      });

      if (res.success) {
        notifications.show({
          title: 'Tree Hierarchy Updated',
          message: `${targetRole?.name || 'Role'} now reports to ${parentLabel}.`,
          color: 'teal',
          icon: <IconCheck size={18} />,
        });
        setHierarchyModalRole(null);
        setManageHierarchyModalOpen(false);
        if (nodeDetailsRole?.id === roleId) {
          setNodeDetailsRole(null);
        }
      } else {
        notifications.show({
          title: 'Update Failed',
          message: res.message || 'Could not update role hierarchy',
          color: 'red',
          icon: <IconX size={18} />,
        });
      }
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to update hierarchy',
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setUpdatingHierarchy(false);
    }
  };

  // Colors based on theme
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0';
  const headingColor = isDark ? '#F8FAFC' : '#0F172A';
  const subtitleColor = isDark ? '#94A3B8' : '#64748B';

  // Module Icon mapper
  const getModuleIcon = (id: string) => {
    switch (id) {
      case 'dashboard':
        return <IconLayoutGrid size={18} color="#4F46E5" />;
      case 'employee_dashboard':
        return <IconUser size={18} color="#4F46E5" />;
      case 'distributor_dashboard':
        return <IconBuildingStore size={18} color="#4F46E5" />;
      case 'calendar':
        return <IconCalendar size={18} color="#4F46E5" />;
      case 'daily_working_plan':
        return <IconClipboardList size={18} color="#4F46E5" />;
      case 'access_control':
        return <IconShieldLock size={18} color="#4F46E5" />;
      case 'settings':
        return <IconSettings size={18} color="#4F46E5" />;
      case 'audit_logs':
        return <IconHistory size={18} color="#4F46E5" />;
      case 'employee_management':
        return <IconUsers size={18} color="#4F46E5" />;
      case 'attendance':
        return <IconClockCheck size={18} color="#4F46E5" />;
      case 'shift_details':
        return <IconClock size={18} color="#4F46E5" />;
      case 'area_dashboard':
        return <IconChartBar size={18} color="#4F46E5" />;
      case 'leave_management':
        return <IconCalendarOff size={18} color="#4F46E5" />;
      case 'contacts':
        return <IconAddressBook size={18} color="#4F46E5" />;
      case 'customers':
      case 'companies':
        return <IconBuilding size={18} color="#4F46E5" />;
      case 'leads':
        return <IconFlame size={18} color="#4F46E5" />;
      case 'scheduled_meetings':
      case 'meetings':
        return <IconCalendar size={18} color="#4F46E5" />;
      case 'call_logs':
      case 'calls':
        return <IconPhone size={18} color="#4F46E5" />;
      case 'deals':
        return <IconBriefcase size={18} color="#4F46E5" />;
      case 'projects':
      case 'projects_management':
        return <IconFolders size={18} color="#4F46E5" />;
      case 'activity_timeline':
        return <IconClock size={18} color="#4F46E5" />;
      case 'employees':
      case 'employee_management':
        return <IconUsers size={18} color="#4F46E5" />;
      case 'client_visits':
        return <IconMapPin size={18} color="#4F46E5" />;
      case 'daily_reports':
        return <IconFileText size={18} color="#4F46E5" />;
      case 'beat_planning':
        return <IconRoute size={18} color="#4F46E5" />;
      default:
        return <IconLayoutGrid size={18} color="#4F46E5" />;
    }
  };

  // Avatar color palette for Team list
  const userAvatarColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#6366F1'];

  return (
    <Box p={{ base: 'xs', sm: 'sm', md: 'md' }} style={{ width: '100%', maxWidth: '100%' }}>
      {/* 1. Top Header Bar */}
      <Group justify="space-between" align="center" mb="xl" wrap="wrap" gap="md">
        <div>
          <Text fw={800} size="28px" style={{ letterSpacing: '-0.02em', color: headingColor }}>
            Access Control
          </Text>
          <Text size="sm" c="dimmed">
            Manage roles, permissions & user assignments
          </Text>
        </div>

        <Group gap="sm">
          {/* Segmented Pill Tabs */}
          <Paper
            p={4}
            radius="100px"
            style={{
              background: isDark ? '#1E293B' : '#F1F5F9',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
              display: 'inline-flex',
              gap: 4,
            }}
          >
            <UnstyledButton
              onClick={() => setActiveTab('perms')}
              style={{
                padding: '8px 18px',
                borderRadius: '100px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'perms' ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
                color: activeTab === 'perms' ? (isDark ? '#FFFFFF' : '#0F172A') : subtitleColor,
                boxShadow: activeTab === 'perms' ? '0 2px 8px rgba(0,0,0,0.08)' : undefined,
                transition: 'all 0.15s ease',
              }}
            >
              <IconShield size={16} stroke={2} />
              Perms
            </UnstyledButton>

            <UnstyledButton
              onClick={() => setActiveTab('team')}
              style={{
                padding: '8px 18px',
                borderRadius: '100px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'team' ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
                color: activeTab === 'team' ? (isDark ? '#FFFFFF' : '#0F172A') : subtitleColor,
                boxShadow: activeTab === 'team' ? '0 2px 8px rgba(0,0,0,0.08)' : undefined,
                transition: 'all 0.15s ease',
              }}
            >
              <IconUsers size={16} stroke={2} />
              Team{' '}
              <Badge size="xs" variant="filled" color="blue" radius="xl" style={{ marginLeft: 2, height: 18, padding: '0 6px' }}>
                {users.length}
              </Badge>
            </UnstyledButton>

            <UnstyledButton
              onClick={() => setActiveTab('tree')}
              style={{
                padding: '8px 18px',
                borderRadius: '100px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'tree' ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
                color: activeTab === 'tree' ? (isDark ? '#FFFFFF' : '#0F172A') : subtitleColor,
                boxShadow: activeTab === 'tree' ? '0 2px 8px rgba(0,0,0,0.08)' : undefined,
                transition: 'all 0.15s ease',
              }}
            >
              <IconSitemap size={16} stroke={2} />
              Tree
            </UnstyledButton>
          </Paper>

          {/* Add Role Button */}
          <Button
            radius="100px"
            leftSection={<IconPlus size={16} />}
            onClick={() => setAddRoleModalOpen(true)}
            style={{
              background: 'var(--crm-primary-gradient, linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%))',
              color: '#FFFFFF',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              padding: '0 22px',
              height: 40,
            }}
          >
            Add Role
          </Button>
        </Group>
      </Group>

      {/* 2. TAB 1: PERMS (Two-Column Master-Detail) */}
      {activeTab === 'perms' && (
        <Box style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '24px', alignItems: 'flex-start' }}>
          {/* Left Sidebar: Roles List */}
          <Stack
            gap="sm"
            style={{
              position: 'sticky',
              top: '16px',
              alignSelf: 'flex-start',
            }}
          >
            <TextInput
              placeholder="Search roles & users..."
              leftSection={<IconSearch size={16} color="gray" />}
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              radius="100px"
              styles={{
                input: {
                  backgroundColor: cardBg,
                  border: cardBorder,
                  height: 42,
                },
              }}
            />

            {loading ? (
              <Paper p="md" radius="18px" style={{ background: cardBg, border: cardBorder, textAlign: 'center' }}>
                <Text size="xs" c="dimmed">
                  Loading roles & modules...
                </Text>
              </Paper>
            ) : filteredRoles.length === 0 ? (
              <Paper p="md" radius="18px" style={{ background: cardBg, border: cardBorder, textAlign: 'center' }}>
                <Text size="xs" c="dimmed">
                  No roles found.
                </Text>
              </Paper>
            ) : (
              <ScrollArea.Autosize
                mah="calc(100vh - 220px)"
                scrollbarSize={6}
                offsetScrollbars
                styles={{
                  viewport: {
                    paddingRight: 4,
                  },
                }}
              >
                <Stack gap={10} mt={4}>
                {filteredRoles.map((role) => {
                  const isSelected = selectedRole?.id === role.id;
                  const roleMembers = users.filter((u) => u.roleId === role.id || u.role?.toUpperCase() === role.slug.toUpperCase());
                  const memberCount = role.userCount !== undefined ? role.userCount : roleMembers.length;
                  const isExpanded = Boolean(expandedRoles[role.id]);

                  return (
                    <Paper
                      key={role.id}
                      p="md"
                      radius="18px"
                      onClick={() => {
                        setSelectedRole(role);
                      }}
                      style={{
                        background: isSelected
                          ? (isDark ? 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)' : '#FFFFFF')
                          : cardBg,
                        border: isSelected
                          ? `2px solid ${isDark ? '#60A5FA' : '#2563EB'}`
                          : cardBorder,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0px)';
                      }}
                    >
                      {/* Card Header Row */}
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            radius="xl"
                            color={isSelected ? 'blue' : 'gray'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRoles((prev) => ({
                                ...prev,
                                [role.id]: !prev[role.id],
                              }));
                            }}
                            style={{
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              cursor: 'pointer',
                            }}
                            title={isExpanded ? 'Collapse members' : 'Expand members'}
                          >
                            <IconChevronRight size={16} stroke={2.5} />
                          </ActionIcon>

                          <Box
                            style={{
                              width: 36,
                              height: 36,
                              minWidth: 36,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              userSelect: 'none',
                              boxShadow: '0 2px 5px rgba(37, 99, 235, 0.22)',
                            }}
                          >
                            <Text
                              size="12px"
                              fw={800}
                              style={{
                                color: '#FFFFFF',
                                letterSpacing: '0.04em',
                                lineHeight: 1,
                                userSelect: 'none',
                              }}
                            >
                              {getRoleInitials(role.name)}
                            </Text>
                          </Box>

                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text fw={700} size="sm" style={{ color: headingColor }} lineClamp={1}>
                              {role.name}
                            </Text>
                            <Text size="11px" fw={500} style={{ color: isSelected ? (isDark ? '#93C5FD' : '#2563EB') : (isDark ? '#94A3B8' : '#64748B') }}>
                              {memberCount} member{memberCount === 1 ? '' : 's'}
                            </Text>
                          </Box>
                        </Group>

                        <Group gap={6} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
                          {isSelected && (
                            <Badge
                              size="xs"
                              variant="filled"
                              color="blue"
                              radius="100px"
                              style={{ flexShrink: 0, textTransform: 'none', fontWeight: 600, fontSize: '10px' }}
                            >
                              Active
                            </Badge>
                          )}

                          <Tooltip
                            label={
                              role.slug === 'super_admin' || role.isSystem
                                ? 'Super Admin is a permanent system role and cannot be deleted'
                                : `Delete ${role.name}`
                            }
                            withArrow
                            position="top"
                          >
                            <ActionIcon
                              variant="subtle"
                              color={role.slug === 'super_admin' || role.isSystem ? 'gray' : 'red'}
                              size="sm"
                              radius="md"
                              disabled={role.slug === 'super_admin' || role.isSystem}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRole(role.id, role.name, e);
                              }}
                              style={{
                                opacity: role.slug === 'super_admin' || role.isSystem ? 0.35 : 0.85,
                                cursor: role.slug === 'super_admin' || role.isSystem ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <IconTrash size={15} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>

                      {/* Expandable Member Details Accordion */}
                      <Collapse in={isExpanded}>
                        <Box
                          mt="sm"
                          pt="xs"
                          style={{
                            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                          }}
                        >
                          <Group justify="space-between" align="center" mb={6}>
                            <Text size="10px" fw={700} c="dimmed" style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                              Assigned Members ({roleMembers.length})
                            </Text>
                            <Text size="10px" c="dimmed">
                              Click to view details
                            </Text>
                          </Group>

                          {roleMembers.length === 0 ? (
                            <Text size="xs" c="dimmed" py={4}>
                              No members assigned yet.
                            </Text>
                          ) : (
                            <Stack gap={6}>
                              {roleMembers.map((member) => (
                                <Paper
                                  key={member.id}
                                  p="xs"
                                  radius="12px"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('team');
                                  }}
                                  style={{
                                    background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                                    border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #EEF2F6',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <Group justify="space-between" align="center" wrap="nowrap">
                                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                                      <Box
                                        style={{
                                          width: 26,
                                          height: 26,
                                          minWidth: 26,
                                          borderRadius: '50%',
                                          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                          userSelect: 'none',
                                        }}
                                      >
                                        <Text
                                          size="10px"
                                          fw={800}
                                          style={{
                                            color: '#FFFFFF',
                                            letterSpacing: '0.02em',
                                            lineHeight: 1,
                                            userSelect: 'none',
                                          }}
                                        >
                                          {member.name.slice(0, 2).toUpperCase()}
                                        </Text>
                                      </Box>
                                      <Box style={{ minWidth: 0 }}>
                                        <Text size="xs" fw={700} style={{ color: headingColor }} lineClamp={1}>
                                          {member.name}
                                        </Text>
                                        <Text size="10px" c="dimmed" lineClamp={1}>
                                          {member.email}
                                        </Text>
                                      </Box>
                                    </Group>

                                    {member.phone && (
                                      <Text size="10px" fw={600} c="dimmed" style={{ flexShrink: 0 }}>
                                        {member.phone}
                                      </Text>
                                    )}
                                  </Group>
                                </Paper>
                              ))}
                            </Stack>
                          )}

                          <Button
                            variant="light"
                            color="gray"
                            size="xs"
                            radius="100px"
                            fullWidth
                            mt="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab('team');
                            }}
                            styles={{
                              root: {
                                fontWeight: 600,
                                height: 28,
                                fontSize: '11px',
                              },
                            }}
                          >
                            Manage in Team Tab →
                          </Button>
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Stack>

          {/* Right Panel: Role Details & Collapsible Switches Grid */}
          {selectedRole ? (
            <Paper p="xl" radius="24px" style={{ background: cardBg, border: cardBorder }}>
              {/* Role Header Banner */}
              <Box mb="xl">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Box>
                    <Group gap="xs" align="center">
                      <Text fw={800} size="24px" style={{ color: headingColor }}>
                        {selectedRole.name}
                      </Text>
                      {hasUnsavedChanges && (
                        <Badge color="orange" variant="light" size="sm" radius="xl">
                          ● Unsaved Changes
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" mt={2} mb="xs">
                      {selectedRole.description || 'Configured permissions and module access.'}
                    </Text>
                  </Box>

                  <Group gap="sm" align="center" wrap="nowrap">
                    {/* Explicit Save Permissions Button */}
                    <Button
                      variant={hasUnsavedChanges ? 'filled' : 'light'}
                      color={hasUnsavedChanges ? 'blue' : 'teal'}
                      size="sm"
                      radius="100px"
                      loading={savingPermissions}
                      leftSection={hasUnsavedChanges ? <IconDeviceFloppy size={16} /> : <IconCheck size={16} />}
                      onClick={handleSavePermissions}
                      styles={{
                        root: {
                          fontWeight: 700,
                          fontSize: '13px',
                          boxShadow: hasUnsavedChanges ? '0 4px 14px rgba(37, 99, 235, 0.35)' : undefined,
                          transition: 'all 0.2s ease',
                          flexShrink: 0,
                        },
                      }}
                    >
                      {hasUnsavedChanges ? 'Save Permissions' : 'Saved'}
                    </Button>

                    {!selectedRole.isSystem && selectedRole.slug !== 'super_admin' && (
                      <Button
                        variant="light"
                        color="red"
                        size="xs"
                        radius="100px"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => handleDeleteRole(selectedRole.id, selectedRole.name)}
                        styles={{
                          root: {
                            fontWeight: 600,
                            flexShrink: 0,
                          },
                        }}
                      >
                        Delete Role
                      </Button>
                    )}
                  </Group>
                </Group>

                <Group justify="space-between" align="center" mt={8} mb={4} wrap="wrap" gap="sm">
                  <Group gap="xs" align="center">
                    <Badge
                      size="md"
                      radius="100px"
                      variant="light"
                      color="blue"
                      leftSection={<IconWorld size={13} style={{ marginRight: 4 }} />}
                      style={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Web Only / Unassigned
                    </Badge>

                    {(() => {
                      const enabledCount = systemModules.filter((m) => localPermissions[m.id]?.canView).length;
                      return (
                        <Text size="xs" c="dimmed">
                          {enabledCount} of {systemModules.length} modules enabled
                        </Text>
                      );
                    })()}
                  </Group>

                  {/* Quick Select All / Deselect All Action Buttons */}
                  <Group gap={6}>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="blue"
                      radius="xl"
                      styles={{ root: { fontSize: '11px', height: 26, padding: '0 10px', fontWeight: 600 } }}
                      onClick={handleSelectAllModules}
                    >
                      Enable All
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      radius="xl"
                      styles={{ root: { fontSize: '11px', height: 26, padding: '0 10px', fontWeight: 600 } }}
                      onClick={handleDeselectAllModules}
                    >
                      Disable All
                    </Button>
                  </Group>
                </Group>
              </Box>

              {/* Module Categories List */}
              <Stack gap="lg">
                {categories.map(([categoryName, modules]) => {
                  const enabledInCat = modules.filter((m) => localPermissions[m.id]?.canView).length;
                  const isCollapsed = Boolean(collapsedCategories[categoryName]);

                  return (
                    <Box key={categoryName}>
                      {/* Category Header */}
                      <Group
                        justify="space-between"
                        align="center"
                        py="xs"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => toggleCategoryCollapse(categoryName)}
                      >
                        <Group gap="xs">
                          <Text fw={800} size="sm" style={{ color: headingColor }}>
                            {categoryName}
                          </Text>
                          <Badge
                            size="sm"
                            radius="100px"
                            variant="light"
                            color="green"
                            style={{ fontWeight: 700, fontSize: '11px', height: 20, padding: '0 8px' }}
                          >
                            {enabledInCat}/{modules.length}
                          </Badge>
                        </Group>

                        {isCollapsed ? (
                          <IconChevronDown size={16} color="#94A3B8" />
                        ) : (
                          <IconChevronUp size={16} color="#94A3B8" />
                        )}
                      </Group>

                      {/* Modules 4-Column Grid */}
                      <Collapse in={!isCollapsed}>
                        <Box
                          mt="sm"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: '16px',
                          }}
                        >
                          {modules.map((mod) => {
                            const isEnabled = Boolean(localPermissions[mod.id]?.canView);
                            const isLocked = mod.id === 'access_control' && !['admin', 'super_admin'].includes(selectedRole.slug);
                            const isScopedModule = mod.id === 'contacts' || mod.id === 'leads';
                            const currentScope = localPermissions[mod.id]?.dataScope || (['admin', 'super_admin'].includes(selectedRole.slug) ? 'All' : 'Own');

                            return (
                              <Paper
                                key={mod.id}
                                p="sm"
                                radius="14px"
                                style={{
                                  background: isDark ? '#1E293B' : '#F8FAFC',
                                  border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                <Group justify="space-between" align="center" wrap="nowrap" style={{ width: '100%' }}>
                                  <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                                    {getModuleIcon(mod.id)}
                                    <Text
                                      fw={600}
                                      size="13px"
                                      style={{ color: headingColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                      title={mod.name}
                                    >
                                      {mod.name}
                                    </Text>
                                    {isLocked && <IconLock size={14} color="#F59E0B" />}
                                  </Group>

                                  <Switch
                                    checked={isEnabled}
                                    disabled={['admin', 'super_admin'].includes(selectedRole.slug) && mod.id === 'access_control'}
                                    color="indigo"
                                    size="md"
                                    onChange={() => handleToggleModule(mod.id)}
                                    styles={{
                                      track: { cursor: 'pointer' },
                                    }}
                                  />
                                </Group>

                                {/* Data Scope Option for Contacts and Leads */}
                                {isScopedModule && isEnabled && (
                                  <Group
                                    justify="space-between"
                                    align="center"
                                    pt={6}
                                    style={{
                                      borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
                                      width: '100%',
                                    }}
                                  >
                                    <Text size="11px" fw={600} c="dimmed">
                                      Data Scope
                                    </Text>
                                    <SegmentedControl
                                      size="xs"
                                      value={currentScope}
                                      disabled={selectedRole.slug === 'super_admin'}
                                      onChange={(val) => handleDataScopeChange(mod.id, val as 'Own' | 'All')}
                                      data={[
                                        { label: 'Own Data', value: 'Own' },
                                        { label: 'All Data', value: 'All' },
                                      ]}
                                      styles={{
                                        root: {
                                          padding: 2,
                                          height: 24,
                                          background: isDark ? '#0F172A' : '#E2E8F0',
                                        },
                                        label: {
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          padding: '2px 8px',
                                          lineHeight: '18px',
                                        },
                                      }}
                                    />
                                  </Group>
                                )}
                              </Paper>
                            );
                          })}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          ) : (
            <Paper p="xl" radius="24px" style={{ background: cardBg, border: cardBorder, textAlign: 'center', padding: '60px 20px' }}>
              <IconShieldLock size={44} color="#6366F1" style={{ margin: '0 auto 12px', opacity: 0.7 }} />
              <Text fw={700} size="md" style={{ color: headingColor }}>
                No Role Selected
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Please choose a role from the left list to view and configure its module permissions.
              </Text>
            </Paper>
          )}
        </Box>
      )}

      {/* 3. TAB 2: TEAM (User Role Assignments Grouped by Role) */}
      {activeTab === 'team' && (
        <Stack gap="lg">
          {/* Filter & Search Bar */}
          <Paper p="md" radius="18px" style={{ background: cardBg, border: cardBorder }}>
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Group gap="sm">
                {/* Segmented Filter Pills */}
                <Paper
                  p={3}
                  radius="100px"
                  style={{
                    background: isDark ? '#1E293B' : '#F1F5F9',
                    border: cardBorder,
                    display: 'inline-flex',
                  }}
                >
                  <UnstyledButton
                    onClick={() => setTeamFilter('all')}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '100px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: teamFilter === 'all' ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
                      color: teamFilter === 'all' ? (isDark ? '#FFFFFF' : '#0F172A') : subtitleColor,
                      boxShadow: teamFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.08)' : undefined,
                    }}
                  >
                    All
                  </UnstyledButton>
                  <UnstyledButton
                    onClick={() => setTeamFilter('assigned')}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '100px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: teamFilter === 'assigned' ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
                      color: teamFilter === 'assigned' ? (isDark ? '#FFFFFF' : '#0F172A') : subtitleColor,
                      boxShadow: teamFilter === 'assigned' ? '0 2px 6px rgba(0,0,0,0.08)' : undefined,
                    }}
                  >
                    Assigned
                  </UnstyledButton>
                  <UnstyledButton
                    onClick={() => setTeamFilter('unassigned')}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '100px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: teamFilter === 'unassigned' ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
                      color: teamFilter === 'unassigned' ? (isDark ? '#FFFFFF' : '#0F172A') : subtitleColor,
                      boxShadow: teamFilter === 'unassigned' ? '0 2px 6px rgba(0,0,0,0.08)' : undefined,
                    }}
                  >
                    Unassigned
                  </UnstyledButton>
                </Paper>

                <TextInput
                  placeholder="Search by name, email, or role..."
                  leftSection={<IconSearch size={16} color="gray" />}
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  radius="100px"
                  style={{ width: 340 }}
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      height: 38,
                    },
                  }}
                />
              </Group>

              <Group gap="md">
                <Text size="xs" fw={700} c="dimmed">
                  👥 {totalAssignedCount} assigned
                </Text>
                <Text size="xs" fw={700} c="dimmed">
                  👤 {totalUnassignedCount} unassigned
                </Text>
              </Group>
            </Group>
          </Paper>

          {/* User Cards Grouped by Role */}
          <Stack gap="md">
            {usersGroupedByRole.map((group, groupIdx) => {
              const roleInfo = group.role;
              const parentRoleName = roleInfo?.parentRole?.name || null;

              return (
                <Paper key={group.roleName} p="xl" radius="24px" style={{ background: cardBg, border: cardBorder }}>
                  {/* Role Header */}
                  <Group justify="space-between" align="center" mb="lg">
                    <Group gap="sm">
                      <Box
                        style={{
                          width: 32,
                          height: 32,
                          minWidth: 32,
                          borderRadius: '50%',
                          background: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          userSelect: 'none',
                        }}
                      >
                        <Text
                          size="11px"
                          fw={800}
                          style={{
                            color: '#FFFFFF',
                            lineHeight: 1,
                            userSelect: 'none',
                          }}
                        >
                          {getRoleInitials(group.roleName)}
                        </Text>
                      </Box>
                      <Text fw={800} size="md" style={{ color: headingColor }}>
                        {group.roleName}
                      </Text>
                    </Group>

                    <Badge size="sm" variant="light" color="gray" radius="100px">
                      {group.users.length} member{group.users.length === 1 ? '' : 's'}
                    </Badge>
                  </Group>

                  {/* Users List */}
                  <Stack gap="sm">
                    {group.users.map((user, uIdx) => {
                      const avatarColor = userAvatarColors[(groupIdx * 3 + uIdx) % userAvatarColors.length];
                      const currentRoleId = user.roleId || (roles.find((r) => r.slug.toUpperCase() === user.role?.toUpperCase())?.id) || '';
                      
                      // Dynamic reporting manager text
                      const reportingText = parentRoleName
                        ? `Reports to ${parentRoleName}`
                        : group.roleName === 'Admin' || group.roleName === 'Super Admin'
                        ? 'Reports to Direct Board'
                        : 'Reports to Management';

                      return (
                        <Paper
                          key={user.id}
                          p="md"
                          radius="16px"
                          style={{
                            background: isDark ? '#1E293B' : '#F8FAFC',
                            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {/* User Identity */}
                          <Group gap="md" style={{ flex: 1, minWidth: 260 }}>
                            <Box
                              style={{
                                width: 38,
                                height: 38,
                                minWidth: 38,
                                borderRadius: '50%',
                                background: avatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                userSelect: 'none',
                              }}
                            >
                              <Text
                                size="12px"
                                fw={800}
                                style={{
                                  color: '#FFFFFF',
                                  lineHeight: 1,
                                  userSelect: 'none',
                                }}
                              >
                                {getRoleInitials(user.name)}
                              </Text>
                            </Box>

                            <div>
                              <Text fw={700} size="14px" style={{ color: headingColor }}>
                                {user.name}
                              </Text>
                              <Group gap="md" mt={2}>
                                <Group gap={4}>
                                  <IconMail size={13} color="gray" />
                                  <Text size="11px" c="dimmed">
                                    {user.email}
                                  </Text>
                                </Group>
                                {user.phone && (
                                  <Group gap={4}>
                                    <IconPhone size={13} color="gray" />
                                    <Text size="11px" c="dimmed">
                                      {user.phone}
                                    </Text>
                                  </Group>
                                )}
                              </Group>
                            </div>
                          </Group>

                          {/* Dynamic Reporting line & Role selector */}
                          <Group gap="md">
                            <Text size="xs" c="dimmed">
                              {reportingText}
                            </Text>

                            <Select
                              data={roles.map((r) => ({ value: r.id, label: r.name }))}
                              value={currentRoleId}
                              onChange={(val) => {
                                if (val) assignUserRole(user.id, val);
                              }}
                              radius="100px"
                              size="xs"
                              style={{ width: 140 }}
                              styles={{
                                input: {
                                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                                  fontWeight: 600,
                                  textAlign: 'left',
                                },
                              }}
                            />
                          </Group>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Stack>
      )}

      {/* 4. TAB 3: TREE (100% Dynamic Organization Role Structure Canvas) */}
      {activeTab === 'tree' && (
        <Paper
          p="xl"
          radius="24px"
          style={{
            background: isDark ? '#111827' : '#FFFFFF',
            border: cardBorder,
            minHeight: 640,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Dot Grid Background */}
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: isDark
                ? 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)'
                : 'radial-gradient(#CBD5E1 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px',
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          />

          {/* Canvas Header */}
          <Group justify="space-between" align="center" mb="xl" style={{ position: 'relative', zIndex: 2 }} wrap="wrap">
            <Group gap="sm">
              <Box
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDark ? '#818CF8' : '#6366F1',
                }}
              >
                <IconSitemap size={20} />
              </Box>
              <div>
                <Text fw={800} size="md" style={{ color: headingColor }}>
                  Organization Role Structure
                </Text>
                <Text size="xs" c="dimmed">
                  Dynamic visual tree: click any role to view details or reassign reporting lines
                </Text>
              </div>
            </Group>

            <Group gap="xs">
              <Button
                variant="light"
                color="indigo"
                radius="100px"
                size="xs"
                leftSection={<IconGitBranch size={15} />}
                onClick={() => setManageHierarchyModalOpen(true)}
              >
                Reorganize Hierarchy
              </Button>
              <Button
                variant="gradient"
                gradient={{ from: '#6366F1', to: '#7C3AED', deg: 135 }}
                radius="100px"
                size="xs"
                leftSection={<IconPlus size={15} />}
                onClick={() => setAddRoleModalOpen(true)}
              >
                Add Role
              </Button>
            </Group>
          </Group>

          {/* 100% Dynamic Recursive Hierarchy Tree Container */}
          <Box
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 20,
              paddingBottom: 40,
              overflowX: 'auto',
            }}
          >
            {roleTree.length > 0 ? (
              <Group align="flex-start" justify="center" gap={60} style={{ width: '100%' }}>
                {roleTree.map((rootNode) => (
                  <DynamicTreeNode
                    key={rootNode.role.id}
                    node={rootNode}
                    users={users}
                    allRoles={roles}
                    onSelectRole={(r) => {
                      setNodeDetailsRole(r);
                    }}
                    onEditHierarchy={(r) => {
                      setHierarchyModalRole(r);
                      setTargetParentId(r.parentRoleId || '');
                    }}
                    isDark={isDark}
                  />
                ))}
              </Group>
            ) : (
              <Text size="sm" c="dimmed" mt="xl">
                No organizational roles found. Click "+ Add Role" to create one.
              </Text>
            )}
          </Box>
        </Paper>
      )}

      {/* 5. ADD ROLE MODAL */}
      <Modal
        opened={addRoleModalOpen}
        onClose={() => setAddRoleModalOpen(false)}
        title={
          <Group gap="xs">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--crm-primary-gradient, linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <IconPlus size={18} />
            </Box>
            <Text fw={800} size="md">
              Create New Role
            </Text>
          </Group>
        }
        radius="20px"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Role Name"
            placeholder="e.g. Sales Executive, Project Manager, Support Lead..."
            required
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            radius="md"
          />

          <Select
            label="Reporting Manager"
            placeholder="Select Reporting Manager..."
            data={[
              ...roles.map((r) => ({
                value: r.id,
                label: r.slug === 'super_admin' ? `${r.name} (Super Admin / Board)` : r.name,
              })),
              { value: 'ROOT', label: 'Root Level (Direct to Board)' },
            ]}
            value={newRoleParentId || (roles.find((r) => r.slug === 'super_admin')?.id || 'ROOT')}
            onChange={(val) => setNewRoleParentId(val || 'ROOT')}
            radius="md"
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" radius="100px" onClick={() => setAddRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              radius="100px"
              loading={saving}
              onClick={handleCreateRoleSubmit}
              disabled={!newRoleName.trim()}
              style={{
                background: 'var(--crm-primary-gradient, linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%))',
                color: '#FFFFFF',
              }}
            >
              Create Role
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Custom Module Modal */}
      <Modal
        opened={addModuleModalOpen}
        onClose={() => setAddModuleModalOpen(false)}
        title={
          <Group gap="xs">
            <IconLayoutGrid size={20} color="#6366F1" />
            <Text fw={700} size="lg">
              Create New Module
            </Text>
          </Group>
        }
        radius="18px"
        centered
        styles={{
          header: { background: cardBg },
          content: { background: cardBg, border: cardBorder },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Module Name"
            placeholder="e.g. Invoicing & Billing"
            required
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            radius="md"
          />

          <Select
            label="Category"
            data={[
              'Sales & CRM',
              'Operations & Projects',
              'Management & HR',
              'Administration & Security',
              'Core',
              'Custom Modules',
            ]}
            value={newModuleCategory}
            onChange={(val) => setNewModuleCategory(val || 'Custom Modules')}
            radius="md"
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Describe what access or features this module provides"
            minRows={2}
            value={newModuleDesc}
            onChange={(e) => setNewModuleDesc(e.target.value)}
            radius="md"
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" radius="100px" onClick={() => setAddModuleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              radius="100px"
              loading={creatingModule}
              onClick={handleCreateModuleSubmit}
              disabled={!newModuleName.trim()}
              style={{
                background: 'var(--crm-primary-gradient, linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%))',
                color: '#FFFFFF',
              }}
            >
              + Create Module
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 6. CHANGE REPORTING LINE MODAL (Single Role) */}
      <Modal
        opened={!!hierarchyModalRole}
        onClose={() => setHierarchyModalRole(null)}
        title={
          <Group gap="xs">
            <IconGitBranch size={20} color="#6366F1" />
            <Text fw={700} size="md">
              Change Reporting Line: {hierarchyModalRole?.name}
            </Text>
          </Group>
        }
        radius="20px"
        centered
        styles={{
          header: { background: cardBg },
          content: { background: cardBg, border: cardBorder },
        }}
      >
        {hierarchyModalRole && (
          <Stack gap="md">
            <Text size="xs" c="dimmed">
              Select the new manager or parent role for <b>{hierarchyModalRole.name}</b>. The organizational tree will immediately update to reflect this change.
            </Text>

            <Select
              label="Reports To (Parent Role)"
              placeholder="Select parent role..."
              data={[
                { value: 'none', label: 'Top-Level (Direct to Board / No Parent)' },
                ...getValidParentsForRole(hierarchyModalRole).map((r) => ({
                  value: r.id,
                  label: `${r.name} (${users.filter((u) => u.roleId === r.id || u.role?.toUpperCase() === r.slug.toUpperCase()).length} members)`,
                })),
              ]}
              value={targetParentId || 'none'}
              onChange={(val) => setTargetParentId(val === 'none' ? '' : (val || ''))}
              radius="md"
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" radius="100px" onClick={() => setHierarchyModalRole(null)}>
                Cancel
              </Button>
              <Button
                radius="100px"
                loading={updatingHierarchy}
                onClick={() => handleUpdateRoleParent(hierarchyModalRole.id, targetParentId || null)}
                style={{
                  background: 'var(--crm-primary-gradient, linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%))',
                  color: '#FFFFFF',
                }}
              >
                Save Structure
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* 7. REORGANIZE HIERARCHY MODAL (Full Matrix View) */}
      <Modal
        opened={manageHierarchyModalOpen}
        onClose={() => setManageHierarchyModalOpen(false)}
        title={
          <Group gap="xs">
            <IconSitemap size={22} color="#6366F1" />
            <div>
              <Text fw={800} size="md">
                Reorganize Role Hierarchy
              </Text>
              <Text size="xs" c="dimmed">
                Reassign parent reporting lines for all organizational roles
              </Text>
            </div>
          </Group>
        }
        size="lg"
        radius="20px"
        centered
        styles={{
          header: { background: cardBg },
          content: { background: cardBg, border: cardBorder },
        }}
      >
        <Stack gap="md">
          <Paper p="sm" radius="md" style={{ background: isDark ? '#1E293B' : '#F8FAFC', border: cardBorder }}>
            <Text size="xs" c="dimmed">
              💡 <b>Tip:</b> Changing any role's parent below dynamically updates its branch and connection lines in the visual organizational tree.
            </Text>
          </Paper>

          <Stack gap="xs">
            {roles.map((r) => {
              const memberCount = users.filter((u) => u.roleId === r.id || u.role?.toUpperCase() === r.slug.toUpperCase()).length;
              const isRoot = !r.parentRoleId && !r.parentRole?.id;
              const isSuperAdmin = r.slug === 'super_admin';
              const validParents = getValidParentsForRole(r);

              return (
                <Paper
                  key={r.id}
                  p="sm"
                  radius="md"
                  style={{
                    background: isDark ? '#111827' : '#FFFFFF',
                    border: cardBorder,
                  }}
                >
                  <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                    <div>
                      <Group gap="xs">
                        <Text fw={700} size="sm">
                          {r.name}
                        </Text>
                        {isSuperAdmin && (
                          <Badge size="xs" variant="filled" color="indigo">
                            Root Head
                          </Badge>
                        )}
                        <Badge size="xs" variant="light" color="gray">
                          {memberCount} member{memberCount === 1 ? '' : 's'}
                        </Badge>
                      </Group>
                      <Text size="11px" c="dimmed">
                        Current: {isRoot ? 'Direct to Board (Top-level)' : `Reports to ${r.parentRole?.name || roles.find((p) => p.id === r.parentRoleId)?.name || 'Unknown'}`}
                      </Text>
                    </div>

                    {isSuperAdmin ? (
                      <Text size="xs" c="dimmed" fs="italic">
                        Super Admin cannot have a parent
                      </Text>
                    ) : (
                      <Group gap="xs">
                        <Select
                          placeholder="Change Parent..."
                          data={[
                            { value: 'none', label: 'Top-Level (Direct to Board)' },
                            ...validParents.map((p) => ({ value: p.id, label: p.name })),
                          ]}
                          value={r.parentRoleId || 'none'}
                          onChange={(val) => {
                            const newP = val === 'none' ? null : val;
                            handleUpdateRoleParent(r.id, newP);
                          }}
                          radius="100px"
                          size="xs"
                          style={{ width: 230 }}
                          disabled={updatingHierarchy}
                        />
                      </Group>
                    )}
                  </Group>
                </Paper>
              );
            })}
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button radius="100px" onClick={() => setManageHierarchyModalOpen(false)}>
              Done
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 8. ROLE DETAILS & MEMBERS MODAL */}
      <Modal
        opened={!!nodeDetailsRole}
        onClose={() => setNodeDetailsRole(null)}
        title={
          <Group gap="xs">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--crm-primary-gradient, linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <IconShieldLock size={18} />
            </Box>
            <div>
              <Text fw={800} size="md">
                {nodeDetailsRole?.name}
              </Text>
              <Text size="xs" c="dimmed">
                Role Hierarchy & Member Overview
              </Text>
            </div>
          </Group>
        }
        radius="20px"
        centered
        styles={{
          header: { background: cardBg },
          content: { background: cardBg, border: cardBorder },
        }}
      >
        {nodeDetailsRole && (
          <Stack gap="md">
            {/* Details summary */}
            <Paper p="sm" radius="md" style={{ background: isDark ? '#1E293B' : '#F8FAFC', border: cardBorder }}>
              <Group justify="space-between" mb={6}>
                <Text size="xs" fw={600} c="dimmed">
                  Reporting Line
                </Text>
                <Text size="xs" fw={700}>
                  {nodeDetailsRole.parentRole?.name || roles.find((r) => r.id === nodeDetailsRole.parentRoleId)?.name || 'Direct to Board (Root Head)'}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" fw={600} c="dimmed">
                  Assigned Members
                </Text>
                <Badge size="xs" variant="light" color="indigo">
                  {users.filter((u) => u.roleId === nodeDetailsRole.id || u.role?.toUpperCase() === nodeDetailsRole.slug.toUpperCase()).length} members
                </Badge>
              </Group>
            </Paper>

            {/* Members list */}
            <div>
              <Text fw={700} size="xs" mb="xs" c="dimmed" tt="uppercase">
                Members in this Role
              </Text>
              {users.filter((u) => u.roleId === nodeDetailsRole.id || u.role?.toUpperCase() === nodeDetailsRole.slug.toUpperCase()).length > 0 ? (
                <Stack gap={6} style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {users
                    .filter((u) => u.roleId === nodeDetailsRole.id || u.role?.toUpperCase() === nodeDetailsRole.slug.toUpperCase())
                    .map((u) => (
                      <Paper key={u.id} p="xs" radius="md" style={{ background: isDark ? '#111827' : '#FFFFFF', border: cardBorder }}>
                        <Group justify="space-between">
                          <Group gap="xs">
                            <Avatar size="sm" radius="xl" color="indigo">
                              {u.name.slice(0, 2).toUpperCase()}
                            </Avatar>
                            <div>
                              <Text size="xs" fw={600}>
                                {u.name}
                              </Text>
                              <Text size="10px" c="dimmed">
                                {u.email}
                              </Text>
                            </div>
                          </Group>
                          {u.department && (
                            <Badge size="xs" variant="outline" color="gray">
                              {u.department}
                            </Badge>
                          )}
                        </Group>
                      </Paper>
                    ))}
                </Stack>
              ) : (
                <Paper p="md" radius="md" style={{ textAlign: 'center', background: isDark ? '#111827' : '#FFFFFF', border: cardBorder }}>
                  <Text size="xs" c="dimmed">
                    No users currently assigned to this role.
                  </Text>
                </Paper>
              )}
            </div>

            {/* Quick Actions */}
            <Group justify="space-between" mt="md">
              {nodeDetailsRole.slug !== 'super_admin' ? (
                <Button
                  variant="light"
                  color="indigo"
                  radius="100px"
                  size="xs"
                  leftSection={<IconGitBranch size={14} />}
                  onClick={() => {
                    const r = nodeDetailsRole;
                    setNodeDetailsRole(null);
                    setHierarchyModalRole(r);
                    setTargetParentId(r.parentRoleId || '');
                  }}
                >
                  Change Reporting
                </Button>
              ) : <Box />}

              <Button
                radius="100px"
                size="xs"
                style={{
                  background: 'var(--crm-primary-gradient, linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%))',
                  color: '#FFFFFF',
                }}
                leftSection={<IconShieldLock size={14} />}
                onClick={() => {
                  setSelectedRole(nodeDetailsRole);
                  setNodeDetailsRole(null);
                  setActiveTab('perms');
                }}
              >
                Configure Permissions
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
};

export default AccessControlPage;
