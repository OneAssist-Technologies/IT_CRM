import React, { useState, useEffect } from 'react';
import {
  NavLink,
  Stack,
  Group,
  Text,
  Box,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Divider,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconHome,
  IconChevronLeft,
  IconUsersGroup,
  IconAddressBook,
  IconTarget,
  IconShieldLock,
  IconCalendarEvent,
  IconFolders,
  IconPhoneCall,
  IconClipboardList,
  IconBuilding,
  IconSettings,
  IconUserCheck,
  IconClock,
  IconChevronDown,
  IconChevronsRight,
  IconLock,
} from '@tabler/icons-react';
import { useCRM } from '../../context/CRMContext';
import { usePermissions } from '../../context/AccessControlContext';
import { useLead } from '../../context/LeadContext';
import { useCustomer } from '../../context/CustomerContext';
import { useProject } from '../../context/ProjectContext';
import { fetchCallLogStatsApi, fetchCallLogsApi } from '../../services/callLogService';
import { SidebarWaveBackdrop } from './SidebarWaveBackdrop';

interface SidebarProps {
  onSelectNav: (nav: string) => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSelectNav, isMobile = false }) => {
  const { activeNav, sidebarCollapsed, setSidebarCollapsed } = useCRM();
  const { can, isSuperAdmin } = usePermissions();
  const { leads } = useLead();
  const { customers } = useCustomer();
  const { projects, pagination, stats: projectStats } = useProject();
  const [callCount, setCallCount] = useState<number>(0);

  const customerCount = customers?.length || 0;
  const projectCount = pagination?.total ?? projectStats?.total ?? projects?.length ?? 0;

  useEffect(() => {
    let mounted = true;
    const fetchCounts = async () => {
      try {
        const stats = await fetchCallLogStatsApi();
        if (mounted && stats && typeof stats.total === 'number') {
          setCallCount(stats.total);
        }
      } catch (err) {
        try {
          const res = await fetchCallLogsApi();
          if (mounted && res && typeof res.count === 'number') {
            setCallCount(res.count);
          }
        } catch (e) {
          console.warn('Call logs count fetch failed:', e);
        }
      }
    };

    fetchCounts();

    const handleUpdate = () => fetchCounts();
    window.addEventListener('crm_call_logs_updated', handleUpdate);
    window.addEventListener('crm_calls_updated', handleUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('crm_call_logs_updated', handleUpdate);
      window.removeEventListener('crm_calls_updated', handleUpdate);
    };
  }, [activeNav]);

  const renderNavBadge = (_count: number | string, _isItemActive: boolean = false) => {
    return null;
  };

  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const isCollapsed = !isMobile && Boolean(sidebarCollapsed);

  const sidebarBg = isDark
    ? '#050B1A'
    : 'radial-gradient(ellipse at 85% 15%, #E1EEFD 0%, #F5F9FE 45%, #EAF2FC 100%)';
  const sidebarBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(226, 232, 240, 0.8)';
  const headerBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(226, 232, 240, 0.8)';

  const renderNavItem = (
    key: string,
    label: string,
    icon: React.ReactNode,
    isActive: boolean,
    hasDropdown: boolean = false,
    badgeContent?: React.ReactNode
  ) => {
    const navLink = (
      <NavLink
        label={isCollapsed ? undefined : label}
        leftSection={icon}
        rightSection={
          !isCollapsed
            ? badgeContent || (hasDropdown ? <IconChevronDown size={14} color="#64748B" /> : null)
            : null
        }
        active={isActive}
        onClick={() => onSelectNav(key)}
        className={`sidebar-nav-item ${isActive ? 'crextio-pill-active' : 'crextio-pill-inactive'}`}
        style={{
          borderRadius: 12,
          padding: isCollapsed ? '9px 0' : '9px 12px',
          height: 42,
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          alignItems: 'center',
          transition: 'all 0.15s ease',
          width: '100%',
          boxSizing: 'border-box',
        }}
        styles={
          isCollapsed
            ? {
                section: { margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
                body: { display: 'none' },
              }
            : {
                root: {
                  width: '100%',
                  boxSizing: 'border-box',
                },
                body: {
                  minWidth: 0,
                  flex: 1,
                  overflow: 'hidden',
                },
                label: {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: 13,
                },
                section: {
                  flexShrink: 0,
                  marginInlineStart: 8,
                },
              }
        }
      />
    );

    if (isCollapsed) {
      return (
        <Tooltip key={key} label={label} position="right" withArrow offset={14} zIndex={1000}>
          <Box style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>{navLink}</Box>
        </Tooltip>
      );
    }

    return <React.Fragment key={key}>{navLink}</React.Fragment>;
  };

  return (
    <Box
      style={{
        width: isMobile ? '100%' : isCollapsed ? 72 : 275,
        height: isMobile ? '100%' : '100vh',
        background: sidebarBg,
        borderRight: isMobile ? 'none' : `1px solid ${sidebarBorder}`,
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'relative' : 'sticky',
        top: 0,
        flexShrink: 0,
        userSelect: 'none',
        zIndex: 110,
        overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Ambient Sidebar Fluid Aurora Animation Layer */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        {/* Bottom-right glowing cyan-blue orb */}
        <Box
          style={{
            position: 'absolute',
            bottom: '-4%',
            right: '-15%',
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, rgba(37, 99, 235, 0.2) 50%, transparent 75%)'
              : 'radial-gradient(circle, rgba(0, 198, 255, 0.06) 0%, rgba(0, 112, 243, 0.02) 50%, transparent 75%)',
            filter: 'blur(45px)',
            animation: 'sidebarAuroraDrift 12s ease-in-out infinite',
          }}
        />
        {/* Mid-left subtle floating purple-blue glow */}
        <Box
          style={{
            position: 'absolute',
            top: '28%',
            left: '-20%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(99, 102, 241, 0.12) 50%, transparent 75%)'
              : 'radial-gradient(circle, rgba(0, 112, 243, 0.04) 0%, rgba(99, 102, 241, 0.02) 50%, transparent 75%)',
            filter: 'blur(40px)',
            animation: 'sidebarAuroraDrift2 16s ease-in-out infinite',
          }}
        />
        {/* Luminous Cyber Wave Flowing at Bottom */}
        <SidebarWaveBackdrop />
      </Box>

      {/* 1. Top 64px Brand Logo Header */}
      <Box
        px={isCollapsed ? 'xs' : 'md'}
        style={{
          height: 64,
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: `1px solid ${headerBorder}`,
          flexShrink: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
          gap: isCollapsed ? 0 : 8,
          position: 'relative',
          zIndex: 2,
          background: isDark ? 'rgba(5, 11, 26, 0.88)' : 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        {!isCollapsed ? (
          <>
            <Group
              gap={10}
              wrap="nowrap"
              align="center"
              className="sidebar-brand-box"
              style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}
              onClick={() => onSelectNav('dashboard')}
            >
              <Box
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #0055FF 0%, #0070F3 55%, #00C6FF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 112, 243, 0.35)',
                  color: '#FFFFFF',
                  flexShrink: 0,
                }}
              >
                <IconLock size={18} color="#FFFFFF" stroke={2.4} />
              </Box>
              <Box style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                <Text
                  fw={800}
                  size="16px"
                  truncate
                  style={{
                    color: isDark ? '#FFFFFF' : '#071126',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                  }}
                >
                  OneAssist <Text span inherit fw={800} style={{ color: isDark ? '#38BDF8' : '#0066FF' }}>CRM</Text>
                </Text>
                <Text
                  size="9px"
                  fw={700}
                  tt="uppercase"
                  truncate
                  style={{
                    color: isDark ? '#94A3B8' : '#64748B',
                    letterSpacing: '0.07em',
                    lineHeight: 1.1,
                    marginTop: 2,
                  }}
                >
                  IT Sales & Operations Hub
                </Text>
              </Box>
            </Group>

            {/* Collapse Icon */}
            <Tooltip label="Collapse sidebar" position="right" withArrow>
              <ActionIcon
                variant="subtle"
                size={30}
                style={{
                  color: isDark ? '#94A3B8' : '#64748B',
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(226, 232, 240, 0.9)',
                  boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.04)',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
              >
                <IconChevronLeft size={15} stroke={2.2} />
              </ActionIcon>
            </Tooltip>
          </>
        ) : (
          <Tooltip label="Expand sidebar" position="right" withArrow>
            <ActionIcon
              variant="subtle"
              size="md"
              style={{
                color: isDark ? '#38BDF8' : '#0062FF',
                background: isDark ? 'rgba(37, 99, 235, 0.15)' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(226, 232, 240, 0.9)',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.04)',
                borderRadius: 10,
                width: 38,
                height: 38,
                transition: 'all 0.2s ease',
              }}
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <IconChevronsRight size={18} stroke={2.5} />
            </ActionIcon>
          </Tooltip>
        )}
      </Box>

      {/* 2. Main Navigation Items */}
      <ScrollArea
        style={{ flex: 1, position: 'relative', zIndex: 1, width: '100%' }}
        p={isCollapsed ? 'xs' : '10px'}
        styles={{
          viewport: {
            overflowX: 'hidden',
          },
        }}
        type="never"
      >
        <Stack gap="sm">
          {!isCollapsed ? (
            <Text
              className="sidebar-section-header"
              size="10px"
              fw={800}
              tt="uppercase"
              px="xs"
              style={{ letterSpacing: '0.08em' }}
            >
              Main Navigation
            </Text>
          ) : (
            <Divider color={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'} my={4} />
          )}

          <Stack gap={6}>
            {can('dashboard', 'view') &&
              renderNavItem(
                'dashboard',
                'Dashboard',
                <IconHome size={18} stroke={1.8} />,
                activeNav === 'dashboard'
              )}

            {can('employee_dashboard', 'view') &&
              renderNavItem(
                'employee-dashboard',
                'Employee Dashboard',
                <IconUserCheck size={18} stroke={2} />,
                activeNav === 'employee-dashboard'
              )}

            {can('employee_management', 'view') &&
              renderNavItem(
                'employees',
                'Employee Management',
                <IconUsersGroup size={18} stroke={2} />,
                activeNav === 'employees' ||
                  activeNav === 'add-employee' ||
                  activeNav === 'onboard-employee' ||
                  activeNav === 'onboard'
              )}

            {can('contacts', 'view') &&
              renderNavItem(
                'contacts',
                'Contacts',
                <IconAddressBook size={18} stroke={2} />,
                activeNav === 'contacts' ||
                  activeNav === 'add-contact' ||
                  activeNav === 'contact-details' ||
                  activeNav === 'contact-qualification' ||
                  activeNav === 'qualification'
              )}

            {can('leads', 'view') &&
              renderNavItem(
                'leads',
                'Leads',
                <IconTarget size={18} stroke={2} />,
                activeNav === 'leads' ||
                  activeNav === 'add-lead' ||
                  activeNav === 'lead-schedule' ||
                  activeNav === 'lead-details'
              )}

            {can('scheduled_meetings', 'view') &&
              renderNavItem(
                'scheduled-meetings',
                'Meetings',
                <IconCalendarEvent size={18} stroke={2} />,
                activeNav === 'scheduled-meetings' || activeNav === 'meetings'
              )}

            {can('call_logs', 'view') &&
              renderNavItem(
                'call-logs',
                'Activity Logs',
                <IconPhoneCall size={18} stroke={2} />,
                activeNav === 'call-logs' || activeNav === 'calls' || activeNav === 'activity-logs'
              )}

            {can('customers', 'view') &&
              renderNavItem(
                'customers',
                'Customers',
                <IconBuilding size={18} stroke={2} />,
                activeNav === 'customers' ||
                  activeNav === 'customer' ||
                  activeNav === 'customer-details' ||
                  activeNav === 'add-customer'
              )}

            {can('projects', 'view') &&
              renderNavItem(
                'projects',
                'Projects Management',
                <IconFolders size={18} stroke={2} />,
                activeNav.startsWith('projects') || activeNav === 'project' || activeNav === 'add-project'
              )}

            {(can('activity_timeline', 'view') || can('activities', 'view') || isSuperAdmin || can('leads', 'view')) &&
              renderNavItem(
                'activity-timeline',
                'Activity Timeline',
                <IconClock size={18} stroke={2} />,
                activeNav === 'activity-timeline' || activeNav === 'activities' || activeNav === 'activity'
              )}
          </Stack>

          {/* Administration & Security Section */}
          {(can('access_control', 'view') || can('settings', 'view') || isSuperAdmin) && (
            <>
              {isCollapsed ? (
                <Divider color={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'} my={4} />
              ) : (
                <Text
                  className="sidebar-section-header"
                  size="10px"
                  fw={800}
                  tt="uppercase"
                  px="xs"
                  mt="sm"
                  style={{ letterSpacing: '0.08em' }}
                >
                  Administration & Security
                </Text>
              )}

              <Stack gap={6}>
                {can('access_control', 'view') &&
                  renderNavItem(
                    'access-control',
                    'Access Control',
                    <IconShieldLock size={18} stroke={2} />,
                    activeNav === 'access-control' || activeNav === 'rbac'
                  )}

                {(can('settings', 'view') || isSuperAdmin) &&
                  renderNavItem(
                    'settings',
                    'Settings',
                    <IconSettings size={18} stroke={2} />,
                    activeNav === 'settings'
                  )}
              </Stack>
            </>
          )}
        </Stack>
      </ScrollArea>
    </Box>
  );
};

export default Sidebar;