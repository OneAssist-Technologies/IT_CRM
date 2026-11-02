import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Text,
  Group,
  Stack,
  Paper,
  Button,
  Badge,
  TextInput,
  Select,
  ActionIcon,
  Loader,
  Center,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  Popover,
  Divider,
  useComputedColorScheme,
  Grid,
  Table,
  Avatar,
  SegmentedControl,
  Progress,
  ScrollArea,
  Modal,
} from '@mantine/core';
import {
  IconClock,
  IconSearch,
  IconCalendar,
  IconFilter,
  IconCalendarEvent,
  IconFileDescription,
  IconFileCheck,
  IconReceiptTax,
  IconCreditCard,
  IconRocket,
  IconFlag,
  IconMessageDots,
  IconRefresh,
  IconBuilding,
  IconUser,
  IconUserCircle,
  IconArrowRight,
  IconArrowLeft,
  IconX,
  IconCheck,
  IconAdjustmentsHorizontal,
  IconPhone,
  IconMail,
  IconUserPlus,
  IconTarget,
  IconExternalLink,
  IconBriefcase,
  IconMapPin,
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlertTriangle,
  IconScale,
  IconReceipt,
  IconSparkles,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { useCRM } from '../../context/CRMContext';
import { useLead } from '../../context/LeadContext';
import { useCustomer } from '../../context/CustomerContext';
import { CRM_COLORS } from '../../theme/colors';
import { activityService } from '../../services/activityService';
import {
  ActivityItem,
  ActivitySummary,
  ActivityFilterParams,
  ActivityPagination,
  ActivityMetadata,
} from '../../types/activity';
import { Lead } from '../../types/lead';

export const PIPELINE_STAGES = [
  { id: 'meeting', name: 'Meetings', icon: IconCalendarEvent, color: '#0284C7' },
  { id: 'proposal', name: 'Proposals', icon: IconFileDescription, color: '#6366F1' },
  { id: 'quotation', name: 'Quotations', icon: IconReceiptTax, color: '#EC4899' },
  { id: 'negotiation', name: 'Negotiation', icon: IconScale, color: '#F59E0B' },
  { id: 'contract', name: 'Contracts', icon: IconFileCheck, color: '#E11D48' },
  { id: 'invoice', name: 'Invoices', icon: IconReceipt, color: '#D97706' },
  { id: 'payment', name: 'Payments', icon: IconCreditCard, color: '#10B981' },
  { id: 'progress', name: 'Progress', icon: IconRocket, color: '#0EA5E9' },
  { id: 'closure', name: 'Closure', icon: IconFlag, color: '#8B5CF6' },
];

export const getLeadPipelineStageIndex = (lead: Lead): number => {
  const stage = (lead.stage || '').toLowerCase();
  const status = (lead.status || '').toLowerCase();

  if (
    status.includes('won') ||
    status.includes('closed') ||
    status.includes('complete') ||
    stage.includes('won') ||
    stage.includes('complete') ||
    stage.includes('closure')
  ) {
    return 8; // Closure
  }
  if (stage.includes('progress') || stage.includes('handover')) return 7;
  if (stage.includes('payment')) return 6;
  if (stage.includes('invoice')) return 5;
  if (stage.includes('contract') || stage.includes('decision')) return 4;
  if (stage.includes('negotiat')) return 3;
  if (stage.includes('quotation')) return 2;
  if (stage.includes('proposal')) return 1;
  if (stage.includes('meeting') || stage.includes('discovery') || stage.includes('demo')) return 0;

  return 0; // Default to initial stage (Meetings)
};

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Activities' },
  { value: 'qualification', label: 'Lead Qualification' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'proposal', label: 'Proposals / Quotations' },
  { value: 'negotiation', label: 'Negotiations' },
  { value: 'contract', label: 'Contracts' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'payment', label: 'Payments' },
  { value: 'progress', label: 'Progress / Handover' },
  { value: 'closure', label: 'Closure' },
];

export const ActivityTimelinePage: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { setActiveNav } = useCRM();
  const { leads, setSelectedLead: setGlobalSelectedLead, fetchLeads, deleteLead, loading: leadsLoading } = useLead();
  const { customers, setSelectedCustomer } = useCustomer();

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Selected Lead state for 2-level navigation
  // null = Level 1 (Leads Table List)
  // Lead = Level 2 (Selected Lead Activity Timeline & Pipeline)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(() => {
    try {
      const saved = sessionStorage.getItem('crm_activity_timeline_selected_lead');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  });

  // Leads list filter & search state (Level 1)
  const [leadSearch, setLeadSearch] = useState<string>('');
  const [leadStatusTab, setLeadStatusTab] = useState<string>('ALL');

  // Timeline data states (Level 2)
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<ActivitySummary>({
    meetings: 0,
    proposals: 0,
    contracts: 0,
    invoices: 0,
    payments: 0,
    progress: 0,
    closure: 0,
    negotiations: 0,
    total: 0,
  });
  const [pagination, setPagination] = useState<ActivityPagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    from: 0,
    to: 0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Timeline filter states (Level 2)
  const [search, setSearch] = useState<string>('');
  const [activityType, setActivityType] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePickerOpened, setDatePickerOpened] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Fetch leads once on mount
  useEffect(() => {
    fetchLeads().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-clear stale selected lead if it no longer exists in database
  useEffect(() => {
    if (!leadsLoading && selectedLead) {
      const exists = leads.some(
        (l) => l.id === selectedLead.id || (l.leadId && l.leadId === selectedLead.leadId)
      );
      if (!exists) {
        setSelectedLead(null);
        try {
          sessionStorage.removeItem('crm_activity_timeline_selected_lead');
        } catch (_) {}
      }
    }
  }, [leads, leadsLoading, selectedLead]);

  // Persist selected lead in session storage
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setPage(1);
    setSearch('');
    setActivityType('all');
    setSortOrder('newest');
    try {
      sessionStorage.setItem('crm_activity_timeline_selected_lead', JSON.stringify(lead));
    } catch (_) {}
  };

  const handleBackToLeadsList = () => {
    setSelectedLead(null);
    try {
      sessionStorage.removeItem('crm_activity_timeline_selected_lead');
    } catch (_) {}
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const targetId = deleteTarget.id || deleteTarget.leadId;
      const res = await deleteLead(targetId);
      if (res && res.success) {
        if (selectedLead && (selectedLead.id === deleteTarget.id || selectedLead.leadId === deleteTarget.leadId)) {
          setSelectedLead(null);
          try {
            sessionStorage.removeItem('crm_activity_timeline_selected_lead');
          } catch (_) {}
        }
        setDeleteTarget(null);
        await fetchLeads();
      }
    } catch (err: any) {
      console.error('Error deleting lead from timeline:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Fetch activities from backend API for selected lead
  const fetchActivities = useCallback(async () => {
    if (!selectedLead) return;
    setLoading(true);
    try {
      const params: ActivityFilterParams = {
        page: 1,
        limit: 100,
        leadId: selectedLead.id || selectedLead.leadId,
        leadName: selectedLead.name || undefined,
        leadCode: selectedLead.leadId || undefined,
        search: search.trim() || undefined,
        type: activityType !== 'all' ? activityType : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const res = await activityService.getActivities(params);
      if (res && res.data) {
        setActivities(res.data);
        if (res.pagination) setPagination(res.pagination);
        if (res.summary) setSummary(res.summary);
      }
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      notifications.show({
        title: 'Failed to load activities',
        message: error.message || 'Could not fetch lead activity timeline.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedLead, page, search, activityType, startDate, endDate]);

  useEffect(() => {
    if (selectedLead) {
      fetchActivities();
    }
  }, [selectedLead, fetchActivities]);

  // Handle manual sync
  const handleSync = async () => {
    setSyncing(true);
    try {
      await activityService.syncActivities();
      notifications.show({
        title: 'Timeline Synchronized',
        message: 'All CRM meetings, quotations, contracts, and closure records are up to date.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      if (selectedLead) fetchActivities();
      fetchLeads().catch(() => {});
    } catch (err: any) {
      notifications.show({
        title: 'Sync Notice',
        message: err.message || 'Sync completed with existing records.',
        color: 'blue',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Quick Date presets
  const handleSelectDatePreset = (preset: string) => {
    setDateRangePreset(preset);
    const now = dayjs();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.format('YYYY-MM-DD');
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      setStartDate(now.startOf('week').format('YYYY-MM-DD'));
      setEndDate(now.endOf('week').format('YYYY-MM-DD'));
    } else if (preset === 'month') {
      setStartDate(now.startOf('month').format('YYYY-MM-DD'));
      setEndDate(now.endOf('month').format('YYYY-MM-DD'));
    } else if (preset === 'last_month') {
      const lastM = now.subtract(1, 'month');
      setStartDate(lastM.startOf('month').format('YYYY-MM-DD'));
      setEndDate(lastM.endOf('month').format('YYYY-MM-DD'));
    }
    setPage(1);
    setDatePickerOpened(false);
  };

  // Reset timeline filters
  const handleResetTimelineFilters = () => {
    setSearch('');
    setActivityType('all');
    setStartDate('');
    setEndDate('');
    setDateRangePreset('all');
    setSortOrder('newest');
    setPage(1);
  };

  // Navigate to full lead deal page
  const handleOpenLeadDealPage = (lead: Lead) => {
    setGlobalSelectedLead(lead);
    try {
      sessionStorage.setItem('crm_selected_lead', JSON.stringify(lead));
    } catch (_) {}
    setActiveNav('lead-schedule');
  };

  // Filter leads for Level 1 table
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const q = leadSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (lead.name && lead.name.toLowerCase().includes(q)) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.phone && lead.phone.toLowerCase().includes(q)) ||
        (lead.leadId && lead.leadId.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (leadStatusTab === 'ALL') return true;
      const s = (lead.status || '').toLowerCase();
      const stg = (lead.stage || '').toLowerCase();
      if (leadStatusTab === 'IN_PROGRESS') return s.includes('progress');
      if (leadStatusTab === 'COMPLETED') {
        return (
          s.includes('complete') ||
          s.includes('won') ||
          s.includes('closed') ||
          stg.includes('complete') ||
          stg.includes('won') ||
          stg.includes('closure')
        );
      }
      return true;
    });
  }, [leads, leadSearch, leadStatusTab]);

  // Format date display helper
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = dayjs(dateStr);
      return d.isValid() ? d.format('DD MMM YYYY') : dateStr;
    } catch (_) {
      return dateStr;
    }
  };

  // Find qualification milestone for selected lead
  const qualificationActivity = useMemo(() => {
    return activities.find((a) => a.type === 'qualification');
  }, [activities]);

  const qualificationDate = useMemo(() => {
    if (qualificationActivity?.activityDate) return qualificationActivity.activityDate;
    if (selectedLead?.createdAt) {
      try {
        return dayjs(selectedLead.createdAt).format('YYYY-MM-DD');
      } catch (_) {}
    }
    return '';
  }, [qualificationActivity, selectedLead]);

  const originContactInfo = useMemo(() => {
    if (qualificationActivity?.description) {
      const match = qualificationActivity.description.match(/Origin Contact:\s*(#[A-Z0-9-]+)/i);
      if (match) return match[1];
    }
    return null;
  }, [qualificationActivity]);

  // Helper to parse time strings like '04:15 PM', '12:00 AM' into minutes for accurate comparison
  const parseTimeMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = (match[3] || '').toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  // Sort activities: default descending (latest/newest first) or pipeline flow (oldest first)
  // Qualification is the root origin of the lead:
  // - In descending (newest first) order, qualification is ALWAYS at the very bottom!
  // - In ascending (pipeline flow) order, qualification is ALWAYS at the very top!
  const sortedActivities = useMemo(() => {
    const list = [...activities];
    if (sortOrder === 'newest') {
      return list.sort((a, b) => {
        // Qualification is the birth event; in latest-first, it must strictly be at the bottom
        if (a.type === 'qualification' && b.type !== 'qualification') return 1;
        if (b.type === 'qualification' && a.type !== 'qualification') return -1;
        if (a.type === 'qualification' && b.type === 'qualification') return 0;

        const dateA = a.activityDate || '';
        const dateB = b.activityDate || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }

        const timeDiff = parseTimeMinutes(b.activityTime) - parseTimeMinutes(a.activityTime);
        if (timeDiff !== 0) return timeDiff;

        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    } else {
      return list.sort((a, b) => {
        // In pipeline flow, qualification is strictly at the top
        if (a.type === 'qualification' && b.type !== 'qualification') return -1;
        if (b.type === 'qualification' && a.type !== 'qualification') return 1;
        if (a.type === 'qualification' && b.type === 'qualification') return 0;

        const dateA = a.activityDate || '';
        const dateB = b.activityDate || '';
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }

        const timeDiff = parseTimeMinutes(a.activityTime) - parseTimeMinutes(b.activityTime);
        if (timeDiff !== 0) return timeDiff;

        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
    }
  }, [activities, sortOrder]);

  // Group label helper (Today, Yesterday, MMM DD) matching Touchpoints timeline reference
  const getDateGroupLabel = (dateStr?: string) => {
    if (!dateStr) return 'Earlier';
    try {
      const d = dayjs(dateStr);
      if (!d.isValid()) return dateStr;
      const today = dayjs();
      if (d.isSame(today, 'day')) return 'Today';
      if (d.isSame(today.subtract(1, 'day'), 'day')) return 'Yesterday';
      return d.format('MMM DD');
    } catch (_) {
      return dateStr;
    }
  };

  // Group sorted activities by date (single group per date to prevent duplicate keys)
  const groupedActivities = useMemo(() => {
    const map = new Map<string, { dateKey: string; dateLabel: string; items: ActivityItem[] }>();
    for (const item of sortedActivities) {
      const rawDate = item.activityDate || 'earlier';
      const label = getDateGroupLabel(item.activityDate);
      const groupKey = `${rawDate}_${label}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          dateKey: groupKey,
          dateLabel: label,
          items: [],
        });
      }
      map.get(groupKey)!.items.push(item);
    }
    return Array.from(map.values());
  }, [sortedActivities]);

  // Visual style for each activity type
  const getActivityStyle = (type: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'qualification':
      case 'qualified':
        return {
          label: 'Qualification',
          icon: <IconSparkles size={23} stroke={2.2} />,
          badgeBg: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
          badgeText: isDark ? '#A5B4FC' : '#4338CA',
          iconBg: isDark ? 'rgba(99, 102, 241, 0.25)' : '#EEF2FF',
          iconColor: isDark ? '#818CF8' : '#4F46E5',
        };
      case 'meeting':
        return {
          label: 'Meeting',
          icon: <IconCalendarEvent size={23} stroke={2.2} />,
          badgeBg: isDark ? 'rgba(20, 184, 166, 0.2)' : '#D1FAE5',
          badgeText: isDark ? '#2DD4BF' : '#065F46',
          iconBg: isDark ? 'rgba(20, 184, 166, 0.25)' : '#D1FAE5',
          iconColor: isDark ? '#2DD4BF' : '#059669',
        };
      case 'proposal':
      case 'quotation':
        return {
          label: 'Proposal',
          icon: <IconFileDescription size={23} stroke={2.2} />,
          badgeBg: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EDE9FE',
          badgeText: isDark ? '#A5B4FC' : '#5B21B6',
          iconBg: isDark ? 'rgba(99, 102, 241, 0.25)' : '#EDE9FE',
          iconColor: isDark ? '#A5B4FC' : '#6366F1',
        };
      case 'contract':
        return {
          label: 'Contract',
          icon: <IconFileCheck size={23} stroke={2.2} />,
          badgeBg: isDark ? 'rgba(244, 63, 94, 0.2)' : '#FFE4E6',
          badgeText: isDark ? '#FDA4AF' : '#9F1239',
          iconBg: isDark ? 'rgba(244, 63, 94, 0.25)' : '#FFE4E6',
          iconColor: isDark ? '#FB7185' : '#E11D48',
        };
      case 'invoice':
        return {
          label: 'Invoice',
          icon: <IconReceiptTax size={23} stroke={2.2} />,
          badgeBg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
          badgeText: isDark ? '#FCD34D' : '#92400E',
          iconBg: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7',
          iconColor: isDark ? '#FBBF24' : '#D97706',
        };
      case 'payment':
        return {
          label: 'Payment',
          icon: <IconCreditCard size={23} stroke={2.2} />,
          badgeBg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
          badgeText: isDark ? '#6EE7B7' : '#14532D',
          iconBg: isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7',
          iconColor: isDark ? '#34D399' : '#16A34A',
        };
      case 'progress':
      case 'handover':
        return {
          label: 'Progress',
          icon: <IconRocket size={23} stroke={2.2} />,
          badgeBg: isDark ? 'rgba(14, 165, 233, 0.2)' : '#E0F2FE',
          badgeText: isDark ? '#7DD3FC' : '#0369A1',
          iconBg: isDark ? 'rgba(14, 165, 233, 0.25)' : '#E0F2FE',
          iconColor: isDark ? '#38BDF8' : '#0284C7',
        };
      case 'closure':
      case 'closed':
        return {
          label: 'Closure',
          icon: <IconFlag size={23} stroke={2.2} />,
          badgeBg: isDark ? 'rgba(168, 85, 247, 0.2)' : '#F3E8FF',
          badgeText: isDark ? '#D8B4FE' : '#6B21A8',
          iconBg: isDark ? 'rgba(168, 85, 247, 0.25)' : '#F3E8FF',
          iconColor: isDark ? '#C084FC' : '#9333EA',
        };
      case 'negotiation':
      default:
        return {
          label: 'Negotiation',
          icon: <IconMessageDots size={23} stroke={2.2} />,
          badgeBg: isDark ? 'rgba(6, 182, 212, 0.2)' : '#CFFAFE',
          badgeText: isDark ? '#67E8F9' : '#155E75',
          iconBg: isDark ? 'rgba(6, 182, 212, 0.25)' : '#CFFAFE',
          iconColor: isDark ? '#22D3EE' : '#0891B2',
        };
    }
  };

  // Status style and config for activity cards in pipeline
  const getActivityStatusConfig = (status?: string | null, isFirst = false) => {
    const s = (status || '').trim();
    const normalized = s.toLowerCase();

    // Success / Completed / Qualified / Won / Accepted / Signed / Handover / Paid
    if (
      normalized.includes('complete') ||
      normalized.includes('qualif') ||
      normalized.includes('won') ||
      normalized.includes('accept') ||
      normalized.includes('paid') ||
      normalized.includes('signed') ||
      normalized.includes('handover')
    ) {
      return {
        label: s || 'Completed',
        color: isDark ? '#34D399' : '#059669',
        bg: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
        border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
        dotColor: '#10B981',
      };
    }

    // Pending / Action Required / Amber / Rescheduled / Draft / Revised / Partially Paid
    if (
      normalized.includes('resched') ||
      normalized.includes('pending') ||
      normalized.includes('draft') ||
      normalized.includes('revised') ||
      normalized.includes('partial') ||
      normalized.includes('awaiting')
    ) {
      return {
        label: s || 'Pending',
        color: isDark ? '#FBBF24' : '#D97706',
        bg: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
        border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
        dotColor: '#F59E0B',
      };
    }

    // Active / Scheduled / In Progress / Sent / Issued / Blue
    if (
      normalized.includes('schedul') ||
      normalized.includes('progress') ||
      normalized.includes('sent') ||
      normalized.includes('issued') ||
      normalized.includes('under review') ||
      normalized.includes('request') ||
      normalized.includes('active')
    ) {
      return {
        label: s || 'Scheduled',
        color: isDark ? '#38BDF8' : '#0284C7',
        bg: isDark ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.08)',
        border: isDark ? 'rgba(2, 132, 199, 0.35)' : '#BAE6FD',
        dotColor: '#0284C7',
      };
    }

    // Cancelled / Rejected / Lost / Overdue
    if (
      normalized.includes('cancel') ||
      normalized.includes('reject') ||
      normalized.includes('lost') ||
      normalized.includes('overdue')
    ) {
      return {
        label: s || 'Cancelled',
        color: isDark ? '#F87171' : '#DC2626',
        bg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
        border: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
        dotColor: '#EF4444',
      };
    }

    // Fallback
    return {
      label: s || 'Logged',
      color: isFirst ? '#FF5722' : isDark ? '#E2E8F0' : '#475569',
      bg: isFirst
        ? isDark ? 'rgba(255, 87, 34, 0.12)' : 'rgba(255, 87, 34, 0.06)'
        : isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
      border: isFirst ? '#FF5722' : isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1',
      dotColor: isFirst ? '#FF5722' : '#94A3B8',
    };
  };

  // Helper for status badge styling in leads table
  const getStatusBadgeStyle = (statusStr?: string) => {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('progress')) {
      return { bg: isDark ? 'rgba(14, 165, 233, 0.18)' : '#E0F2FE', color: isDark ? '#38BDF8' : '#0284C7' };
    }
    if (s.includes('active')) {
      return { bg: isDark ? 'rgba(20, 184, 166, 0.18)' : '#CCFBF1', color: isDark ? '#2DD4BF' : '#0F766E' };
    }
    if (s.includes('new')) {
      return { bg: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF', color: isDark ? '#818CF8' : '#4338CA' };
    }
    if (s.includes('won') || s.includes('complete')) {
      return { bg: isDark ? 'rgba(34, 197, 94, 0.18)' : '#DCFCE7', color: isDark ? '#4ADE80' : '#166534' };
    }
    return { bg: isDark ? 'rgba(148, 163, 184, 0.18)' : '#F1F5F9', color: isDark ? '#94A3B8' : '#475569' };
  };

  // =========================================================================
  // VIEW 1: LEADS LIST VIEW (When no lead is currently selected)
  // =========================================================================
  if (!selectedLead) {
    return (
      <Box style={{ width: '100%', maxWidth: 1440, margin: '0 auto' }}>
        {/* Page Header */}
        <Box mb="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
            <Group gap="sm" align="center">
              <Box
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: isDark ? 'rgba(79, 70, 229, 0.25)' : '#EEF2FF',
                  border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(79, 70, 229, 0.2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDark ? '#A5B4FC' : '#4F46E5',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.12)',
                }}
              >
                <IconClock size={24} stroke={2.2} />
              </Box>
              <Box>
                <Text fw={700} size="22px" style={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Activity Timeline
                </Text>
                <Text size="13px" c="dimmed" mt={3} style={{ fontWeight: 500 }}>
                  Select a lead from the list below to view its chronological activity timeline and deal pipeline.
                </Text>
              </Box>
            </Group>

            <Group gap="xs">
              <Tooltip label="Sync latest CRM activities" withArrow>
                <ActionIcon
                  variant="default"
                  size={38}
                  radius="md"
                  loading={syncing}
                  onClick={handleSync}
                  style={{
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
                  }}
                >
                  <IconRefresh size={18} stroke={1.8} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Box>

        {/* Search & Status Filter Toolbar */}
        <Paper
          p="sm"
          radius="lg"
          withBorder
          mb="md"
          style={{
            background: isDark ? 'var(--mantine-color-dark-7)' : CRM_COLORS.cardBg,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : CRM_COLORS.border,
          }}
        >
          <Group justify="space-between" wrap="wrap" gap="sm">
            <TextInput
              placeholder="Search leads by name, company, contact info..."
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              leftSection={<IconSearch size={16} stroke={1.8} color="dimmed" />}
              rightSection={
                leadSearch ? (
                  <ActionIcon size="xs" variant="transparent" c="dimmed" onClick={() => setLeadSearch('')}>
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              radius="md"
              size="sm"
              style={{ width: 340, maxWidth: '100%' }}
            />

            <SegmentedControl
              value={leadStatusTab}
              onChange={setLeadStatusTab}
              data={[
                { label: 'All Leads', value: 'ALL' },
                { label: 'In Progress', value: 'IN_PROGRESS' },
                { label: 'Completed', value: 'COMPLETED' },
              ]}
              radius="md"
              size="xs"
              color="oneassist"
            />
          </Group>
        </Paper>

        {/* Leads Table Card (Matching the user screenshot) */}
        <Paper
          radius="lg"
          withBorder
          style={{
            overflow: 'hidden',
            backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : CRM_COLORS.border,
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
          }}
        >
          {leadsLoading ? (
            <Center py={60}>
              <Loader size="md" color="oneassist" />
            </Center>
          ) : filteredLeads.length === 0 ? (
            <Center py={60}>
              <Stack align="center" gap="xs">
                <IconTarget size={36} color="gray" />
                <Text fw={600} size="sm">No leads found matching your search</Text>
                <Button size="xs" variant="light" color="oneassist" onClick={() => { setLeadSearch(''); setLeadStatusTab('ALL'); }}>
                  Reset Search
                </Button>
              </Stack>
            </Center>
          ) : (
            <Table
              verticalSpacing="md"
              horizontalSpacing="lg"
              highlightOnHover
              styles={{
                table: { fontSize: 13 },
                th: {
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: isDark ? '#94A3B8' : '#64748B',
                  backgroundColor: isDark ? 'var(--mantine-color-dark-8)' : '#F8FAFC',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                  paddingTop: 14,
                  paddingBottom: 14,
                },
                tr: {
                  transition: 'background-color 0.15s ease',
                  cursor: 'pointer',
                },
                td: {
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'}`,
                  paddingTop: 16,
                  paddingBottom: 16,
                },
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '25%' }}>LEAD NAME</Table.Th>
                  <Table.Th style={{ width: '22%' }}>COMPANY / PROFESSION</Table.Th>
                  <Table.Th style={{ width: '22%' }}>CONTACT INFO</Table.Th>
                  <Table.Th style={{ width: '13%' }}>ASSIGNED TO</Table.Th>
                  <Table.Th style={{ width: '10%' }}>STATUS</Table.Th>
                  <Table.Th style={{ width: '8%', textAlign: 'right' }}>ACTIONS</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredLeads.map((lead) => {
                  const initialLetter = (lead.name ? lead.name.charAt(0) : 'L').toUpperCase();
                  const statusStyle = getStatusBadgeStyle(lead.status);

                  return (
                    <Table.Tr
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      style={{
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* 1. LEAD NAME */}
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap" align="center">
                          <Box
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE',
                              color: isDark ? '#38BDF8' : '#0284C7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 15,
                              flexShrink: 0,
                            }}
                          >
                            {initialLetter}
                          </Box>
                          <Box style={{ minWidth: 0 }}>
                            <Text fw={700} size="14px" truncate style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                              {lead.name}
                            </Text>
                            <Text size="11.5px" c="dimmed" mt={1}>
                              Added: {formatDateDisplay(lead.createdAt?.toString()) || 'Recently'} • By {lead.createdByName || 'Admin'}
                            </Text>
                          </Box>
                        </Group>
                      </Table.Td>

                      {/* 2. COMPANY / PROFESSION */}
                      <Table.Td>
                        <Box>
                          <Group gap={6} align="center" wrap="nowrap">
                            <IconBuilding size={14} stroke={1.8} color={isDark ? '#94A3B8' : '#64748B'} />
                            <Text fw={600} size="13px" truncate style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                              {lead.companyName || lead.profession || 'Individual Client'}
                            </Text>
                          </Group>
                          <Text size="11.5px" c="dimmed" mt={2} pl={20}>
                            {lead.designation || (lead.companyName ? 'Representative' : 'Client')}
                          </Text>
                        </Box>
                      </Table.Td>

                      {/* 3. CONTACT INFO */}
                      <Table.Td>
                        <Stack gap={3}>
                          {lead.phone ? (
                            <Group gap={6} align="center" wrap="nowrap">
                              <IconPhone size={13} stroke={2} color="#10B981" />
                              <Text size="12px" fw={500} style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
                                {lead.phone}
                              </Text>
                            </Group>
                          ) : (
                            <Text size="11px" c="dimmed">—</Text>
                          )}
                          {lead.email ? (
                            <Group gap={6} align="center" wrap="nowrap">
                              <IconMail size={13} stroke={2} color="#3B82F6" />
                              <Text size="12px" fw={500} style={{ color: isDark ? '#CBD5E1' : '#334155' }} truncate>
                                {lead.email}
                              </Text>
                            </Group>
                          ) : null}
                        </Stack>
                      </Table.Td>

                      {/* 4. ASSIGNED TO */}
                      <Table.Td>
                        {lead.assignedToName ? (
                          <Box
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 100,
                              backgroundColor: isDark ? 'rgba(79, 70, 229, 0.15)' : '#EEF2FF',
                              border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE'}`,
                            }}
                          >
                            <IconUser size={12} stroke={2} color="#4F46E5" />
                            <Text size="11.5px" fw={600} style={{ color: isDark ? '#C7D2FE' : '#4338CA' }}>
                              {lead.assignedToName}
                            </Text>
                          </Box>
                        ) : (
                          <Box
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '4px 11px',
                              borderRadius: 100,
                              border: isDark ? '1px dashed rgba(255,255,255,0.2)' : '1px dashed #CBD5E1',
                              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                            }}
                          >
                            <IconUserPlus size={12} stroke={2} color="#94A3B8" />
                            <Text size="11px" fw={600} c="dimmed">
                              Assign Lead
                            </Text>
                          </Box>
                        )}
                      </Table.Td>

                      {/* 5. STATUS */}
                      <Table.Td>
                        <Box>
                          <Badge
                            size="sm"
                            radius="xl"
                            variant="light"
                            style={{
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.color,
                              fontWeight: 700,
                              fontSize: 11,
                              textTransform: 'none',
                              padding: '0 9px',
                              height: 22,
                              border: 'none',
                            }}
                          >
                            {lead.status || 'Active'}
                          </Badge>
                          <Text size="11.5px" c="dimmed" mt={3} fw={500}>
                            {lead.stage || 'Discovery'}
                          </Text>
                        </Box>
                      </Table.Td>

                      {/* 6. ACTIONS (Matching user screenshot) */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="View Activities & Pipeline" withArrow>
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              color="blue"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectLead(lead);
                              }}
                            >
                              <IconEdit size={16} stroke={1.8} color="#3B82F6" />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete Lead" withArrow>
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(lead);
                              }}
                            >
                              <IconTrash size={16} stroke={1.8} color="#F87171" />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Paper>

        {/* Delete Confirmation Modal for Level 1 */}
        <Modal
          opened={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title={
            <Group gap="xs">
              <IconAlertTriangle color="#EF4444" size={20} />
              <Text fw={700}>Delete Lead Record</Text>
            </Group>
          }
          centered
          radius="lg"
        >
          <Text size="sm" c="dimmed" mb="lg">
            Are you sure you want to delete lead{' '}
            <Text span fw={700} c={isDark ? 'white' : 'dark'}>
              {deleteTarget?.name} ({deleteTarget?.leadId})
            </Text>
            ? This will remove the lead and all its associated timeline records. This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmDelete} loading={deleteLoading}>
              Delete Permanently
            </Button>
          </Group>
        </Modal>
      </Box>
    );
  }

  // =========================================================================
  // VIEW 2: SELECTED LEAD ACTIVITY TIMELINE & PIPELINE VIEW
  // (Left: Vertical timeline for this lead | Right: Card 1 Lead Details + Card 2 Summary)
  // =========================================================================
  const leadInitial = (selectedLead.name ? selectedLead.name.charAt(0) : 'L').toUpperCase();

  return (
    <Box
      style={{
        width: '100%',
        maxWidth: 1440,
        margin: '0 auto',
        height: 'calc(100vh - 144px)',
        maxHeight: 'calc(100vh - 144px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top Action & Filter Toolbar for this Lead's Timeline (Includes Back Button) */}
      <Paper
        p="xs"
        px="sm"
        radius="lg"
        withBorder
        mb="xs"
        style={{
          background: isDark ? 'var(--mantine-color-dark-7)' : CRM_COLORS.cardBg,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : CRM_COLORS.border,
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          flexShrink: 0,
        }}
      >
        <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
          {/* Back Button to return to Leads list */}
          <Button
            variant="default"
            size="sm"
            radius="md"
            leftSection={<IconArrowLeft size={16} stroke={2} />}
            onClick={handleBackToLeadsList}
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
              fontWeight: 600,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            Back
          </Button>

          <Divider orientation="vertical" />

          {/* Search bar within this lead */}
          <TextInput
            placeholder="Search activities in this lead..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftSection={<IconSearch size={16} stroke={1.8} color="dimmed" />}
            rightSection={
              search ? (
                <ActionIcon size="xs" variant="transparent" c="dimmed" onClick={() => setSearch('')}>
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
            radius="md"
            size="sm"
            style={{ flex: 1, minWidth: 200 }}
          />

          {/* Activity Type Dropdown */}
          <Select
            data={ACTIVITY_TYPE_OPTIONS}
            value={activityType}
            onChange={(val) => {
              setActivityType(val || 'all');
              setPage(1);
            }}
            radius="md"
            size="sm"
            style={{ width: 170, flexShrink: 0 }}
          />

          {/* Date Range Selector Popover */}
          <Popover opened={datePickerOpened} onChange={setDatePickerOpened} position="bottom-end" withArrow shadow="md">
            <Popover.Target>
              <Button
                variant="default"
                radius="md"
                size="sm"
                leftSection={<IconCalendar size={15} stroke={1.8} color="dimmed" />}
                onClick={() => setDatePickerOpened((o) => !o)}
                style={{ fontWeight: 500, fontSize: 13, flexShrink: 0 }}
              >
                Date Range
              </Button>
            </Popover.Target>
            <Popover.Dropdown p="sm" style={{ width: 260 }}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
                Select Date Range
              </Text>
              <Stack gap={6}>
                {[
                  { key: 'all', label: 'All Activities' },
                  { key: 'today', label: 'Today' },
                  { key: 'week', label: 'This Week' },
                  { key: 'month', label: 'This Month' },
                ].map((item) => (
                  <Button
                    key={item.key}
                    variant={dateRangePreset === item.key ? 'light' : 'subtle'}
                    color="oneassist"
                    size="xs"
                    justify="flex-start"
                    radius="md"
                    onClick={() => handleSelectDatePreset(item.key)}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </Popover.Dropdown>
          </Popover>

          {/* Reset button */}
          <Tooltip label="Reset filters" withArrow>
            <ActionIcon variant="default" size={36} radius="md" onClick={handleResetTimelineFilters} style={{ flexShrink: 0 }}>
              <IconAdjustmentsHorizontal size={17} stroke={1.8} />
            </ActionIcon>
          </Tooltip>

          {/* Refresh button */}
          <Tooltip label="Refresh activities" withArrow>
            <ActionIcon variant="default" size={36} radius="md" loading={loading} onClick={fetchActivities} style={{ flexShrink: 0 }}>
              <IconRefresh size={16} stroke={1.8} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Paper>

      {/* Two Column Layout: Left Pipeline & Details, Right Activity Timeline */}
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          gap: 16,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {/* -----------------------------------------------------------------
            LEFT COLUMN:
            CARD 1: LEAD DETAILS
            CARD 2: LEAD ACTIVITY SUMMARY
            ----------------------------------------------------------------- */}
        <Box
          style={{
            width: 360,
            minWidth: 300,
            maxWidth: 380,
            flexShrink: 0,
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Stack gap="xs" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4, scrollbarWidth: 'thin' }}>
            {/* =============================================================
                CARD 1: LEAD DETAILS
                ============================================================= */}
            <Paper
              p="md"
              radius="lg"
              withBorder
              style={{
                backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : CRM_COLORS.cardBg,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : CRM_COLORS.border,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                flexShrink: 0,
              }}
            >
              {/* Card 1 Header */}
              <Group justify="space-between" align="center" mb="xs">
                <Group gap={8} align="center">
                  <IconUser size={18} stroke={2.2} color={isDark ? '#A5B4FC' : '#4F46E5'} />
                  <Text fw={700} size="15px">
                    Lead Details
                  </Text>
                </Group>
                <Group gap={6} align="center">
                  <Badge size="xs" radius="sm" variant="light" color="oneassist">
                    {selectedLead.leadId || 'LEAD'}
                  </Badge>
                  <Tooltip label="Delete Lead" withArrow>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      color="red"
                      onClick={() => setDeleteTarget(selectedLead)}
                    >
                      <IconTrash size={15} stroke={1.8} color="#F87171" />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              {/* Lead Avatar & Name */}
              <Box
                p="xs"
                mb="xs"
                style={{
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}`,
                }}
              >
                <Group gap="sm" align="center">
                  <Box
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.25)' : '#EEF2FF',
                      color: isDark ? '#A5B4FC' : '#4F46E5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {leadInitial}
                  </Box>
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text fw={700} size="14.5px" style={{ wordBreak: 'break-word' }}>
                      {selectedLead.name}
                    </Text>
                    <Text size="12px" c="dimmed" style={{ wordBreak: 'break-word' }}>
                      {selectedLead.companyName || selectedLead.profession || 'Direct Client'}
                    </Text>
                  </Box>
                </Group>
              </Box>

              {/* Lead Field Values */}
              <Stack gap={8} my="xs">
                {/* Qualified Date Row */}
                <Group
                  justify="space-between"
                  align="center"
                  py={4}
                  style={{
                    borderBottom: `1px dashed ${isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0'}`,
                  }}
                >
                  <Group gap={6} align="center">
                    <IconCalendar size={14} color={isDark ? '#818CF8' : '#4F46E5'} />
                    <Text size="12px" c="dimmed">Qualified Date</Text>
                  </Group>
                  <Text size="12.5px" fw={600}>
                    {formatDateDisplay(qualificationDate) || '-'}
                  </Text>
                </Group>

                {/* Phone */}
                {selectedLead.phone && (
                  <Group
                    justify="space-between"
                    align="center"
                    py={4}
                    style={{
                      borderBottom: `1px dashed ${isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0'}`,
                    }}
                  >
                    <Group gap={6} align="center">
                      <IconPhone size={14} color="#10B981" />
                      <Text size="12px" c="dimmed">Phone</Text>
                    </Group>
                    <Text size="12.5px" fw={600}>{selectedLead.phone}</Text>
                  </Group>
                )}

                {/* Email */}
                {selectedLead.email && (
                  <Group
                    justify="space-between"
                    align="center"
                    py={4}
                    style={{
                      borderBottom: `1px dashed ${isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0'}`,
                    }}
                  >
                    <Group gap={6} align="center">
                      <IconMail size={14} color="#3B82F6" />
                      <Text size="12px" c="dimmed">Email</Text>
                    </Group>
                    <Text size="12.5px" fw={600} style={{ wordBreak: 'break-all', textAlign: 'right', maxWidth: 200 }}>{selectedLead.email}</Text>
                  </Group>
                )}

                {/* Assigned To */}
                <Group
                  justify="space-between"
                  align="center"
                  py={4}
                >
                  <Group gap={6} align="center">
                    <IconUserCircle size={14} color={isDark ? '#A5B4FC' : '#6366F1'} />
                    <Text size="12px" c="dimmed">Assigned To</Text>
                  </Group>
                  <Text size="12.5px" fw={600} style={{ color: isDark ? '#A5B4FC' : '#4F46E5' }}>
                    {selectedLead.assignedToName || 'Unassigned'}
                  </Text>
                </Group>
              </Stack>

              <Button
                variant="light"
                color="oneassist"
                radius="md"
                size="xs"
                fullWidth
                mt="sm"
                rightSection={<IconArrowRight size={13} />}
                onClick={() => handleOpenLeadDealPage(selectedLead)}
              >
                Open Full Lead Pipeline
              </Button>
            </Paper>

            {/* =============================================================
                CARD 2: LEAD ACTIVITY SUMMARY
                ============================================================= */}
            <Paper
              p="sm"
              radius="lg"
              withBorder
              style={{
                backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : CRM_COLORS.cardBg,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : CRM_COLORS.border,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                flexShrink: 0,
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text fw={700} size="14px">
                  Lead Activity Summary
                </Text>
                <Badge size="xs" variant="filled" color="oneassist">
                  {summary.meetings +
                    summary.proposals +
                    summary.negotiations +
                    summary.contracts +
                    summary.invoices +
                    summary.payments +
                    summary.progress +
                    summary.closure}{' '}
                  Total
                </Badge>
              </Group>

              <Stack gap={4}>
                {[
                  {
                    key: 'meeting',
                    label: 'Meetings',
                    count: summary.meetings,
                    icon: <IconCalendarEvent size={14} stroke={2} />,
                    iconBg: isDark ? 'rgba(20, 184, 166, 0.2)' : '#D1FAE5',
                    iconColor: isDark ? '#2DD4BF' : '#059669',
                  },
                  {
                    key: 'proposal',
                    label: 'Proposals / Quotations',
                    count: summary.proposals,
                    icon: <IconFileDescription size={14} stroke={2} />,
                    iconBg: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EDE9FE',
                    iconColor: isDark ? '#A5B4FC' : '#6366F1',
                  },
                  {
                    key: 'negotiation',
                    label: 'Negotiations',
                    count: summary.negotiations,
                    icon: <IconScale size={14} stroke={2} />,
                    iconBg: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7',
                    iconColor: isDark ? '#F59E0B' : '#D97706',
                  },
                  {
                    key: 'contract',
                    label: 'Contracts',
                    count: summary.contracts,
                    icon: <IconFileCheck size={14} stroke={2} />,
                    iconBg: isDark ? 'rgba(244, 63, 94, 0.2)' : '#FFE4E6',
                    iconColor: isDark ? '#FB7185' : '#E11D48',
                  },
                  {
                    key: 'invoice',
                    label: 'Invoices',
                    count: summary.invoices,
                    icon: <IconReceiptTax size={14} stroke={2} />,
                    iconBg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                    iconColor: isDark ? '#FBBF24' : '#D97706',
                  },
                  {
                    key: 'payment',
                    label: 'Payments',
                    count: summary.payments,
                    icon: <IconCreditCard size={14} stroke={2} />,
                    iconBg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
                    iconColor: isDark ? '#34D399' : '#16A34A',
                  },
                  {
                    key: 'progress',
                    label: 'Progress / Handover',
                    count: summary.progress,
                    icon: <IconRocket size={14} stroke={2} />,
                    iconBg: isDark ? 'rgba(14, 165, 233, 0.2)' : '#E0F2FE',
                    iconColor: isDark ? '#38BDF8' : '#0284C7',
                  },
                  {
                    key: 'closure',
                    label: 'Closure',
                    count: summary.closure,
                    icon: <IconFlag size={14} stroke={2} />,
                    iconBg: isDark ? 'rgba(168, 85, 247, 0.2)' : '#F3E8FF',
                    iconColor: isDark ? '#C084FC' : '#9333EA',
                  },
                ].map((cat) => {
                  const isActive = activityType === cat.key;
                  return (
                    <UnstyledButton
                      key={cat.key}
                      onClick={() => {
                        setActivityType(cat.key === activityType ? 'all' : cat.key);
                        setPage(1);
                      }}
                      style={{
                        padding: '5px 8px',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isActive
                          ? isDark
                            ? 'rgba(99, 102, 241, 0.2)'
                            : 'rgba(79, 70, 229, 0.08)'
                          : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = isDark
                            ? 'rgba(255,255,255,0.04)'
                            : '#F8FAFC';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <Group gap={8} align="center">
                        <Box
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: cat.iconBg,
                            color: cat.iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {cat.icon}
                        </Box>
                        <Text size="12px" fw={isActive ? 700 : 500}>
                          {cat.label}
                        </Text>
                      </Group>
                      <Text
                        size="12.5px"
                        fw={700}
                        style={{
                          color: isActive
                            ? isDark
                              ? '#A5B4FC'
                              : '#4F46E5'
                            : isDark
                            ? '#E2E8F0'
                            : '#1E293B',
                        }}
                      >
                        {cat.count}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </Paper>

          </Stack>
        </Box>

        {/* -----------------------------------------------------------------
            RIGHT COLUMN: TOUCHPOINTS / ACTIVITY TIMELINE
            ----------------------------------------------------------------- */}
        <Box
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Paper
            p="md"
            radius="xl"
            withBorder
            style={{
              height: '100%',
              maxHeight: '100%',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: isDark ? 'var(--mantine-color-dark-8)' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.02)',
              overflow: 'hidden',
            }}
          >
            {/* Top Navigation / Tab Header (Touchpoints | Activity timeline) - PINNED */}
            <Group
              justify="space-between"
              align="center"
              pb="xs"
              mb="xs"
              style={{
                flexShrink: 0,
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
              }}
            >
              <Group gap="md" align="center">
                <Text fw={700} size="16px" style={{ letterSpacing: '-0.01em', color: isDark ? '#FFFFFF' : '#0F172A' }}>
                  Touchpoints
                </Text>
                <Text fw={500} size="14px" c="dimmed">
                  Activity timeline
                </Text>
                <Badge size="xs" variant="light" color="gray">
                  {sortedActivities.length} activities
                </Badge>
              </Group>

              {/* Toggle: Newest First vs Oldest First */}
              <SegmentedControl
                size="xs"
                radius="md"
                value={sortOrder}
                onChange={(val) => setSortOrder(val as 'newest' | 'oldest')}
                data={[
                  { label: 'Newest First', value: 'newest' },
                  { label: 'Oldest First', value: 'oldest' },
                ]}
              />
            </Group>

            {/* Timeline Scrollable Container - SCROLLS INTERNALLY INSIDE THIS CARD */}
            <Box
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'thin',
                paddingLeft: 0,
                paddingRight: 8,
                paddingBottom: 24,
                width: '100%',
                minWidth: 0,
              }}
            >
              {/* Inner wrapper so continuous line covers 100% of scrollable content */}
              <Box style={{ position: 'relative', width: '100%', minHeight: '100%' }}>
                {/* Continuous Vertical Timeline Track (Left Side) */}
                <Box
                  style={{
                    position: 'absolute',
                    top: 14,
                    bottom: 24,
                    left: 44,
                    width: 2,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
                    zIndex: 1,
                  }}
                />

              {/* Loading State */}
              {loading ? (
                <Stack gap="lg" py="xl" style={{ width: '100%', minWidth: 0 }}>
                  {[1, 2, 3].map((i) => (
                    <Box key={i} style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
                      <Box
                        style={{
                          position: 'absolute',
                          left: 44,
                          transform: 'translateX(-50%)',
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          backgroundColor: isDark ? 'var(--mantine-color-dark-6)' : '#CBD5E1',
                        }}
                      />
                      <Box
                        style={{
                          position: 'absolute',
                          left: 44,
                          width: 32,
                          height: 2.5,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                          zIndex: 1,
                        }}
                      />
                      <Paper
                        px="lg"
                        py="md"
                        radius="xl"
                        withBorder
                        style={{
                          marginLeft: 76,
                          width: 'calc(100% - 88px)',
                          maxWidth: 'calc(100% - 88px)',
                          minWidth: 0,
                          height: 86,
                          minHeight: 86,
                          maxHeight: 86,
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF',
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                        }}
                      >
                        <Center style={{ width: '100%' }}>
                          <Loader size="sm" color="oneassist" />
                        </Center>
                      </Paper>
                    </Box>
                  ))}
                </Stack>
              ) : sortedActivities.length === 0 ? (
                /* Empty State */
                <Paper
                  p="xl"
                  radius="lg"
                  withBorder
                  style={{
                    textAlign: 'center',
                    background: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                    margin: '20px 0',
                  }}
                >
                  <ThemeIcon size={56} radius="xl" color="gray" variant="light" style={{ margin: '0 auto 12px' }}>
                    <IconClock size={32} />
                  </ThemeIcon>
                  <Text fw={700} size="md">
                    No Activities Recorded For This Lead Yet
                  </Text>
                  <Text size="sm" c="dimmed" mt={4} mb="md" maw={420} mx="auto">
                    There are no activities matching your filter criteria for {selectedLead.name}.
                  </Text>
                  <Button size="xs" variant="default" radius="md" onClick={handleResetTimelineFilters}>
                    Clear Filters
                  </Button>
                </Paper>
              ) : (
                /* Date-Grouped Timeline Entries (Matching Reference) */
                <Box style={{ width: '100%', minWidth: 0 }}>
                  {groupedActivities.map((group, groupIdx) => (
                    <Box key={`${group.dateKey}-${groupIdx}`} mb={18} style={{ width: '100%', minWidth: 0 }}>
                      {/* Date Capsule Pill (Centered on the Left Vertical Track) */}
                      <Box
                        style={{
                          position: 'relative',
                          zIndex: 2,
                          display: 'flex',
                          alignItems: 'center',
                          margin: groupIdx === 0 ? '4px 0 14px' : '20px 0 14px',
                        }}
                      >
                        <Box
                          style={{
                            position: 'absolute',
                            left: 44,
                            transform: 'translateX(-50%)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3px 14px',
                            borderRadius: 20,
                            backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF',
                            border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'}`,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: isDark ? '#E2E8F0' : '#475569',
                            whiteSpace: 'nowrap',
                            zIndex: 3,
                          }}
                        >
                          {group.dateLabel}
                        </Box>
                        {/* Vertical spacer so card below does not overlap pill */}
                        <Box style={{ height: 22 }} />
                      </Box>

                      {/* Activities for this date */}
                      <Stack gap={16} style={{ width: '100%', minWidth: 0 }}>
                        {group.items.map((item, itemIdx) => {
                          const isGlobalFirst = groupIdx === 0 && itemIdx === 0;
                          const style = getActivityStyle(item.type);
                          const statusCfg = getActivityStatusConfig(item.status || style.label, isGlobalFirst);

                          return (
                            <Box
                              key={item.id ? `${item.id}-${itemIdx}` : `item-${groupIdx}-${itemIdx}`}
                              style={{
                                position: 'relative',
                                zIndex: 2,
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                minWidth: 0,
                              }}
                            >
                              {/* Node Bullet Dot on the Vertical Line */}
                              <Box
                                style={{
                                  position: 'absolute',
                                  left: 44,
                                  transform: 'translateX(-50%)',
                                  width: 15,
                                  height: 15,
                                  borderRadius: '50%',
                                  backgroundColor: isGlobalFirst ? '#FF5722' : isDark ? '#64748B' : '#CBD5E1',
                                  border: `2.5px solid ${isDark ? 'var(--mantine-color-dark-8)' : '#FFFFFF'}`,
                                  boxShadow: isGlobalFirst ? '0 0 0 3px rgba(255, 87, 34, 0.22)' : 'none',
                                  zIndex: 3,
                                  flexShrink: 0,
                                }}
                              />

                              {/* Horizontal Branch Connector Line */}
                              <Box
                                style={{
                                  position: 'absolute',
                                  left: 44,
                                  width: 32,
                                  height: 2.5,
                                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                                  zIndex: 1,
                                }}
                              />

                              {/* Activity Card */}
                              <Paper
                                px="lg"
                                py="md"
                                radius="xl"
                                withBorder
                                style={{
                                  marginLeft: 76,
                                  width: 'calc(100% - 88px)',
                                  maxWidth: 'calc(100% - 88px)',
                                  minWidth: 0,
                                  minHeight: 86,
                                  boxSizing: 'border-box',
                                  display: 'flex',
                                  alignItems: 'center',
                                  backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF',
                                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.boxShadow = isDark
                                    ? '0 6px 20px rgba(0, 0, 0, 0.35)'
                                    : '0 6px 18px rgba(0, 0, 0, 0.06)';
                                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.02)';
                                  e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
                                  e.currentTarget.style.transform = 'none';
                                }}
                              >
                                <Group justify="space-between" align="center" wrap="nowrap" gap="md" style={{ width: '100%', minWidth: 0 }}>
                                  {/* Left: Avatar/Icon Circle + Titles */}
                                  <Group gap="md" align="center" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                                    {/* Circle Icon Avatar (50px) */}
                                    <Box
                                      style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: '50%',
                                        backgroundColor: style.iconBg,
                                        color: style.iconColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {style.icon}
                                    </Box>

                                    {/* Titles & Details */}
                                    <Box style={{ minWidth: 0, flex: 1 }}>
                                      <Group gap="xs" align="center" wrap="wrap" style={{ minWidth: 0 }}>
                                        <Text
                                          fw={700}
                                          size="15px"
                                          style={{
                                            letterSpacing: '-0.01em',
                                            lineHeight: 1.35,
                                            minWidth: 0,
                                            wordBreak: 'break-word',
                                          }}
                                        >
                                          {item.title}
                                        </Text>
                                        {item.activityTime && (
                                          <Text size="12.5px" c="dimmed" fw={500} style={{ flexShrink: 0 }}>
                                            {item.activityTime}
                                          </Text>
                                        )}
                                      </Group>

                                      <Text
                                        size="13px"
                                        c="dimmed"
                                        mt={4}
                                        style={{
                                          lineHeight: 1.45,
                                          minWidth: 0,
                                          wordBreak: 'break-word',
                                          whiteSpace: 'pre-line',
                                        }}
                                      >
                                        {item.description || ''}
                                        {item.description && (item.customerName || item.performedBy) ? ' • ' : ''}
                                        {item.customerName ? `Client: ${item.customerName}` : ''}
                                        {item.performedBy ? ` (By ${item.performedBy})` : ''}
                                      </Text>
                                    </Box>
                                  </Group>

                                  {/* Right: Activity Status Pill Badge */}
                                  <Badge
                                    size="lg"
                                    radius="xl"
                                    variant="outline"
                                    style={{
                                      borderColor: statusCfg.border,
                                      color: statusCfg.color,
                                      backgroundColor: statusCfg.bg,
                                      fontWeight: 600,
                                      fontSize: 13,
                                      textTransform: 'none',
                                      padding: '0 16px',
                                      height: 34,
                                      flexShrink: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      transition: 'all 0.2s ease',
                                    }}
                                    leftSection={
                                      <Box
                                        style={{
                                          width: 7,
                                          height: 7,
                                          borderRadius: '50%',
                                          backgroundColor: statusCfg.dotColor,
                                        }}
                                      />
                                    }
                                  >
                                    {statusCfg.label}
                                  </Badge>
                                </Group>
                              </Paper>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  ))}
                </Box>
              )}
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Delete Confirmation Modal for Level 2 */}
      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={
          <Group gap="xs">
            <IconAlertTriangle color="#EF4444" size={20} />
            <Text fw={700}>Delete Lead Record</Text>
          </Group>
        }
        centered
        radius="lg"
      >
        <Text size="sm" c="dimmed" mb="lg">
          Are you sure you want to delete lead{' '}
          <Text span fw={700} c={isDark ? 'white' : 'dark'}>
            {deleteTarget?.name} ({deleteTarget?.leadId})
          </Text>
          ? This will remove the lead and all its associated timeline records. This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleConfirmDelete} loading={deleteLoading}>
            Delete Permanently
          </Button>
        </Group>
      </Modal>
    </Box>
  );
};

export default ActivityTimelinePage;
