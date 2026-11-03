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

  const pillBg = isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)';
  const pillShadow = isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.04)';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const iconColor = isDark ? '#94A3B8' : '#64748B';

  const headerBg = isDark
    ? 'rgba(5, 11, 26, 0.88)'
    : 'rgba(255, 255, 255, 0.88)';
  const headerBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(226, 232, 240, 0.8)';

  return (
    <Box
      style={{
        height: 64,
        background: headerBg,
        borderBottom: `1px solid ${headerBorder}`,
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.02)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Left: Mobile Burger + Search Bar with fixed max-width */}
      <Group gap="sm" style={{ flex: 1, maxWidth: 420 }} wrap="nowrap" align="center">
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
          leftSection={<IconSearch size={16} stroke={1.8} color={iconColor} />}
          rightSection={
            globalSearch ? (
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => setGlobalSearch('')}
                title="Clear search"
              >
                <IconX size={13} />
              </ActionIcon>
            ) : (
              <Kbd
                size="xs"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'}`,
                  color: isDark ? '#94A3B8' : '#64748B',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 4,
                  marginRight: 4,
                }}
              >
                ⌘K
              </Kbd>
            )
          }
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.currentTarget.value)}
          style={{ flex: 1, minWidth: 140 }}
          radius="100px"
          styles={{
            input: {
              background: isDark ? 'rgba(30, 41, 59, 0.65)' : '#F8FAFC',
              paddingLeft: 38,
              paddingRight: 40,
              height: 40,
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              color: textColor,
              border: `1px solid ${pillBorder}`,
              boxShadow: 'none',
              transition: 'all 0.2s ease',
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
              color: isDark ? '#F59E0B' : '#64748B',
              border: `1px solid ${pillBorder}`,
              boxShadow: pillShadow,
              width: 38,
              height: 38,
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              const nextScheme = isDark ? 'light' : 'dark';
              setColorScheme(nextScheme);
              try {
                localStorage.setItem('crm_user_explicit_theme', 'true');
              } catch (e) {}
            }}
          >
            {isDark ? <IconSun size={17} stroke={1.8} /> : <IconMoon size={17} stroke={1.8} />}
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
                boxShadow: pillShadow,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Avatar
                src={currentUser.avatar || undefined}
                radius="100px"
                size="sm"
                styles={{
                  placeholder: {
                    background: 'linear-gradient(135deg, #0055FF 0%, #0070F3 55%, #00C6FF 100%)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                  },
                }}
              >
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
