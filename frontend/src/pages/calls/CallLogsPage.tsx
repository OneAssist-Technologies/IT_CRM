import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Group,
  TextInput,
  Select,
  Button,
  Text,
  ActionIcon,
  Modal,
  Pagination,
  useComputedColorScheme,
  UnstyledButton,
  Paper,
  Center,
  Loader,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconPlus,
  IconX,
  IconAlertTriangle,
  IconPhoneCall,
  IconBrandWhatsapp,
  IconMail,
  IconActivity,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconCheck,
  IconClock,
  IconMessageCircle,
  IconSend,
  IconSparkles,
} from '@tabler/icons-react';
import {
  CallLog,
  CallLogStats,
  ActivityLogItem,
  WhatsAppStats,
  EmailStats,
  OthersStats,
  ActivityLogSection,
} from '../../types/callLog';
import {
  fetchCallLogsApi,
  fetchCallLogStatsApi,
  createCallLogApi,
  updateCallLogApi,
  deleteCallLogApi,
  fetchSectionActivitiesApi,
  fetchSectionStatsApi,
  createSectionActivityApi,
  deleteSectionActivityApi,
} from '../../services/callLogService';
import { useEmployee } from '../../context/EmployeeContext';
import { useContact } from '../../context/ContactContext';
import { useLead } from '../../context/LeadContext';
import { contactService } from '../../services/contactService';
import { Contact } from '../../types/contact';
import { createMeetingApi } from '../../services/meetingService';
import { CallLogTableView } from './components/CallLogTableView';
import { CallLogModal } from './components/CallLogModal';
import { CallDetailsModal } from './components/CallDetailsModal';
import { WhatsAppTableView } from './components/WhatsAppTableView';
import { EmailTableView } from './components/EmailTableView';
import { OthersTableView } from './components/OthersTableView';
import { ActivityLogModal } from './components/ActivityLogModal';
import { ActivityDetailsModal } from './components/ActivityDetailsModal';
import {
  DateFilterControl,
  DateFilterValue,
  DEFAULT_DATE_FILTER,
  isDateMatchingFilter,
} from '../../components/common/DateFilterControl';

type ActiveCallTabType = 'ALL' | 'INCOMING' | 'OUTGOING' | 'COMPLETED' | 'FOLLOW_UP' | 'MISSED';

export const CallLogsPage: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  // Active Section: Calls, WhatsApp, Email, Others
  const [activeSection, setActiveSection] = useState<ActivityLogSection>('calls');

  // Contexts
  const { employees, fetchEmployees } = useEmployee();
  const { contacts: contextContacts } = useContact();
  const { leads } = useLead();
  const [allContacts, setAllContacts] = useState<Contact[]>([]);

  // Section 1: Calls State
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [callStats, setCallStats] = useState<CallLogStats | null>(null);

  // Section 2: WhatsApp State
  const [whatsappItems, setWhatsappItems] = useState<ActivityLogItem[]>([]);
  const [whatsappStats, setWhatsappStats] = useState<WhatsAppStats | null>(null);

  // Section 3: Email State
  const [emailItems, setEmailItems] = useState<ActivityLogItem[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);

  // Section 4: Others State
  const [othersItems, setOthersItems] = useState<ActivityLogItem[]>([]);
  const [othersStats, setOthersStats] = useState<OthersStats | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  // Filters State
  const [callTab, setCallTab] = useState<ActiveCallTabType>('ALL');
  const [genericSubTab, setGenericSubTab] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Modals State
  const [callModalOpen, setCallModalOpen] = useState<boolean>(false);
  const [editingCall, setEditingCall] = useState<CallLog | null>(null);
  const [detailsCall, setDetailsCall] = useState<CallLog | null>(null);

  const [activityModalOpen, setActivityModalOpen] = useState<boolean>(false);
  const [detailsActivity, setDetailsActivity] = useState<ActivityLogItem | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; section: ActivityLogSection } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Load Contacts list if context is empty
  useEffect(() => {
    if (contextContacts && contextContacts.length > 0) {
      setAllContacts(contextContacts);
    } else {
      contactService
        .getContacts({ limit: 100 })
        .then((res) => {
          if (res?.data) setAllContacts(res.data);
        })
        .catch(() => {});
    }
  }, [contextContacts]);

  // Load all sections data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        callsRes,
        callStatsRes,
        waRes,
        waStatsRes,
        emRes,
        emStatsRes,
        othRes,
        othStatsRes,
      ] = await Promise.all([
        fetchCallLogsApi().catch(() => ({ calls: [], count: 0 })),
        fetchCallLogStatsApi().catch(() => null),
        fetchSectionActivitiesApi('whatsapp').catch(() => ({ items: [], count: 0 })),
        fetchSectionStatsApi('whatsapp').catch(() => null),
        fetchSectionActivitiesApi('email').catch(() => ({ items: [], count: 0 })),
        fetchSectionStatsApi('email').catch(() => null),
        fetchSectionActivitiesApi('others').catch(() => ({ items: [], count: 0 })),
        fetchSectionStatsApi('others').catch(() => null),
      ]);

      const rawCalls: CallLog[] = callsRes.calls || [];
      const enrichedCalls = rawCalls.map((c) => {
        let empName = c.employeeName;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(empName) || empName === c.employeeId) {
          const emp = employees.find((e) => e.id === empName || e.empCode === empName || e.id === c.employeeId);
          if (emp) empName = emp.name;
        }

        let compName = c.companyName;
        if (!compName) {
          const foundC = allContacts.find((x) => x.id === c.contactId || x.contactId === c.contactId || (x.name && c.contactName && x.name.toLowerCase() === c.contactName.toLowerCase()));
          if (foundC?.companyName) {
            compName = foundC.companyName;
          } else {
            const foundL = leads.find((l) => l.id === c.leadId || l.leadId === c.leadId || (l.name && c.contactName && l.name.toLowerCase() === c.contactName.toLowerCase()));
            if (foundL?.companyName) compName = foundL.companyName;
          }
        }

        return {
          ...c,
          employeeName: empName,
          companyName: compName,
        };
      });

      setCalls(enrichedCalls);
      if (callStatsRes) setCallStats(callStatsRes);

      const enrichActivityItem = (item: ActivityLogItem): ActivityLogItem => {
        let perfBy = item.performedBy || '';
        if (!perfBy || perfBy === 'Staff' || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(perfBy) || perfBy === item.performedById) {
          const emp = employees.find((e) =>
            (perfBy && (e.id === perfBy || e.empCode === perfBy)) ||
            (item.performedById && (e.id === item.performedById || e.empCode === item.performedById))
          );
          if (emp) perfBy = emp.name;
        }

        let compName = item.customerName || (item.metadata as any)?.companyName || '';
        if (!compName) {
          const foundC = allContacts.find((x) =>
            x.id === item.contactId ||
            x.contactId === item.contactId ||
            (x.name && item.contactName && x.name.toLowerCase() === item.contactName.toLowerCase())
          );
          if (foundC?.companyName) {
            compName = foundC.companyName;
          } else {
            const foundL = leads.find((l) =>
              l.id === item.leadId ||
              l.leadId === item.leadId ||
              (l.name && item.contactName && l.name.toLowerCase() === item.contactName.toLowerCase())
            );
            if (foundL?.companyName) compName = foundL.companyName;
          }
        }

        return {
          ...item,
          performedBy: perfBy || item.performedBy || 'Staff',
          customerName: compName || item.customerName || '',
        };
      };

      setWhatsappItems((waRes.items || []).map(enrichActivityItem));
      if (waStatsRes) setWhatsappStats(waStatsRes as WhatsAppStats);

      setEmailItems((emRes.items || []).map(enrichActivityItem));
      if (emStatsRes) setEmailStats(emStatsRes as EmailStats);

      setOthersItems((othRes.items || []).map(enrichActivityItem));
      if (othStatsRes) setOthersStats(othStatsRes as OthersStats);

      if (fetchEmployees) fetchEmployees();
    } catch (err: any) {
      notifications.show({
        title: 'Error Loading Activity Logs',
        message: err.message || 'Could not fetch records',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Re-enrich performer names and assigned employees whenever employee context is ready/updated
  useEffect(() => {
    if (employees && employees.length > 0) {
      setWhatsappItems((prev) =>
        prev.map((item) => {
          if (!item.performedBy || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(item.performedBy) || item.performedBy === item.performedById) {
            const emp = employees.find(
              (e) =>
                (item.performedBy && (e.id === item.performedBy || e.empCode === item.performedBy)) ||
                (item.performedById && (e.id === item.performedById || e.empCode === item.performedById))
            );
            if (emp) return { ...item, performedBy: emp.name };
          }
          return item;
        })
      );

      setEmailItems((prev) =>
        prev.map((item) => {
          if (!item.performedBy || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(item.performedBy) || item.performedBy === item.performedById) {
            const emp = employees.find(
              (e) =>
                (item.performedBy && (e.id === item.performedBy || e.empCode === item.performedBy)) ||
                (item.performedById && (e.id === item.performedById || e.empCode === item.performedById))
            );
            if (emp) return { ...item, performedBy: emp.name };
          }
          return item;
        })
      );

      setOthersItems((prev) =>
        prev.map((item) => {
          if (!item.performedBy || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(item.performedBy) || item.performedBy === item.performedById) {
            const emp = employees.find(
              (e) =>
                (item.performedBy && (e.id === item.performedBy || e.empCode === item.performedBy)) ||
                (item.performedById && (e.id === item.performedById || e.empCode === item.performedById))
            );
            if (emp) return { ...item, performedBy: emp.name };
          }
          return item;
        })
      );

      setCalls((prev) =>
        prev.map((c) => {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(c.employeeName) || c.employeeName === c.employeeId) {
            const emp = employees.find((e) => e.id === c.employeeName || e.empCode === c.employeeName || e.id === c.employeeId);
            if (emp) return { ...c, employeeName: emp.name };
          }
          return c;
        })
      );
    }
  }, [employees]);

  // Listen to update events from contact updates or call actions
  useEffect(() => {
    const handleUpdated = () => {
      loadAllData();
    };
    window.addEventListener('crm_call_logs_updated', handleUpdated);
    window.addEventListener('crm_activities_updated', handleUpdated);
    return () => {
      window.removeEventListener('crm_call_logs_updated', handleUpdated);
      window.removeEventListener('crm_activities_updated', handleUpdated);
    };
  }, []);

  // Reset pagination & filters on section change
  const handleSectionChange = (sec: ActivityLogSection) => {
    setActiveSection(sec);
    setSearchInput('');
    setStatusFilter('All');
    setGenericSubTab('ALL');
    setCallTab('ALL');
    setPage(1);
  };

  // -------------------------------------------------------------------------
  // FILTERING LOGIC
  // -------------------------------------------------------------------------

  // 1. Calls filtering
  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      if (callTab === 'INCOMING' && call.callType.toLowerCase() !== 'incoming') return false;
      if (callTab === 'OUTGOING' && call.callType.toLowerCase() !== 'outgoing') return false;
      if (callTab === 'COMPLETED' && call.status.toLowerCase() !== 'completed') return false;
      if (callTab === 'FOLLOW_UP' && !call.status.toLowerCase().includes('follow')) return false;
      if (callTab === 'MISSED' && call.status.toLowerCase() !== 'missed') return false;

      if (statusFilter !== 'All') {
        const sFilter = statusFilter.toLowerCase();
        const cStatus = (call.status || '').toLowerCase();
        if (sFilter.includes('not interest') || sFilter.includes('not intrest')) {
          if (!cStatus.includes('not interest') && !cStatus.includes('not intrest')) return false;
        } else if (sFilter.includes('interest') || sFilter.includes('intrest')) {
          if (cStatus.includes('not') || (!cStatus.includes('interest') && !cStatus.includes('intrest'))) return false;
        } else if (sFilter.includes('follow')) {
          if (!cStatus.includes('follow')) return false;
        } else if (cStatus !== sFilter) {
          return false;
        }
      }

      if (!isDateMatchingFilter(call.callDate || call.createdAt, dateFilter)) {
        return false;
      }

      if (searchInput.trim()) {
        const q = searchInput.toLowerCase();
        const matchEmp = (call.employeeName || '').toLowerCase().includes(q);
        const matchContact = (call.contactName || '').toLowerCase().includes(q);
        const matchCompany = (call.companyName || '').toLowerCase().includes(q);
        const matchPhone = (call.phoneNumber || '').toLowerCase().includes(q);
        const matchId = (call.callId || '').toLowerCase().includes(q);
        const matchNotes = (call.description || '').toLowerCase().includes(q);
        const matchStatus = (call.status || '').toLowerCase().includes(q);
        if (!matchEmp && !matchContact && !matchCompany && !matchPhone && !matchId && !matchNotes && !matchStatus) return false;
      }

      return true;
    });
  }, [calls, callTab, statusFilter, dateFilter, searchInput]);

  // 2. Generic Activities filtering (WhatsApp, Email, Others)
  const getFilteredActivities = (items: ActivityLogItem[]) => {
    return items.filter((item) => {
      if (genericSubTab !== 'ALL') {
        const sLow = (item.status || '').toLowerCase();
        const tLow = genericSubTab.toLowerCase();
        if (tLow === 'sent' && !sLow.includes('sent')) return false;
        if (tLow === 'replied' && !sLow.includes('replied')) return false;
        if (tLow === 'draft' && !sLow.includes('draft')) return false;
        if (tLow === 'interested' && (!sLow.includes('interest') || sLow.includes('not'))) return false;
        if (tLow === 'follow' && !sLow.includes('follow')) return false;
        if (tLow === 'failed' && !sLow.includes('fail')) return false;
        if (tLow === 'not_interested' && (!sLow.includes('not interest') && !sLow.includes('not intrest'))) return false;
      }

      if (statusFilter !== 'All') {
        const sFilter = statusFilter.toLowerCase();
        const itemStatus = (item.status || '').toLowerCase();
        if (sFilter.includes('interest') && !sFilter.includes('not')) {
          if (!itemStatus.includes('interest') || itemStatus.includes('not')) return false;
        } else if (sFilter.includes('not interest') || sFilter.includes('not intrest')) {
          if (!itemStatus.includes('not interest') && !itemStatus.includes('not intrest')) return false;
        } else if (sFilter.includes('follow')) {
          if (!itemStatus.includes('follow')) return false;
        } else if (itemStatus !== sFilter) {
          return false;
        }
      }

      if (!isDateMatchingFilter(item.activityDate || item.createdAt, dateFilter)) {
        return false;
      }

      if (searchInput.trim()) {
        const q = searchInput.toLowerCase();
        const matchContact = (item.contactName || '').toLowerCase().includes(q);
        const matchCompany = (item.customerName || (item.metadata as any)?.companyName || '').toLowerCase().includes(q);
        const matchPhone = (item.phone || item.phoneNumber || (item.metadata as any)?.phoneNumber || '').toLowerCase().includes(q);
        const matchEmail = (item.email || (item.metadata as any)?.email || '').toLowerCase().includes(q);
        const matchPerformer = (item.performedBy || '').toLowerCase().includes(q);
        const matchId = (item.activityNumber || '').toLowerCase().includes(q);
        const matchNotes = (item.description || '').toLowerCase().includes(q);
        const matchStatus = (item.status || '').toLowerCase().includes(q);
        if (
          !matchContact &&
          !matchCompany &&
          !matchPhone &&
          !matchEmail &&
          !matchPerformer &&
          !matchId &&
          !matchNotes &&
          !matchStatus
        ) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredWhatsApp = useMemo(() => getFilteredActivities(whatsappItems), [whatsappItems, genericSubTab, statusFilter, dateFilter, searchInput]);
  const filteredEmail = useMemo(() => getFilteredActivities(emailItems), [emailItems, genericSubTab, statusFilter, dateFilter, searchInput]);
  const filteredOthers = useMemo(() => getFilteredActivities(othersItems), [othersItems, genericSubTab, statusFilter, dateFilter, searchInput]);

  // Current list based on active section
  const currentList = useMemo(() => {
    if (activeSection === 'calls') return filteredCalls;
    if (activeSection === 'whatsapp') return filteredWhatsApp;
    if (activeSection === 'email') return filteredEmail;
    return filteredOthers;
  }, [activeSection, filteredCalls, filteredWhatsApp, filteredEmail, filteredOthers]);

  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, page, pageSize]);

  // -------------------------------------------------------------------------
  // HANDLERS (SAVE & DELETE)
  // -------------------------------------------------------------------------

  const handleOpenAddModal = () => {
    if (activeSection === 'calls') {
      setEditingCall(null);
      setCallModalOpen(true);
    } else {
      setActivityModalOpen(true);
    }
  };

  const handleSaveCall = async (payload: Partial<CallLog>) => {
    setSubmitting(true);
    try {
      if (editingCall) {
        const updated = await updateCallLogApi(editingCall.id, payload);
        if (updated) {
          setCalls((prev) => prev.map((c) => (c.id === editingCall.id ? { ...c, ...updated } : c)));
        }
        notifications.show({
          title: 'Call Record Updated',
          message: 'Call log details have been updated successfully.',
          color: 'blue',
        });
      } else {
        const created = await createCallLogApi(payload);
        if (created) {
          setCalls((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        }
        notifications.show({
          title: 'Call Logged Successfully',
          message: 'New call record has been saved.',
          color: 'teal',
        });
      }
      setCallModalOpen(false);
      setEditingCall(null);
      window.dispatchEvent(new CustomEvent('crm_call_logs_updated'));
      await loadAllData();
    } catch (err: any) {
      notifications.show({
        title: 'Save Failed',
        message: err.message || 'Could not save call record.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveActivity = async (payload: Partial<ActivityLogItem>) => {
    setSubmitting(true);
    try {
      const created = await createSectionActivityApi(activeSection, payload);

      // If scheduled meeting from Activity Logs, automatically synchronize to Meetings & Lead modules
      if (activeSection === 'others' && (payload.activityType === 'Meeting' || payload.activityType === 'Client Meeting')) {
        try {
          await createMeetingApi({
            contactId: payload.contactId || undefined,
            leadId: payload.leadId || undefined,
            clientName: payload.customerName ? `${payload.contactName} (${payload.customerName})` : payload.contactName,
            title: `Meeting with ${payload.contactName}`,
            purpose: payload.description || 'Client Meeting Discussion',
            meetingDate: payload.activityDate || new Date().toISOString().slice(0, 10),
            startTime: payload.activityTime || '10:00 AM',
            status: payload.status === 'Interested' ? 'Scheduled' : (payload.status || 'Scheduled'),
            employeeId: payload.performedById || undefined,
            employeeName: payload.performedBy || 'Staff',
            notes: payload.description || undefined,
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('crm_meetings_updated'));
          }
        } catch (mErr) {
          console.warn('Error creating scheduled meeting from Activity Logs:', mErr);
        }
      }

      notifications.show({
        title: 'Activity Logged Successfully',
        message: `${activeSection.toUpperCase()} activity recorded in database.`,
        color: 'teal',
      });
      setActivityModalOpen(false);
      window.dispatchEvent(new CustomEvent('crm_activities_updated'));
      await loadAllData();
    } catch (err: any) {
      notifications.show({
        title: 'Save Failed',
        message: err.message || 'Could not save activity record.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.section === 'calls') {
        await deleteCallLogApi(deleteTarget.id);
        setCalls((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      } else {
        await deleteSectionActivityApi(deleteTarget.section, deleteTarget.id);
        if (deleteTarget.section === 'whatsapp') {
          setWhatsappItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        } else if (deleteTarget.section === 'email') {
          setEmailItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        } else {
          setOthersItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        }
      }
      notifications.show({
        title: 'Record Removed',
        message: 'The record has been permanently deleted.',
        color: 'blue',
      });
      setDeleteTarget(null);
      await loadAllData();
    } catch (err: any) {
      notifications.show({
        title: 'Delete Failed',
        message: err.message || 'Could not delete record.',
        color: 'red',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Status dropdown options based on active section
  const statusDropdownOptions = useMemo(() => {
    if (activeSection === 'calls') {
      return [
        { value: 'All', label: 'All Statuses' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Follow-up', label: 'Follow-up' },
        { value: 'Interested', label: 'Interested' },
        { value: 'Missed', label: 'Missed' },
        { value: 'Busy', label: 'Busy' },
        { value: 'No Answer', label: 'No Answer' },
        { value: 'Not Interested', label: 'Not Interested' },
      ];
    }
    if (activeSection === 'whatsapp') {
      return [
        { value: 'All', label: 'All Statuses' },
        { value: 'Msg Sent', label: 'Msg Sent' },
        { value: 'Replied', label: 'Replied' },
        { value: 'Interested', label: 'Interested' },
        { value: 'Follow up', label: 'Follow up' },
        { value: 'Failed', label: 'Failed' },
        { value: 'Not Interested', label: 'Not Interested' },
      ];
    }
    if (activeSection === 'email') {
      return [
        { value: 'All', label: 'All Statuses' },
        { value: 'Mail Sent', label: 'Mail Sent' },
        { value: 'Replied', label: 'Replied' },
        { value: 'Draft', label: 'Draft' },
        { value: 'Interested', label: 'Interested' },
        { value: 'Follow up', label: 'Follow up' },
        { value: 'Failed', label: 'Failed' },
        { value: 'Not Interested', label: 'Not Interested' },
      ];
    }
    return [
      { value: 'All', label: 'All Statuses' },
      { value: 'Interested', label: 'Interested' },
      { value: 'Follow up', label: 'Follow up' },
      { value: 'Not Interested', label: 'Not Interested' },
    ];
  }, [activeSection]);

  // Section button label
  const getActionBtnLabel = () => {
    if (activeSection === 'calls') return 'Log Call';
    if (activeSection === 'whatsapp') return 'Log WhatsApp';
    if (activeSection === 'email') return 'Log Email';
    return 'Log Activity';
  };

  return (
    <Box p={{ base: 'xs', sm: 'sm', md: 'md' }} style={{ width: '100%', maxWidth: '100%' }}>
      {/* ========================================================================= */}
      {/* MODULE HEADER                                                             */}
      {/* ========================================================================= */}
      <Paper
        p="md"
        radius="lg"
        mb="md"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <div>
            <Group gap="xs" align="center">
              <Text size="xl" fw={700} style={{ color: isDark ? '#F1F5F9' : '#0F172A', letterSpacing: '-0.02em' }}>
                Activity Logs
              </Text>
              <Badge color="indigo" variant="light" size="sm">
                Omni-Channel
              </Badge>
            </Group>
          </div>

          {/* Section Navigation Tabs (Segmented Control Pill Bar) */}
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              padding: 4,
              borderRadius: 12,
              border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
            }}
          >
            {[
              { id: 'calls' as ActivityLogSection, label: 'Calls', icon: IconPhoneCall, count: calls.length, color: '#4F46E5' },
              { id: 'whatsapp' as ActivityLogSection, label: 'WhatsApp', icon: IconBrandWhatsapp, count: whatsappItems.length, color: '#16A34A' },
              { id: 'email' as ActivityLogSection, label: 'Email', icon: IconMail, count: emailItems.length, color: '#2563EB' },
              { id: 'others' as ActivityLogSection, label: 'Others', icon: IconActivity, count: othersItems.length, color: '#D97706' },
            ].map((sec) => {
              const active = activeSection === sec.id;
              const IconComp = sec.icon;
              return (
                <UnstyledButton
                  key={sec.id}
                  onClick={() => handleSectionChange(sec.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    backgroundColor: active ? (isDark ? '#0F172A' : '#FFFFFF') : 'transparent',
                    color: active ? (isDark ? '#818CF8' : sec.color) : isDark ? '#94A3B8' : '#64748B',
                    boxShadow: active ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <IconComp size={16} stroke={active ? 2.2 : 1.8} />
                  <span>{sec.label}</span>
                  <Box
                    style={{
                      minWidth: 20,
                      height: 20,
                      padding: '0 6px',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: active
                        ? isDark
                          ? '#4338CA'
                          : sec.color
                        : isDark
                        ? '#334155'
                        : '#CBD5E1',
                      color: active ? '#FFFFFF' : isDark ? '#94A3B8' : '#475569',
                    }}
                  >
                    {sec.count}
                  </Box>
                </UnstyledButton>
              );
            })}
          </Box>
        </Group>
      </Paper>


      {/* ========================================================================= */}
      {/* FILTER CONTROLS BAR                                                       */}
      {/* ========================================================================= */}
      <Paper
        p="sm"
        radius="lg"
        mb="md"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          {/* Sub-Filters Tabs */}
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              padding: 3,
              borderRadius: 10,
              border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
            }}
          >
            {activeSection === 'calls'
              ? [
                  { id: 'ALL' as ActiveCallTabType, label: 'All' },
                  { id: 'INCOMING' as ActiveCallTabType, label: 'Incoming' },
                  { id: 'OUTGOING' as ActiveCallTabType, label: 'Outgoing' },
                  { id: 'COMPLETED' as ActiveCallTabType, label: 'Completed' },
                  { id: 'FOLLOW_UP' as ActiveCallTabType, label: 'Follow-up' },
                  { id: 'MISSED' as ActiveCallTabType, label: 'Missed' },
                ].map((tab) => {
                  const active = callTab === tab.id;
                  return (
                    <UnstyledButton
                      key={tab.id}
                      onClick={() => {
                        setCallTab(tab.id);
                        setPage(1);
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: active ? 700 : 500,
                        backgroundColor: active ? (isDark ? '#0F172A' : '#FFFFFF') : 'transparent',
                        color: active ? (isDark ? '#818CF8' : '#4F46E5') : isDark ? '#94A3B8' : '#64748B',
                        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </UnstyledButton>
                  );
                })
              : activeSection === 'whatsapp'
              ? [
                  { id: 'ALL', label: 'All' },
                  { id: 'sent', label: 'Msg Sent' },
                  { id: 'replied', label: 'Replied' },
                  { id: 'interested', label: 'Interested' },
                  { id: 'follow', label: 'Follow up' },
                  { id: 'failed', label: 'Failed' },
                  { id: 'not_interested', label: 'Not Interested' },
                ].map((tab) => {
                  const active = genericSubTab === tab.id;
                  return (
                    <UnstyledButton
                      key={tab.id}
                      onClick={() => {
                        setGenericSubTab(tab.id);
                        setPage(1);
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: active ? 700 : 500,
                        backgroundColor: active ? (isDark ? '#0F172A' : '#FFFFFF') : 'transparent',
                        color: active ? (isDark ? '#4ADE80' : '#16A34A') : isDark ? '#94A3B8' : '#64748B',
                        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </UnstyledButton>
                  );
                })
              : activeSection === 'email'
              ? [
                  { id: 'ALL', label: 'All' },
                  { id: 'sent', label: 'Mail Sent' },
                  { id: 'replied', label: 'Replied' },
                  { id: 'draft', label: 'Draft' },
                  { id: 'interested', label: 'Interested' },
                  { id: 'follow', label: 'Follow up' },
                  { id: 'failed', label: 'Failed' },
                  { id: 'not_interested', label: 'Not Interested' },
                ].map((tab) => {
                  const active = genericSubTab === tab.id;
                  return (
                    <UnstyledButton
                      key={tab.id}
                      onClick={() => {
                        setGenericSubTab(tab.id);
                        setPage(1);
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: active ? 700 : 500,
                        backgroundColor: active ? (isDark ? '#0F172A' : '#FFFFFF') : 'transparent',
                        color: active ? (isDark ? '#60A5FA' : '#2563EB') : isDark ? '#94A3B8' : '#64748B',
                        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </UnstyledButton>
                  );
                })
              : [
                  { id: 'ALL', label: 'All' },
                  { id: 'interested', label: 'Interested' },
                  { id: 'follow', label: 'Follow up' },
                  { id: 'not_interested', label: 'Not Interested' },
                ].map((tab) => {
                  const active = genericSubTab === tab.id;
                  return (
                    <UnstyledButton
                      key={tab.id}
                      onClick={() => {
                        setGenericSubTab(tab.id);
                        setPage(1);
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: active ? 700 : 500,
                        backgroundColor: active ? (isDark ? '#0F172A' : '#FFFFFF') : 'transparent',
                        color: active ? (isDark ? '#FBBF24' : '#D97706') : isDark ? '#94A3B8' : '#64748B',
                        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </UnstyledButton>
                  );
                })}
          </Box>

          {/* Right Controls: Search, Status Dropdown, Date Filter & Log Action Button */}
          <Group gap="xs" wrap="wrap">
            <TextInput
              placeholder="Search by contact, company, phone..."
              leftSection={<IconSearch size={15} color={isDark ? '#94A3B8' : '#64748B'} />}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.currentTarget.value);
                setPage(1);
              }}
              size="sm"
              radius="md"
              styles={{
                input: {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderColor: isDark ? '#374151' : '#E2E8F0',
                  color: isDark ? '#F1F5F9' : '#0F172A',
                  fontSize: 13,
                  height: 36,
                },
              }}
              style={{ width: 230 }}
              rightSection={
                searchInput ? (
                  <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setSearchInput('')}>
                    <IconX size={12} />
                  </ActionIcon>
                ) : null
              }
            />

            <Select
              data={statusDropdownOptions}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val || 'All');
                setPage(1);
              }}
              size="sm"
              radius="md"
              styles={{
                input: {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderColor: isDark ? '#374151' : '#E2E8F0',
                  color: isDark ? '#F1F5F9' : '#0F172A',
                  fontSize: 13,
                  height: 36,
                },
              }}
              style={{ width: 140 }}
              allowDeselect={false}
            />

            <DateFilterControl
              value={dateFilter}
              onChange={(val) => {
                setDateFilter(val);
                setPage(1);
              }}
              width={135}
            />

            <Button
              leftSection={<IconPlus size={16} />}
              radius="md"
              size="sm"
              onClick={handleOpenAddModal}
              style={{
                background:
                  activeSection === 'whatsapp'
                    ? 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)'
                    : activeSection === 'email'
                    ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                    : activeSection === 'others'
                    ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)'
                    : 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 13,
                height: 36,
                border: 'none',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
              }}
            >
              {getActionBtnLabel()}
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* ========================================================================= */}
      {/* SECTION TABLE VIEWS                                                       */}
      {/* ========================================================================= */}
      {loading ? (
        <Paper
          p="4rem"
          radius="lg"
          style={{
            background: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            textAlign: 'center',
          }}
        >
          <Center>
            <Loader size="md" color="indigo" />
          </Center>
        </Paper>
      ) : (
        <>
          {activeSection === 'calls' && (
            <CallLogTableView
              calls={paginatedList as CallLog[]}
              onEdit={(call) => {
                setEditingCall(call);
                setCallModalOpen(true);
              }}
              onDelete={(call) => setDeleteTarget({ id: call.id, name: call.callId, section: 'calls' })}
              onAddNew={handleOpenAddModal}
              onViewDetails={(call) => setDetailsCall(call)}
              loading={loading}
            />
          )}

          {activeSection === 'whatsapp' && (
            <WhatsAppTableView
              items={paginatedList as ActivityLogItem[]}
              onViewDetails={(item) => setDetailsActivity(item)}
              onDelete={(item) => setDeleteTarget({ id: item.id, name: item.activityNumber, section: 'whatsapp' })}
              onAddNew={handleOpenAddModal}
              loading={loading}
            />
          )}

          {activeSection === 'email' && (
            <EmailTableView
              items={paginatedList as ActivityLogItem[]}
              onViewDetails={(item) => setDetailsActivity(item)}
              onDelete={(item) => setDeleteTarget({ id: item.id, name: item.activityNumber, section: 'email' })}
              onAddNew={handleOpenAddModal}
              loading={loading}
            />
          )}

          {activeSection === 'others' && (
            <OthersTableView
              items={paginatedList as ActivityLogItem[]}
              onViewDetails={(item) => setDetailsActivity(item)}
              onDelete={(item) => setDeleteTarget({ id: item.id, name: item.activityNumber, section: 'others' })}
              onAddNew={handleOpenAddModal}
              loading={loading}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Group justify="space-between" align="center" mt="md" wrap="wrap">
              <Text size="xs" c="dimmed">
                Showing {paginatedList.length} of {currentList.length} records
              </Text>
              <Pagination
                total={totalPages}
                value={page}
                onChange={setPage}
                size="sm"
                radius="md"
                color="indigo"
              />
            </Group>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 1. Calls Create / Edit Modal */}
      <CallLogModal
        opened={callModalOpen}
        onClose={() => {
          setCallModalOpen(false);
          setEditingCall(null);
        }}
        onSave={handleSaveCall}
        editingCall={editingCall}
        employees={employees}
        contacts={allContacts}
        leads={leads}
        submitting={submitting}
      />

      {/* 2. Calls Details Modal */}
      <CallDetailsModal
        call={detailsCall}
        opened={!!detailsCall}
        onClose={() => setDetailsCall(null)}
        onEdit={(call) => {
          setDetailsCall(null);
          setEditingCall(call);
          setCallModalOpen(true);
        }}
        onDelete={(call) => {
          setDetailsCall(null);
          setDeleteTarget({ id: call.id, name: call.callId, section: 'calls' });
        }}
      />

      {/* 3. WhatsApp / Email / Others Create Modal */}
      <ActivityLogModal
        section={activeSection}
        opened={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        onSubmit={handleSaveActivity}
        submitting={submitting}
        contacts={allContacts}
      />

      {/* 4. WhatsApp / Email / Others Details Modal */}
      <ActivityDetailsModal
        activity={detailsActivity}
        opened={!!detailsActivity}
        onClose={() => setDetailsActivity(null)}
        onDelete={(act) => {
          setDetailsActivity(null);
          setDeleteTarget({ id: act.id, name: act.activityNumber, section: activeSection });
        }}
      />

      {/* 5. Delete Confirmation Modal */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="#EF4444" />
            <Text fw={700} size="md" c="red">
              Delete Record
            </Text>
          </Group>
        }
        size="sm"
        radius="lg"
      >
        <Text size="sm" mb="md" c={isDark ? '#E2E8F0' : '#475569'}>
          Are you sure you want to delete record{' '}
          <Text span fw={700} c={isDark ? '#FFFFFF' : '#0F172A'}>
            {deleteTarget?.name}
          </Text>
          ? This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" radius="md" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button color="red" radius="md" loading={deleteLoading} onClick={handleConfirmDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Box>
  );
};
