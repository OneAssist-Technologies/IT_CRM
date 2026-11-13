import React, { useState, useEffect, useRef } from 'react';
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
  UnstyledButton,
  Menu,
  Loader,
  SimpleGrid,
  ScrollArea,
  TextInput,
  ThemeIcon,
  Divider,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconEdit,
  IconTrash,
  IconUserPlus,
  IconUserCheck,
  IconUserX,
  IconChevronDown,
  IconBrandLinkedin,
  IconWorld,
  IconShare,
  IconPhoneCall,
  IconUsers,
  IconBuilding,
  IconPhone,
  IconMail,
  IconBrandWhatsapp,
  IconShieldCheck,
  IconTargetArrow,
  IconUser,
  IconCalendar,
  IconArrowRight,
  IconTag,
  IconCheck,
  IconChevronRight,
  IconNotes,
  IconCalendarTime,
  IconMapPin,
  IconClock,
} from '@tabler/icons-react';
import { Contact } from '../../../types/contact';
import { useContact } from '../../../context/ContactContext';
import { useCRM } from '../../../context/CRMContext';
import { useEmployee } from '../../../context/EmployeeContext';
import { usePermissions } from '../../../context/AccessControlContext';

export type ContactTableActiveTab = 'BULK_IMPORT' | 'NEW' | 'ASSIGNED';

interface ContactTableViewProps {
  contacts: Contact[];
  activeTab?: ContactTableActiveTab;
  onView: (contact: Contact) => void;
  onRowClick?: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onAddNew: () => void;
  onQualify?: (contact: Contact) => void;
  loading?: boolean;
  onTabChange?: (tab: ContactTableActiveTab) => void;
  onContactUpdated?: (contact: Contact) => void;
}

export const ContactTableView: React.FC<ContactTableViewProps> = ({
  contacts,
  activeTab,
  onView,
  onRowClick,
  onEdit,
  onDelete,
  onAddNew,
  onQualify,
  loading = false,
  onTabChange,
  onContactUpdated,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const isMobile = useMediaQuery('(max-width: 820px)');
  const { setActiveNav, currentUser } = useCRM();
  const { setSelectedContact, metadata, assignContact, updateContact } = useContact();
  const [updatingPriorityId, setUpdatingPriorityId] = useState<string | null>(null);

  // Accordion expansion state: single click toggles row details, double click opens edit form
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatDisplayDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleRowClick = (contact: Contact) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      const targetId = contact.id || contact.contactId || '';
      setExpandedId((prev) => (prev === targetId ? null : targetId));
      clickTimerRef.current = null;
    }, 250);
  };

  const handleRowDoubleClick = (contact: Contact) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onEdit(contact);
  };

  const getContactModeInfo = (contact: Contact) => {
    const rawMode = (contact.contactMode || (contact as any).mode || '').trim();
    let mode = rawMode;

    if (!mode) {
      if (contact.meetingDate || contact.meetingTitle || (contact as any).meetingType) {
        mode = 'Meeting';
      } else if (contact.whatsappDate || (contact as any).whatsappStatus) {
        mode = 'WhatsApp';
      } else if (contact.emailDate || (contact as any).emailStatus) {
        mode = 'Email';
      } else if (
        contact.callDate ||
        contact.callStatus ||
        (contact as any).callType ||
        Boolean(contact.phone) ||
        (contact as any).isBulkImport
      ) {
        mode = 'Call';
      } else {
        return null;
      }
    }

    const modeLow = mode.toLowerCase();
    if (modeLow === 'meeting') {
      return {
        label: 'Meeting',
        color: 'grape',
        icon: <IconCalendar size={12} />,
      };
    }
    if (modeLow === 'whatsapp') {
      return {
        label: 'WhatsApp',
        color: 'teal',
        icon: <IconBrandWhatsapp size={12} />,
      };
    }
    if (modeLow === 'email') {
      return {
        label: 'Email',
        color: 'indigo',
        icon: <IconMail size={12} />,
      };
    }
    if (modeLow === 'other' || modeLow === 'others') {
      return {
        label: 'Other',
        color: 'gray',
        icon: <IconNotes size={12} />,
      };
    }
    return {
      label: 'Call',
      color: 'blue',
      icon: <IconPhoneCall size={12} />,
    };
  };

  const handleUpdatePriority = async (contact: Contact, newPriority: string) => {
    try {
      const contactTargetId = contact.id || contact.contactId;
      if (!contactTargetId) return;
      setUpdatingPriorityId(contactTargetId);
      const res = await updateContact(contactTargetId, {
        priority: newPriority,
        tagPriority: newPriority,
      });
      if (res && res.success && res.data) {
        onContactUpdated?.(res.data);
      }
    } catch (err) {
      console.error('Failed to update priority:', err);
    } finally {
      setUpdatingPriorityId(null);
    }
  };
  const { employees: contextEmployees, fetchEmployees } = useEmployee();
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!contextEmployees || contextEmployees.length === 0) {
      fetchEmployees();
    }
  }, []);

  const availableEmployees =
    contextEmployees && contextEmployees.length > 0
      ? contextEmployees
      : (metadata?.employees || []);

  const roleUpper = (currentUser?.role || '').toUpperCase().trim();
  const emailLower = (currentUser?.email || '').toLowerCase().trim();
  const isSuperAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN' || emailLower === 'sandy@gmail.com';
  const isAdmin = isSuperAdmin || roleUpper === 'ADMIN' || roleUpper === 'MANAGEMENT';

  const handleAssignOwner = async (contact: Contact, targetId: string | null) => {
    try {
      const contactTargetId = contact.id || contact.contactId;
      if (!contactTargetId) return;
      setAssigningId(contactTargetId);

      const res = await assignContact(contactTargetId, targetId);
      if (res && res.success && res.data) {
        onContactUpdated?.(res.data);
      }
    } catch (err: any) {
      console.error('Failed to assign contact owner:', err);
    } finally {
      setAssigningId(null);
    }
  };

  const handleMoveToAssigned = async (contact: Contact) => {
    try {
      const contactTargetId = contact.id || contact.contactId;
      if (!contactTargetId) return;
      setAssigningId(contactTargetId);
      const myEmp = availableEmployees.find(
        (e) =>
          (currentUser?.email && e.email?.toLowerCase() === currentUser.email?.toLowerCase()) ||
          (currentUser?.name && e.name?.toLowerCase() === currentUser.name?.toLowerCase()) ||
          (currentUser?.id && e.id === currentUser.id)
      );
      const targetEmpId = myEmp?.id || currentUser?.id || currentUser?.name || 'me';
      const res = await assignContact(contactTargetId, targetEmpId);
      if (res && res.success && res.data) {
        onContactUpdated?.(res.data);
      }
    } catch (err: any) {
      console.error('Failed to move contact to assigned:', err);
    } finally {
      setAssigningId(null);
    }
  };

  const formatLastUpdate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleOpenQualification = (contact: Contact) => {
    setSelectedContact(contact);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('crm_qualifying_contact', JSON.stringify(contact));
    }
    setActiveNav('contact-qualification');
  };

  // 1. Sleek Modern SOURCE Badge (Ultra Clean Pill Design)
  const renderSourceBadge = (source?: string | null) => {
    const s = (source || 'Direct').trim();
    let bg = isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9';
    let color = isDark ? '#CBD5E1' : '#475569';
    let border = isDark ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0';
    let icon = <IconWorld size={13} stroke={2} />;

    const sLow = s.toLowerCase();
    if (sLow.includes('linkedin')) {
      bg = isDark ? 'rgba(10, 102, 194, 0.16)' : '#EFF6FF';
      color = isDark ? '#93C5FD' : '#0A66C2';
      border = isDark ? 'rgba(10, 102, 194, 0.28)' : '#BFDBFE';
      icon = <IconBrandLinkedin size={13} stroke={2.2} />;
    } else if (sLow.includes('social')) {
      bg = isDark ? 'rgba(147, 51, 234, 0.14)' : '#FAF5FF';
      color = isDark ? '#D8B4FE' : '#7E22CE';
      border = isDark ? 'rgba(147, 51, 234, 0.25)' : '#E9D5FF';
      icon = <IconShare size={12} stroke={2} />;
    } else if (sLow.includes('referral')) {
      bg = isDark ? 'rgba(16, 185, 129, 0.14)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0';
      icon = <IconUsers size={12} stroke={2} />;
    } else if (sLow.includes('call')) {
      bg = isDark ? 'rgba(245, 158, 11, 0.14)' : '#FFFBEB';
      color = isDark ? '#FCD34D' : '#B45309';
      border = isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A';
      icon = <IconPhoneCall size={12} stroke={2} />;
    } else if (sLow.includes('web')) {
      bg = isDark ? 'rgba(14, 165, 233, 0.14)' : '#F0F9FF';
      color = isDark ? '#7DD3FC' : '#0369A1';
      border = isDark ? 'rgba(14, 165, 233, 0.25)' : '#BAE6FD';
      icon = <IconWorld size={13} stroke={2} />;
    }

    return (
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 100,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {icon}
        <span>{s}</span>
      </Box>
    );
  };

  // 2. Sleek Modern STATUS Badge
  const renderStatusBadge = (statusVal?: string | null, stageVal?: string | null) => {
    const st = (statusVal || stageVal || 'Not Connected').trim();
    const sLow = st.toLowerCase();
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (sLow.includes('not connected') || sLow.includes('not-connected') || sLow === 'new') {
      bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
      color = isDark ? '#93C5FD' : '#1D4ED8';
      border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';
    } else if (sLow.includes('unqual') || sLow.includes('disqual') || sLow.includes('lost') || sLow.includes('cancel') || sLow.includes('not interested') || sLow.includes('failed')) {
      bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#DC2626';
      border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
    } else if (sLow.includes('qualif') || (sLow.includes('interested') && !sLow.includes('not'))) {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    } else if (sLow.includes('follow') || sLow.includes('follow-up')) {
      bg = isDark ? 'rgba(249, 115, 22, 0.16)' : '#FFF7ED';
      color = isDark ? '#FB923C' : '#C2410C';
      border = isDark ? 'rgba(249, 115, 22, 0.35)' : '#FFEDD5';
    } else if (sLow.includes('replied')) {
      bg = isDark ? 'rgba(20, 184, 166, 0.16)' : '#F0FDFA';
      color = isDark ? '#2DD4BF' : '#0D9488';
      border = isDark ? 'rgba(20, 184, 166, 0.35)' : '#99F6E4';
    } else if (sLow.includes('sent')) {
      bg = isDark ? 'rgba(99, 102, 241, 0.16)' : '#EEF2FF';
      color = isDark ? '#A5B4FC' : '#4F46E5';
      border = isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE';
    } else if (sLow.includes('draft')) {
      bg = isDark ? 'rgba(148, 163, 184, 0.16)' : '#F8FAFC';
      color = isDark ? '#94A3B8' : '#64748B';
      border = isDark ? 'rgba(148, 163, 184, 0.35)' : '#CBD5E1';
    } else if (sLow.includes('progress')) {
      bg = isDark ? 'rgba(14, 165, 233, 0.16)' : '#F0F9FF';
      color = isDark ? '#7DD3FC' : '#0284C7';
      border = isDark ? 'rgba(14, 165, 233, 0.35)' : '#BAE6FD';
    } else if (sLow.includes('won') || sLow.includes('complete')) {
      bg = isDark ? 'rgba(34, 197, 94, 0.18)' : '#DCFCE7';
      color = isDark ? '#86EFAC' : '#15803D';
      border = isDark ? 'rgba(34, 197, 94, 0.4)' : '#86EFAC';
    } else if (sLow.includes('hold') || sLow.includes('pend')) {
      bg = isDark ? 'rgba(234, 179, 8, 0.16)' : '#FEFCE8';
      color = isDark ? '#FACC15' : '#A16207';
      border = isDark ? 'rgba(234, 179, 8, 0.35)' : '#FEF08A';
    } else if (sLow.includes('init') || sLow.includes('active')) {
      bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
      color = isDark ? '#93C5FD' : '#1D4ED8';
      border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';
    }

    const displayLabel = sLow === 'new' ? 'Not Connected' : st;

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
        {displayLabel}
      </Box>
    );
  };

  // Priority / Tag Priority Badge
  const renderPriorityBadge = (priorityVal?: string | null) => {
    const p = (priorityVal || 'Medium').trim();
    const pLow = p.toLowerCase();

    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#2563EB';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (pLow === 'high' || pLow.includes('urgent') || pLow.includes('critical')) {
      bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#DC2626';
      border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
    } else if (pLow === 'medium' || pLow === 'med') {
      bg = isDark ? 'rgba(245, 158, 11, 0.16)' : '#FFFBEB';
      color = isDark ? '#FCD34D' : '#D97706';
      border = isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A';
    } else if (pLow === 'low') {
      bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
      color = isDark ? '#93C5FD' : '#2563EB';
      border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';
    } else {
      // Custom entered priority / tag (e.g. VIP, Important, etc.)
      bg = isDark ? 'rgba(139, 92, 246, 0.16)' : '#F5F3FF';
      color = isDark ? '#C4B5FD' : '#7C3AED';
      border = isDark ? 'rgba(139, 92, 246, 0.35)' : '#DDD6FE';
    }

    return (
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 100,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          maxWidth: 120,
        }}
      >
        <IconTag size={11} stroke={2.2} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span>
      </Box>
    );
  };

  // Determine canonical contact display status (Default is 'Not Connected' for uncontacted/new contacts)
  const getContactDisplayStatus = (c: Contact) => {
    const s = (c.status || '').trim();
    const sLow = s.toLowerCase();
    const q = (c.qualificationStatus || '').trim();
    const qLow = q.toLowerCase();

    if (
      sLow === 'not interested' ||
      sLow === 'not-interested' ||
      (c as any).callStatus === 'Not Interested' ||
      (c as any).whatsappStatus === 'Not Interested' ||
      (c as any).emailStatus === 'Not Interested'
    ) {
      return 'Not Interested';
    }
    if (qLow === 'qualified' || sLow === 'qualified' || (c as any).stage === 'Qualification' && qLow === 'qualified') {
      return 'Qualified';
    }
    if (sLow === 'interested' || (c as any).callStatus === 'Interested' || (c as any).whatsappStatus === 'Interested') {
      return 'Interested';
    }
    if (
      qLow === 'unqualified' ||
      qLow === 'disqualified' ||
      sLow === 'unqualified' ||
      sLow === 'disqualified'
    ) {
      return 'Unqualified';
    }
    if (
      qLow === 'follow-up required' ||
      sLow === 'follow-up required' ||
      sLow === 'follow-up' ||
      sLow === 'followup'
    ) {
      return 'Follow-up Required';
    }
    if (qLow === 'pending' || sLow === 'pending') {
      return 'Pending';
    }
    if (s && s !== 'Not Connected' && s !== 'New' && s !== 'new') {
      return s;
    }
    if (
      s === 'Not Connected' ||
      s === 'New' ||
      s === 'new' ||
      q === 'New' ||
      q === 'new' ||
      (!s && !q)
    ) {
      return 'Not Connected';
    }
    return c.status || c.qualificationStatus || 'Not Connected';
  };



  if (!loading && contacts.length === 0) {
    return (
      <Paper
        p="3.5rem"
        radius="lg"
        style={{
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          textAlign: 'center',
          marginTop: 16,
        }}
      >
        <Center>
          <Stack align="center" gap="sm">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#60A5FA' : '#0F172A',
              }}
            >
              <IconUserPlus size={32} stroke={1.8} />
            </Box>
            <Text fw={700} size="lg" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
              No Contacts Found
            </Text>
            <Text size="sm" c="dimmed" style={{ maxWidth: 420 }}>
              No contact records match your current view or filter criteria.
            </Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  const getStatusDetailText = (contact: Contact, displayStatus: string): { show: boolean; text: string } => {
    const sLow = (displayStatus || '').toLowerCase();
    const isUnqualified =
      sLow.includes('unqual') ||
      sLow.includes('disqual') ||
      String(contact.qualificationStatus || '').toLowerCase().includes('unqual') ||
      String(contact.qualificationStatus || '').toLowerCase().includes('disqual') ||
      String(contact.status || '').toLowerCase().includes('unqual') ||
      String(contact.status || '').toLowerCase().includes('disqual');

    const isNotInterested =
      sLow.includes('not interested') ||
      sLow.includes('not-interested') ||
      String(contact.status || '').toLowerCase().includes('not interested') ||
      String(contact.status || '').toLowerCase().includes('not-interested');

    // 1. If status is Unqualified / Disqualified, show Disqualification Reason
    if (sLow.includes('unqual') || sLow.includes('disqual')) {
      const reason =
        (contact as any).disqualificationReason ||
        contact.unqualifiedReason ||
        contact.remarks ||
        contact.description ||
        '';
      const trimmed = String(reason || '').trim();
      return { show: Boolean(trimmed), text: trimmed };
    }

    // 2. If status is Not Interested, show Description
    if (sLow.includes('not interested') || sLow.includes('not-interested')) {
      const desc =
        contact.description ||
        contact.remarks ||
        contact.notes ||
        (contact as any).disqualificationReason ||
        contact.unqualifiedReason ||
        '';
      const trimmed = String(desc || '').trim();
      return { show: Boolean(trimmed), text: trimmed };
    }

    if (isUnqualified) {
      const reason =
        (contact as any).disqualificationReason ||
        contact.unqualifiedReason ||
        contact.remarks ||
        contact.description ||
        '';
      const trimmed = String(reason || '').trim();
      return { show: Boolean(trimmed), text: trimmed };
    }

    if (isNotInterested) {
      const desc =
        contact.description ||
        contact.remarks ||
        contact.notes ||
        '';
      const trimmed = String(desc || '').trim();
      return { show: Boolean(trimmed), text: trimmed };
    }

    return { show: false, text: '' };
  };

  if (isMobile) {
    return (
      <Stack gap="sm" mt="md">
        {contacts.map((contact) => {
          const displayStatus = getContactDisplayStatus(contact);
          const statusDetail = getStatusDetailText(contact, displayStatus);
          const modeInfo = getContactModeInfo(contact);

          return (
          <Paper
            key={contact.id}
            p="md"
            radius="16px"
            onClick={() => {
              if (onRowClick) {
                onRowClick(contact);
              } else {
                onView(contact);
              }
            }}
            style={{
              cursor: 'pointer',
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
            }}
          >
            {/* Header: Initial Avatar + Name + Designation + Status Badge */}
            <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs">
              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                <Box
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {(contact.name || 'C').charAt(0).toUpperCase()}
                </Box>
                <Box style={{ minWidth: 0, flex: 1 }}>
                  <Text fw={700} size="sm" truncate style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    {contact.name || '—'}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {contact.designation || contact.profession || contact.contactType || '—'}
                  </Text>
                </Box>
              </Group>
              <Box style={{ flexShrink: 0, textAlign: 'right' }}>
                <Tooltip label="Click to update contact" withArrow position="top">
                  <UnstyledButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(contact);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {renderStatusBadge(displayStatus, contact.stage)}
                  </UnstyledButton>
                </Tooltip>

                {modeInfo && (
                  <Group gap={3} justify="flex-end" align="center" wrap="nowrap" mt={3} style={{ opacity: 0.85 }}>
                    {React.cloneElement(modeInfo.icon as React.ReactElement<any>, {
                      size: 11,
                      color: isDark ? '#94A3B8' : '#64748B',
                      stroke: 2,
                    })}
                    <Text size="10.5px" fw={500} style={{ color: isDark ? '#94A3B8' : '#64748B', lineHeight: 1 }}>
                      {modeInfo.label}
                    </Text>
                  </Group>
                )}
              </Box>
            </Group>

            {/* Details Grid */}
            <SimpleGrid cols={2} spacing="xs" mb="xs" style={{ fontSize: 12 }}>
              {contact.companyName && (
                <Group gap={5} wrap="nowrap">
                  <IconBuilding size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text size="xs" truncate style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                    {contact.companyName}
                  </Text>
                </Group>
              )}
              {contact.contactPerson && (
                <Group gap={5} wrap="nowrap">
                  <IconUser size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text size="xs" truncate style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                    {contact.contactPerson}
                  </Text>
                </Group>
              )}
              {contact.phone && (
                <Group gap={5} wrap="nowrap">
                  <IconPhone size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text size="xs" style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                    {contact.phone}
                  </Text>
                </Group>
              )}
              {contact.email && (
                <Group gap={5} wrap="nowrap">
                  <IconMail size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text size="xs" truncate style={{ color: '#2563EB' }}>
                    {contact.email}
                  </Text>
                </Group>
              )}
              {contact.estimatedValue && (
                <Group gap={5} wrap="nowrap">
                  <Text size="xs" fw={600} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    Est: {contact.estimatedValue.startsWith('₹') ? contact.estimatedValue : `₹ ${contact.estimatedValue}`}
                  </Text>
                </Group>
              )}
              {contact.expectedCloseDate && (
                <Group gap={5} wrap="nowrap">
                  <IconCalendar size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Close: {contact.expectedCloseDate}
                  </Text>
                </Group>
              )}
            </SimpleGrid>

            {/* Footer: Assigned Employee + Source + Action Icons */}
            <Group justify="space-between" align="center" pt="xs" style={{ borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #F1F5F9' }}>
              <Group gap={6} align="center" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                <Menu
                  shadow="lg"
                  width={230}
                  position="bottom-start"
                  radius="md"
                  withinPortal
                >
                  <Menu.Target>
                    <UnstyledButton style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      {assigningId === (contact.id || contact.contactId) ? (
                        <Badge size="xs" radius="xl">
                          <Loader size={10} color="blue" /> Assigning...
                        </Badge>
                      ) : contact.assignedToName ? (
                        <Badge size="xs" variant="light" color="blue" radius="xl" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconUserCheck size={11} stroke={2.2} />
                          <span>{contact.assignedToName}</span>
                          <IconChevronDown size={10} stroke={2} style={{ opacity: 0.7 }} />
                        </Badge>
                      ) : (
                        <Badge size="xs" variant="outline" color="blue" radius="xl" style={{ borderStyle: 'dashed', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconUserPlus size={11} stroke={2.2} />
                          <span>+ Assign</span>
                          <IconChevronDown size={9} stroke={2} style={{ opacity: 0.7 }} />
                        </Badge>
                      )}
                    </UnstyledButton>
                  </Menu.Target>
                  <Menu.Dropdown p="xs">
                    <Menu.Label>ASSIGNED OWNER</Menu.Label>
                    <Menu.Item
                      leftSection={<IconUserCheck size={14} color="#0284C7" stroke={2.2} />}
                      onClick={() => handleAssignOwner(contact, 'me')}
                    >
                      <Text size="12px" fw={600}>Assigned for Me</Text>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Label>EMPLOYEES LIST</Menu.Label>
                    <ScrollArea.Autosize mah={180} type="scroll">
                      {availableEmployees && availableEmployees.length > 0 ? (
                        availableEmployees.map((emp) => (
                          <Menu.Item
                            key={emp.id}
                            leftSection={<IconUserCheck size={13} color={contact.assignedTo === emp.id ? '#10B981' : undefined} />}
                            onClick={() => handleAssignOwner(contact, emp.id)}
                          >
                            <Text size="12px" fw={contact.assignedTo === emp.id ? 700 : 500}>{emp.name}</Text>
                          </Menu.Item>
                        ))
                      ) : (
                        <Menu.Item disabled>No employees available</Menu.Item>
                      )}
                    </ScrollArea.Autosize>
                    {contact.assignedToName && (
                      <>
                        <Menu.Divider />
                        <Menu.Item color="red" leftSection={<IconUserX size={13} />} onClick={() => handleAssignOwner(contact, null)}>
                          <Text size="12px" fw={600}>Unassign Owner</Text>
                        </Menu.Item>
                      </>
                    )}
                  </Menu.Dropdown>
                </Menu>
                {contact.source && renderSourceBadge(contact.source)}
                {renderPriorityBadge(contact.priority || (contact as any).tagPriority)}
              </Group>

              <Group gap={4} onClick={(e) => e.stopPropagation()}>
                <Tooltip label="Edit Contact">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    radius="md"
                    color="indigo"
                    onClick={() => onEdit(contact)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete Contact">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    radius="md"
                    color="red"
                    onClick={() => onDelete(contact)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Paper>
        );
      })}
      </Stack>
    );
  }

  return (
    <Paper
      radius="16px"
      style={{
        background: isDark ? '#111827' : '#FFFFFF',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 112, 243, 0.04)',
        marginTop: 16,
        width: '100%',
      }}
    >
      <Box
        style={{
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
        }}
      >
        <Table
          verticalSpacing="sm"
          horizontalSpacing="xs"
          highlightOnHover
          style={{
            width: '100%',
            userSelect: 'none',
          }}
        >
          <Table.Thead
            style={{
              background: isDark ? '#0F172A' : '#F8FAFC',
              borderBottom: isDark ? '2px solid rgba(255, 255, 255, 0.08)' : '2px solid #E2E8F0',
            }}
          >
            <Table.Tr style={{ height: 44 }}>
              <Table.Th style={{ width: 85, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                ID
              </Table.Th>
              <Table.Th style={{ minWidth: 120, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                COMPANY
              </Table.Th>
              <Table.Th style={{ minWidth: 105, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                CONTACT PERSON
              </Table.Th>
              <Table.Th style={{ minWidth: 130, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                EMAIL
              </Table.Th>
              <Table.Th style={{ width: 100, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                PHONE NUMBER
              </Table.Th>
              <Table.Th style={{ width: 115, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                ASSIGNED OWNER
              </Table.Th>
              <Table.Th style={{ width: 105, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                TAG PRIORITY
              </Table.Th>
              <Table.Th style={{ width: 110, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                STATUS
              </Table.Th>
              <Table.Th style={{ width: 95, textAlign: 'center', whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 4px' }}>
                ACTIONS
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {contacts.map((contact) => {
              const isAssigned =
                contact.assignmentStatus === 'Assigned' ||
                (contact.assignedTo && contact.assignedTo !== 'Unassigned') ||
                Boolean(contact.assignedToName);

              const displayStatus = getContactDisplayStatus(contact);
              const statusDetail = getStatusDetailText(contact, displayStatus);
              const contactKey = contact.id || contact.contactId || '';
              const isExpanded = expandedId === contactKey;
              const modeInfo = getContactModeInfo(contact);

              return (
                <React.Fragment key={contactKey}>
                  <Table.Tr
                    onClick={() => handleRowClick(contact)}
                    onDoubleClick={() => handleRowDoubleClick(contact)}
                    style={{
                      cursor: 'pointer',
                      height: 52,
                      transition: 'background 0.12s ease',
                      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                      backgroundColor: isExpanded
                        ? (isDark ? 'rgba(14, 165, 233, 0.12)' : '#F0F9FF')
                        : undefined,
                    }}
                  >
                    {/* 1. ID with expand toggle */}
                    <Table.Td style={{ width: 85, whiteSpace: 'nowrap', padding: '8px 8px', verticalAlign: 'middle' }}>
                      <Group gap={4} wrap="nowrap" align="center">
                        <ActionIcon
                          size={18}
                          variant="subtle"
                          color={isExpanded ? 'blue' : 'gray'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId((prev) => (prev === contactKey ? null : contactKey));
                          }}
                          title={isExpanded ? 'Collapse description & follow-up' : 'Click to show description & follow-up'}
                        >
                          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                        </ActionIcon>
                        <Text
                          fw={700}
                          size="12px"
                          style={{
                            color: isExpanded ? '#0284C7' : (isDark ? '#F8FAFC' : '#0F172A'),
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace',
                          }}
                        >
                          {contact.contactId || contact.bulkId || (contact.id ? (contact.id.startsWith('CNT-') || contact.id.startsWith('BLK-') ? contact.id : ((contact as any).isBulkImport ? `BLK-${contact.id.slice(0, 4).toUpperCase()}` : `CNT-${contact.id.slice(0, 4).toUpperCase()}`)) : '—')}
                        </Text>
                      </Group>
                    </Table.Td>

                    {/* 2. COMPANY */}
                    <Table.Td style={{ minWidth: 120, padding: '8px 8px', verticalAlign: 'middle' }}>
                      <Tooltip label={contact.companyName || ''} withArrow multiline maw={240} disabled={!contact.companyName}>
                        <Text
                          size="12.5px"
                          fw={600}
                          truncate
                          style={{
                            color: isDark ? '#F8FAFC' : '#1E293B',
                            maxWidth: 160,
                          }}
                        >
                          {contact.companyName || '—'}
                        </Text>
                      </Tooltip>
                    </Table.Td>

                    {/* 3. CONTACT PERSON */}
                    <Table.Td style={{ minWidth: 105, padding: '8px 8px', verticalAlign: 'middle' }}>
                      <Tooltip label={contact.contactPerson || contact.name || ''} withArrow multiline maw={220}>
                        <Text
                          size="12px"
                          truncate
                          style={{
                            color: isDark ? '#CBD5E1' : '#334155',
                            maxWidth: 140,
                          }}
                        >
                          {contact.contactPerson || contact.name || '—'}
                        </Text>
                      </Tooltip>
                    </Table.Td>

                    {/* 4. EMAIL */}
                    <Table.Td style={{ minWidth: 130, padding: '8px 8px', verticalAlign: 'middle' }}>
                      <Tooltip label={contact.email || ''} withArrow position="top" disabled={!contact.email}>
                        <Text
                          size="12px"
                          truncate
                          style={{
                            color: isDark ? '#94A3B8' : '#64748B',
                            maxWidth: 160,
                          }}
                        >
                          {contact.email || '—'}
                        </Text>
                      </Tooltip>
                    </Table.Td>

                    {/* 5. PHONE NUMBER */}
                    <Table.Td style={{ width: 100, whiteSpace: 'nowrap', padding: '8px 8px', verticalAlign: 'middle' }}>
                      <Text size="12px" fw={500} style={{ color: isDark ? '#CBD5E1' : '#334155', whiteSpace: 'nowrap' }}>
                        {contact.phone || '—'}
                      </Text>
                    </Table.Td>

                    {/* 6. ASSIGNED OWNER: Quick Assign dropdown matching bulk import batches (Super Admin Only) */}
                    <Table.Td
                      style={{ width: 115, whiteSpace: 'nowrap', padding: '8px 8px', verticalAlign: 'middle' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isSuperAdmin ? (
                        <Tooltip
                          label={`Assigned to ${contact.assignedToName || (contact as any).createdBy || 'Assigned'}`}
                          withArrow
                          position="top"
                        >
                          <Badge
                            radius="xl"
                            styles={{
                              root: {
                                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                                color: isDark ? '#93C5FD' : '#1D4ED8',
                                border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #BFDBFE',
                                fontWeight: 600,
                                fontSize: 11.5,
                                textTransform: 'none',
                                padding: '4px 10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              },
                            }}
                          >
                            <IconUserCheck size={12} stroke={2.2} />
                            <span>{contact.assignedToName || (contact as any).createdBy || 'Assigned'}</span>
                          </Badge>
                        </Tooltip>
                      ) : (
                        <Menu
                          shadow="lg"
                          width={230}
                          position="bottom-start"
                          radius="md"
                          withinPortal
                        >
                        <Menu.Target>
                          <Tooltip
                            label={
                              contact.assignedToName
                                ? `Assigned to ${contact.assignedToName} (Click to change)`
                                : 'Click to assign employee'
                            }
                            withArrow
                            position="top"
                          >
                            <UnstyledButton
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.12s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.04)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              {assigningId === (contact.id || contact.contactId) ? (
                                <Badge
                                  radius="xl"
                                  styles={{
                                    root: {
                                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                                      color: isDark ? '#93C5FD' : '#64748B',
                                      padding: '4px 10px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                    },
                                  }}
                                >
                                  <Loader size={12} color="blue" />
                                  Assigning...
                                </Badge>
                              ) : contact.assignedToName ? (
                                <Badge
                                  radius="xl"
                                  styles={{
                                    root: {
                                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                                      color: isDark ? '#93C5FD' : '#1D4ED8',
                                      border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #BFDBFE',
                                      fontWeight: 600,
                                      fontSize: 11.5,
                                      textTransform: 'none',
                                      padding: '4px 10px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      cursor: 'pointer',
                                    },
                                  }}
                                >
                                  <IconUserCheck size={12} stroke={2.2} />
                                  <span>{contact.assignedToName}</span>
                                  <IconChevronDown size={11} stroke={2} style={{ opacity: 0.7 }} />
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  radius="xl"
                                  styles={{
                                    root: {
                                      borderStyle: 'dashed',
                                      borderColor: isDark ? '#60A5FA' : '#3B82F6',
                                      color: isDark ? '#93C5FD' : '#2563EB',
                                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF',
                                      fontWeight: 600,
                                      fontSize: 11,
                                      textTransform: 'none',
                                      padding: '4px 9px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      cursor: 'pointer',
                                    },
                                  }}
                                >
                                  <IconUserPlus size={11} stroke={2.2} />
                                  <span>+ Assign</span>
                                  <IconChevronDown size={10} stroke={2} style={{ opacity: 0.7 }} />
                                </Badge>
                              )}
                            </UnstyledButton>
                          </Tooltip>
                        </Menu.Target>

                        <Menu.Dropdown p="xs" onClick={(e) => e.stopPropagation()}>
                          <Menu.Label>ASSIGNED OWNER</Menu.Label>

                          {/* 1. Assign to Me / Assigned for Me option */}
                          <Menu.Item
                            leftSection={<IconUserCheck size={15} color="#0284C7" stroke={2.2} />}
                            rightSection={
                              (currentUser?.name &&
                                contact.assignedToName &&
                                contact.assignedToName.toLowerCase() === currentUser.name.toLowerCase()) ||
                              (currentUser?.id && contact.assignedTo === currentUser.id) ? (
                                <Badge size="xs" color="teal" variant="light">
                                  Current
                                </Badge>
                              ) : undefined
                            }
                            onClick={() => handleAssignOwner(contact, 'me')}
                          >
                            <Box>
                              <Text size="13px" fw={600} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                                Assigned for Me
                              </Text>
                              <Text size="11px" c="dimmed">
                                {currentUser?.name ? `${currentUser.name} (You)` : 'Assign to currently logged-in account'}
                              </Text>
                            </Box>
                          </Menu.Item>

                          <Menu.Divider />
                          <Menu.Label>EMPLOYEES LIST</Menu.Label>

                          <ScrollArea.Autosize mah={200} type="scroll">
                            {availableEmployees && availableEmployees.length > 0 ? (
                              availableEmployees.map((emp) => {
                                const isCurrent =
                                  contact.assignedTo === emp.id ||
                                  contact.assignedTo === emp.empCode ||
                                  (contact.assignedToName &&
                                    contact.assignedToName.toLowerCase() === emp.name.toLowerCase());
                                return (
                                  <Menu.Item
                                    key={emp.id}
                                    leftSection={
                                      <IconUserCheck
                                        size={14}
                                        color={isCurrent ? '#10B981' : undefined}
                                      />
                                    }
                                    rightSection={
                                      isCurrent ? (
                                        <Badge size="xs" color="teal" variant="light">
                                          Current
                                        </Badge>
                                      ) : undefined
                                    }
                                    onClick={() => handleAssignOwner(contact, emp.id)}
                                  >
                                    <Box>
                                      <Text size="13px" fw={isCurrent ? 700 : 500}>
                                        {emp.name}
                                      </Text>
                                      {(emp.designation || emp.department || emp.empCode) && (
                                        <Text size="10.5px" c="dimmed">
                                          {[emp.designation, emp.empCode ? `(${emp.empCode})` : '']
                                            .filter(Boolean)
                                            .join(' ')}
                                        </Text>
                                      )}
                                    </Box>
                                  </Menu.Item>
                                );
                              })
                            ) : (
                              <Menu.Item disabled>No employees available</Menu.Item>
                            )}
                          </ScrollArea.Autosize>

                          {contact.assignedToName && (
                            <>
                              <Menu.Divider />
                              <Menu.Item
                                color="red"
                                leftSection={<IconUserX size={14} />}
                                onClick={() => handleAssignOwner(contact, null)}
                              >
                                <Text size="12.5px" fw={600}>
                                  Unassign Owner
                                </Text>
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                      )}
                    </Table.Td>



                    {/* 6.5 TAG PRIORITY */}
                    <Table.Td
                      style={{ width: 105, whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '8px 8px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Menu shadow="md" width={220} position="bottom-start" radius="md" withinPortal>
                        <Menu.Target>
                          <Tooltip
                            label={`Tag Priority: ${contact.priority || (contact as any).tagPriority || 'Medium'} (Click to change)`}
                            withArrow
                            position="top"
                          >
                            <UnstyledButton
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.12s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.04)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              {updatingPriorityId === (contact.id || contact.contactId) ? (
                                <Badge size="xs" radius="xl" color="blue">
                                  <Loader size={10} color="blue" /> Saving...
                                </Badge>
                              ) : (
                                renderPriorityBadge(contact.priority || (contact as any).tagPriority)
                              )}
                            </UnstyledButton>
                          </Tooltip>
                        </Menu.Target>

                        <Menu.Dropdown onClick={(e) => e.stopPropagation()} style={{ minWidth: 220, padding: 8 }}>
                          <Menu.Label>SET TAG PRIORITY</Menu.Label>
                          <Menu.Item
                            leftSection={<Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#DC2626' }} />}
                            onClick={() => handleUpdatePriority(contact, 'High')}
                          >
                            High
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#D97706' }} />}
                            onClick={() => handleUpdatePriority(contact, 'Medium')}
                          >
                            Medium
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2563EB' }} />}
                            onClick={() => handleUpdatePriority(contact, 'Low')}
                          >
                            Low
                          </Menu.Item>

                          {/* Show custom priority if currently active on this contact */}
                          {contact.priority &&
                            !['high', 'medium', 'low'].includes(contact.priority.toLowerCase()) && (
                              <Menu.Item
                                leftSection={<IconTag size={13} color="#7C3AED" />}
                                onClick={() => handleUpdatePriority(contact, contact.priority!)}
                              >
                                Current: {contact.priority}
                              </Menu.Item>
                            )}

                          <Menu.Divider />

                          {/* Quick Custom Tag Priority Entry directly from the table */}
                          <Box p={4} onClick={(e) => e.stopPropagation()}>
                            <Text size="11px" fw={700} c="dimmed" mb={5}>
                              CUSTOM TAG PRIORITY
                            </Text>
                            <Group gap={4} wrap="nowrap">
                              <TextInput
                                size="xs"
                                radius="sm"
                                placeholder="Type custom tag (e.g. VIP)..."
                                id={`custom-priority-input-${contact.id || contact.contactId}`}
                                defaultValue={
                                  contact.priority &&
                                  !['high', 'medium', 'low'].includes(contact.priority.toLowerCase())
                                    ? contact.priority
                                    : ''
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = e.currentTarget.value.trim();
                                    if (val) {
                                      handleUpdatePriority(contact, val);
                                    }
                                  }
                                }}
                                style={{ flex: 1 }}
                              />
                              <ActionIcon
                                size="sm"
                                variant="filled"
                                color="blue"
                                radius="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const input = document.getElementById(
                                    `custom-priority-input-${contact.id || contact.contactId}`
                                  ) as HTMLInputElement | null;
                                  const val = input?.value?.trim();
                                  if (val) {
                                    handleUpdatePriority(contact, val);
                                  }
                                }}
                              >
                                <IconCheck size={14} />
                              </ActionIcon>
                            </Group>
                          </Box>

                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconEdit size={13} />}
                            onClick={() => onEdit(contact)}
                          >
                            Edit in contact form...
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>

                    {/* 7. STATUS */}
                    <Table.Td style={{ width: 110, verticalAlign: 'middle', padding: '8px 8px' }}>
                      <Stack gap={3} align="flex-start" justify="center">
                        <Tooltip label="Click to update contact" withArrow position="top">
                          <UnstyledButton
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(contact);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              cursor: 'pointer',
                              transition: 'transform 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.04)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            {renderStatusBadge(displayStatus, contact.stage)}
                          </UnstyledButton>
                        </Tooltip>

                        {modeInfo && (
                          <Group gap={4} align="center" wrap="nowrap" style={{ opacity: 0.85, paddingLeft: 2 }}>
                            {React.cloneElement(modeInfo.icon as React.ReactElement<any>, {
                              size: 11,
                              color: isDark ? '#94A3B8' : '#64748B',
                              stroke: 2,
                            })}
                            <Text
                              size="11px"
                              fw={500}
                              style={{
                                color: isDark ? '#94A3B8' : '#64748B',
                                lineHeight: 1.2,
                              }}
                            >
                              {modeInfo.label}
                            </Text>
                          </Group>
                        )}
                      </Stack>
                    </Table.Td>

                    {/* 8. ACTIONS */}
                    <Table.Td style={{ width: 95, textAlign: 'center', verticalAlign: 'middle', padding: '8px 4px' }} onClick={(e) => e.stopPropagation()}>
                      <Group gap={3} justify="center" wrap="nowrap">
                        <Tooltip label="Qualify Contact" withArrow>
                          <ActionIcon
                            variant="light"
                            size="sm"
                            radius="md"
                            color="blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQualify?.(contact);
                            }}
                          >
                            <IconTargetArrow size={15} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Edit Contact" withArrow>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            radius="md"
                            color="indigo"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(contact);
                            }}
                          >
                            <IconEdit size={15} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Delete Contact" withArrow>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            radius="md"
                            color="red"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(contact);
                            }}
                          >
                            <IconTrash size={15} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>

                  {/* Expanded Sub-Row showing clean description on single click */}
                  {isExpanded && (
                    <Table.Tr
                      style={{
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                      }}
                    >
                      <Table.Td colSpan={9} style={{ padding: '8px 16px 12px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <Box
                          p="sm"
                          px="md"
                          style={{
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #CBD5E1',
                            borderRadius: 10,
                            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 1px 3px rgba(0,0,0,0.03)',
                          }}
                        >
                          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                            <Text
                              size="13px"
                              style={{
                                color: isDark ? '#F1F5F9' : '#1E293B',
                                lineHeight: 1.55,
                                whiteSpace: 'pre-wrap',
                                flex: 1,
                              }}
                            >
                              {contact.description ||
                                contact.notes ||
                                contact.remarks ||
                                (contact as any).remarks ||
                                (statusDetail.show ? statusDetail.text : 'No description available')}
                            </Text>

                            <Group gap="xs" align="center" wrap="nowrap">
                              {modeInfo && (
                                <Badge
                                  size="sm"
                                  variant="light"
                                  color={modeInfo.color}
                                  leftSection={modeInfo.icon}
                                  styles={{ root: { fontWeight: 600, textTransform: 'capitalize' } }}
                                >
                                  Mode: {modeInfo.label}
                                </Badge>
                              )}

                              {contact.nextFollowDate &&
                                Boolean(contact.status && contact.status.toLowerCase().includes('follow')) && (
                                <Badge color="orange" variant="light" size="sm" leftSection={<IconCalendar size={11} />}>
                                  Follow-up: {formatDisplayDate(contact.nextFollowDate)}
                                </Badge>
                              )}
                            </Group>
                          </Group>
                        </Box>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </React.Fragment>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Paper>
  );
};

export default ContactTableView;
