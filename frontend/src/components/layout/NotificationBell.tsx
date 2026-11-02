import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActionIcon,
  Popover,
  Box,
  Text,
  Group,
  Badge,
  Stack,
  ScrollArea,
  Button,
  UnstyledButton,
  Tooltip,
  Indicator,
  Divider,
  Center,
  useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBell,
  IconBellRinging,
  IconCalendar,
  IconClock,
  IconAlertCircle,
  IconCheck,
  IconChevronRight,
  IconRefresh,
  IconCalendarCheck,
  IconCalendarTime,
  IconInbox,
  IconExternalLink,
  IconX,
  IconUser,
} from '@tabler/icons-react';
import { contactService } from '../../services/contactService';
import { settingsService } from '../../services/settingsService';
import { Contact } from '../../types/contact';
import { ReminderItem } from '../../types/settings';
import { useCRM } from '../../context/CRMContext';
import { useContact } from '../../context/ContactContext';

interface NotificationItem {
  id: string;
  type: 'contact' | 'reminder';
  contact?: Contact;
  reminder?: ReminderItem;
  title: string;
  subtitle: string;
  category: 'due_today' | 'overdue' | 'upcoming' | 'pending' | 'reminder';
  dateStr: string;
  formattedDate: string;
  badgeLabel: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeTextColor: string;
  statusText: string;
  isRead: boolean;
}

export const NotificationBell: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { currentUser, setActiveNav } = useCRM();
  const { setSelectedContact, fetchContacts: refreshContactsList } = useContact();

  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('crm_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState<'all' | 'reminders' | 'due_today' | 'overdue' | 'followup' | 'pending'>('all');
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('crm_dismiss_notif_banner') === 'true';
    } catch {
      return false;
    }
  });

  const pillBg = isDark ? '#1E293B' : '#F5F8FA';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCleanDate = (dateStr: string) => {
    if (!dateStr) return '';
    const today = getTodayStr();
    if (dateStr === today) {
      return 'Today';
    }
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {}
    return dateStr;
  };

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  const requestDesktopPermission = async () => {
    if (!('Notification' in window)) {
      notifications.show({
        title: 'Not Supported',
        message: 'Browser notifications are not supported in this browser.',
        color: 'orange',
      });
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setDesktopPermission(perm);
      if (perm === 'granted') {
        playNotificationSound();
        notifications.show({
          title: 'Desktop Notifications Enabled',
          message: 'You will receive alerts for scheduled reminders and follow-ups!',
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
        try {
          new Notification('CRM Web Notifications Active', {
            body: 'You will receive timely desktop notifications when reminders or follow-ups are assigned.',
            icon: '/favicon.ico',
          });
        } catch (e) {}
      } else if (perm === 'denied') {
        notifications.show({
          title: 'Notifications Blocked',
          message: 'Browser notifications are disabled in your browser settings. Please allow notifications for this site.',
          color: 'red',
        });
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem('crm_dismiss_notif_banner', 'true');
    } catch {}
  };

  // Check if reminder is meant for this logged-in user and alert
  const checkAndAlertReminder = useCallback((rem: ReminderItem) => {
    if (!rem) return;
    const myId = (currentUser?.id || '').toLowerCase();
    const myName = (currentUser?.name || '').toLowerCase();
    const myEmail = (currentUser?.email || '').toLowerCase();

    const assignedId = (rem.assignedToId || '').toLowerCase();
    const assignedUserId = (rem.assignedUserId || '').toLowerCase();
    const assignedEmpId = (rem.assignedEmployeeId || '').toLowerCase();
    const assignedName = (rem.assignedToName || '').toLowerCase();
    const assignedEmail = (rem.assignedToEmail || '').toLowerCase();
    const creatorId = (rem.createdById || '').toLowerCase();

    // Do not notify creator of their own scheduled reminder, only the recipient
    const isRecipient =
      (myId && (assignedId === myId || assignedUserId === myId || assignedEmpId === myId)) ||
      (myName && assignedName === myName) ||
      (myEmail && assignedEmail === myEmail) ||
      (currentUser?.role === 'SUPER_ADMIN' && creatorId !== myId);

    if (isRecipient) {
      playNotificationSound();
      notifications.show({
        id: `notif-assigned-${rem.id}`,
        title: 'New Reminder Scheduled!',
        message: `"${rem.title}" scheduled for ${rem.date} at ${rem.time || '10:00 AM'}${rem.createdByName ? ` by ${rem.createdByName}` : ''}`,
        color: 'indigo',
        autoClose: 10000,
        icon: <IconBellRinging size={18} />,
      });

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`Reminder: ${rem.title}`, {
            body: `Scheduled for ${rem.date} at ${rem.time || '10:00 AM'} by ${rem.createdByName || 'Admin'}`,
            icon: '/favicon.ico',
          });
        } catch {}
      }
    }
  }, [currentUser]);

  // Fetch contacts and reminders for notifications
  const fetchAllNotifications = useCallback(async (isInitial = false) => {
    try {
      setLoading(true);
      const [contactsRes, remindersRes] = await Promise.allSettled([
        contactService.getContacts({ limit: 150 }),
        settingsService.getReminders(),
      ]);

      if (contactsRes.status === 'fulfilled' && contactsRes.value?.data) {
        setContacts(contactsRes.value.data);

        if (isInitial) {
          const today = getTodayStr();
          const dueTodayList = contactsRes.value.data.filter((c) => {
            const fDate = (c.nextFollowDate || '').trim();
            return fDate === today;
          });

          if (dueTodayList.length > 0) {
            const sessionKey = `crm_notified_today_${today}`;
            if (!sessionStorage.getItem(sessionKey)) {
              sessionStorage.setItem(sessionKey, 'true');
              playNotificationSound();

              notifications.show({
                id: 'crm-followups-due-today',
                title: 'Follow-ups Due Today!',
                message: `You have ${dueTodayList.length} contact follow-up${dueTodayList.length > 1 ? 's' : ''} scheduled for today.`,
                color: 'blue',
                autoClose: 12000,
                icon: <IconBellRinging size={18} />,
              });
            }
          }
        }
      }

      if (remindersRes.status === 'fulfilled' && Array.isArray(remindersRes.value?.data)) {
        setReminders(remindersRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load notifications data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllNotifications(true);

    const handleContactsUpdated = () => {
      fetchAllNotifications(false);
    };

    const handleRemindersUpdated = (e: any) => {
      fetchAllNotifications(false);
      const rem = e?.detail;
      if (rem) {
        checkAndAlertReminder(rem);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'crm_reminder_broadcast' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          fetchAllNotifications(false);
          if (parsed?.reminder && parsed.action === 'create') {
            checkAndAlertReminder(parsed.reminder);
          }
        } catch {}
      } else if (e.key === 'crm_contacts_updated') {
        fetchAllNotifications(false);
      }
    };

    window.addEventListener('crm_contacts_updated', handleContactsUpdated);
    window.addEventListener('crm_reminders_updated', handleRemindersUpdated);
    window.addEventListener('storage', handleStorageChange);

    // Dynamic background polling every 12 seconds so updates from other sessions appear dynamically
    const interval = setInterval(() => {
      fetchAllNotifications(false);
    }, 12000);

    return () => {
      window.removeEventListener('crm_contacts_updated', handleContactsUpdated);
      window.removeEventListener('crm_reminders_updated', handleRemindersUpdated);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [fetchAllNotifications, checkAndAlertReminder]);

  // Transform contacts & reminders into clean notifications
  const notificationItems = useMemo<NotificationItem[]>(() => {
    const today = getTodayStr();
    const items: NotificationItem[] = [];

    // 1. Process contacts
    contacts.forEach((c) => {
      const followDate = (c.nextFollowDate || '').trim();
      const qStatus = (c.qualificationStatus || '').trim();
      const status = (c.status || '').trim();

      if (!followDate) return;
      if (followDate > today) return;

      const isPending = qStatus === 'Pending' || status === 'Pending';
      const isDueToday = followDate === today;

      if (isDueToday) {
        items.push({
          id: `due_${c.id}`,
          type: 'contact',
          contact: c,
          title: c.name,
          subtitle: c.companyName || c.phone || 'Company Representative',
          category: 'due_today',
          dateStr: followDate,
          formattedDate: 'Today',
          badgeLabel: 'Due Today',
          badgeColor: 'blue',
          badgeBg: isDark ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF',
          badgeBorder: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
          badgeTextColor: isDark ? '#93C5FD' : '#1D4ED8',
          statusText: isPending ? 'Pending review scheduled for today' : 'Follow-up scheduled for today',
          isRead: readIds.includes(`due_${c.id}`),
        });
      } else {
        items.push({
          id: `overdue_${c.id}`,
          type: 'contact',
          contact: c,
          title: c.name,
          subtitle: c.companyName || c.phone || 'Company Representative',
          category: 'overdue',
          dateStr: followDate,
          formattedDate: formatCleanDate(followDate),
          badgeLabel: 'Overdue',
          badgeColor: 'red',
          badgeBg: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2',
          badgeBorder: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
          badgeTextColor: isDark ? '#FCA5A5' : '#DC2626',
          statusText: isPending ? 'Review overdue' : 'Follow-up overdue',
          isRead: readIds.includes(`overdue_${c.id}`),
        });
      }
    });

    // 2. Process active reminders
    reminders.forEach((r) => {
      if (r.completed) return; // Hide completed reminders from active notification popover
      const remDate = (r.date || '').trim();
      const isDueToday = remDate === today;
      const isOverdue = remDate < today;

      const category = isDueToday ? 'due_today' : isOverdue ? 'overdue' : 'reminder';
      const badgeLabel = isDueToday
        ? 'Reminder Today'
        : isOverdue
        ? 'Reminder Overdue'
        : r.priority === 'High'
        ? 'High Priority'
        : 'Reminder';

      const badgeColor = isOverdue ? 'red' : isDueToday ? 'indigo' : r.priority === 'High' ? 'red' : 'indigo';
      const badgeBg = isOverdue
        ? isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2'
        : isDueToday
        ? isDark ? 'rgba(99, 102, 241, 0.16)' : '#EEF2FF'
        : isDark ? 'rgba(99, 102, 241, 0.12)' : '#F5F3FF';
      const badgeBorder = isOverdue
        ? isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA'
        : isDueToday
        ? isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE'
        : isDark ? 'rgba(99, 102, 241, 0.25)' : '#DDD6FE';
      const badgeTextColor = isOverdue
        ? isDark ? '#FCA5A5' : '#DC2626'
        : isDueToday
        ? isDark ? '#A5B4FC' : '#4338CA'
        : isDark ? '#C7D2FE' : '#6366F1';

      const assignedInfo =
        r.assignedToName && r.assignedToName !== 'Super Administrator'
          ? `For: ${r.assignedToName}`
          : 'Confidential Task';

      items.push({
        id: `rem_${r.id}`,
        type: 'reminder',
        reminder: r,
        title: r.title,
        subtitle: `${assignedInfo} • By ${r.createdByName || 'Admin'}`,
        category,
        dateStr: remDate,
        formattedDate: `${formatCleanDate(remDate)}${r.time ? ` at ${r.time}` : ''}`,
        badgeLabel,
        badgeColor,
        badgeBg,
        badgeBorder,
        badgeTextColor,
        statusText: r.notes || `${r.category} • Priority: ${r.priority}`,
        isRead: readIds.includes(`rem_${r.id}`),
      });
    });

    const priorityWeight: Record<string, number> = {
      due_today: 1,
      overdue: 2,
      reminder: 3,
      pending: 4,
      upcoming: 5,
    };

    return items.sort((a, b) => {
      const pDiff = (priorityWeight[a.category] || 6) - (priorityWeight[b.category] || 6);
      if (pDiff !== 0) return pDiff;
      return a.dateStr.localeCompare(b.dateStr);
    });
  }, [contacts, reminders, readIds, isDark]);

  const unreadCount = useMemo(() => {
    return notificationItems.filter((i) => !i.isRead).length;
  }, [notificationItems]);

  const dueTodayCount = useMemo(() => {
    return notificationItems.filter((i) => i.category === 'due_today').length;
  }, [notificationItems]);

  const overdueCount = useMemo(() => {
    return notificationItems.filter((i) => i.category === 'overdue').length;
  }, [notificationItems]);

  const reminderCount = useMemo(() => {
    return notificationItems.filter((i) => i.type === 'reminder').length;
  }, [notificationItems]);

  const followUpCount = useMemo(() => {
    return notificationItems.filter(
      (i) =>
        i.type === 'contact' &&
        (i.contact?.qualificationStatus === 'Follow-up Required' ||
          i.contact?.status === 'Follow-up Required' ||
          i.category === 'overdue' ||
          (i.category === 'due_today' && i.badgeLabel === 'Due Today'))
    ).length;
  }, [notificationItems]);

  const pendingCount = useMemo(() => {
    return notificationItems.filter(
      (i) =>
        i.type === 'contact' &&
        (i.contact?.qualificationStatus === 'Pending' || i.contact?.status === 'Pending')
    ).length;
  }, [notificationItems]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'reminders') return notificationItems.filter((i) => i.type === 'reminder');
    if (activeTab === 'due_today') return notificationItems.filter((i) => i.category === 'due_today');
    if (activeTab === 'overdue') return notificationItems.filter((i) => i.category === 'overdue');
    if (activeTab === 'followup') {
      return notificationItems.filter(
        (i) =>
          i.type === 'contact' &&
          (i.contact?.qualificationStatus === 'Follow-up Required' ||
            i.contact?.status === 'Follow-up Required' ||
            i.category === 'overdue' ||
            (i.category === 'due_today' && i.badgeLabel === 'Due Today'))
      );
    }
    if (activeTab === 'pending') {
      return notificationItems.filter(
        (i) =>
          i.type === 'contact' &&
          (i.contact?.qualificationStatus === 'Pending' || i.contact?.status === 'Pending')
      );
    }
    return notificationItems;
  }, [notificationItems, activeTab]);

  const handleMarkAllAsRead = () => {
    const allIds = notificationItems.map((i) => i.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    try {
      localStorage.setItem('crm_read_notifications', JSON.stringify(updated));
    } catch {}
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!readIds.includes(item.id)) {
      const updated = [...readIds, item.id];
      setReadIds(updated);
      try {
        localStorage.setItem('crm_read_notifications', JSON.stringify(updated));
      } catch {}
    }

    if (item.type === 'reminder' && item.reminder) {
      setOpened(false);
      try {
        sessionStorage.setItem('crm_selected_reminder_date', item.reminder.date);
      } catch {}
      window.dispatchEvent(
        new CustomEvent('crm_open_calendar_date', {
          detail: { date: item.reminder.date, reminderId: item.reminder.id },
        })
      );
      setActiveNav('settings');
      notifications.show({
        id: `nav-calendar-${item.reminder.id}`,
        title: 'Opening Calendar',
        message: `Navigating to reminder on ${formatCleanDate(item.reminder.date)}`,
        color: 'indigo',
        autoClose: 2500,
        icon: <IconCalendar size={16} />,
      });
      return;
    }

    if (item.contact) {
      try {
        sessionStorage.setItem('crm_qualifying_contact', JSON.stringify(item.contact));
        sessionStorage.setItem('crm_selected_contact', JSON.stringify(item.contact));
      } catch {}

      setSelectedContact(item.contact);
      setOpened(false);
      setActiveNav('contact-qualification');
    }
  };

  const handleViewAllContacts = () => {
    setOpened(false);
    try {
      sessionStorage.removeItem('crm_selected_contact');
      sessionStorage.removeItem('crm_qualifying_contact');
      sessionStorage.removeItem('crm_editing_contact');
    } catch {}
    setSelectedContact(null);
    setActiveNav('contacts');
    if (refreshContactsList) {
      refreshContactsList();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
    }
  };

  const handleViewCalendar = () => {
    setOpened(false);
    setActiveNav('settings');
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={410}
      position="bottom-end"
      radius="16px"
      shadow="xl"
      withArrow
      arrowSize={12}
      transitionProps={{ transition: 'pop-top-right', duration: 180 }}
    >
      <Popover.Target>
        <Tooltip
          label={unreadCount > 0 ? `${unreadCount} New Notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
          withArrow
          position="bottom"
        >
          <Indicator
            inline
            size={11}
            offset={4}
            color={dueTodayCount > 0 ? 'red' : 'indigo'}
            disabled={unreadCount === 0}
            processing={dueTodayCount > 0}
            zIndex={10}
          >
            <ActionIcon
              variant="subtle"
              size="md"
              radius="100px"
              style={{
                background: pillBg,
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(15, 23, 42, 0.08)',
                color: unreadCount > 0 ? '#4F46E5' : textColor,
                width: 38,
                height: 38,
                transition: 'all 0.15s ease',
              }}
              onClick={() => setOpened((o) => !o)}
              aria-label="Open notifications"
            >
              {unreadCount > 0 ? <IconBellRinging size={18} stroke={2} /> : <IconBell size={18} stroke={1.8} />}
            </ActionIcon>
          </Indicator>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown
        p={0}
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #EAECF0',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* 1. HEADER */}
        <Box
          p="md"
          pb={10}
          style={{
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #F1F5F9',
            background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
          }}
        >
          <Group justify="space-between" align="center">
            <Group gap={8} align="center">
              <Text fw={750} size="15px" style={{ color: textColor, letterSpacing: '-0.01em' }}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Badge size="sm" variant="filled" color="indigo" radius="xl">
                  {unreadCount} new
                </Badge>
              )}
            </Group>

            <Group gap={6}>
              <Tooltip label="Refresh" withArrow position="top">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  loading={loading}
                  onClick={() => fetchAllNotifications(false)}
                  style={{ borderRadius: 6 }}
                >
                  <IconRefresh size={14} />
                </ActionIcon>
              </Tooltip>
              {unreadCount > 0 && (
                <Button
                  variant="subtle"
                  size="compact-xs"
                  color="indigo"
                  leftSection={<IconCheck size={12} stroke={2.5} />}
                  onClick={handleMarkAllAsRead}
                  style={{ fontSize: 11, fontWeight: 650, borderRadius: 6 }}
                >
                  Mark read
                </Button>
              )}
            </Group>
          </Group>

          {/* Desktop Permission Banner */}
          {desktopPermission !== 'granted' && !bannerDismissed && (
            <Box
              mt={10}
              p="xs"
              style={{
                borderRadius: 10,
                background: isDark
                  ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.16) 0%, rgba(59, 130, 246, 0.16) 100%)'
                  : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: isDark ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid #BFDBFE',
              }}
            >
              <Group justify="space-between" align="center" wrap="nowrap">
                <Group gap={8} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <Box
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: 'var(--crm-primary, #2563EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0,
                    }}
                  >
                    <IconBellRinging size={14} />
                  </Box>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="11px" fw={700} style={{ color: isDark ? '#A5B4FC' : '#3730A3', lineHeight: 1.2 }}>
                      Enable desktop alerts
                    </Text>
                    <Text size="10px" c="dimmed" truncate style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                      Get instant alerts for reminders & follow-ups
                    </Text>
                  </Box>
                </Group>

                <Group gap={4} wrap="nowrap">
                  <Button
                    size="compact-xs"
                    color="indigo"
                    radius="100px"
                    onClick={requestDesktopPermission}
                    style={{ fontSize: 10, height: 22, fontWeight: 700 }}
                  >
                    Enable
                  </Button>
                  <ActionIcon size="xs" variant="subtle" color="gray" onClick={dismissBanner} style={{ borderRadius: 999 }}>
                    <IconX size={12} />
                  </ActionIcon>
                </Group>
              </Group>
            </Box>
          )}

          {/* 2. PILL SEGMENTED TABS */}
          <Box
            mt={10}
            p={3}
            style={{
              background: isDark ? '#0F172A' : '#F1F5F9',
              borderRadius: 100,
              display: 'flex',
              gap: 3,
              overflowX: 'auto',
            }}
          >
            {[
              { key: 'all', label: 'All', count: notificationItems.length },
              ...(reminderCount > 0 ? [{ key: 'reminders', label: 'Reminders', count: reminderCount }] : []),
              { key: 'due_today', label: 'Due Today', count: dueTodayCount, alert: dueTodayCount > 0 },
              ...(overdueCount > 0 ? [{ key: 'overdue', label: 'Overdue', count: overdueCount, alert: true }] : []),
              { key: 'followup', label: 'Follow-ups', count: followUpCount },
              { key: 'pending', label: 'Pending', count: pendingCount },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <UnstyledButton
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '5px 8px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 600,
                    color: isActive
                      ? isDark
                        ? '#FFFFFF'
                        : '#0F172A'
                      : isDark
                      ? '#94A3B8'
                      : '#64748B',
                    background: isActive ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 100,
                      background: isActive
                        ? isDark
                          ? 'rgba(255,255,255,0.15)'
                          : 'rgba(15, 23, 42, 0.08)'
                        : isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(15, 23, 42, 0.05)',
                      color: tab.alert ? '#EF4444' : 'inherit',
                    }}
                  >
                    {tab.count}
                  </span>
                </UnstyledButton>
              );
            })}
          </Box>
        </Box>

        {/* 3. NOTIFICATION ITEMS LIST */}
        <ScrollArea.Autosize mah={360} scrollbarSize={6}>
          {filteredItems.length === 0 ? (
            <Center p="xl" py={36}>
              <Stack align="center" gap={8}>
                <Box
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconInbox size={24} color={subtextColor} stroke={1.5} />
                </Box>
                <Text size="xs" fw={700} style={{ color: textColor }}>
                  No notifications in this view
                </Text>
                <Text size="11px" c="dimmed" ta="center" style={{ maxWidth: 240 }}>
                  {activeTab === 'reminders'
                    ? 'No scheduled calendar reminders for you right now.'
                    : activeTab === 'due_today'
                    ? 'No tasks or follow-ups due today.'
                    : 'All notifications and tasks are up to date!'}
                </Text>
              </Stack>
            </Center>
          ) : (
            <Stack gap={0}>
              {filteredItems.map((item, idx) => {
                return (
                  <UnstyledButton
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    p="xs"
                    px="md"
                    style={{
                      borderBottom:
                        idx === filteredItems.length - 1
                          ? 'none'
                          : isDark
                          ? '1px solid rgba(255, 255, 255, 0.05)'
                          : '1px solid #F1F5F9',
                      background: !item.isRead
                        ? isDark
                          ? 'rgba(99, 102, 241, 0.08)'
                          : 'rgba(99, 102, 241, 0.03)'
                        : 'transparent',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = !item.isRead
                        ? isDark
                          ? 'rgba(99, 102, 241, 0.08)'
                          : 'rgba(99, 102, 241, 0.03)'
                        : 'transparent';
                    }}
                  >
                    <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                      <Group gap="sm" align="center" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        {/* Leading Icon Squircle */}
                        <Box
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: item.badgeBg,
                            border: `1px solid ${item.badgeBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: item.badgeTextColor,
                          }}
                        >
                          {item.type === 'reminder' ? (
                            <IconBellRinging size={18} stroke={2.2} />
                          ) : item.category === 'due_today' ? (
                            <IconCalendarCheck size={18} stroke={2.2} />
                          ) : item.category === 'overdue' ? (
                            <IconAlertCircle size={18} stroke={2.2} />
                          ) : item.category === 'pending' ? (
                            <IconClock size={18} stroke={2.2} />
                          ) : (
                            <IconCalendarTime size={18} stroke={2.2} />
                          )}
                        </Box>

                        {/* Details */}
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap={6} align="center" wrap="nowrap" justify="space-between">
                            <Group gap={6} align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                              <Text size="xs" fw={750} truncate style={{ color: textColor }}>
                                {item.title}
                              </Text>
                              {!item.isRead && (
                                <Box
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: '#4F46E5',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </Group>

                            {/* Badge */}
                            <Box
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 8px',
                                borderRadius: 100,
                                background: item.badgeBg,
                                color: item.badgeTextColor,
                                border: `1px solid ${item.badgeBorder}`,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.01em',
                                flexShrink: 0,
                              }}
                            >
                              {item.badgeLabel}
                            </Box>
                          </Group>

                          {/* Subtitle */}
                          <Text size="11px" c="dimmed" truncate mt={1} fw={500}>
                            {item.subtitle}
                          </Text>

                          {/* Date & Context */}
                          <Group gap={6} mt={3} align="center" wrap="nowrap">
                            <Group gap={3} align="center" wrap="nowrap">
                              <IconCalendar size={11} color={subtextColor} stroke={1.8} />
                              <Text size="10.5px" fw={650} style={{ color: textColor }}>
                                {item.formattedDate}
                              </Text>
                            </Group>
                            <Text size="10.5px" c="dimmed" truncate>
                              • {item.statusText}
                            </Text>
                          </Group>
                        </Box>
                      </Group>

                      {/* Right subtle arrow */}
                      <IconChevronRight size={14} color={subtextColor} style={{ flexShrink: 0, opacity: 0.6 }} />
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </ScrollArea.Autosize>

        {/* 4. FOOTER */}
        <Box
          p="xs"
          px="md"
          style={{
            background: isDark ? 'rgba(0, 0, 0, 0.25)' : '#F8FAFC',
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          }}
        >
          <Group justify="space-between" align="center">
            <Group gap={6} align="center">
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10B981',
                }}
              />
              <Text size="11px" fw={500} c="dimmed">
                Dynamic real-time sync active
              </Text>
            </Group>
            <Group gap="xs">
              <Button
                variant="subtle"
                size="compact-xs"
                color="indigo"
                leftSection={<IconCalendar size={12} />}
                onClick={handleViewCalendar}
                style={{ fontSize: 11, fontWeight: 650, borderRadius: 6 }}
              >
                Calendar
              </Button>
              <Button
                id="notif-view-contacts-btn"
                variant="subtle"
                size="compact-xs"
                color="blue"
                rightSection={<IconExternalLink size={12} />}
                onClick={handleViewAllContacts}
                style={{ fontSize: 11, fontWeight: 650, borderRadius: 6 }}
              >
                Contacts
              </Button>
            </Group>
          </Group>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
};

export default NotificationBell;
