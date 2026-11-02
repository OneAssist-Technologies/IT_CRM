import React from 'react';
import {
  Group,
  TextInput,
  ActionIcon,
  Avatar,
  Text,
  Menu,
  useMantineColorScheme,
  useComputedColorScheme,
  Box,
  Tooltip,
  Kbd,
  Burger,
} from '@mantine/core';
import {
  IconSearch,
  IconSun,
  IconMoon,
  IconMicrophone,
  IconLogout,
  IconUserPlus,
  IconLogin,
  IconChevronDown,
  IconMenu2,
  IconX,
} from '@tabler/icons-react';
import { useCRM } from '../../context/CRMContext';
import { CRM_COLORS } from '../../theme/colors';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {}

export const Header: React.FC<HeaderProps> = () => {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { currentUser, setActiveNav, globalSearch, setGlobalSearch, logoutUser, sidebarMobileOpened, setSidebarMobileOpened } = useCRM();

  const pillBg = isDark ? '#1E293B' : '#F5F8FA';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const iconColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <Box
      style={{
        height: 64,
        background: 'var(--mantine-color-default)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Left: Mobile Burger + Search Bar with fixed max-width */}
      <Group gap="sm" style={{ flex: 1, maxWidth: 380 }} wrap="nowrap" align="center">
        <Burger
          opened={sidebarMobileOpened}
          onClick={() => setSidebarMobileOpened(!sidebarMobileOpened)}
          hiddenFrom="md"
          size="sm"
          color={textColor}
          aria-label="Toggle navigation"
        />
        <TextInput
          placeholder="Search anything..."
          leftSection={<IconSearch size={16} stroke={2} color={iconColor} />}
          rightSection={
            globalSearch ? (
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => setGlobalSearch('')}
              >
                <IconX size={13} />
              </ActionIcon>
            ) : null
          }
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.currentTarget.value)}
          style={{ flex: 1, minWidth: 120 }}
          radius="100px"
          variant="unstyled"
          styles={{
            input: {
              background: pillBg,
              paddingLeft: 36,
              paddingRight: 16,
              height: 38,
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              color: textColor,
              border: `1px solid ${pillBorder}`,
            },
          }}
        />
      </Group>

      {/* 2. Right: Notifications, Dark/Light, User Avatar Menu */}
      <Group gap="xs" wrap="nowrap">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Dark / Light Toggle */}
        <Tooltip label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} withArrow position="bottom">
          <ActionIcon
            variant="subtle"
            size="md"
            radius="100px"
            style={{
              background: pillBg,
              color: isDark ? '#F59E0B' : '#0F172A',
              border: `1px solid ${pillBorder}`,
            }}
            onClick={() => {
              const nextScheme = isDark ? 'light' : 'dark';
              setColorScheme(nextScheme);
              try {
                localStorage.setItem('crm_user_explicit_theme', 'true');
              } catch (e) {}
            }}
          >
            {isDark ? <IconSun size={16} stroke={1.8} /> : <IconMoon size={16} stroke={1.8} />}
          </ActionIcon>
        </Tooltip>

        {/* Interactive User Profile Dropdown Menu */}
        <Menu shadow="xl" width={220} position="bottom-end" radius="16px" transitionProps={{ transition: 'pop-top-right' }}>
          <Menu.Target>
            <Group
              gap="xs"
              p={3}
              pr={{ base: 3, sm: 'sm' }}
              style={{
                background: pillBg,
                borderRadius: 100,
                border: `1px solid ${pillBorder}`,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Avatar src={currentUser.avatar || undefined} radius="100px" size="sm" color="blue">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <Text size="xs" fw={700} visibleFrom="sm" style={{ color: textColor }}>
                {currentUser.name || 'Account'}
              </Text>
              <Box visibleFrom="sm">
                <IconChevronDown size={14} color={iconColor} />
              </Box>
            </Group>
          </Menu.Target>
          <Menu.Dropdown p="xs">
            {/* User Account Info */}
            <Box px="xs" py={6}>
              <Text size="xs" fw={800} style={{ color: textColor }}>
                {currentUser.name || 'Guest User'}
              </Text>
              <Text size="10px" c="dimmed">
                {currentUser.email || 'No email associated'}
              </Text>
            </Box>
            <Menu.Divider />

            <Menu.Label>Account</Menu.Label>
            <Menu.Item leftSection={<IconUserPlus size={15} />} onClick={() => setActiveNav('signup')}>
              Create New Account
            </Menu.Item>
            <Menu.Item leftSection={<IconLogin size={15} />} onClick={() => setActiveNav('login')}>
              Sign In (Login)
            </Menu.Item>

            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconLogout size={15} />} onClick={() => logoutUser()}>
              Log Out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Box>
  );
};

export default Header;
