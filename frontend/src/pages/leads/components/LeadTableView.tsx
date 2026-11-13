import React from 'react';
import {
  Table,
  Group,
  Text,
  Badge,
  ActionIcon,
  Paper,
  Stack,
  Center,
  Button,
  Tooltip,
  useComputedColorScheme,
  Box,
  Menu,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconTarget,
  IconPhoneCall,
  IconMail,
  IconBuilding,
  IconUser,
  IconUserCheck,
  IconUserX,
  IconUserPlus,
  IconCheck,
  IconChevronDown,
  IconCalendar,
  IconFileDescription,
  IconCalculator,
  IconScale,
  IconFileCheck,
  IconReceipt,
  IconCreditCard,
  IconRocket,
  IconSparkles,
  IconNotes,
  IconBrandWhatsapp,
  IconClock,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Lead } from '../../../types/lead';
import { useCRM } from '../../../context/CRMContext';
import { useLead } from '../../../context/LeadContext';
import { useEmployee } from '../../../context/EmployeeContext';
import { usePermissions } from '../../../context/AccessControlContext';

interface LeadTableViewProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onAddNew?: () => void;
  loading?: boolean;
}

export const LeadTableView: React.FC<LeadTableViewProps> = ({
  leads,
  onEdit,
  onUpdateLead,
  onDelete,
  onAddNew,
  loading = false,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { setActiveNav, currentUser } = useCRM();
  const { isSuperAdmin } = usePermissions();
  const { setSelectedLead, updateLead, fetchLeads, metadata } = useLead();
  const { employees } = useEmployee();
  const [assigningId, setAssigningId] = React.useState<string | null>(null);

  const canManageAssignee = Boolean(
    isSuperAdmin ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role?.toUpperCase() === 'SUPER_ADMIN' ||
    currentUser?.role?.toUpperCase() === 'SUPER ADMIN'
  );

  const canDeleteLead =
    isSuperAdmin ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role?.toUpperCase() === 'SUPER_ADMIN';

  // Submodule resolution helper: tracks lead progress across the 8 internal submodules
  const resolveLeadSubmoduleStage = (leadItem: Lead): { status: string; stage: string } => {
    const rawStatus = (leadItem.status || '').trim();
    const rawStage = (leadItem.stage || '').trim();
    const sLow = rawStatus.toLowerCase();
    const stgLow = rawStage.toLowerCase();

    // 1. Explicit Complete or Won
    if (
      sLow === 'complete' ||
      sLow === 'completed' ||
      sLow === 'won' ||
      sLow === 'closed won' ||
      stgLow === 'completed' ||
      stgLow === 'won'
    ) {
      return { status: 'Complete', stage: 'Completed' };
    }

    // 2. Check each submodule stage in pipeline order
    if (stgLow === 'handover') return { status: 'In Progress', stage: 'Handover' };
    if (stgLow === 'progress') return { status: 'In Progress', stage: 'Progress' };
    if (stgLow === 'payments' || stgLow === 'payment') return { status: 'In Progress', stage: 'Payments' };
    if (stgLow === 'invoices' || stgLow === 'invoice') return { status: 'In Progress', stage: 'Invoices' };
    if (stgLow === 'contracts' || stgLow === 'contract' || stgLow === 'decision making') return { status: 'In Progress', stage: 'Contracts' };
    if (stgLow === 'negotiation' || stgLow === 'negotiations' || stgLow.includes('negotiat')) return { status: 'In Progress', stage: 'Negotiation' };
    if (stgLow === 'quotations' || stgLow === 'quotation') return { status: 'In Progress', stage: 'Quotations' };
    if (stgLow === 'proposals' || stgLow === 'proposal') return { status: 'In Progress', stage: 'Proposals' };
    if (stgLow === 'meetings' || stgLow === 'meeting' || stgLow === 'discovery' || stgLow.includes('demo') || stgLow.includes('requirement')) {
      return { status: 'In Progress', stage: 'Meetings' };
    }

    // 3. Inspect deal data in localStorage if stage was unspecific or generic 'In Progress'
    if (typeof window !== 'undefined' && leadItem.id) {
      try {
        const saved = localStorage.getItem(`crm_lead_deal_${leadItem.id}`);
        if (saved) {
          const deal = JSON.parse(saved);
          if (deal?.handover && (deal.handover.handoverStatus === 'Completed' || deal.handover.status === 'Handover Completed')) {
            return { status: 'Complete', stage: 'Completed' };
          }
          if (deal?.handover || (deal?.progress?.overallPercentage === 100)) {
            return { status: 'In Progress', stage: 'Handover' };
          }
          if (deal?.progress?.overallPercentage > 50) {
            return { status: 'In Progress', stage: 'Progress' };
          }
          if (Array.isArray(deal?.payments) && deal.payments.length > 0) {
            return { status: 'In Progress', stage: 'Payments' };
          }
          if (Array.isArray(deal?.invoices) && deal.invoices.length > 0) {
            return { status: 'In Progress', stage: 'Invoices' };
          }
          if (deal?.contract && (deal.contract.status === 'Signed' || deal.contract.status === 'Under Review')) {
            return { status: 'In Progress', stage: 'Contracts' };
          }
          if (deal?.negotiation && (deal.negotiation.status === 'REVISED_QUOTATION' || deal.negotiation.status === 'AWAITING_CLIENT' || (deal.negotiation.history && deal.negotiation.history.length > 0))) {
            return { status: 'In Progress', stage: 'Negotiation' };
          }
          if (Array.isArray(deal?.quotations) && deal.quotations.some((q: any) => q.status === 'Sent' || q.status === 'Accepted')) {
            return { status: 'In Progress', stage: 'Quotations' };
          }
          if (Array.isArray(deal?.proposals) && deal.proposals.some((p: any) => p.status === 'Sent' || p.status === 'Accepted')) {
            return { status: 'In Progress', stage: 'Proposals' };
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 4. Brand new or newly qualified lead
    if (
      !rawStatus ||
      sLow === 'new' ||
      stgLow === 'initialization' ||
      stgLow === 'qualification' ||
      stgLow === 'new lead' ||
      stgLow === 'new'
    ) {
      return { status: 'New', stage: 'New Lead' };
    }

    // 5. Default in-progress pipeline fallback is the first pipeline submodule: Meetings!
    return {
      status: 'In Progress',
      stage: 'Meetings',
    };
  };

  const SUBMODULE_STAGES = [
    {
      stage: 'New Lead',
      status: 'New',
      icon: IconSparkles,
      color: '#0284C7',
      lightBg: '#F0F9FF',
      lightBorder: '#BAE6FD',
      darkBg: 'rgba(2, 132, 199, 0.16)',
      darkBorder: 'rgba(2, 132, 199, 0.35)',
      darkColor: '#7DD3FC',
    },
    {
      stage: 'Meetings',
      status: 'In Progress',
      icon: IconCalendar,
      color: '#2563EB',
      lightBg: '#EFF6FF',
      lightBorder: '#BFDBFE',
      darkBg: 'rgba(37, 99, 235, 0.16)',
      darkBorder: 'rgba(37, 99, 235, 0.35)',
      darkColor: '#93C5FD',
    },
    {
      stage: 'Proposals',
      status: 'In Progress',
      icon: IconFileDescription,
      color: '#7C3AED',
      lightBg: '#FAF5FF',
      lightBorder: '#DDD6FE',
      darkBg: 'rgba(124, 58, 237, 0.16)',
      darkBorder: 'rgba(124, 58, 237, 0.35)',
      darkColor: '#C4B5FD',
    },
    {
      stage: 'Quotations',
      status: 'In Progress',
      icon: IconCalculator,
      color: '#DB2777',
      lightBg: '#FDF2F8',
      lightBorder: '#FBCFE8',
      darkBg: 'rgba(219, 39, 119, 0.16)',
      darkBorder: 'rgba(219, 39, 119, 0.35)',
      darkColor: '#F472B6',
    },
    {
      stage: 'Negotiation',
      status: 'In Progress',
      icon: IconScale,
      color: '#D97706',
      lightBg: '#FFFBEB',
      lightBorder: '#FDE68A',
      darkBg: 'rgba(217, 119, 6, 0.16)',
      darkBorder: 'rgba(217, 119, 6, 0.35)',
      darkColor: '#FCD34D',
    },
    {
      stage: 'Contracts',
      status: 'In Progress',
      icon: IconFileCheck,
      color: '#059669',
      lightBg: '#ECFDF5',
      lightBorder: '#A7F3D0',
      darkBg: 'rgba(5, 150, 105, 0.16)',
      darkBorder: 'rgba(5, 150, 105, 0.35)',
      darkColor: '#6EE7B7',
    },
    {
      stage: 'Invoices',
      status: 'In Progress',
      icon: IconReceipt,
      color: '#4F46E5',
      lightBg: '#EEF2FF',
      lightBorder: '#C7D2FE',
      darkBg: 'rgba(79, 70, 229, 0.16)',
      darkBorder: 'rgba(79, 70, 229, 0.35)',
      darkColor: '#A5B4FC',
    },
    {
      stage: 'Payments',
      status: 'In Progress',
      icon: IconCreditCard,
      color: '#0D9488',
      lightBg: '#F0FDFA',
      lightBorder: '#99F6E4',
      darkBg: 'rgba(13, 148, 136, 0.16)',
      darkBorder: 'rgba(13, 148, 136, 0.35)',
      darkColor: '#5EEAD4',
    },
    {
      stage: 'Progress',
      status: 'In Progress',
      icon: IconRocket,
      color: '#EA580C',
      lightBg: '#FFF7ED',
      lightBorder: '#FED7AA',
      darkBg: 'rgba(234, 88, 12, 0.16)',
      darkBorder: 'rgba(234, 88, 12, 0.35)',
      darkColor: '#FDBA74',
    },
    {
      stage: 'Completed',
      status: 'Complete',
      icon: IconCheck,
      color: '#16A34A',
      lightBg: '#ECFDF5',
      lightBorder: '#A7F3D0',
      darkBg: 'rgba(22, 163, 74, 0.16)',
      darkBorder: 'rgba(22, 163, 74, 0.35)',
      darkColor: '#86EFAC',
    },
  ];

  const getSubmoduleConfig = (stageOrHeading?: string | null) => {
    const raw = (stageOrHeading || '').trim().toLowerCase();
    if (!raw) return SUBMODULE_STAGES[1]; // Meetings

    if (raw === 'proposals' || raw === 'proposal') {
      return SUBMODULE_STAGES.find((s) => s.stage === 'Proposals') || SUBMODULE_STAGES[2];
    }
    if (raw === 'quotations' || raw === 'quotation') {
      return SUBMODULE_STAGES.find((s) => s.stage === 'Quotations') || SUBMODULE_STAGES[3];
    }
    if (raw.includes('negotiat')) {
      return SUBMODULE_STAGES.find((s) => s.stage === 'Negotiation') || SUBMODULE_STAGES[4];
    }
    if (raw.includes('contract') || raw === 'decision making') {
      return SUBMODULE_STAGES.find((s) => s.stage === 'Contracts') || SUBMODULE_STAGES[5];
    }
    if (raw.includes('invoice')) {
      return SUBMODULE_STAGES.find((s) => s.stage === 'Invoices') || SUBMODULE_STAGES[6];
    }
    if (raw.includes('payment')) {
      return SUBMODULE_STAGES.find((s) => s.stage === 'Payments') || SUBMODULE_STAGES[7];
    }
    if (raw === 'progress') {
      return SUBMODULE_STAGES.find((s) => s.stage === 'Progress') || SUBMODULE_STAGES[8];
    }
    if (raw.includes('complete') || raw === 'won' || raw === 'closed won') {
      return SUBMODULE_STAGES.find((s) => s.stage === 'Completed') || SUBMODULE_STAGES[9];
    }
    if (raw.includes('new') || raw.includes('init') || raw.includes('qualif')) {
      return SUBMODULE_STAGES.find((s) => s.stage === 'New Lead') || SUBMODULE_STAGES[0];
    }
    if (raw === 'meetings' || raw === 'meeting' || raw === 'discovery' || raw.includes('demo') || raw.includes('requirement')) {
      return SUBMODULE_STAGES.find((s) => s.stage === 'Meetings') || SUBMODULE_STAGES[1];
    }

    return SUBMODULE_STAGES[1]; // Meetings
  };

  const STATUS_OPTIONS = ['New', 'In Progress', 'Completed', 'Lost'];

  const getStatusDotColor = (statusVal?: string | null) => {
    const s = (statusVal || '').toLowerCase();
    if (s.includes('unqual') || s.includes('disqual') || s.includes('lost') || s.includes('cancel')) {
      return '#EF4444';
    }
    if (s.includes('qualif') || s.includes('won') || s.includes('complete') || s.includes('active')) {
      return '#10B981';
    }
    if (s.includes('follow')) {
      return '#F59E0B';
    }
    if (s.includes('interest')) {
      return '#10B981';
    }
    if (s.includes('progress') || s.includes('contact')) {
      return '#0EA5E9';
    }
    if (s.includes('proposal') || s.includes('negotiat')) {
      return '#A855F7';
    }
    return '#3B82F6';
  };

  const handleUpdateStatus = async (lead: Lead, newStatus: string) => {
    try {
      const res = await updateLead(lead.id, { status: newStatus }, { silent: true });
      if (res.success) {
        notifications.show({
          title: 'Status Updated',
          message: `${lead.name}'s status changed to ${newStatus}`,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
        await fetchLeads();
      }
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update status',
        color: 'red',
      });
    }
  };

  const handleUpdateStage = async (lead: Lead, newStage: string) => {
    try {
      const newStatus =
        newStage === 'Completed'
          ? 'Complete'
          : newStage === 'New Lead'
          ? 'New'
          : 'In Progress';
      const res = await updateLead(lead.id, { stage: newStage, status: newStatus }, { silent: true });
      if (res.success) {
        notifications.show({
          title: 'Sub-Module Stage Updated',
          message: `${lead.name}'s pipeline stage set to ${newStage}`,
          color: 'indigo',
          icon: <IconCheck size={16} />,
        });
        await fetchLeads();
      }
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update stage',
        color: 'red',
      });
    }
  };

  const handleAssignLead = async (lead: Lead, emp: { id: string; name: string }) => {
    try {
      setAssigningId(lead.id);
      const res = await updateLead(
        lead.id,
        {
          assignedTo: emp.id,
          assignedToName: emp.name,
        },
        { silent: true }
      );
      if (res.success) {
        notifications.show({
          title: 'Lead Assigned',
          message: `${lead.name} has been assigned to ${emp.name}`,
          color: 'teal',
          icon: <IconUserCheck size={16} />,
        });
        await fetchLeads();
      }
    } catch (err: any) {
      notifications.show({
        title: 'Assignment Failed',
        message: err.message || 'Could not assign lead',
        color: 'red',
      });
    } finally {
      setAssigningId(null);
    }
  };

  const handleUnassignLead = async (lead: Lead) => {
    try {
      setAssigningId(lead.id);
      const res = await updateLead(
        lead.id,
        {
          assignedTo: null,
          assignedToName: null,
        },
        { silent: true }
      );
      if (res.success) {
        notifications.show({
          title: 'Assignment Removed',
          message: `Assignment removed for ${lead.name}`,
          color: 'blue',
          icon: <IconUserCheck size={16} />,
        });
        await fetchLeads();
      }
    } catch (err: any) {
      notifications.show({
        title: 'Failed',
        message: err.message || 'Could not remove assignment',
        color: 'red',
      });
    } finally {
      setAssigningId(null);
    }
  };

  const handleOpenLeadSchedule = (lead: Lead, forceTab?: 'schedule' | 'pipeline' | 'progress') => {
    setSelectedLead(lead);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('crm_selected_lead', JSON.stringify(lead));
      const { stage: effStage } = resolveLeadSubmoduleStage(lead);
      const stageMap: Record<string, string> = {
        meetings: 'meetings',
        proposals: 'proposals',
        quotations: 'quotations',
        negotiation: 'negotiation',
        contracts: 'contracts',
        invoices: 'invoices',
        payments: 'payments',
        progress: 'progress',
      };
      const targetSection = stageMap[effStage.toLowerCase()] || 'meetings';
      sessionStorage.setItem('crm_lead_active_section', targetSection);

      const isNew = !lead.status || lead.status.toLowerCase() === 'new';
      const targetTab = forceTab || (isNew ? 'schedule' : 'pipeline');
      sessionStorage.setItem('crm_schedule_tab', targetTab);
    }
    setActiveNav('lead-schedule');
  };


  // Helper to format activity timestamps nicely (e.g. "Today • 10:20 AM" or "Oct 31, 2026 • 05:00 PM")
  const formatActivityTimestamp = (dateStr?: string | null, timeStr?: string | null, isoStr?: string | null) => {
    if (!dateStr && !isoStr) return 'Recently';

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let rawDate = dateStr || (isoStr ? isoStr.slice(0, 10) : '');
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(rawDate)) {
      const parts = rawDate.split(/[-/]/);
      rawDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const targetDateStr = rawDate;

    let dayLabel = targetDateStr;
    if (targetDateStr === todayStr) {
      dayLabel = 'Today';
    } else if (targetDateStr === yesterdayStr) {
      dayLabel = 'Yesterday';
    } else if (targetDateStr) {
      try {
        const d = new Date(targetDateStr.includes('T') ? targetDateStr : `${targetDateStr}T12:00:00Z`);
        dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        dayLabel = targetDateStr;
      }
    }

    const finalTime = (timeStr && timeStr.trim()) || (isoStr ? new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '');
    if (finalTime) {
      return `${dayLabel} • ${finalTime}`;
    }
    return dayLabel;
  };

  const getActivityTypeDetails = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'meeting') {
      return { icon: <IconCalendar size={13} />, color: '#2563EB', bg: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF', label: 'Meeting' };
    }
    if (t === 'call') {
      return { icon: <IconPhoneCall size={13} />, color: '#10B981', bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5', label: 'Call' };
    }
    if (t === 'whatsapp') {
      return { icon: <IconBrandWhatsapp size={13} />, color: '#16A34A', bg: isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4', label: 'WhatsApp' };
    }
    if (t === 'email') {
      return { icon: <IconMail size={13} />, color: '#EA580C', bg: isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFF7ED', label: 'Email' };
    }
    if (t === 'proposal') {
      return { icon: <IconFileDescription size={13} />, color: '#7C3AED', bg: isDark ? 'rgba(124, 58, 237, 0.15)' : '#FAF5FF', label: 'Proposal' };
    }
    if (t === 'quotation') {
      return { icon: <IconCalculator size={13} />, color: '#DB2777', bg: isDark ? 'rgba(219, 39, 119, 0.15)' : '#FDF2F8', label: 'Quotation' };
    }
    if (t === 'contract') {
      return { icon: <IconFileCheck size={13} />, color: '#059669', bg: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5', label: 'Contract' };
    }
    if (t === 'invoice') {
      return { icon: <IconReceipt size={13} />, color: '#4F46E5', bg: isDark ? 'rgba(79, 70, 229, 0.15)' : '#EEF2FF', label: 'Invoice' };
    }
    if (t === 'payment') {
      return { icon: <IconCreditCard size={13} />, color: '#0D9488', bg: isDark ? 'rgba(13, 148, 136, 0.15)' : '#F0FDFA', label: 'Payment' };
    }
    if (t === 'qualification') {
      return { icon: <IconUserCheck size={13} />, color: '#0284C7', bg: isDark ? 'rgba(2, 132, 199, 0.15)' : '#F0F9FF', label: 'Qualification' };
    }
    if (t === 'note') {
      return { icon: <IconNotes size={13} />, color: '#D97706', bg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FFFBEB', label: 'Note' };
    }
    return { icon: <IconSparkles size={13} />, color: '#6366F1', bg: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF', label: 'Activity' };
  };

  const formatMeetingScheduleDateTime = (dateStr?: string | null, timeStr?: string | null) => {
    if (!dateStr) return timeStr || '';
    let rawDate = dateStr.trim();
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(rawDate)) {
      const parts = rawDate.split(/[-/]/);
      rawDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    let datePart = rawDate;
    try {
      const d = new Date(rawDate.includes('T') ? rawDate : `${rawDate}T12:00:00Z`);
      if (!isNaN(d.getTime())) {
        datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {}

    if (timeStr && timeStr.trim()) {
      return `${datePart} • ${timeStr.trim()}`;
    }
    return datePart;
  };

  const formatFollowUpDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    let rawDate = dateStr.trim();
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(rawDate)) {
      const parts = rawDate.split(/[-/]/);
      rawDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    try {
      const d = new Date(rawDate.includes('T') ? rawDate : `${rawDate}T12:00:00Z`);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatLastActivityTitle = (act: any) => {
    const t = (act.type || '').toLowerCase();
    const status = act.status ? String(act.status).trim() : '';
    const direction = act.direction || 'Outgoing';

    if (t === 'meeting') {
      return status ? `Meeting: ${status}` : 'Meeting: Scheduled';
    }

    if (t === 'call') {
      return status ? `Call: ${direction} - ${status}` : `Call: ${direction}`;
    }

    if (t === 'email') {
      return status ? `Email: ${direction} - ${status}` : `Email: ${direction}`;
    }

    if (t === 'whatsapp') {
      return status ? `WhatsApp: ${direction} - ${status}` : `WhatsApp: ${direction}`;
    }

    let displayTitle = act.title || 'Activity';
    if (displayTitle.startsWith('EMAIL: ')) {
      displayTitle = 'Email: ' + displayTitle.slice(7);
    } else if (displayTitle.startsWith('WHATSAPP: ')) {
      displayTitle = 'WhatsApp: ' + displayTitle.slice(10);
    } else if (displayTitle.startsWith('CALL: ')) {
      displayTitle = 'Call: ' + displayTitle.slice(6);
    }
    return status && !displayTitle.toLowerCase().includes(status.toLowerCase())
      ? `${displayTitle} - ${status}`
      : displayTitle;
  };

  const renderLastActivity = (lead: Lead) => {
    const act = lead.lastActivity;
    if (!act) {
      return (
        <Text size="xs" c="dimmed">
          No activity yet
        </Text>
      );
    }

    const { icon, color, bg } = getActivityTypeDetails(act.type);
    const displayTitle = formatLastActivityTitle(act);
    const timeDisplay = formatActivityTimestamp(act.date, act.time, act.updatedAt || act.createdAt);
    const isMeeting = (act.type || '').toLowerCase() === 'meeting';
    const isFollowUp = /follow/i.test(act.status || '') || /follow/i.test(displayTitle);
    const effectiveFollowUpDate = act.followUpDate || act.nextFollowDate || (act as any).metadata?.nextFollowDate || (lead as any).nextFollowDate;

    return (
      <Stack gap={2} style={{ minWidth: 'max-content', maxWidth: 280 }}>
        <Group gap={6} wrap="nowrap" align="center">
          <Box
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Text
            size="xs"
            fw={600}
            style={{
              color: isDark ? '#E2E8F0' : '#1E293B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={displayTitle}
          >
            {displayTitle}
          </Text>
        </Group>

        {/* Follow up date badge (shown across ALL contact modes when status is Follow-up) */}
        {isFollowUp && effectiveFollowUpDate && (
          <Group gap={4} wrap="nowrap" align="center" style={{ paddingLeft: 28, marginTop: 2 }}>
            <Badge
              size="xs"
              variant="light"
              color="orange"
              leftSection={<IconCalendar size={11} />}
              styles={{
                root: {
                  textTransform: 'none',
                  height: 20,
                  paddingLeft: 6,
                  paddingRight: 8,
                  width: 'auto',
                  maxWidth: 'none',
                  backgroundColor: isDark ? 'rgba(234, 88, 12, 0.18)' : '#FFF7ED',
                  color: isDark ? '#FDBA74' : '#C2410C',
                  border: isDark ? '1px solid rgba(253, 186, 116, 0.25)' : '1px solid #FED7AA',
                  flexShrink: 0,
                },
                label: {
                  fontWeight: 600,
                  fontSize: 11,
                  overflow: 'visible',
                  textOverflow: 'clip',
                  whiteSpace: 'nowrap',
                },
              }}
            >
              Follow-up: {formatFollowUpDate(effectiveFollowUpDate)}
            </Badge>
          </Group>
        )}

        {/* Meeting scheduled date & time (shown ONLY when meeting is scheduled and NOT follow-up) */}
        {isMeeting && !isFollowUp && (act.date || act.time) && (
          <Group gap={4} wrap="nowrap" align="center" style={{ paddingLeft: 28, marginTop: 2 }}>
            <Badge
              size="xs"
              variant="light"
              color="blue"
              leftSection={<IconCalendar size={11} />}
              styles={{
                root: {
                  textTransform: 'none',
                  height: 20,
                  paddingLeft: 6,
                  paddingRight: 8,
                  width: 'auto',
                  maxWidth: 'none',
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.18)' : '#EFF6FF',
                  color: isDark ? '#93C5FD' : '#1D4ED8',
                  border: isDark ? '1px solid rgba(147, 197, 253, 0.25)' : '1px solid #BFDBFE',
                  flexShrink: 0,
                },
                label: {
                  fontWeight: 600,
                  fontSize: 11,
                  overflow: 'visible',
                  textOverflow: 'clip',
                  whiteSpace: 'nowrap',
                },
              }}
            >
              {formatMeetingScheduleDateTime(act.date, act.time)}
            </Badge>
          </Group>
        )}
      </Stack>
    );
  };

  // Sleek Modern STATUS Badge strictly displaying New, In Progress, Completed, or Lost
  const renderStatusBadge = (statusVal?: string | null, stageVal?: string | null) => {
    let raw = (statusVal || stageVal || 'New').trim();
    const sLow = raw.toLowerCase();
    let normalized = 'New';
    if (sLow.includes('lost') || sLow.includes('disqual') || sLow.includes('unqual') || sLow.includes('cancel')) {
      normalized = 'Lost';
    } else if (sLow.includes('complete') || sLow.includes('won') || sLow.includes('closed won')) {
      normalized = 'Completed';
    } else if (
      sLow.includes('progress') ||
      sLow.includes('follow') ||
      sLow.includes('interest') ||
      sLow.includes('proposal') ||
      sLow.includes('negotiat') ||
      sLow.includes('contact') ||
      sLow.includes('active')
    ) {
      normalized = 'In Progress';
    } else {
      normalized = 'New';
    }

    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (normalized === 'Lost') {
      bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#DC2626';
      border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
    } else if (normalized === 'Completed') {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    } else if (normalized === 'In Progress') {
      bg = isDark ? 'rgba(14, 165, 233, 0.16)' : '#F0F9FF';
      color = isDark ? '#7DD3FC' : '#0284C7';
      border = isDark ? 'rgba(14, 165, 233, 0.35)' : '#BAE6FD';
    } else {
      // New
      bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
      color = isDark ? '#93C5FD' : '#1D4ED8';
      border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';
    }

    return (
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 12px',
          borderRadius: 100,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        {normalized}
      </Box>
    );
  };

  // Premium Modern ASSIGNEE Badge / Interactive User Chip
  const renderAssigneeBadge = (lead: Lead) => {
    if (lead.assignedToName) {
      const initial = lead.assignedToName.trim().charAt(0).toUpperCase();
      return (
        <Box
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: canManageAssignee ? '3px 10px 3px 4px' : '3px 12px 3px 4px',
            borderRadius: 100,
            background: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
            border: isDark ? '1px solid rgba(99, 102, 241, 0.28)' : '1px solid #E0E7FF',
            cursor: canManageAssignee ? 'pointer' : 'default',
            transition: 'all 0.18s ease',
            userSelect: 'none',
          }}
        >
          <Box
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)',
              flexShrink: 0,
            }}
          >
            {initial}
          </Box>
          <Text
            size="12px"
            fw={600}
            style={{
              color: isDark ? '#C7D2FE' : '#3730A3',
              whiteSpace: 'nowrap',
              maxWidth: 130,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {lead.assignedToName}
          </Text>
          {canManageAssignee && (
            <IconChevronDown
              size={11}
              style={{
                opacity: 0.65,
                color: isDark ? '#A5B4FC' : '#4F46E5',
                marginLeft: 1,
              }}
            />
          )}
        </Box>
      );
    }

    if (!canManageAssignee) {
      return (
        <Box
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 100,
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            userSelect: 'none',
          }}
        >
          <Text size="11px" fw={500} c="dimmed">
            Unassigned
          </Text>
        </Box>
      );
    }

    return (
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 11px 3px 5px',
          borderRadius: 100,
          background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
          border: isDark ? '1px dashed rgba(255, 255, 255, 0.2)' : '1px dashed #CBD5E1',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          userSelect: 'none',
        }}
      >
        <Box
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#94A3B8' : '#64748B',
            flexShrink: 0,
          }}
        >
          <IconUserPlus size={12} stroke={2} />
        </Box>
        <Text
          size="11px"
          fw={600}
          style={{
            color: isDark ? '#94A3B8' : '#64748B',
            whiteSpace: 'nowrap',
          }}
        >
          Assign Lead
        </Text>
      </Box>
    );
  };

  const formatLastUpdate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (!loading && leads.length === 0) {
    return (
      <Paper
        p="3.5rem"
        style={{
          borderRadius: 12,
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          textAlign: 'center',
          marginTop: 12,
        }}
      >
        <Center>
          <Stack align="center" gap="sm">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: isDark ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#818CF8' : '#4F46E5',
              }}
            >
              <IconTarget size={32} stroke={1.8} />
            </Box>
            <Text fw={700} size="lg" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
              No Leads Found
            </Text>
            <Text size="sm" c="dimmed" style={{ maxWidth: 420 }}>
              No lead records match your current view or filter criteria.
            </Text>
            {onAddNew && (
              <Button
                mt="xs"
                radius="md"
                leftSection={<IconTarget size={16} />}
                onClick={onAddNew}
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                }}
              >
                + Add Lead
              </Button>
            )}
          </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <>
      {/* DESKTOP / TABLET VIEW: Full Table Container matching Contacts Design */}
      <Paper
        visibleFrom="sm"
        style={{
          borderRadius: 12,
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 1px 4px rgba(0, 0, 0, 0.03)',
          marginTop: 12,
        }}
      >
        <Table.ScrollContainer minWidth={920}>
          <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
            <Table.Thead
              style={{
                background: isDark ? '#0F172A' : '#FBFBFC',
                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
              }}
            >
              <Table.Tr>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  LEAD NAME
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  COMPANY / PROFESSION
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  CONTACT INFO
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  ASSIGNED TO
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  STATUS
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', minWidth: 220 }}>
                  LAST ACTIVITY
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                  ACTIONS
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {leads.map((lead) => {
                return (
                <Table.Tr
                  key={lead.id}
                  style={{
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                    borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                  }}
                  onClick={() => handleOpenLeadSchedule(lead)}
                >
                  {/* 1. Lead Name */}
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Box
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: isDark ? '#1E3A8A' : '#EFF6FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isDark ? '#93C5FD' : '#2563EB',
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
                      </Box>
                      <Text
                        fw={700}
                        size="sm"
                        style={{
                          color: isDark ? '#F9FAFB' : '#0F172A',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {lead.name}
                      </Text>
                    </Group>
                  </Table.Td>

                  {/* 2. Company / Profession */}
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      {lead.companyName ? (
                        <IconBuilding size={14} color="#64748B" />
                      ) : (
                        <IconUser size={14} color="#64748B" />
                      )}
                      <Text size="sm" fw={500}>
                        {lead.companyName || lead.profession || 'Individual'}
                      </Text>
                    </Group>
                  </Table.Td>

                  {/* 3. Contact Info */}
                  <Table.Td>
                    <Stack gap={2}>
                      {lead.phone && (
                        <Group gap={6} wrap="nowrap">
                          <IconPhoneCall size={14} color="#10B981" />
                          <Text size="xs" fw={500}>
                            {lead.phone}
                          </Text>
                        </Group>
                      )}
                      {lead.email && (
                        <Group gap={6} wrap="nowrap">
                          <IconMail size={14} color="#3B82F6" />
                          <Text size="xs" style={{ color: '#2563EB' }}>
                            {lead.email}
                          </Text>
                        </Group>
                      )}
                      {!lead.phone && !lead.email && (
                        <Text size="xs" c="dimmed">
                          No contact details
                        </Text>
                      )}
                    </Stack>
                  </Table.Td>

                  {/* 4. Assigned To (Redesigned Modern Avatar Chip) */}
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    {canManageAssignee ? (
                      <Menu shadow="md" width={260} position="bottom-start" withinPortal radius="md">
                        <Menu.Target>
                          <Tooltip label="Click to assign or reassign employee" withArrow>
                            <Box style={{ display: 'inline-block' }}>
                              {renderAssigneeBadge(lead)}
                            </Box>
                          </Tooltip>
                        </Menu.Target>

                        <Menu.Dropdown p="xs" style={{ maxHeight: 300, overflowY: 'auto' }}>
                          <Menu.Label>Assign Lead to Team Member</Menu.Label>
                          {employees && employees.length > 0 ? (
                            employees.map((emp) => {
                              const isCurrent =
                                lead.assignedTo === emp.id ||
                                lead.assignedToName === emp.name;
                              const empInitial = emp.name.trim().charAt(0).toUpperCase();
                              return (
                                <Menu.Item
                                  key={emp.id}
                                  leftSection={
                                    <Box
                                      style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: isCurrent
                                          ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                                          : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                                        color: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 11,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {empInitial}
                                    </Box>
                                  }
                                  rightSection={
                                    isCurrent ? (
                                      <Badge size="xs" color="teal" variant="light">
                                        Assigned
                                      </Badge>
                                    ) : undefined
                                  }
                                  onClick={() => handleAssignLead(lead, emp)}
                                >
                                  <Box>
                                    <Text size="13px" fw={isCurrent ? 700 : 500}>
                                      {emp.name}
                                    </Text>
                                    {emp.designation && (
                                      <Text size="10px" c="dimmed">
                                        {emp.designation}
                                      </Text>
                                    )}
                                  </Box>
                                </Menu.Item>
                              );
                            })
                          ) : (
                            <Menu.Item disabled>No employees available</Menu.Item>
                          )}

                          {lead.assignedToName && (
                            <>
                              <Menu.Divider />
                              <Menu.Item
                                color="red"
                                leftSection={<IconUserX size={14} />}
                                onClick={() => handleUnassignLead(lead)}
                              >
                                Remove Assignment
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    ) : (
                      <Box style={{ display: 'inline-block' }}>
                        {renderAssigneeBadge(lead)}
                      </Box>
                    )}
                  </Table.Td>

                  {/* 5. Status */}
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Menu shadow="md" width={170} position="bottom-start" withinPortal radius="md">
                      <Menu.Target>
                        <Tooltip label="Click to change status" withArrow>
                          <Box style={{ display: 'inline-block', cursor: 'pointer' }}>
                            <Stack gap={4} align="flex-start">
                              {renderStatusBadge(lead.status, lead.stage)}
                              {lead.stage && (
                                <Text size="11px" c="dimmed" style={{ paddingLeft: 4 }}>
                                  {lead.stage?.toLowerCase() === 'qualification' ? 'Initialization' : lead.stage}
                                </Text>
                              )}
                            </Stack>
                          </Box>
                        </Tooltip>
                      </Menu.Target>
                      <Menu.Dropdown p="xs">
                        <Menu.Label>Change Status</Menu.Label>
                        {STATUS_OPTIONS.map((statusOpt) => {
                          const sL = (lead.status || 'New').toLowerCase();
                          let curNorm = 'New';
                          if (sL.includes('lost') || sL.includes('disqual') || sL.includes('cancel')) curNorm = 'Lost';
                          else if (sL.includes('complete') || sL.includes('won')) curNorm = 'Completed';
                          else if (sL.includes('progress') || sL.includes('follow') || sL.includes('interest') || sL.includes('proposal') || sL.includes('contact') || sL.includes('active')) curNorm = 'In Progress';
                          const isCurrent = curNorm === statusOpt;
                          return (
                            <Menu.Item
                              key={statusOpt}
                              leftSection={
                                <Box
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: getStatusDotColor(statusOpt),
                                  }}
                                />
                              }
                              rightSection={isCurrent ? <IconCheck size={14} color="#10B981" /> : undefined}
                              onClick={() => handleUpdateStatus(lead, statusOpt)}
                            >
                              <Text size="13px" fw={isCurrent ? 700 : 500}>
                                {statusOpt}
                              </Text>
                            </Menu.Item>
                          );
                        })}
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>

                  {/* 6. Last Activity */}
                  <Table.Td style={{ minWidth: 220 }} onClick={(e) => e.stopPropagation()}>
                    {renderLastActivity(lead)}
                  </Table.Td>

                  {/* 5. Actions */}
                  <Table.Td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <Group gap={6} justify="flex-end" wrap="nowrap">
                      <Tooltip label="Update Lead" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="teal"
                          size="md"
                          radius="md"
                          onClick={() => (onUpdateLead ? onUpdateLead(lead) : onEdit(lead))}
                        >
                          <IconNotes size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Edit Lead" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="indigo"
                          size="md"
                          radius="md"
                          onClick={() => onEdit(lead)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {canDeleteLead && (
                        <Tooltip label="Delete Lead" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="md"
                            radius="md"
                            onClick={() => onDelete(lead)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {/* MOBILE VIEW: Responsive Touch Cards List */}
      <Stack hiddenFrom="sm" gap="sm" mt="md">
        {leads.map((lead) => {
          return (
          <Paper
            key={lead.id}
            p="md"
            radius="14px"
            style={{
              background: isDark ? '#111827' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            {/* Header: Avatar, Name & Status */}
            <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs">
              <Group
                gap="sm"
                wrap="nowrap"
                style={{ cursor: 'pointer', flex: 1 }}
                onClick={() => handleOpenLeadSchedule(lead)}
              >
                <Box
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: isDark ? '#14532D' : '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? '#86EFAC' : '#15803D',
                    fontWeight: 700,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
                </Box>
                <Box style={{ overflow: 'hidden' }}>
                  <Text fw={700} size="14px" truncate style={{ color: isDark ? '#F9FAFB' : '#0F172A' }}>
                    {lead.name}
                  </Text>
                </Box>
              </Group>

              <Box onClick={(e) => e.stopPropagation()}>
                <Menu shadow="md" width={170} position="bottom-end" withinPortal radius="md">
                  <Menu.Target>
                    <Box style={{ display: 'inline-block', cursor: 'pointer' }}>
                      {renderStatusBadge(lead.status, lead.stage)}
                    </Box>
                  </Menu.Target>
                  <Menu.Dropdown p="xs">
                    <Menu.Label>Change Status</Menu.Label>
                    {STATUS_OPTIONS.map((statusOpt) => {
                      const sL = (lead.status || 'New').toLowerCase();
                      let curNorm = 'New';
                      if (sL.includes('lost') || sL.includes('disqual') || sL.includes('cancel')) curNorm = 'Lost';
                      else if (sL.includes('complete') || sL.includes('won')) curNorm = 'Completed';
                      else if (sL.includes('progress') || sL.includes('follow') || sL.includes('interest') || sL.includes('proposal') || sL.includes('contact') || sL.includes('active')) curNorm = 'In Progress';
                      const isCurrent = curNorm === statusOpt;
                      return (
                        <Menu.Item
                          key={statusOpt}
                          leftSection={
                            <Box
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: getStatusDotColor(statusOpt),
                              }}
                            />
                          }
                          rightSection={isCurrent ? <IconCheck size={14} color="#10B981" /> : undefined}
                          onClick={() => handleUpdateStatus(lead, statusOpt)}
                        >
                          <Text size="13px" fw={isCurrent ? 700 : 500}>
                            {statusOpt}
                          </Text>
                        </Menu.Item>
                      );
                    })}
                  </Menu.Dropdown>
                </Menu>
              </Box>
            </Group>

            {/* Assigned To Row in Mobile */}
            <Group justify="space-between" align="center" wrap="nowrap" mb="xs" onClick={(e) => e.stopPropagation()}>
              <Text size="xs" c="dimmed">Assigned To:</Text>
              {canManageAssignee ? (
                <Menu shadow="md" width={240} position="bottom-end" withinPortal radius="md">
                  <Menu.Target>
                    <Box style={{ display: 'inline-block' }}>
                      {renderAssigneeBadge(lead)}
                    </Box>
                  </Menu.Target>
                  <Menu.Dropdown p="xs" style={{ maxHeight: 280, overflowY: 'auto' }}>
                    <Menu.Label>Assign Lead to Team Member</Menu.Label>
                    {employees && employees.length > 0 ? (
                      employees.map((emp) => {
                        const isCurrent = lead.assignedTo === emp.id || lead.assignedToName === emp.name;
                        const empInitial = emp.name.trim().charAt(0).toUpperCase();
                        return (
                          <Menu.Item
                            key={emp.id}
                            leftSection={
                              <Box
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: isCurrent
                                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                                    : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                {empInitial}
                              </Box>
                            }
                            rightSection={isCurrent ? <Badge size="xs" color="teal" variant="light">Assigned</Badge> : undefined}
                            onClick={() => handleAssignLead(lead, emp)}
                          >
                            <Text size="13px" fw={isCurrent ? 700 : 500}>{emp.name}</Text>
                          </Menu.Item>
                        );
                      })
                    ) : (
                      <Menu.Item disabled>No employees available</Menu.Item>
                    )}
                    {lead.assignedToName && (
                      <>
                        <Menu.Divider />
                        <Menu.Item color="red" leftSection={<IconUserX size={14} />} onClick={() => handleUnassignLead(lead)}>
                          Remove Assignment
                        </Menu.Item>
                      </>
                    )}
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <Box style={{ display: 'inline-block' }}>
                  {renderAssigneeBadge(lead)}
                </Box>
              )}
            </Group>

            {/* Last Activity in Mobile */}
            {lead.lastActivity && (
              <Stack gap={2} mb="xs">
                <Group gap={6} align="center" wrap="wrap">
                  <Text size="xs" c="dimmed">Last Activity:</Text>
                  <Text size="xs" fw={600} style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
                    {formatLastActivityTitle(lead.lastActivity)}
                  </Text>
                  {((/follow/i.test(lead.lastActivity.status || '') || /follow/i.test(lead.lastActivity.title || '')) && (lead.lastActivity.followUpDate || lead.lastActivity.nextFollowDate || (lead as any).nextFollowDate)) ? (
                    <Badge
                      size="xs"
                      variant="light"
                      color="orange"
                      leftSection={<IconCalendar size={10} />}
                      styles={{
                        root: {
                          textTransform: 'none',
                          height: 18,
                          paddingLeft: 6,
                          paddingRight: 8,
                          backgroundColor: isDark ? 'rgba(234, 88, 12, 0.18)' : '#FFF7ED',
                          color: isDark ? '#FDBA74' : '#C2410C',
                          border: isDark ? '1px solid rgba(253, 186, 116, 0.25)' : '1px solid #FED7AA',
                          flexShrink: 0,
                        },
                        label: { fontWeight: 600, fontSize: 10, overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' },
                      }}
                    >
                      Follow-up: {formatFollowUpDate(lead.lastActivity.followUpDate || lead.lastActivity.nextFollowDate || (lead as any).nextFollowDate)}
                    </Badge>
                  ) : ((lead.lastActivity.type || '').toLowerCase() === 'meeting' && (lead.lastActivity.date || lead.lastActivity.time) ? (
                    <Badge
                      size="xs"
                      variant="light"
                      color="blue"
                      leftSection={<IconCalendar size={10} />}
                      styles={{
                        root: {
                          textTransform: 'none',
                          height: 18,
                          paddingLeft: 6,
                          paddingRight: 8,
                          backgroundColor: isDark ? 'rgba(37, 99, 235, 0.18)' : '#EFF6FF',
                          color: isDark ? '#93C5FD' : '#1D4ED8',
                          border: isDark ? '1px solid rgba(147, 197, 253, 0.25)' : '1px solid #BFDBFE',
                          flexShrink: 0,
                        },
                        label: { fontWeight: 600, fontSize: 10, overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' },
                      }}
                    >
                      {formatMeetingScheduleDateTime(lead.lastActivity.date, lead.lastActivity.time)}
                    </Badge>
                  ) : null)}
                </Group>
              </Stack>
            )}

            {/* Company / Profession & Stage */}
            <Group justify="space-between" align="center" wrap="wrap" gap="xs" mb="xs">
              <Group gap={6} wrap="nowrap">
                {lead.companyName ? (
                  <IconBuilding size={14} color="#64748B" />
                ) : (
                  <IconUser size={14} color="#64748B" />
                )}
                <Text size="xs" fw={500} style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                  {lead.companyName || lead.profession || 'Individual'}
                </Text>
              </Group>

              {lead.stage && (
                <Badge variant="outline" size="xs" color="gray" style={{ textTransform: 'none' }}>
                  {lead.stage?.toLowerCase() === 'qualification' ? 'Initialization' : lead.stage}
                </Badge>
              )}
            </Group>

            {/* Contact Chips */}
            <Group gap="xs" wrap="wrap" mb="sm">
              {lead.phone && (
                <Button
                  component="a"
                  href={`tel:${lead.phone}`}
                  size="compact-xs"
                  variant="light"
                  color="teal"
                  leftSection={<IconPhoneCall size={12} />}
                  style={{ borderRadius: 6, fontWeight: 500 }}
                >
                  {lead.phone}
                </Button>
              )}
              {lead.email && (
                <Button
                  component="a"
                  href={`mailto:${lead.email}`}
                  size="compact-xs"
                  variant="light"
                  color="blue"
                  leftSection={<IconMail size={12} />}
                  style={{ borderRadius: 6, fontWeight: 500 }}
                >
                  {lead.email}
                </Button>
              )}
            </Group>

            {/* Action Bar */}
            <Group
              justify="flex-end"
              pt="xs"
              style={{
                borderTop: isDark ? '1px solid #1F2937' : '1px solid #F1F5F9',
              }}
            >
              <Group gap={6}>
                <ActionIcon
                  variant="subtle"
                  color="teal"
                  size="md"
                  radius="md"
                  onClick={() => (onUpdateLead ? onUpdateLead(lead) : onEdit(lead))}
                  title="Update Lead"
                >
                  <IconNotes size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="md"
                  radius="md"
                  onClick={() => onEdit(lead)}
                  title="Edit Lead"
                >
                  <IconEdit size={16} />
                </ActionIcon>
                {canDeleteLead && (
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="md"
                    radius="md"
                    onClick={() => onDelete(lead)}
                    title="Delete Lead"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
          </Paper>
          );
        })}
      </Stack>
    </>
  );
};

export default LeadTableView;
