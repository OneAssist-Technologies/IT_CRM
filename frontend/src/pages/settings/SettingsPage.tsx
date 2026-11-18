import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import {
  Stack,
  Text,
  Box,
  UnstyledButton,
  Paper,
  Group,
  ThemeIcon,
  Button,
  useComputedColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconAlertCircle, IconUser, IconCalendar, IconFolders, IconBuildingSkyscraper, IconLock } from '@tabler/icons-react';
import { ProjectCatalogTab } from './components/ProjectCatalogTab';
import { CompanyProfileTab } from './components/CompanyProfileTab';
import { UserProfileTab } from './components/UserProfileTab';
import { CalendarRemindersTab } from './components/CalendarRemindersTab';
import { useAccessControl } from '../../context/AccessControlContext';

type SettingsTabKey = 'profile' | 'company' | 'calendar' | 'projects';

interface NavItem {
  key: SettingsTabKey;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  permModule: string;
}

interface TabErrorBoundaryProps {
  tabName: string;
  children: ReactNode;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  state: TabErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SettingsPage] Error in tab "${this.props.tabName}":`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Paper p="xl" radius="md" withBorder style={{ maxWidth: 800 }}>
          <Group gap="sm" mb="sm">
            <ThemeIcon color="red" variant="light" size="lg" radius="md">
              <IconAlertCircle size={22} />
            </ThemeIcon>
            <Box>
              <Text fw={700} size="md">
                Error Loading {this.props.tabName}
              </Text>
              <Text size="xs" c="dimmed">
                {this.state.error?.message || 'An unexpected runtime error occurred.'}
              </Text>
            </Box>
          </Group>
          <Button size="xs" variant="light" color="indigo" onClick={this.handleRetry}>
            Try Again
          </Button>
        </Paper>
      );
    }
    return this.props.children;
  }
}

const getInitialSettingsTab = (): SettingsTabKey => {
  if (typeof window !== 'undefined') {
    // 1. Check URL query param ?tab=
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as SettingsTabKey | null;
    if (tabParam && (tabParam === 'profile' || tabParam === 'company' || tabParam === 'calendar' || tabParam === 'projects')) {
      return tabParam;
    }
    // 2. Check URL hash #company
    const hash = window.location.hash.replace(/^#/, '') as SettingsTabKey;
    if (hash && (hash === 'profile' || hash === 'company' || hash === 'calendar' || hash === 'projects')) {
      return hash;
    }
    // 3. Check localStorage
    const saved = localStorage.getItem('crm_settings_tab') as SettingsTabKey | null;
    if (saved && (saved === 'profile' || saved === 'company' || saved === 'calendar' || saved === 'projects')) {
      return saved;
    }
  }
  return 'profile';
};

export const SettingsPage: React.FC = () => {
  const { can, isSuperAdmin } = useAccessControl();
  const [activeTab, setActiveTabState] = useState<SettingsTabKey>(getInitialSettingsTab);
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSmallMobile = useMediaQuery('(max-width: 520px)');

  const allNavItems: NavItem[] = useMemo(
    () => [
      { key: 'profile', label: 'My Profile', shortLabel: 'Profile', icon: <IconUser size={15} />, permModule: 'myprofile' },
      { key: 'company', label: 'Company Profile', shortLabel: 'Company', icon: <IconBuildingSkyscraper size={15} />, permModule: 'company_profile' },
      { key: 'calendar', label: 'Calendar & Reminders', shortLabel: 'Calendar', icon: <IconCalendar size={15} />, permModule: 'calendar' },
      { key: 'projects', label: 'Project Catalog', shortLabel: 'Catalog', icon: <IconFolders size={15} />, permModule: 'project_catalog' },
    ],
    []
  );

  const navItems = useMemo(() => {
    if (isSuperAdmin) return allNavItems;
    return allNavItems.filter((item) => can(item.permModule, 'view'));
  }, [isSuperAdmin, can, allNavItems]);

  // Ensure active tab is allowed, otherwise switch to first allowed tab
  useEffect(() => {
    if (navItems.length > 0 && !navItems.some((item) => item.key === activeTab)) {
      setActiveTabState(navItems[0].key);
    }
  }, [navItems, activeTab]);

  const handleTabChange = (key: SettingsTabKey) => {
    setActiveTabState(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_settings_tab', key);
      const url = new URL(window.location.href);
      if (key === 'profile') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', key);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_settings_tab', activeTab);
      const url = new URL(window.location.href);
      if (activeTab !== 'profile') {
        if (url.searchParams.get('tab') !== activeTab) {
          url.searchParams.set('tab', activeTab);
          window.history.replaceState(null, '', url.pathname + url.search);
        }
      } else if (url.searchParams.has('tab')) {
        url.searchParams.delete('tab');
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }

    const handlePop = () => {
      const tab = getInitialSettingsTab();
      setActiveTabState(tab);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [activeTab]);

  if (navItems.length === 0) {
    return (
      <Paper p="xl" radius="md" withBorder style={{ maxWidth: 600, margin: '40px auto' }}>
        <Group gap="sm" mb="sm">
          <ThemeIcon color="red" variant="light" size="lg" radius="md">
            <IconAlertCircle size={22} />
          </ThemeIcon>
          <Box>
            <Text fw={700} size="md">
              Access Restricted
            </Text>
            <Text size="sm" c="dimmed">
              You do not have permission to view any settings modules. Please contact your system administrator.
            </Text>
          </Box>
        </Group>
      </Paper>
    );
  }

  return (
    <Box style={{ width: '100%', maxWidth: '100%' }}>
      {/* 1. Main Page Title */}
      <Box mb="md" pl={2}>
        <Text
          fw={800}
          size={isMobile ? '20px' : '22px'}
          style={{
            letterSpacing: '-0.02em',
            color: isDark ? '#F8FAFC' : '#0F172A',
          }}
        >
          Account Settings
        </Text>
      </Box>

      {/* 2. Inner Split Layout (Sub-sidebar on Desktop, Modern Segmented Tabs Bar on Mobile) */}
      <Box
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 14 : 20,
          alignItems: 'stretch',
        }}
      >
        {/* Sub-nav: Segmented pill bar on mobile, Vertical clean sidebar on desktop */}
        <Box
          style={{
            width: isMobile ? '100%' : 180,
            maxWidth: '100%',
            flexShrink: 0,
            position: isMobile ? 'relative' : 'sticky',
            top: isMobile ? 0 : 80,
            overflowX: isMobile ? 'auto' : 'visible',
            scrollbarWidth: 'none',
          }}
        >
          <Box
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              gap: isMobile ? 4 : 4,
              backgroundColor: isMobile
                ? isDark
                  ? 'rgba(255, 255, 255, 0.04)'
                  : '#F1F5F9'
                : 'transparent',
              padding: isMobile ? 4 : 0,
              borderRadius: isMobile ? 12 : 0,
              width: '100%',
            }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <UnstyledButton
                  key={item.key}
                  onClick={() => handleTabChange(item.key)}
                  style={{
                    backgroundColor: isActive
                      ? isMobile
                        ? isDark
                          ? '#1E293B'
                          : '#FFFFFF'
                        : isDark
                        ? 'rgba(37, 99, 235, 0.18)'
                        : '#EFF6FF'
                      : 'transparent',
                    color: isActive
                      ? isDark
                        ? '#60A5FA'
                        : '#2563EB'
                      : isDark
                      ? '#94A3B8'
                      : '#64748B',
                    boxShadow: isMobile && isActive
                      ? isDark
                        ? '0 1px 3px rgba(0,0,0,0.3)'
                        : '0 1px 3px rgba(16, 24, 40, 0.08)'
                      : 'none',
                    borderRadius: isMobile ? 8 : 10,
                    padding: isMobile
                      ? isSmallMobile
                        ? '8px 8px'
                        : '8px 12px'
                      : '8px 14px',
                    fontWeight: isActive ? 650 : 500,
                    fontSize: isMobile ? (isSmallMobile ? 12 : 13) : 13.5,
                    flex: isMobile ? 1 : undefined,
                    width: isMobile ? 'auto' : '100%',
                    whiteSpace: 'nowrap',
                    textAlign: isMobile ? 'center' : 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isMobile ? 'center' : 'flex-start',
                    gap: 6,
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && !isMobile) {
                      e.currentTarget.style.color = isDark ? '#F8FAFC' : '#1E293B';
                      e.currentTarget.style.backgroundColor = isDark
                        ? 'rgba(255, 255, 255, 0.04)'
                        : 'rgba(0, 0, 0, 0.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive && !isMobile) {
                      e.currentTarget.style.color = isDark ? '#94A3B8' : '#64748B';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.icon}
                  <span>{isSmallMobile ? item.shortLabel : item.label}</span>
                </UnstyledButton>
              );
            })}
          </Box>
        </Box>

        {/* Right Active View Workspace */}
        <Box
          style={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            height: isMobile ? 'auto' : 'calc(100vh - 120px)',
            maxHeight: isMobile ? 'none' : 'calc(100vh - 120px)',
            overflowY: isMobile ? 'visible' : 'auto',
            paddingRight: isMobile ? 0 : 12,
            scrollbarWidth: 'thin',
          }}
        >
          {activeTab === 'profile' && (
            <TabErrorBoundary tabName="My Profile">
              <UserProfileTab />
            </TabErrorBoundary>
          )}
          {activeTab === 'company' && (
            <TabErrorBoundary tabName="Company Profile">
              <CompanyProfileTab />
            </TabErrorBoundary>
          )}
          {activeTab === 'calendar' && (
            <TabErrorBoundary tabName="Calendar & Reminders">
              <CalendarRemindersTab />
            </TabErrorBoundary>
          )}
          {activeTab === 'projects' && (
            <TabErrorBoundary tabName="Project Catalog">
              <ProjectCatalogTab />
            </TabErrorBoundary>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsPage;
