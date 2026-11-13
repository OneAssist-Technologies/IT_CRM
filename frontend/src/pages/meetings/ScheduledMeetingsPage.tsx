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
  Stack,
  Textarea,
  SimpleGrid,
  ThemeIcon,
  Loader,
  Center,
  Paper,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconPlus,
  IconX,
  IconAlertTriangle,
  IconAlertCircle,
  IconCalendarEvent,
  IconArrowLeft,
  IconBuilding,
  IconUser,
  IconPhoneCall,
  IconMail,
  IconLayersSubtract,
} from '@tabler/icons-react';
import { ScheduledMeeting, MeetingStats } from '../../types/meeting';
import { Lead } from '../../types/lead';
import {
  DateFilterControl,
  DateFilterValue,
  DEFAULT_DATE_FILTER,
  isDateMatchingFilter,
} from '../../components/common/DateFilterControl';
import {
  fetchMeetingsApi,
  fetchMeetingStatsApi,
  createMeetingApi,
  updateMeetingApi,
  deleteMeetingApi,
} from '../../services/meetingService';
import { leadService } from '../../services/leadService';
import { contactService } from '../../services/contactService';
import { customerService } from '../../services/customerService';
import { Contact } from '../../types/contact';
import { useEmployee } from '../../context/EmployeeContext';
import { useCRM } from '../../context/CRMContext';
import { useLead } from '../../context/LeadContext';
import { CRM_COLORS } from '../../theme/colors';
import { MeetingTableView } from './components/MeetingTableView';
import { LeadMeetingsTableView } from './components/LeadMeetingsTableView';
import { MeetingDetailsModal } from './components/MeetingDetailsModal';
import { MeetingTimePicker } from './components/MeetingTimePicker';
import { MeetingDatePicker } from './components/MeetingDatePicker';
import { findLeadForMeeting, isMeetingForLead } from './meetingLeadUtils';

type ActiveLeadTabType = 'ALL' | 'TODAY' | 'UPCOMING' | 'COMPLETED';

export const ScheduledMeetingsPage: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { employees } = useEmployee();
  const { activeNav, setActiveNav } = useCRM();
  const { leads, setSelectedLead, fetchLeads } = useLead();
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);

  const baseLeads = allLeads.length > 0 ? allLeads : leads;

  const effectiveLeads = useMemo(() => {
    const list: Lead[] = [...baseLeads];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    list.forEach((l) => {
      if (l.id) seenIds.add(String(l.id));
      if (l.leadId) seenIds.add(String(l.leadId));
      if (l.name) seenNames.add(l.name.toLowerCase().trim());
    });

    // 1. Incorporate CRM contacts as virtual leads
    allContacts.forEach((c) => {
      const cId = String(c.id);
      const cContactId = c.contactId ? String(c.contactId) : '';
      const cName = (c.name || c.contactPerson || '').trim();
      const cNameLower = cName.toLowerCase();

      const exists =
        seenIds.has(cId) ||
        (cContactId && seenIds.has(cContactId)) ||
        (cName && seenNames.has(cNameLower));

      if (!exists && cName) {
        seenIds.add(cId);
        if (cContactId) seenIds.add(cContactId);
        seenNames.add(cNameLower);

        list.push({
          id: c.id,
          leadId: c.contactId || c.id,
          name: c.name || c.contactPerson || 'Contact',
          companyName: c.companyName || '',
          email: c.email || '',
          phone: c.phone || '',
          profession: (c as any).designation || 'Contact',
          status: c.status || 'New',
          stage: c.stage || 'Initialization',
          assignedTo: c.assignedTo || '',
          createdAt: c.createdAt || new Date().toISOString(),
        } as Lead);
      }
    });

    // 2. Incorporate Customers (e.g. from Support Tickets and converted accounts)
    allCustomers.forEach((cust) => {
      const custId = String(cust.id);
      const custCode = cust.customerId ? String(cust.customerId) : '';
      const custName = (cust.contactPerson || cust.name || cust.companyName || '').trim();
      const custCo = cust.companyName || cust.name || '';
      const custNameLower = custName.toLowerCase();

      const exists =
        seenIds.has(custId) ||
        (custCode && seenIds.has(custCode)) ||
        (custName && seenNames.has(custNameLower));

      if (!exists && (custName || custCo)) {
        seenIds.add(custId);
        if (custCode) seenIds.add(custCode);
        if (custName) seenNames.add(custNameLower);

        list.push({
          id: custId,
          leadId: custCode || custId,
          name: custName || custCo,
          companyName: custCo,
          email: cust.email || '',
          phone: cust.phone || '',
          profession: cust.designation || 'Customer',
          status: 'Customer',
          stage: 'Customer',
          assignedTo: cust.accountManager || '',
          createdAt: cust.createdAt || new Date().toISOString(),
        } as Lead);
      }
    });

    // 3. Synthesize virtual leads for any meeting not matched yet
    meetings.forEach((m) => {
      const matched = findLeadForMeeting(m, list);
      if (!matched) {
        const rawName = (m.clientName || m.leadName || 'Client').replace(/\s*\(.*?\)\s*/g, '').trim() || 'Client';
        const rawCompany = m.clientName && m.clientName.includes('(')
          ? m.clientName.split('(')[1].replace(')', '').trim()
          : '';
        const synthId = m.contactId || m.leadId || `synth-${m.id}`;

        const synthLead: Lead = {
          id: synthId,
          leadId: m.contactId || m.leadId || `MEET-${m.id.slice(0, 8)}`,
          name: rawName,
          companyName: rawCompany,
          email: '',
          phone: '',
          profession: 'Client',
          status: m.status || 'Scheduled',
          stage: 'Meeting',
          assignedTo: m.employeeName || '',
          createdAt: m.createdAt || new Date().toISOString(),
        } as Lead;

        seenIds.add(synthId);
        seenNames.add(rawName.toLowerCase());
        list.push(synthLead);
      }
    });

    return list;
  }, [baseLeads, allContacts, allCustomers, meetings]);
  const [stats, setStats] = useState<MeetingStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Drill-down State: Which lead's meetings are currently being viewed
  const [activeLeadSelection, setActiveLeadSelection] = useState<Lead | null>(null);

  // Meeting Details Modal State
  const [detailsMeeting, setDetailsMeeting] = useState<ScheduledMeeting | null>(null);

  // Filter States for Leads View
  const [leadTab, setLeadTab] = useState<ActiveLeadTabType>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Modal States
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingMeeting, setEditingMeeting] = useState<ScheduledMeeting | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<ScheduledMeeting | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

// Helper to compute end time from start time and duration
const calculateEndTime = (startTimeStr: string, durationStr: string): string => {
  try {
    const trimmed = (startTimeStr || '10:00 AM').trim();
    const parts = trimmed.split(' ');
    const timePart = parts[0] || '10:00';
    const meridiem = (parts[1] || 'AM').toUpperCase();
    const [h, m] = timePart.split(':').map(Number);
    let durMin = 30;
    if (durationStr.includes('15')) durMin = 15;
    else if (durationStr.includes('45')) durMin = 45;
    else if (durationStr.includes('1.5')) durMin = 90;
    else if (durationStr.includes('2')) durMin = 120;
    else if (durationStr.includes('1 Hour') || durationStr.includes('60')) durMin = 60;
    else durMin = 30;

    const baseH = (h % 12) + (meridiem === 'PM' ? 12 : 0);
    const totalMin = baseH * 60 + (isNaN(m) ? 0 : m) + durMin;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    const endMeridiem = endH >= 12 ? 'PM' : 'AM';
    const displayEndH = (endH % 12) || 12;
    return `${displayEndH}:${endM.toString().padStart(2, '0')} ${endMeridiem}`;
  } catch (_) {
    return '10:30 AM';
  }
};

const inferDuration = (start?: string, end?: string): string => {
  if (!start || !end) return '30 Minutes';
  try {
    const parseM = (t: string) => {
      const parts = t.trim().split(' ');
      const timePart = parts[0] || '10:00';
      const meridiem = (parts[1] || 'AM').toUpperCase();
      const [h, m] = timePart.split(':').map(Number);
      return ((h % 12) + (meridiem === 'PM' ? 12 : 0)) * 60 + (isNaN(m) ? 0 : m);
    };
    const diff = parseM(end) - parseM(start);
    if (diff === 15) return '15 Minutes';
    if (diff === 30) return '30 Minutes';
    if (diff === 45) return '45 Minutes';
    if (diff === 60) return '1 Hour';
    if (diff === 90) return '1.5 Hours';
    if (diff === 120) return '2 Hours';
  } catch (_) {}
  return '30 Minutes';
};

  // Form Fields State
  const [formPurpose, setFormPurpose] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState<string | null>(null);
  const [formEmployeeName, setFormEmployeeName] = useState('');
  const [formEmployeeEmail, setFormEmployeeEmail] = useState('');
  const [formEmployeeDesignation, setFormEmployeeDesignation] = useState('');
  const [formMeetingDate, setFormMeetingDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formDuration, setFormDuration] = useState('30 Minutes');
  const [formEndTime, setFormEndTime] = useState('');
  const [formMeetingType, setFormMeetingType] = useState('Virtual');
  const [formLocation, setFormLocation] = useState('');
  const [formContactId, setFormContactId] = useState<string | null>(null);
  const [formClientName, setFormClientName] = useState('');
  const [formStatus, setFormStatus] = useState('Scheduled');
  const [formNotes, setFormNotes] = useState('');

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [meetingsRes, statsRes, leadsRes, contactsRes, customersRes] = await Promise.all([
        fetchMeetingsApi(),
        fetchMeetingStatsApi().catch(() => null),
        leadService.getLeads({}, { page: 1, limit: 1000 }).catch(() => null),
        contactService.getContacts({ limit: 1000 }).catch(() => null),
        customerService.getCustomers({ limit: 1000 }).catch(() => null),
      ]);
      setMeetings(meetingsRes.meetings || []);
      if (statsRes) setStats(statsRes);
      if (leadsRes && leadsRes.data) {
        setAllLeads(leadsRes.data);
      }
      if (contactsRes && contactsRes.data) {
        setAllContacts(contactsRes.data);
      }
      if (customersRes && (customersRes.data || (customersRes as any).customers)) {
        setAllCustomers(customersRes.data || (customersRes as any).customers || []);
      }
      if (fetchLeads) fetchLeads();
    } catch (err: any) {
      notifications.show({
        title: 'Error Loading Meetings',
        message: err.message || 'Could not fetch scheduled meetings',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeNav === 'scheduled-meetings' || activeNav === 'meetings') {
      loadData();
    }
  }, [activeNav]);

  useEffect(() => {
    const handleUpdated = () => {
      loadData();
    };
    window.addEventListener('crm_meetings_updated', handleUpdated);
    window.addEventListener('crm_contacts_updated', handleUpdated);
    window.addEventListener('crm_customers_updated', handleUpdated);
    window.addEventListener('crm_leads_updated', handleUpdated);
    window.addEventListener('crm_activities_updated', handleUpdated);
    return () => {
      window.removeEventListener('crm_meetings_updated', handleUpdated);
      window.removeEventListener('crm_contacts_updated', handleUpdated);
      window.removeEventListener('crm_customers_updated', handleUpdated);
      window.removeEventListener('crm_leads_updated', handleUpdated);
      window.removeEventListener('crm_activities_updated', handleUpdated);
    };
  }, []);

  // Auto-open meeting details if navigated via "View Outcome" from Activity Pipeline
  useEffect(() => {
    if (activeNav !== 'scheduled-meetings' && activeNav !== 'meetings') return;
    const targetMeetingId = sessionStorage.getItem('crm_open_meeting_id');
    const targetMeetingDataStr = sessionStorage.getItem('crm_open_meeting_data');
    if (!targetMeetingId && !targetMeetingDataStr) return;

    let targetMeetingData: ScheduledMeeting | null = null;
    try {
      if (targetMeetingDataStr) targetMeetingData = JSON.parse(targetMeetingDataStr);
    } catch (_) {}

    const openMeetingModal = (targetMeeting: ScheduledMeeting) => {
      // Find matching lead strictly by ID or exact name
      const matchedLead = findLeadForMeeting(targetMeeting, leads);

      if (matchedLead) {
        setActiveLeadSelection(matchedLead);
      } else {
        try {
          const saved = sessionStorage.getItem('crm_selected_lead');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed) setActiveLeadSelection(parsed);
          }
        } catch (_) {}
      }

      setDetailsMeeting(targetMeeting);
      sessionStorage.removeItem('crm_open_meeting_id');
      sessionStorage.removeItem('crm_open_meeting_data');
      return true;
    };

    // 1. If full meeting data is in session, open it immediately without any delay!
    if (targetMeetingData) {
      const fresh = meetings.find((m) => String(m.id) === String(targetMeetingId || targetMeetingData?.id));
      openMeetingModal(fresh || targetMeetingData);
      return;
    }

    // 2. Otherwise search in meetings list with String comparison
    const found = meetings.find((m) => String(m.id) === String(targetMeetingId));
    if (found) {
      openMeetingModal(found);
    } else {
      fetchMeetingsApi()
        .then((res) => {
          if (res.meetings) {
            setMeetings(res.meetings);
            const foundInApi = res.meetings.find((m) => String(m.id) === String(targetMeetingId));
            if (foundInApi) {
              openMeetingModal(foundInApi);
            }
          }
        })
        .catch(() => {});
    }
  }, [activeNav, meetings, effectiveLeads]);

  // Map meetings to leads
  const leadMeetingsMap = useMemo(() => {
    const map = new Map<string, ScheduledMeeting[]>();
    effectiveLeads.forEach((l) => map.set(l.id, []));

    meetings.forEach((m) => {
      // Find matching lead strictly by ID or exact name
      const matched = findLeadForMeeting(m, effectiveLeads);
      if (matched) {
        const arr = map.get(matched.id) || [];
        arr.push(m);
        map.set(matched.id, arr);
      }
    });

    return map;
  }, [effectiveLeads, meetings]);

  // Filtered Leads List (ONLY leads that have meetings are displayed)
  const filteredLeads = useMemo(() => {
    return effectiveLeads.filter((lead) => {
      const leadMeets = leadMeetingsMap.get(lead.id) || [];
      const hasMeetings = leadMeets.length > 0;

      // Must have scheduled meetings
      if (!hasMeetings) return false;

      const activeMeets = leadMeets.filter(
        (m) => (m.status || m.meetingStatus || '').toLowerCase() !== 'cancelled'
      );
      const pendingMeets = activeMeets.filter(
        (m) => (m.status || m.meetingStatus || '').toLowerCase() !== 'completed'
      );
      const isAllCompleted = activeMeets.length > 0 && pendingMeets.length === 0;

      const hasToday = pendingMeets.some((m) => m.meetingDate === todayStr) || (isAllCompleted && activeMeets.some((m) => m.meetingDate === todayStr));
      const hasUpcoming = pendingMeets.some((m) => m.meetingDate > todayStr);

      // 1. Tab filter
      if (leadTab === 'TODAY' && !hasToday) return false;
      if (leadTab === 'UPCOMING' && !hasUpcoming) return false;
      if (leadTab === 'COMPLETED' && !isAllCompleted) return false;

      // 2. Status dropdown filter
      if (statusFilter !== 'All') {
        const matchesStatus = leadMeets.some(
          (m) => (m.status || m.meetingStatus || '').toLowerCase() === statusFilter.toLowerCase()
        );
        if (!matchesStatus) return false;
      }

      // 2b. Date filter
      if (dateFilter.type !== 'ALL') {
        const matchesDate = leadMeets.some((m) =>
          isDateMatchingFilter(m.meetingDate || (m as any).date || m.createdAt, dateFilter)
        );
        if (!matchesDate) return false;
      }

      // 3. Search query
      if (searchInput.trim()) {
        const query = searchInput.toLowerCase();
        const matchName = (lead.name || '').toLowerCase().includes(query);
        const matchCompany = (lead.companyName || '').toLowerCase().includes(query);
        const matchEmail = (lead.email || '').toLowerCase().includes(query);
        const matchPhone = (lead.phone || '').toLowerCase().includes(query);
        const matchProfession = (lead.profession || '').toLowerCase().includes(query);
        const matchMeeting = leadMeets.some(
          (m) =>
            (m.title || '').toLowerCase().includes(query) ||
            (m.purpose || '').toLowerCase().includes(query) ||
            (m.employeeName || '').toLowerCase().includes(query)
        );
        if (!matchName && !matchCompany && !matchEmail && !matchPhone && !matchProfession && !matchMeeting)
          return false;
      }

      return true;
    });
  }, [effectiveLeads, leadMeetingsMap, leadTab, statusFilter, dateFilter, searchInput, todayStr]);

  // Pagination for Leads list
  const totalLeadPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, page, pageSize]);

  // Counts for top capsule pills (for leads with meetings)
  const leadsWithMeetings = useMemo(() => {
    return effectiveLeads.filter((l) => (leadMeetingsMap.get(l.id) || []).length > 0);
  }, [effectiveLeads, leadMeetingsMap]);

  const totalLeadsWithMeetingsCount = leadsWithMeetings.length;

  const todayLeadsCount = useMemo(() => {
    return leadsWithMeetings.filter((l) => {
      const lm = leadMeetingsMap.get(l.id) || [];
      const active = lm.filter((m) => (m.status || m.meetingStatus || '').toLowerCase() !== 'cancelled');
      const pending = active.filter((m) => (m.status || m.meetingStatus || '').toLowerCase() !== 'completed');
      const isAllDone = active.length > 0 && pending.length === 0;
      return pending.some((m) => m.meetingDate === todayStr) || (isAllDone && active.some((m) => m.meetingDate === todayStr));
    }).length;
  }, [leadsWithMeetings, leadMeetingsMap, todayStr]);

  const upcomingLeadsCount = useMemo(() => {
    return leadsWithMeetings.filter((l) => {
      const lm = leadMeetingsMap.get(l.id) || [];
      const active = lm.filter((m) => (m.status || m.meetingStatus || '').toLowerCase() !== 'cancelled');
      const pending = active.filter((m) => (m.status || m.meetingStatus || '').toLowerCase() !== 'completed');
      return pending.some((m) => m.meetingDate > todayStr);
    }).length;
  }, [leadsWithMeetings, leadMeetingsMap, todayStr]);

  const completedLeadsCount = useMemo(() => {
    return leadsWithMeetings.filter((l) => {
      const lm = leadMeetingsMap.get(l.id) || [];
      const active = lm.filter((m) => (m.status || m.meetingStatus || '').toLowerCase() !== 'cancelled');
      const pending = active.filter((m) => (m.status || m.meetingStatus || '').toLowerCase() !== 'completed');
      return active.length > 0 && pending.length === 0;
    }).length;
  }, [leadsWithMeetings, leadMeetingsMap]);

  // Selected Lead's Meetings (filtered strictly by the active tab if on Completed/Today/Upcoming)
  const selectedLeadMeetings = useMemo(() => {
    if (!activeLeadSelection) return [];
    let leadMeets = meetings.filter((m) => isMeetingForLead(m, activeLeadSelection));
    if (leadTab === 'COMPLETED') {
      leadMeets = leadMeets.filter(
        (m) => (m.status || m.meetingStatus || '').toLowerCase() === 'completed'
      );
    } else if (leadTab === 'TODAY') {
      leadMeets = leadMeets.filter((m) => m.meetingDate === todayStr);
    } else if (leadTab === 'UPCOMING') {
      leadMeets = leadMeets.filter(
        (m) => m.meetingDate && m.meetingDate > todayStr && (m.status || m.meetingStatus || '').toLowerCase() !== 'cancelled'
      );
    }
    if (dateFilter.type !== 'ALL') {
      leadMeets = leadMeets.filter((m) =>
        isDateMatchingFilter(m.meetingDate || (m as any).date || m.createdAt, dateFilter)
      );
    }
    return leadMeets;
  }, [activeLeadSelection, meetings, leadTab, dateFilter, todayStr]);

  // Handlers
  const handleLeadTabChange = (tab: ActiveLeadTabType) => {
    setLeadTab(tab);
    setPage(1);
  };

  const handleSelectLead = (lead: Lead) => {
    setActiveLeadSelection(lead);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('crm_selected_lead', JSON.stringify(lead));
    }
  };

  const handleOpenAddModal = (targetLead?: Lead | null) => {
    setEditingMeeting(null);
    setFormPurpose('');
    setFormTitle('');
    const host = employees.length > 0 ? employees[0] : null;
    setFormEmployeeId(host ? host.id || host.empCode : null);
    setFormEmployeeName(host ? host.name : 'Admin User');
    setFormEmployeeEmail(host ? host.email || '' : '');
    setFormEmployeeDesignation(host ? host.designation || host.role || '' : '');

    const leadToUse = targetLead || activeLeadSelection;
    if (leadToUse) {
      setFormContactId(leadToUse.id);
      setFormClientName(leadToUse.companyName ? `${leadToUse.name} (${leadToUse.companyName})` : leadToUse.name);
    } else {
      setFormContactId(null);
      setFormClientName('');
    }

    setFormMeetingDate('');
    setFormStartTime('');
    setFormDuration('30 Minutes');
    setFormEndTime('');
    setFormMeetingType('Virtual');
    setFormLocation('');
    setFormStatus('Scheduled');
    setFormNotes('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (meeting: ScheduledMeeting) => {
    setEditingMeeting(meeting);
    setFormPurpose(meeting.purpose || meeting.title || '');
    setFormTitle(meeting.title || meeting.purpose || '');
    setFormEmployeeId(meeting.employeeId || null);
    setFormEmployeeName(meeting.employeeName || meeting.assignedTo || '');
    setFormEmployeeEmail(meeting.employeeEmail || '');
    setFormEmployeeDesignation(meeting.employeeDesignation || '');
    setFormMeetingDate(meeting.meetingDate || '');
    const meetingTime = meeting.meetingTime || meeting.startTime || meeting.time || '10:00 AM';
    const dur = meeting.duration || inferDuration(meeting.startTime, meeting.endTime);
    setFormStartTime(meetingTime);
    setFormDuration(dur);
    setFormEndTime(meeting.endTime || calculateEndTime(meetingTime, dur));
    setFormMeetingType(meeting.meetingType || 'Virtual');
    setFormLocation(meeting.location || meeting.meetingLocation || meeting.meetingLink || '');
    setFormContactId(meeting.leadId || meeting.contactId || null);
    setFormClientName(meeting.clientName || meeting.leadName || '');
    setFormStatus(meeting.status || 'Scheduled');
    setFormNotes(meeting.notes || meeting.description || '');
    setModalOpen(true);
  };

  const handleSaveMeeting = async () => {
    if (!formPurpose.trim() && !formTitle.trim()) {
      notifications.show({ title: 'Validation Error', message: 'Please enter meeting title or purpose.', color: 'red' });
      return;
    }
    if (!formMeetingDate) {
      notifications.show({ title: 'Validation Error', message: 'Please select meeting date.', color: 'red' });
      return;
    }
    if (!formStartTime) {
      notifications.show({ title: 'Validation Error', message: 'Please select meeting time.', color: 'red' });
      return;
    }

    const resolvedLeadId = formContactId || activeLeadSelection?.id;
    if (!resolvedLeadId && !editingMeeting) {
      notifications.show({ title: 'Validation Error', message: 'Please select an associated lead.', color: 'red' });
      return;
    }

    if (!formLocation.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: formMeetingType === 'Virtual' ? 'Please enter the virtual meeting link.' : 'Please enter the meeting location / address.',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      const computedEndTime = calculateEndTime(formStartTime, formDuration);
      const payload: Partial<ScheduledMeeting> = {
        title: (formTitle || formPurpose).trim(),
        purpose: (formPurpose || formTitle).trim(),
        meetingTitle: (formTitle || formPurpose).trim(),
        leadId: resolvedLeadId || undefined,
        lead_id: resolvedLeadId || undefined,
        employeeId: formEmployeeId || undefined,
        employeeName: formEmployeeName.trim() || 'Admin User',
        assignedTo: formEmployeeName.trim() || 'Admin User',
        assigned_to: formEmployeeName.trim() || 'Admin User',
        employeeEmail: formEmployeeEmail.trim() || undefined,
        employeeDesignation: formEmployeeDesignation.trim() || undefined,
        meetingDate: formMeetingDate,
        startTime: formStartTime,
        meetingTime: formStartTime,
        time: formStartTime,
        endTime: computedEndTime,
        duration: formDuration,
        meetingType: formMeetingType,
        location: formLocation.trim() || undefined,
        meetingLocation: formLocation.trim() || undefined,
        contactId: resolvedLeadId || undefined,
        clientName: formClientName.trim() || undefined,
        status: formStatus,
        meetingStatus: formStatus,
        notes: formNotes.trim() || undefined,
        description: formNotes.trim() || undefined,
      };

      if (editingMeeting) {
        const updated = await updateMeetingApi(editingMeeting.id, payload);
        if (updated) {
          setMeetings((prev) => prev.map((m) => (m.id === editingMeeting.id ? { ...m, ...updated } : m)));
        }
        notifications.show({
          title: 'Meeting Updated',
          message: 'Scheduled meeting updated successfully.',
          color: 'teal',
        });
      } else {
        const created = await createMeetingApi(payload);
        if (created) {
          setMeetings((prev) => [created, ...prev.filter((m) => m.id !== created.id)]);
        }
        notifications.show({
          title: 'Meeting Scheduled',
          message: 'New meeting scheduled successfully.',
          color: 'teal',
        });
      }

      setModalOpen(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm_meetings_updated'));
        window.dispatchEvent(new CustomEvent('crm_leads_updated'));
        window.dispatchEvent(new CustomEvent('crm_activities_updated'));
      }
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Save Failed',
        message: err.message || 'Could not save meeting to database.',
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
      await deleteMeetingApi(deleteTarget.id);
      setMeetings((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      notifications.show({
        title: 'Meeting Deleted',
        message: 'Scheduled meeting removed successfully from database.',
        color: 'blue',
      });
      setDeleteTarget(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm_meetings_updated'));
        window.dispatchEvent(new CustomEvent('crm_leads_updated'));
        window.dispatchEvent(new CustomEvent('crm_activities_updated'));
      }
      await loadData();
    } catch (err: any) {
      notifications.show({ title: 'Delete Failed', message: err.message, color: 'red' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenLeadActivityPipeline = (lead: Lead) => {
    setSelectedLead(lead);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('crm_selected_lead', JSON.stringify(lead));
      sessionStorage.setItem('crm_schedule_tab', 'pipeline');
    }
    setActiveNav('lead-schedule');
  };

  const handleNavigateToLeadFromMeeting = (m: ScheduledMeeting) => {
    const matched = findLeadForMeeting(m, leads);
    if (matched) {
      handleOpenLeadActivityPipeline(matched);
    } else if (activeLeadSelection) {
      handleOpenLeadActivityPipeline(activeLeadSelection);
    }
  };

  const statusDropdownOptions = [
    { value: 'All', label: 'All' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Interested / Progressing', label: 'Interested / Progressing' },
    { value: 'Proposal Requested', label: 'Proposal Requested' },
    { value: 'Demo Completed', label: 'Demo Completed' },
    { value: 'Requirements Gathered', label: 'Requirements Gathered' },
    { value: 'Under Consideration', label: 'Under Consideration' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Rescheduled', label: 'Rescheduled' },
    { value: 'Not Interested', label: 'Not Interested' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  return (
    <Box p={{ base: 'xs', sm: 'sm', md: 'md' }} style={{ width: '100%', maxWidth: '100%' }}>
      {/* ========================================================================= */}
      {/* VIEW A: SELECTED LEAD MEETINGS VIEW (Drill-Down Detail)                   */}
      {/* ========================================================================= */}
      {activeLeadSelection ? (
        <Box>
          {/* Top Bar with Back Button & Action Controls */}
          <Paper
            p="sm"
            radius="lg"
            mb="md"
            style={{
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Group gap="sm">
                <Button
                  variant="subtle"
                  color="gray"
                  size="sm"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => setActiveLeadSelection(null)}
                  style={{
                    fontWeight: 600,
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  Back to Leads
                </Button>

                <Box
                  style={{
                    height: 24,
                    width: 1,
                    backgroundColor: isDark ? '#374151' : '#E2E8F0',
                  }}
                />

                <Group gap="xs">
                  <Box
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: isDark ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDark ? '#818CF8' : '#4F46E5',
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {(activeLeadSelection.name || 'L').charAt(0).toUpperCase()}
                  </Box>
                  <div>
                    <Group gap={8} align="center">
                      <Text fw={700} size="md" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        {activeLeadSelection.name}
                      </Text>
                      <Box
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px 8px',
                          borderRadius: 100,
                          backgroundColor:
                            leadTab === 'COMPLETED'
                              ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5')
                              : (isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF'),
                          color:
                            leadTab === 'COMPLETED'
                              ? (isDark ? '#34D399' : '#047857')
                              : (isDark ? '#A5B4FC' : '#4F46E5'),
                          border:
                            leadTab === 'COMPLETED'
                              ? (isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #A7F3D0')
                              : (isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #E0E7FF'),
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {selectedLeadMeetings.length}{' '}
                        {leadTab === 'COMPLETED'
                          ? selectedLeadMeetings.length === 1
                            ? 'Completed Meeting'
                            : 'Completed Meetings'
                          : selectedLeadMeetings.length === 1
                          ? 'Meeting'
                          : 'Meetings'}
                      </Box>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {activeLeadSelection.companyName
                        ? `${activeLeadSelection.companyName} • ${activeLeadSelection.email || activeLeadSelection.phone || 'Lead'}`
                        : `${activeLeadSelection.email || activeLeadSelection.phone || 'Individual Lead'}`}
                    </Text>
                  </div>
                </Group>
              </Group>

              <Group gap="xs">
                <DateFilterControl
                  value={dateFilter}
                  onChange={setDateFilter}
                  width={135}
                />

                <Button
                  size="sm"
                  variant="default"
                  radius="md"
                  leftSection={<IconLayersSubtract size={16} color="#4F46E5" />}
                  onClick={() => handleOpenLeadActivityPipeline(activeLeadSelection)}
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    height: 36,
                    borderColor: isDark ? '#374151' : '#E2E8F0',
                  }}
                >
                  Activity Pipeline
                </Button>

                <Button
                  size="sm"
                  radius="md"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => handleOpenAddModal(activeLeadSelection)}
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: 13,
                    height: 36,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                  }}
                >
                  Schedule Meeting
                </Button>
              </Group>
            </Group>
          </Paper>

          {/* That Lead's Meetings Table */}
          <MeetingTableView
            meetings={selectedLeadMeetings}
            onEdit={handleOpenEditModal}
            onDelete={(m) => setDeleteTarget(m)}
            onAddNew={() => handleOpenAddModal(activeLeadSelection)}
            onNavigateToLead={() => handleOpenLeadActivityPipeline(activeLeadSelection)}
            onMeetingUpdated={() => loadData()}
            onViewDetails={(m) => setDetailsMeeting(m)}
            loading={loading}
          />
        </Box>
      ) : (
        /* ========================================================================= */
        /* VIEW B: LEADS LIST VIEW (Screenshot 2 Layout)                              */
        /* ========================================================================= */
        <Box>
          {/* Top Controls Bar - Matches Contacts design */}
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
              {/* Left Capsule Filter Tabs */}
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
                {[
                  { id: 'ALL' as ActiveLeadTabType, label: 'All', count: totalLeadsWithMeetingsCount },
                  { id: 'TODAY' as ActiveLeadTabType, label: 'Today', count: todayLeadsCount },
                  { id: 'UPCOMING' as ActiveLeadTabType, label: 'Upcoming', count: upcomingLeadsCount },
                  { id: 'COMPLETED' as ActiveLeadTabType, label: 'Completed', count: completedLeadsCount },
                ].map((tab) => {
                  const active = leadTab === tab.id;
                  return (
                    <UnstyledButton
                      key={tab.id}
                      onClick={() => handleLeadTabChange(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: active ? 700 : 500,
                        backgroundColor: active ? (isDark ? '#0F172A' : '#FFFFFF') : 'transparent',
                        color: active ? (isDark ? '#818CF8' : '#4F46E5') : isDark ? '#94A3B8' : '#64748B',
                        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{tab.label}</span>
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
                              : '#4F46E5'
                            : isDark
                            ? '#334155'
                            : '#CBD5E1',
                          color: active ? '#FFFFFF' : isDark ? '#94A3B8' : '#475569',
                        }}
                      >
                        {tab.count}
                      </Box>
                    </UnstyledButton>
                  );
                })}
              </Box>

              {/* Right Search, Dropdown & Schedule Meeting Button */}
              <Group gap="xs" wrap="wrap">
                <TextInput
                  placeholder="Search meetings or leads..."
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
                  style={{ width: 220 }}
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
                  style={{ width: 125 }}
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
                  onClick={() => handleOpenAddModal(null)}
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: 13,
                    height: 36,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                  }}
                >
                  Schedule Meeting
                </Button>
              </Group>
            </Group>
          </Paper>

          {/* Table Container: Leads List View */}
          {loading ? (
            <Center p="4rem">
              <Stack align="center" gap="sm">
                <Loader color="indigo" />
                <Text size="sm" c="dimmed">
                  Loading leads and meetings...
                </Text>
              </Stack>
            </Center>
          ) : (
            <LeadMeetingsTableView
              leads={paginatedLeads}
              meetings={meetings}
              activeTab={leadTab}
              statusFilter={statusFilter}
              onSelectLead={handleSelectLead}
              onScheduleMeetingForLead={(l) => handleOpenAddModal(l)}
              loading={loading}
            />
          )}

          {/* Pagination Footer */}
          {!loading && filteredLeads.length > 0 && (
            <Paper
              p="sm"
              px="md"
              radius="lg"
              mt="md"
              style={{
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed">
                  Showing {filteredLeads.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
                  {Math.min(page * pageSize, filteredLeads.length)} of {filteredLeads.length} leads with meetings
                </Text>
                {totalLeadPages > 1 && (
                  <Group gap="xs">
                    <Button
                      variant="subtle"
                      size="xs"
                      color="gray"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      style={{ fontSize: 12, fontWeight: 500 }}
                    >
                      &lt; Previous
                    </Button>
                    <Box
                      style={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: isDark ? '1px solid #374151' : '1px solid #E2E8F0',
                        fontSize: 12,
                        fontWeight: 600,
                        color: isDark ? '#F1F5F9' : '#0F172A',
                      }}
                    >
                      {page}
                    </Box>
                    <Text size="xs" c="dimmed">of {totalLeadPages}</Text>
                    <Button
                      variant="subtle"
                      size="xs"
                      color="gray"
                      disabled={page === totalLeadPages}
                      onClick={() => setPage((p) => Math.min(totalLeadPages, p + 1))}
                      style={{ fontSize: 12, fontWeight: 500 }}
                    >
                      Next &gt;
                    </Button>
                  </Group>
                )}
              </Group>
            </Paper>
          )}
        </Box>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT MEETING MODAL                                                  */}
      {/* ADD / EDIT MEETING MODAL                                                  */}
      {/* ========================================================================= */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        centered
        withCloseButton={false}
        radius="lg"
        styles={{
          content: {
            borderRadius: 16,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.18)',
          },
          body: {
            padding: 24,
          },
        }}
      >
        {/* Header matching Contact design */}
        <Group justify="space-between" align="flex-start" mb="lg">
          <Group gap="md">
            <Box
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#60A5FA' : '#2563EB',
              }}
            >
              <IconCalendarEvent size={22} stroke={1.8} />
            </Box>
            <div>
              <Text fw={800} size="19px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
                {editingMeeting ? 'Edit Scheduled Meeting' : 'Schedule Meeting'}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Enter meeting details
              </Text>
            </div>
          </Group>

          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            radius="100px"
            onClick={() => setModalOpen(false)}
          >
            <IconX size={18} />
          </ActionIcon>
        </Group>

        <Stack gap="md">
          {/* Associated Lead Selection */}
          <Select
            label="Associated Lead"
            placeholder="Select Lead from CRM"
            data={(() => {
              const seen = new Set<string>();
              const opts: { value: string; label: string }[] = [];
              effectiveLeads.forEach((l) => {
                if (l.id && !seen.has(l.id)) {
                  seen.add(l.id);
                  opts.push({
                    value: l.id,
                    label: l.companyName ? `${l.name} (${l.companyName})` : l.name,
                  });
                }
              });
              return opts;
            })()}
            value={formContactId}
            onChange={(val) => {
              setFormContactId(val);
              const matched = effectiveLeads.find((l) => l.id === val);
              if (matched) {
                setFormClientName(matched.companyName ? `${matched.name} (${matched.companyName})` : matched.name);
              } else {
                setFormClientName('');
              }
            }}
            searchable
            clearable
            required
            radius="md"
          />

          {/* Meeting Title & Purpose */}
          {(() => {
            const currentLead = formContactId ? effectiveLeads.find((l) => l.id === formContactId) : null;
            return (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  label="Meeting Title"
                  placeholder={
                    currentLead
                      ? `e.g. Discovery Call with ${currentLead.name}`
                      : 'e.g. Discovery & Architecture Call'
                  }
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.currentTarget.value)}
                  required
                  radius="md"
                />
                <TextInput
                  label="Purpose / Agenda"
                  placeholder={
                    currentLead
                      ? `e.g. Product Demo with ${currentLead.name}`
                      : 'e.g. Product Demo & Scope Discussion'
                  }
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.currentTarget.value)}
                  required
                  radius="md"
                />
              </SimpleGrid>
            );
          })()}

          {/* Assigned Host / Employee */}
          <Select
            label="Assigned Host / User"
            placeholder="Select Host"
            data={(() => {
              const seen = new Set<string>();
              const opts: { value: string; label: string }[] = [];
              employees.forEach((e) => {
                const val = e.id || e.empCode;
                if (val && !seen.has(val)) {
                  seen.add(val);
                  opts.push({
                    value: val,
                    label: `${e.name} (${e.designation || e.role || 'Host'})`,
                  });
                }
              });
              return opts;
            })()}
            value={formEmployeeId}
            onChange={(val) => {
              setFormEmployeeId(val);
              const found = employees.find((e) => (e.id || e.empCode) === val);
              if (found) {
                setFormEmployeeName(found.name);
                setFormEmployeeEmail(found.email || '');
                setFormEmployeeDesignation(found.designation || found.role || '');
              }
            }}
            searchable
            clearable
            radius="md"
          />

          {/* Date & Timings */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <MeetingDatePicker
              label="Meeting Date"
              placeholder="dd-mm-yyyy"
              value={formMeetingDate}
              onChange={(val) => setFormMeetingDate(val)}
              required
            />
            <MeetingTimePicker
              label="Meeting Time"
              placeholder="hh:mm"
              value={formStartTime}
              onChange={(val) => setFormStartTime(val)}
              required
            />
            <Select
              label="Duration"
              data={['15 Minutes', '30 Minutes', '45 Minutes', '1 Hour', '1.5 Hours', '2 Hours']}
              value={formDuration}
              onChange={(val) => setFormDuration(val || '30 Minutes')}
              allowDeselect={false}
              required
              radius="md"
            />
          </SimpleGrid>

          {/* Meeting Type & Location / Link */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Select
              label="Meeting Type"
              withAsterisk
              required
              data={[
                { value: 'Virtual', label: 'Virtual (Google Meet / Zoom)' },
                { value: 'In-person', label: 'In-person (Office / Client Site)' },
              ]}
              value={formMeetingType}
              onChange={(val) => setFormMeetingType(val || 'Virtual')}
              radius="md"
            />

            <TextInput
              label={formMeetingType === 'Virtual' ? 'Meeting Link' : 'Meeting Location'}
              withAsterisk
              required
              placeholder={formMeetingType === 'Virtual' ? 'https://meet.google.com/xyz or Zoom URL' : 'Client Office Address or Office Room'}
              value={formLocation}
              onChange={(e) => setFormLocation(e.currentTarget.value)}
              radius="md"
            />
          </SimpleGrid>

          {/* Status */}
          <Select
            label="Meeting Status"
            data={[
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'Interested / Progressing', label: 'Interested / Progressing' },
              { value: 'Proposal Requested', label: 'Proposal Requested' },
              { value: 'Demo Completed', label: 'Demo Completed' },
              { value: 'Requirements Gathered', label: 'Requirements Gathered' },
              { value: 'Under Consideration', label: 'Under Consideration' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Rescheduled', label: 'Rescheduled' },
              { value: 'Not Interested', label: 'Not Interested' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            value={formStatus}
            onChange={(val) => setFormStatus(val || 'Scheduled')}
            radius="md"
          />

          {/* Additional Notes */}
          <Textarea
            label="Additional Notes / Discussion Points"
            placeholder="Special preparation, slides link, key client concerns..."
            value={formNotes}
            onChange={(e) => setFormNotes(e.currentTarget.value)}
            minRows={2}
            radius="md"
          />

          {/* Action Buttons matching Contact design */}
          <Group justify="flex-end" gap="sm" mt="md">
            <Button
              variant="default"
              radius="md"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              style={{
                fontWeight: 600,
                minWidth: 90,
              }}
            >
              Cancel
            </Button>
            <Button
              radius="md"
              loading={submitting}
              onClick={handleSaveMeeting}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                minWidth: 120,
                border: 'none',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              }}
            >
              {editingMeeting ? 'Update Meeting' : 'Save Meeting'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={
          <Group gap="xs">
            <ThemeIcon color="red" variant="light" size="md" radius="md">
              <IconAlertTriangle size={18} />
            </ThemeIcon>
            <Text fw={700} size="md">
              Cancel / Delete Meeting
            </Text>
          </Group>
        }
        size="sm"
        radius="lg"
      >
        <Stack gap="md" mt="xs">
          <Text size="sm" c="dimmed">
            Are you sure you want to remove the scheduled meeting &quot;
            <Text component="span" fw={600} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {deleteTarget?.title || deleteTarget?.purpose}
            </Text>
            &quot;? This record will be permanently deleted from database.
          </Text>

          <Group justify="flex-end" mt="xs">
            <Button variant="default" radius="md" onClick={() => setDeleteTarget(null)}>
              No, Keep
            </Button>
            <Button color="red" radius="md" loading={deleteLoading} onClick={handleConfirmDelete}>
              Yes, Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Meeting Details & Requirements Modal */}
      <MeetingDetailsModal
        opened={!!detailsMeeting}
        onClose={() => setDetailsMeeting(null)}
        meeting={detailsMeeting}
        onMeetingUpdated={(updated) => {
          setDetailsMeeting(updated);
          loadData();
        }}
        onNavigateToLead={handleNavigateToLeadFromMeeting}
      />
    </Box>
  );
};
