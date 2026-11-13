import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types/employee';
import { crmApi } from '../services/api';
import { notifications } from '@mantine/notifications';
import { getAppPath, stripAppBasePath } from '../config/env';

const defaultEmptyUser: UserProfile = {
  id: '',
  name: '',
  email: '',
  role: '' as UserRole,
  avatar: '',
  department: '',
};

interface CRMContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  setCurrentUserRole: (role: UserRole) => void;
  logoutUser: () => Promise<void>;
  activeNav: string;
  setActiveNav: (nav: string) => void;

  // Global Filter / Search
  globalSearch: string;
  setGlobalSearch: (term: string) => void;

  // Sidebar mobile toggle
  sidebarMobileOpened: boolean;
  setSidebarMobileOpened: (opened: boolean) => void;

  // Desktop Sidebar collapse toggle
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

  // Clear Database & Storage
  clearDatabase: () => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('crm_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && !parsed.email.includes('omnitech.io') && parsed.name !== 'Vikram Sundaram') {
          return parsed;
        }
      }
    } catch (e) {}
    return defaultEmptyUser;
  });

  const resolveNavFromPath = (rawPathname?: string): string => {
    if (typeof window === 'undefined') return 'dashboard';
    const pathname = rawPathname || window.location.pathname;
    const stripped = stripAppBasePath(pathname);
    const path = stripped.replace(/^\//, '').split('?')[0].replace(/\/+$/, '').toLowerCase();

    if (!path || path === 'it-crm') {
      const saved = localStorage.getItem('crm_active_nav');
      if (saved && saved !== 'login' && saved !== 'signup') {
        return saved === 'onboard-employee' || saved === 'onboard' ? 'add-employee' : saved;
      }
      return 'dashboard';
    }

    if (path === 'signup') return 'signup';
    if (path === 'login' || path === 'signin' || path === 'auth') return 'login';
    if (path === 'reset-password' || path === 'reset') return 'reset-password';

    if (path === 'dashboard') return 'dashboard';
    if (path === 'employee-dashboard' || path === 'emp-dashboard') return 'employee-dashboard';

    if (
      path === 'employees/add' ||
      path === 'add-employee' ||
      path === 'add' ||
      path === 'employees/onboard' ||
      path === 'onboard' ||
      path === 'onboard-employee'
    ) {
      return 'add-employee';
    }
    if (path === 'employees' || path === 'employee-management') return 'employees';

    if (
      path === 'contact' ||
      path === 'contacts'
    ) {
      return 'contacts';
    }

    if (
      path === 'contact/add' ||
      path === 'contacts/add' ||
      path === 'add-contact'
    ) {
      return 'add-contact';
    }

    if (
      path === 'contact/qualification' ||
      path === 'contacts/qualification' ||
      path === 'contact/qualify' ||
      path === 'contacts/qualify' ||
      path === 'qualification'
    ) {
      return 'contact-qualification';
    }

    if (
      path === 'contact/details' ||
      path === 'contacts/details' ||
      path === 'contact-details'
    ) {
      return 'contact-details';
    }

    if (path === 'leads/schedule' || path === 'lead-schedule' || path === 'lead-details' || path === 'schedule-meeting') return 'lead-schedule';
    if (path === 'leads' || path === 'lead') return 'leads';

    if (path === 'meetings' || path === 'scheduled-meetings') return 'scheduled-meetings';
    if (path === 'activity-logs' || path === 'call-logs' || path === 'calls' || path === 'call-log' || path === 'activity-log') return 'call-logs';

    if (path === 'customers/details' || path === 'customer-details') return 'customer-details';
    if (path === 'customers' || path === 'customer' || path === 'customers-all') return 'customers';

    if (path === 'negotiations' || path === 'negotiation') return 'negotiations';
    if (path === 'contracts' || path === 'contract' || path === 'create-contract') return 'contracts';

    if (path === 'projects/add' || path === 'add-project' || path === 'projects/create' || path === 'create-project') return 'add-project';
    if (path === 'projects/details' || path === 'project-details' || path === 'projects-details') return 'project-details';
    if (path === 'projects/my' || path === 'projects-my') return 'projects-my';
    if (path === 'projects/tasks' || path === 'projects-tasks') return 'projects-tasks';
    if (path === 'projects/team' || path === 'projects-team') return 'projects-team';
    if (path === 'projects/reports' || path === 'projects-reports') return 'projects-reports';
    if (path === 'projects' || path === 'projects-management' || path === 'projects-all' || path === 'project') return 'projects';

    if (path === 'support-tickets/details' || path === 'ticket-details') return 'ticket-details';
    if (path === 'support-tickets' || path === 'tickets') return 'support-tickets';

    if (path === 'invoices/create' || path === 'invoices/add' || path === 'create-invoice') return 'create-invoice';
    if (path === 'invoices/details' || path === 'invoice-details') return 'invoice-details';
    if (path === 'invoices/edit' || path === 'edit-invoice') return 'edit-invoice';
    if (path === 'invoices' || path === 'invoice') return 'invoices';

    if (path === 'activity-timeline' || path === 'activity' || path === 'activities' || path === 'timeline') return 'activity-timeline';

    if (path === 'access-control' || path === 'access-control-matrix' || path === 'rbac') return 'access-control';
    if (path === 'settings' || path === 'setting' || path === 'master-catalog' || path === 'catalog') return 'settings';

    return path;
  };

  /**
   * Resolves canonical /it-crm route path for any navigation target
   */
  const getTargetPathForNav = (nav: string): string => {
    const normalizedNav = nav === 'onboard-employee' || nav === 'onboard' ? 'add-employee' : nav;
    let targetPath = '/dashboard';

    switch (normalizedNav) {
      case 'dashboard':
        targetPath = '/dashboard';
        break;
      case 'employee-dashboard':
      case 'emp-dashboard':
        targetPath = '/employee-dashboard';
        break;
      case 'employees':
      case 'employee-management':
        targetPath = '/employees';
        break;
      case 'add-employee':
        targetPath = '/employees/add';
        break;
      case 'contacts':
      case 'contact':
        targetPath = '/contact';
        break;
      case 'add-contact':
        targetPath = '/contact/add';
        break;
      case 'contact-qualification':
      case 'qualification':
        targetPath = '/contact/qualification';
        break;
      case 'contact-details':
        targetPath = '/contact/details';
        break;
      case 'leads':
      case 'lead':
        targetPath = '/leads';
        break;
      case 'lead-schedule':
      case 'lead-details':
      case 'schedule-meeting':
        targetPath = '/leads/schedule';
        break;
      case 'scheduled-meetings':
      case 'meetings':
        targetPath = '/meetings';
        break;
      case 'call-logs':
      case 'calls':
      case 'call-log':
      case 'activity-logs':
      case 'activity-log':
        targetPath = '/activity-logs';
        break;
      case 'customers':
      case 'customer':
      case 'customers-all':
        targetPath = '/customers';
        break;
      case 'customer-details':
        targetPath = '/customers/details';
        break;
      case 'negotiations':
      case 'negotiation':
        targetPath = '/negotiations';
        break;
      case 'contracts':
      case 'contract':
      case 'create-contract':
        targetPath = '/contracts';
        break;
      case 'projects':
      case 'projects-management':
      case 'projects-all':
      case 'project':
        targetPath = '/projects';
        break;
      case 'add-project':
      case 'create-project':
        targetPath = '/projects/add';
        break;
      case 'project-details':
        targetPath = '/projects/details';
        break;
      case 'projects-my':
        targetPath = '/projects/my';
        break;
      case 'projects-tasks':
        targetPath = '/projects/tasks';
        break;
      case 'projects-team':
        targetPath = '/projects/team';
        break;
      case 'projects-reports':
        targetPath = '/projects/reports';
        break;
      case 'support-tickets':
      case 'tickets':
        targetPath = '/support-tickets';
        break;
      case 'ticket-details':
        targetPath = '/support-tickets/details';
        break;
      case 'invoices':
      case 'invoice':
        targetPath = '/invoices';
        break;
      case 'create-invoice':
        targetPath = '/invoices/create';
        break;
      case 'invoice-details':
        targetPath = '/invoices/details';
        break;
      case 'edit-invoice':
        targetPath = '/invoices/edit';
        break;
      case 'activity-timeline':
      case 'activities':
      case 'activity':
      case 'timeline':
        targetPath = '/activity-timeline';
        break;
      case 'access-control':
      case 'access-control-matrix':
      case 'rbac':
        targetPath = '/access-control';
        break;
      case 'settings':
      case 'setting':
      case 'master-catalog':
      case 'catalog': {
        const savedTab = typeof window !== 'undefined' ? localStorage.getItem('crm_settings_tab') : null;
        targetPath = savedTab && savedTab !== 'company' ? `/settings?tab=${savedTab}` : '/settings';
        break;
      }
      case 'login':
        targetPath = '/login';
        break;
      case 'signup':
        targetPath = '/signup';
        break;
      case 'reset-password':
      case 'reset':
        targetPath = '/reset-password';
        break;
      default:
        targetPath = `/${normalizedNav.replace(/^\/+/, '')}`;
        break;
    }

    return getAppPath(targetPath);
  };

  const [activeNav, setActiveNavState] = useState<string>(() => resolveNavFromPath());

  const setActiveNav = (nav: string) => {
    const normalizedNav = nav === 'onboard-employee' || nav === 'onboard' ? 'add-employee' : nav;
    setActiveNavState(normalizedNav);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_active_nav', normalizedNav);
      const fullTargetPath = getTargetPathForNav(normalizedNav);
      const currentFullPath = window.location.pathname + window.location.search;
      if (currentFullPath !== fullTargetPath && window.location.pathname !== fullTargetPath.split('?')[0]) {
        window.history.pushState({ nav: normalizedNav }, '', fullTargetPath);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const resolved = resolveNavFromPath();
      setActiveNavState(resolved);
      if (typeof window !== 'undefined') {
        localStorage.setItem('crm_active_nav', resolved);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Canonical URL redirection for /it-crm parent prefix
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.replace(/\/+$/, '').toLowerCase();
      // If root or bare /it-crm, redirect to default IT CRM dashboard
      if (pathname === '' || pathname === '/it-crm') {
        const roleUpper = String(currentUser?.role || '').toUpperCase();
        const isAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN';
        const defaultNav = isAdmin ? 'dashboard' : 'employee-dashboard';
        const target = getTargetPathForNav(defaultNav);
        setActiveNavState(defaultNav);
        window.history.replaceState({ nav: defaultNav }, '', target);
        return;
      }

      // If user accesses legacy URLs without /it-crm prefix, cleanly redirect to canonical /it-crm/...
      if (!pathname.startsWith('/it-crm')) {
        const resolved = resolveNavFromPath();
        const target = getTargetPathForNav(resolved);
        window.history.replaceState({ nav: resolved }, '', target);
      }
    }
  }, [currentUser?.role]);

  // Auto-sync current user session from API on load
  useEffect(() => {
    crmApi.getMe()
      .then((res) => {
        if (res?.user && res.user.name) {
          setCurrentUser((prev) => ({
            ...prev,
            ...res.user,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Sync user to localStorage
  useEffect(() => {
    localStorage.setItem('crm_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const setCurrentUserRole = (role: UserRole) => {
    setCurrentUser((prev) => ({
      ...prev,
      role,
      department: 
        role === 'SUPER_ADMIN' ? 'Executive Management' :
        role === 'SALES_MANAGER' ? 'Sales & Business Growth' :
        role === 'PROJECT_MANAGER' ? 'Client Delivery & PMO' :
        role === 'TECH_LEAD' ? 'Engineering & Architecture' :
        role === 'DEVELOPER' ? 'Fullstack Software Engineering' : 'Client Operations',
    }));
    notifications.show({
      title: 'Active Role Switched',
      message: `You are now interacting as: ${role}`,
      color: 'dark',
    });
  };

  // 100% Wipe / Reset Database & Flush Redis Cache
  const clearDatabase = async () => {
    try {
      await crmApi.clearDatabase();
      notifications.show({
        title: 'Database Cleared',
        message: 'All employee data and cache wiped successfully!',
        color: 'teal',
      });
    } catch (err: any) {
      notifications.show({
        title: 'Clear Error',
        message: err.message || 'Failed to clear database.',
        color: 'red',
      });
    }
  };

  const [sidebarMobileOpened, setSidebarMobileOpened] = useState<boolean>(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('crm_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('crm_sidebar_collapsed', String(sidebarCollapsed));
    } catch {}
  }, [sidebarCollapsed]);

  // User Logout: Clears HttpOnly Cookie & Session
  const logoutUser = async () => {
    try {
      await crmApi.logout().catch(() => {});
      localStorage.removeItem('crm_user');
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_my_permissions');
      setCurrentUser(defaultEmptyUser);
      window.dispatchEvent(new CustomEvent('crm_permissions_updated'));
      notifications.show({
        title: 'Logged Out',
        message: 'Session closed and Redis cache purged successfully.',
        color: 'gray',
      });
      setActiveNav('login');
    } catch (err: any) {
      notifications.show({
        title: 'Logout Error',
        message: err.message || 'Failed to logout.',
        color: 'red',
      });
    }
  };

  return (
    <CRMContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        setCurrentUserRole,
        logoutUser,
        activeNav,
        setActiveNav: (nav: string) => {
          setSidebarMobileOpened(false);
          setActiveNav(nav);
        },
        globalSearch,
        setGlobalSearch,
        sidebarMobileOpened,
        setSidebarMobileOpened,
        sidebarCollapsed,
        setSidebarCollapsed,
        clearDatabase,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
