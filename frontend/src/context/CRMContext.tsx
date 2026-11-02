import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types/employee';
import { crmApi } from '../services/api';
import { notifications } from '@mantine/notifications';

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
    const path = pathname.replace(/^\//, '').split('?')[0].replace(/\/+$/, '').toLowerCase();

    if (path === 'signup') return 'signup';
    if (path === 'login' || path === 'signin' || path === 'auth') return 'login';
    if (path === 'reset-password' || path === 'reset') return 'reset-password';

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
    if (path === 'employees') return 'employees';

    if (path === 'contacts/add' || path === 'add-contact') return 'add-contact';
    if (path === 'contacts/qualification' || path === 'contacts/qualify' || path === 'qualification') return 'contact-qualification';
    if (path === 'contacts/details' || path === 'contact-details') return 'contact-details';
    if (path === 'contacts') return 'contacts';

    if (path === 'leads/schedule' || path === 'lead-schedule' || path === 'lead-details' || path === 'schedule-meeting') return 'lead-schedule';
    if (path === 'leads' || path === 'lead') return 'leads';

    if (path === 'scheduled-meetings' || path === 'meetings') return 'scheduled-meetings';
    if (path === 'call-logs' || path === 'calls' || path === 'call-log' || path === 'activity-logs' || path === 'activity-log') return 'call-logs';

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

    if (path === 'invoices/create' || path === 'invoices/add' || path === 'create-invoice') return 'create-invoice';
    if (path === 'invoices/details' || path === 'invoice-details') return 'invoice-details';
    if (path === 'invoices/edit' || path === 'edit-invoice') return 'edit-invoice';
    if (path === 'invoices' || path === 'invoice') return 'invoices';

    if (path === 'activity-timeline' || path === 'activity' || path === 'activities' || path === 'timeline') return 'activity-timeline';

    if (path === 'access-control' || path === 'access-control-matrix' || path === 'rbac') return 'access-control';
    if (path === 'settings' || path === 'setting' || path === 'master-catalog' || path === 'catalog') return 'settings';

    if (path === 'dashboard') return 'dashboard';
    if (path) return path;

    const saved = localStorage.getItem('crm_active_nav');
    if (saved && saved !== 'login' && saved !== 'signup') {
      return saved === 'onboard-employee' || saved === 'onboard' ? 'add-employee' : saved;
    }

    return 'dashboard';
  };

  const [activeNav, setActiveNavState] = useState<string>(() => resolveNavFromPath());

  const setActiveNav = (nav: string) => {
    const normalizedNav = nav === 'onboard-employee' || nav === 'onboard' ? 'add-employee' : nav;
    setActiveNavState(normalizedNav);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_active_nav', normalizedNav);
      let targetPath = '/';
      if (normalizedNav === 'dashboard') targetPath = '/';
      else if (normalizedNav === 'employees') targetPath = '/employees';
      else if (normalizedNav === 'add-employee') targetPath = '/employees/add';
      else if (normalizedNav === 'contacts') targetPath = '/contacts';
      else if (normalizedNav === 'add-contact') targetPath = '/contacts/add';
      else if (normalizedNav === 'contact-qualification' || normalizedNav === 'qualification') targetPath = '/contacts/qualification';
      else if (normalizedNav === 'contact-details') targetPath = '/contacts/details';
      else if (normalizedNav === 'leads' || normalizedNav === 'lead') targetPath = '/leads';
      else if (normalizedNav === 'lead-schedule' || normalizedNav === 'lead-details' || normalizedNav === 'schedule-meeting') targetPath = '/leads/schedule';
      else if (normalizedNav === 'scheduled-meetings' || normalizedNav === 'meetings') targetPath = '/scheduled-meetings';
      else if (normalizedNav === 'call-logs' || normalizedNav === 'calls' || normalizedNav === 'call-log' || normalizedNav === 'activity-logs' || normalizedNav === 'activity-log') targetPath = '/call-logs';
      else if (normalizedNav === 'customers' || normalizedNav === 'customer') targetPath = '/customers';
      else if (normalizedNav === 'customer-details') targetPath = '/customers/details';
      else if (normalizedNav === 'negotiations' || normalizedNav === 'negotiation') targetPath = '/negotiations';
      else if (normalizedNav === 'projects' || normalizedNav === 'projects-management') targetPath = '/projects';
      else if (normalizedNav === 'add-project' || normalizedNav === 'create-project' || normalizedNav === 'projects/add') targetPath = '/projects/add';
      else if (normalizedNav === 'project-details') targetPath = '/projects/details';
      else if (normalizedNav === 'projects-my') targetPath = '/projects/my';
      else if (normalizedNav === 'projects-tasks') targetPath = '/projects/tasks';
      else if (normalizedNav === 'projects-team') targetPath = '/projects/team';
      else if (normalizedNav === 'projects-reports') targetPath = '/projects/reports';
      else if (normalizedNav === 'invoices') targetPath = '/invoices';
      else if (normalizedNav === 'create-invoice') targetPath = '/invoices/create';
      else if (normalizedNav === 'invoice-details') targetPath = '/invoices/details';
      else if (normalizedNav === 'edit-invoice') targetPath = '/invoices/edit';
      else if (normalizedNav === 'activity-timeline' || normalizedNav === 'activities') targetPath = '/activity-timeline';
      else if (normalizedNav === 'access-control' || normalizedNav === 'rbac') targetPath = '/access-control';
      else if (normalizedNav === 'settings') {
        const savedTab = localStorage.getItem('crm_settings_tab');
        targetPath = savedTab && savedTab !== 'company' ? `/settings?tab=${savedTab}` : '/settings';
      }
      else if (normalizedNav === 'login') targetPath = '/login';
      else if (normalizedNav === 'signup') targetPath = '/signup';
      else targetPath = `/${normalizedNav}`;

      const currentFullPath = window.location.pathname + window.location.search;
      if (currentFullPath !== targetPath && window.location.pathname !== targetPath.split('?')[0]) {
        window.history.pushState({ nav: normalizedNav }, '', targetPath);
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
