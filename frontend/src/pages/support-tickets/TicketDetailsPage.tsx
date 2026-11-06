import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Paper,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Box,
  ActionIcon,
  Tooltip,
  Divider,
  useComputedColorScheme,
  Modal,
  ThemeIcon,
  UnstyledButton,
  Textarea,
  TextInput,
  Select,
  Collapse,
  Table,
  Checkbox,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconUserCheck,
  IconClock,
  IconCheck,
  IconRotateClockwise,
  IconBuilding,
  IconFolders,
  IconAlertTriangle,
  IconEdit,
  IconTrash,
  IconChevronRight,
  IconArrowRight,
  IconHistory,
  IconCircleCheck,
  IconPhoneCall,
  IconPlus,
  IconEye,
  IconCalendar,
  IconMessageDots,
  IconFileDescription,
  IconTools,
  IconChevronDown,
  IconChevronUp,
  IconBrandWhatsapp,
  IconMail,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { SupportTicket } from '../../types/supportTicket';
import { useSupportTicket } from '../../context/SupportTicketContext';
import { useCRM } from '../../context/CRMContext';
import { TicketAssignmentModal } from './components/TicketAssignmentModal';
import { TicketStatusModal } from './components/TicketStatusModal';
import { CreateTicketModal } from './CreateTicketModal';
import { ContactModal } from '../contacts/components/ContactModal';
import { MeetingDetailsModal } from '../meetings/components/MeetingDetailsModal';
import { ScheduledMeeting } from '../../types/meeting';
import { createMeetingApi } from '../../services/meetingService';
import { CallDetailsModal } from '../calls/components/CallDetailsModal';
import { CallLog } from '../../types/callLog';
import { projectService } from '../../services/projectService';
import { ProjectModuleItem } from '../../types/project';
import { taskService } from '../../services/taskService';
import {
  fetchTicketTasksApi,
  createTicketTaskApi,
  updateTicketTaskApi,
  deleteTicketTaskApi,
  syncTicketTasksApi,
} from '../../services/supportTicketService';

type TicketSectionType = 'activities' | 'in_progress' | 'closed';

export interface TicketActivityItem {
  id: string;
  refNumber: string;
  title: string;
  type: 'Call' | 'Meeting' | 'Note' | 'Email' | 'WhatsApp' | 'Status Update' | 'Ticket Created';
  date: string;
  time: string;
  summary: string;
  details?: string;
  status: string;
  assignee?: string;
  contactPerson?: string;
  customerName?: string;
  meetingId?: string;
  meetingData?: any;
}

export interface TicketTaskItem {
  id: string;
  refNumber: string;
  taskName: string;
  assignedTo: string;
  targetDate: string;
  priority: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Blocked' | 'Resolved';
  notes?: string;
  resolutionDescription?: string;
  rootCause?: string;
  workaround?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface TicketDetailsPageProps {
  ticketId: string;
  onBack: () => void;
  onNavigateToCustomer?: (customerId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}

export const formatRefNumber = (ref?: string, prefix = 'ACT'): string => {
  if (!ref) return `${prefix}-01`;
  const clean = String(ref).trim();
  if (new RegExp(`^${prefix}-\\d+$`, 'i').test(clean)) {
    return clean.toUpperCase();
  }
  const match = clean.match(/-(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `${prefix}-${isNaN(num) ? match[1] : String(num).padStart(2, '0')}`;
  }
  return clean.length > 10 ? `${prefix}-01` : clean;
};

export const TicketDetailsPage: React.FC<TicketDetailsPageProps> = ({
  ticketId,
  onBack,
  onNavigateToCustomer,
  onNavigateToProject,
}) => {
  const {
    fetchTicketById,
    selectedTicket,
    deleteTicket,
    resolveTicket,
    reopenTicket,
    changeStatus,
    metadata,
  } = useSupportTicket();

  const { currentUser } = useCRM();

  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TicketSectionType>('activities');
  const [overviewOpened, setOverviewOpened] = useState<boolean>(false);

  // Modals state
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [assignModalOpened, setAssignModalOpened] = useState<boolean>(false);
  const [statusModalOpened, setStatusModalOpened] = useState<boolean>(false);
  const [logActivityModalOpened, setLogActivityModalOpened] = useState<boolean>(false);
  const [selectedContactForLogs, setSelectedContactForLogs] = useState<any>(null);

  // View Activity Modal state
  const [viewingActivity, setViewingActivity] = useState<TicketActivityItem | null>(null);
  const [selectedMeetingForModal, setSelectedMeetingForModal] = useState<ScheduledMeeting | null>(null);
  const [selectedMeetingActivityId, setSelectedMeetingActivityId] = useState<string | null>(null);
  const [selectedCallForModal, setSelectedCallForModal] = useState<CallLog | null>(null);
  const [selectedCallActivityId, setSelectedCallActivityId] = useState<string | null>(null);

  // Add Custom Task Modal (In Progress)
  const [addTaskModalOpened, setAddTaskModalOpened] = useState<boolean>(false);
  const [newTaskName, setNewTaskName] = useState<string>('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<string>('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');

  // View / Edit Task Details Modal state (In Progress)
  const [viewingTask, setViewingTask] = useState<TicketTaskItem | null>(null);
  const [editingTaskInModal, setEditingTaskInModal] = useState<boolean>(false);
  const [editTaskName, setEditTaskName] = useState<string>('');
  const [editTaskAssignee, setEditTaskAssignee] = useState<string>('');
  const [editTaskPriority, setEditTaskPriority] = useState<string>('Medium');
  const [editTaskDueDate, setEditTaskDueDate] = useState<string>('');
  const [editTaskStatus, setEditTaskStatus] = useState<TicketTaskItem['status']>('Pending');
  const [editTaskNotes, setEditTaskNotes] = useState<string>('');

  // Inline resolution form state (for Closed tab)
  const [resolutionModalOpened, setResolutionModalOpened] = useState<boolean>(false);
  const [resolutionDesc, setResolutionDesc] = useState<string>('');
  const [rootCause, setRootCause] = useState<string>('');
  const [workaround, setWorkaround] = useState<string>('');
  const [resolving, setResolving] = useState<boolean>(false);

  // Inline reopen prompt state
  const [reopenPromptOpened, setReopenPromptOpened] = useState<boolean>(false);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [reopening, setReopening] = useState<boolean>(false);

  // Local storage persisted activities for this ticket
  const [customActivities, setCustomActivities] = useState<TicketActivityItem[]>(() => {
    try {
      const saved = localStorage.getItem(`crm_ticket_activities_${ticketId}`);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  // Local storage persisted tasks for this ticket
  const [ticketTasks, setTicketTasks] = useState<TicketTaskItem[]>(() => {
    try {
      const keys = [
        `crm_ticket_tasks_${ticketId}`,
        sessionStorage.getItem('crm_selected_ticket_id')
          ? `crm_ticket_tasks_${sessionStorage.getItem('crm_selected_ticket_id')}`
          : null,
      ].filter(Boolean) as string[];
      for (const k of keys) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (_) {}
    return [];
  });

  // Selected completed tasks for resolution
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const inProgressTasks = useMemo(() => {
    return ticketTasks.filter((t) => t.status !== 'Resolved');
  }, [ticketTasks]);

  const completedTasks = useMemo(() => {
    return inProgressTasks.filter((t) => t.status === 'Completed');
  }, [inProgressTasks]);

  const resolvedTasks = useMemo(() => {
    return ticketTasks.filter((t) => t.status === 'Resolved');
  }, [ticketTasks]);

  const resolvingTaskItems = useMemo(() => {
    const list = ticketTasks.filter((t) => selectedTaskIds.includes(t.id || t.refNumber));
    if (list.length > 0) return list;
    return completedTasks;
  }, [ticketTasks, selectedTaskIds, completedTasks]);

  // Load custom activities
  useEffect(() => {
    if (!ticketId) return;
    try {
      const savedAct = localStorage.getItem(`crm_ticket_activities_${ticketId}`);
      if (savedAct) setCustomActivities(JSON.parse(savedAct));
      else setCustomActivities([]);
    } catch (_) {}
  }, [ticketId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTicketById(ticketId)
      .then((t) => {
        if (mounted && t) {
          if (t.status === 'Resolved' || t.status === 'Closed') {
            setActiveTab('closed');
          } else if (t.status === 'In Progress' || t.status === 'Pending Customer' || t.status === 'On Hold') {
            setActiveTab('in_progress');
          } else {
            setActiveTab('activities');
          }
          if (t.resolutionDescription) setResolutionDesc(t.resolutionDescription);
          if (t.rootCause) setRootCause(t.rootCause);
          if (t.workaround) setWorkaround(t.workaround);
        } else if (mounted && !t) {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('crm_selected_ticket_id');
          }
        }
      })
      .catch(() => {
        if (mounted && typeof window !== 'undefined') {
          sessionStorage.removeItem('crm_selected_ticket_id');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [ticketId]);

  const ticket = selectedTicket;

  // Unified Task Manager: Loads from localStorage, fetches from DB, or seeds defaults
  useEffect(() => {
    if (!ticketId && !ticket?.id) return;
    const currentTicketId = ticket?.id || ticketId;

    // 1. Check local storage across UUID and Ticket Number
    const storageKeys = [
      `crm_ticket_tasks_${currentTicketId}`,
      ticket?.ticketNumber ? `crm_ticket_tasks_${ticket.ticketNumber}` : null,
      ticketId && ticketId !== currentTicketId ? `crm_ticket_tasks_${ticketId}` : null,
    ].filter(Boolean) as string[];

    let foundTasks: TicketTaskItem[] | null = null;
    for (const k of storageKeys) {
      try {
        const item = localStorage.getItem(k);
        if (item) {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed) && parsed.length > 0) {
            foundTasks = parsed;
            break;
          }
        }
      } catch (_) {}
    }

    if (foundTasks && foundTasks.length > 0) {
      setTicketTasks(foundTasks);
    }

    // 2. Fetch from database table support_ticket_tasks
    fetchTicketTasksApi(currentTicketId)
      .then((dbTasks) => {
        if (Array.isArray(dbTasks) && dbTasks.length > 0) {
          setTicketTasks(dbTasks);
          try {
            localStorage.setItem(`crm_ticket_tasks_${currentTicketId}`, JSON.stringify(dbTasks));
            if (ticket?.ticketNumber) {
              localStorage.setItem(`crm_ticket_tasks_${ticket.ticketNumber}`, JSON.stringify(dbTasks));
            }
          } catch (_) {}
        } else if (!foundTasks || foundTasks.length === 0) {
          setTicketTasks([]);
        }
      })
      .catch((err) => {
        console.warn('[TicketDetailsPage] DB tasks fetch error:', err);
      });

    // Also cross-sync task statuses with related Project modules
    const targetProjId =
      ticket?.projectId ||
      metadata?.projects?.find(
        (p) =>
          p.id === ticket?.projectId ||
          p.code === ticket?.projectId ||
          (ticket?.projectName && p.name.toLowerCase() === ticket?.projectName.toLowerCase())
      )?.id;

    if (targetProjId) {
      projectService
        .getProjectById(targetProjId)
        .then((projRes) => {
          if (projRes.success && projRes.data && Array.isArray(projRes.data.modules)) {
            const projectModules = projRes.data.modules;
            setTicketTasks((prevTasks) => {
              let changed = false;
              const updated = prevTasks.map((t) => {
                const matchedMod = projectModules.find((m) => {
                  const mName = (m.name || '').toLowerCase();
                  const tRef = (t.refNumber || '').toLowerCase();
                  const tName = (t.taskName || '').toLowerCase();
                  return (
                    (tRef && mName.includes(tRef)) ||
                    (t.id && m.id === t.id) ||
                    (tName && (mName.includes(tName) || tName.includes(mName)))
                  );
                });

                if (matchedMod) {
                  let projModStatus: TicketTaskItem['status'] = t.status;
                  if (matchedMod.status === 'Completed' || (matchedMod.progress || 0) >= 100) {
                    projModStatus = 'Completed';
                  } else if (matchedMod.status === 'In Progress' || (matchedMod.progress || 0) > 0) {
                    projModStatus = 'In Progress';
                  } else {
                    projModStatus = 'Pending';
                  }

                  if (projModStatus !== t.status) {
                    changed = true;
                    return { ...t, status: projModStatus };
                  }
                }
                return t;
              });

              if (changed) {
                try {
                  localStorage.setItem(`crm_ticket_tasks_${currentTicketId}`, JSON.stringify(updated));
                  if (ticket?.ticketNumber) {
                    localStorage.setItem(`crm_ticket_tasks_${ticket.ticketNumber}`, JSON.stringify(updated));
                  }
                } catch (_) {}
                return updated;
              }
              return prevTasks;
            });
          }
        })
        .catch(() => {});
    }
  }, [ticketId, ticket?.id, ticket?.projectId, ticket?.projectName]);

  // Listen for realtime task status updates triggered from Project Management module
  useEffect(() => {
    const handleTicketTasksUpdated = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const isTargetTicket =
        !detail.ticketRef ||
        (ticket && (detail.ticketRef === ticket.id || detail.ticketRef === ticket.ticketNumber)) ||
        detail.ticketRef === ticketId;

      if (isTargetTicket) {
        setTicketTasks((prev) => {
          let hasChange = false;
          const updated = prev.map((t) => {
            const matchesRef = detail.taskRefNumber && (t.refNumber === detail.taskRefNumber || t.id === detail.taskRefNumber);
            const matchesName = detail.taskCleanName && t.taskName && (
              t.taskName.toLowerCase().includes(detail.taskCleanName.toLowerCase()) ||
              detail.taskCleanName.toLowerCase().includes(t.taskName.toLowerCase())
            );
            if (matchesRef || matchesName) {
              hasChange = true;
              return { ...t, status: detail.status };
            }
            return t;
          });

          if (hasChange) {
            try {
              if (ticket?.id) localStorage.setItem(`crm_ticket_tasks_${ticket.id}`, JSON.stringify(updated));
              if (ticket?.ticketNumber) localStorage.setItem(`crm_ticket_tasks_${ticket.ticketNumber}`, JSON.stringify(updated));
              if (ticketId) localStorage.setItem(`crm_ticket_tasks_${ticketId}`, JSON.stringify(updated));
            } catch (_) {}
            return updated;
          }
          return prev;
        });
      }
    };

    window.addEventListener('crm_ticket_tasks_updated', handleTicketTasksUpdated);
    return () => {
      window.removeEventListener('crm_ticket_tasks_updated', handleTicketTasksUpdated);
    };
  }, [ticket?.id, ticket?.ticketNumber, ticketId]);

  // Combined Activities list (Ticket Creation + Comments + Custom Logged Activities)
  const displayActivities = useMemo<TicketActivityItem[]>(() => {
    if (!ticket) return [];
    const list: TicketActivityItem[] = [];

    // 1. Initial Ticket Creation record
    const repDate = ticket.reportedAt ? new Date(ticket.reportedAt) : new Date();
    list.push({
      id: `act-init-${ticket.id}`,
      refNumber: 'ACT-01',
      title: `Ticket Created: ${ticket.subject}`,
      type: 'Ticket Created',
      date: repDate.toISOString().split('T')[0],
      time: repDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      summary: ticket.description || 'Ticket initialized in system',
      details: ticket.description,
      status: 'Completed',
      assignee: ticket.reportedBy || ticket.assignedToName || currentUser?.name || 'Support Staff',
      contactPerson: ticket.contactName || 'Primary Contact',
      customerName: ticket.customerName || 'Customer',
    });

    // 2. Comments from ticket
    if (ticket.comments && ticket.comments.length > 0) {
      ticket.comments.forEach((c, idx) => {
        const cDate = c.createdAt ? new Date(c.createdAt) : new Date();
        list.push({
          id: `act-comment-${c.id || idx}`,
          refNumber: `ACT-${String(idx + 2).padStart(2, '0')}`,
          title: (c as any).isInternal || c.type === 'internal_note' ? 'Internal Team Note' : 'Public Customer Update',
          type: (c as any).isInternal || c.type === 'internal_note' ? 'Note' : 'Email',
          date: cDate.toISOString().split('T')[0],
          time: cDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          summary: c.message,
          details: c.message,
          status: 'Completed',
          assignee: c.authorName || 'Support Agent',
          contactPerson: ticket.contactName,
          customerName: ticket.customerName,
        });
      });
    }

    // 3. User logged custom activities
    customActivities.forEach((ca) => {
      list.push(ca);
    });

    // Sort descending by date/id
    return list.reverse();
  }, [ticket, customActivities]);

  const handleOpenLogActivity = () => {
    if (!ticket) return;

    const cust = (metadata?.customers || []).find(
      (c) =>
        c.id === ticket.customerId ||
        (c.name && ticket.customerName && c.name.toLowerCase().trim() === ticket.customerName.toLowerCase().trim())
    );

    const ct = (metadata?.contacts || []).find(
      (c) =>
        c.id === ticket.contactId ||
        (ticket.contactPhone && c.phone && String(c.phone).replace(/\D/g, '') === String(ticket.contactPhone).replace(/\D/g, '')) ||
        (ticket.contactEmail && c.email && c.email.toLowerCase().trim() === ticket.contactEmail.toLowerCase().trim()) ||
        (ticket.contactName && c.name && c.name.toLowerCase().trim() === ticket.contactName.toLowerCase().trim()) ||
        (c.companyName && (cust?.name || ticket.customerName) && c.companyName.toLowerCase().trim() === (cust?.name || ticket.customerName)!.toLowerCase().trim())
    );

    const ld = (metadata?.leads || []).find(
      (l) =>
        (l.companyName && (cust?.name || ticket.customerName) && l.companyName.toLowerCase().trim() === (cust?.name || ticket.customerName)!.toLowerCase().trim()) ||
        (l.name && ticket.contactName && l.name.toLowerCase().trim() === ticket.contactName.toLowerCase().trim())
    );

    const contactPersonName =
      ticket.contactName ||
      ct?.name ||
      cust?.contactPerson ||
      ld?.name ||
      ticket.customerName ||
      '';

    const company =
      ticket.customerName ||
      cust?.name ||
      ct?.companyName ||
      ld?.companyName ||
      '';

    const email = ticket.contactEmail || ct?.email || cust?.email || ld?.email || '';
    const phone = ticket.contactPhone || ct?.phone || cust?.phone || ld?.phone || '';
    const designation =
      (ct as any)?.designation ||
      (ct as any)?.profession ||
      (ld as any)?.designation ||
      (ld as any)?.profession ||
      'Director';
    const location =
      (cust as any)?.address ||
      (ct as any)?.address ||
      (ld as any)?.address ||
      (cust as any)?.location ||
      'Chennai';
    const website = (cust as any)?.website || (ld as any)?.website || '';

    const contactData: any = {
      ...(ct?.id ? { id: ct.id } : {}),
      contactId: (ct as any)?.contactId || ct?.code || undefined,
      name: contactPersonName || company || 'Customer Contact',
      contactPerson: contactPersonName,
      companyName: company,
      designation: designation,
      email: email,
      phone: phone,
      website: website,
      location: location,
      source: ticket.source || 'Customer Portal',
      tag: ticket.priority || 'Medium',
      priority: ticket.priority || 'Medium',
      contactMode: 'Call',
      leadId: ld?.id || undefined,
    };

    setSelectedContactForLogs(contactData);
    setLogActivityModalOpened(true);
  };

  const handleLogActivitySuccess = async (activityData?: any) => {
    setLogActivityModalOpened(false);
    setSelectedContactForLogs(null);

    if (!ticket) return;

    // Create a new activity record to display directly in the Activities table
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const count = displayActivities.length + 1;

    const mode = activityData?.contactMode || activityData?.type || 'Call';
    const isMeeting = mode === 'Meeting';
    const isWhatsApp = mode === 'WhatsApp';
    const isEmail = mode === 'Email';

    let actType: TicketActivityItem['type'] = 'Call';
    if (isMeeting) actType = 'Meeting';
    else if (isWhatsApp) actType = 'WhatsApp';
    else if (isEmail) actType = 'Email';
    else actType = 'Call';

    const actTitle = activityData?.title || (
      isMeeting
        ? `Meeting with ${ticket.contactName || ticket.customerName}`
        : isWhatsApp
        ? `WhatsApp Interaction`
        : isEmail
        ? `Email Communication`
        : `Call Log: Follow-up & Discussion`
    );

    const actDate = activityData?.date || todayStr;
    const actTime = activityData?.time || timeStr;
    const actStatus = activityData?.status || (isMeeting ? 'Scheduled' : 'Completed');
    const actAssignee = activityData?.assignee || currentUser?.name || ticket?.assignedToName || 'Support Staff';

    let actSummary = '';
    if (activityData?.purpose) {
      actSummary = `${activityData.purpose}${activityData.meetingType ? ` (${activityData.meetingType})` : ''}${activityData.location ? ` - ${activityData.location}` : ''}`;
    } else if (activityData?.description) {
      actSummary = activityData.description;
    } else if (isMeeting) {
      actSummary = `Scheduled Meeting for ${ticket.ticketNumber} with ${ticket.contactName || ticket.customerName}.`;
    } else if (isWhatsApp) {
      actSummary = `WhatsApp message sent regarding ${ticket.ticketNumber}.`;
    } else if (isEmail) {
      actSummary = `Email communication recorded for ${ticket.ticketNumber}.`;
    } else {
      actSummary = `Call log updated for ${ticket.ticketNumber}. Customer discussion points and feedback recorded.`;
    }

    let actDetails = '';
    if (isMeeting) {
      actDetails = `Meeting: ${actTitle}\nPurpose: ${activityData?.purpose || 'Support & Project Review'}\nType: ${activityData?.meetingType || 'Online'}\nLocation / Link: ${activityData?.location || 'Google Meet'}\nStatus: ${actStatus}${activityData?.description ? `\nNotes: ${activityData.description}` : ''}`;
    } else {
      actDetails = activityData?.description || `${actType} logged with ${ticket.contactName || ticket.customerName}. Discussion notes and next action recorded in CRM logs.`;
    }

    let finalMeetingId = activityData?.meetingId || activityData?.meetingData?.id;
    let finalMeetingData = activityData?.meetingData;

    // Ensure the meeting is permanently persisted to ScheduledMeeting in backend database
    if (isMeeting && (!finalMeetingId || String(finalMeetingId).startsWith('meeting-') || !finalMeetingData?.id)) {
      try {
        const clientFormatted = (ticket.customerName && ticket.contactName)
          ? `${ticket.contactName} (${ticket.customerName})`
          : (ticket.customerName || ticket.contactName || 'Client');

        const createdMeet = await createMeetingApi({
          contactId: ticket.contactId || undefined,
          clientName: clientFormatted,
          title: actTitle || `Meeting with ${ticket.contactName || ticket.customerName}`,
          purpose: activityData?.purpose || `Ticket ${ticket.ticketNumber}: ${ticket.subject}`,
          meetingDate: actDate,
          startTime: actTime || '10:00 AM',
          meetingTime: actTime || '10:00 AM',
          time: actTime || '10:00 AM',
          endTime: activityData?.endTime || '10:30 AM',
          duration: activityData?.duration || '30 Minutes',
          meetingType: activityData?.meetingType || 'Virtual (Google Meet / Zoom)',
          location: activityData?.location || 'Virtual',
          meetingLocation: activityData?.location || 'Virtual',
          meetingLink: activityData?.location || 'Virtual',
          employeeName: actAssignee,
          assignedTo: actAssignee,
          status: actStatus || 'Scheduled',
          meetingStatus: actStatus || 'Scheduled',
          notes: `Ticket ${ticket.ticketNumber} (${ticket.subject}). ${activityData?.description ? `Notes: ${activityData.description}` : ''}`.trim(),
        });

        if (createdMeet?.id) {
          finalMeetingId = createdMeet.id;
          finalMeetingData = createdMeet;
        }
      } catch (directMeetErr) {
        console.warn('Direct meeting creation fallback in TicketDetailsPage:', directMeetErr);
      }
    }

    const newActivity: TicketActivityItem = {
      id: `act-user-${Date.now()}`,
      refNumber: `ACT-${String(count).padStart(2, '0')}`,
      title: actTitle,
      type: actType,
      date: actDate,
      time: actTime,
      summary: actSummary,
      details: actDetails,
      status: actStatus,
      assignee: actAssignee,
      contactPerson: ticket.contactName,
      customerName: ticket.customerName,
      meetingId: finalMeetingId,
      meetingData: finalMeetingData || (isMeeting ? {
        id: finalMeetingId || `meeting-${Date.now()}`,
        title: actTitle,
        purpose: activityData?.purpose || 'Support & Project Review',
        meetingDate: actDate,
        date: actDate,
        startTime: actTime,
        meetingTime: actTime,
        time: actTime,
        duration: activityData?.duration || '30 Minutes',
        meetingType: activityData?.meetingType || 'Virtual (Google Meet / Zoom)',
        location: activityData?.location || 'Virtual',
        meetingLocation: activityData?.location || 'Virtual',
        meetingLink: activityData?.location || 'Virtual',
        employeeName: actAssignee,
        assignedTo: actAssignee,
        clientName: (ticket.customerName && ticket.contactName)
          ? `${ticket.contactName} (${ticket.customerName})`
          : (ticket.customerName || ticket.contactName || 'Client'),
        leadName: ticket.contactName || 'Client Contact',
        companyName: ticket.customerName,
        status: actStatus,
        meetingStatus: actStatus,
        description: activityData?.description || actSummary,
        notes: activityData?.description || actSummary,
      } : undefined),
    };

    const updated = [newActivity, ...customActivities];
    setCustomActivities(updated);
    try {
      localStorage.setItem(`crm_ticket_activities_${ticket.id}`, JSON.stringify(updated));
    } catch (_) {}

    try {
      window.dispatchEvent(new CustomEvent('crm_meetings_updated'));
      window.dispatchEvent(new CustomEvent('crm_activities_updated'));
    } catch (_) {}

    await fetchTicketById(ticket.id);

    notifications.show({
      color: 'teal',
      icon: <IconCheck size={16} />,
      title: 'Activity Logged',
      message: `${actType} activity log successfully saved and added to ticket history.`,
    });
  };

  const handleSelectActivity = (act: TicketActivityItem) => {
    if (act.type === 'Meeting') {
      const meetingObj: ScheduledMeeting = act.meetingData || {
        id: act.meetingId || act.id || `mtg-${Date.now()}`,
        title: act.title || 'Client Meeting',
        purpose: act.summary || act.title || 'Support & Project Review',
        meetingDate: act.date || new Date().toISOString().split('T')[0],
        date: act.date || new Date().toISOString().split('T')[0],
        startTime: act.time || '10:00 AM',
        meetingTime: act.time || '10:00 AM',
        time: act.time || '10:00 AM',
        endTime: (act as any).endTime,
        duration: (act as any).duration || '30 Minutes',
        meetingType: (act as any).meetingType || 'Virtual (Google Meet / Zoom)',
        location: (act as any).location || 'Virtual',
        meetingLocation: (act as any).location || 'Virtual',
        meetingLink: (act as any).location || 'Virtual',
        employeeName: act.assignee || currentUser?.name || ticket?.assignedToName || 'Staff',
        assignedTo: act.assignee || currentUser?.name || ticket?.assignedToName || 'Staff',
        clientName: (act.customerName && act.contactPerson)
          ? `${act.contactPerson} (${act.customerName})`
          : (act.customerName || act.contactPerson || 'Client'),
        leadName: act.contactPerson || ticket?.contactName || 'Client Contact',
        companyName: act.customerName || ticket?.customerName,
        status: (act.status as any) || 'Scheduled',
        meetingStatus: (act.status as any) || 'Scheduled',
        description: act.details || act.summary,
        notes: act.details || act.summary,
        requirements: (act as any).requirements || '',
        requirementFileName: (act as any).requirementFileName,
        requirementFileUrl: (act as any).requirementFileUrl,
      };
      setSelectedMeetingForModal(meetingObj);
      setSelectedMeetingActivityId(act.id);
    } else {
      // Non-meeting activities: open CallDetailsModal
      const channel = act.type === 'WhatsApp' ? 'WhatsApp' : act.type === 'Email' ? 'Email' : 'Calls';
      const cust = (metadata?.customers || []).find(
        (c) =>
          c.id === ticket?.customerId ||
          (c.name && ticket?.customerName && c.name.toLowerCase().trim() === ticket.customerName.toLowerCase().trim())
      );
      const ct = (metadata?.contacts || []).find(
        (c) =>
          c.id === ticket?.contactId ||
          (ticket?.contactPhone && c.phone && String(c.phone).replace(/\D/g, '') === String(ticket.contactPhone).replace(/\D/g, ''))
      );
      const resolvedPhone = ticket?.contactPhone || ct?.phone || (cust as any)?.phone || '—';

      const callObj: CallLog = {
        id: act.id,
        callId: (act as any).callId || formatRefNumber(act.refNumber, 'CAL'),
        callType: ((act as any).callType as any) || (act.type === 'Call' ? 'Outgoing' : (act.type as any)) || 'Outgoing',
        employeeId: act.assignee || 'Staff',
        employeeName: act.assignee || currentUser?.name || ticket?.assignedToName || 'Staff',
        contactId: ticket?.contactId || null,
        contactName: act.contactPerson || ticket?.contactName || ct?.name || 'Contact',
        companyName: act.customerName || ticket?.customerName || cust?.name || '—',
        phoneNumber: resolvedPhone,
        duration: (act as any).duration || '—',
        status: (act.status as any) || 'Interested',
        callDate: act.date || new Date().toISOString().split('T')[0],
        callTime: act.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        description: act.details || act.summary || '',
        channel: channel,
      } as any;
      setSelectedCallForModal(callObj);
      setSelectedCallActivityId(act.id);
    }
  };

  const handleDeleteActivity = (actId: string) => {
    if (!ticket) return;
    const updated = customActivities.filter((a) => a.id !== actId);
    setCustomActivities(updated);
    try {
      localStorage.setItem(`crm_ticket_activities_${ticket.id}`, JSON.stringify(updated));
    } catch (_) {}
    notifications.show({
      color: 'blue',
      message: 'Activity record removed.',
    });
  };

  // Switch to Work in Progress and update ticket status
  const handleProceedToInProgress = async () => {
    if (!ticket) return;
    setActiveTab('in_progress');
    if (ticket.status === 'New' || ticket.status === 'Assigned') {
      try {
        await changeStatus(ticket.id, 'In Progress', { reason: 'Moved to Work in Progress workspace' });
        await fetchTicketById(ticket.id);
      } catch (_) {}
    }
    notifications.show({
      color: 'blue',
      icon: <IconArrowRight size={16} />,
      message: 'Navigated to Work in Progress Workspace',
    });
  };

  // Synchronize Tasks and Customer / Lead information to the related Project in Projects Management module
  const syncTasksAndClientToProject = async (
    tasksToSync: TicketTaskItem[],
    primaryAssignee?: string
  ) => {
    if (!ticket) return;

    // Resolve target project ID
    const targetProjId =
      ticket.projectId ||
      metadata?.projects?.find(
        (p) =>
          p.id === ticket.projectId ||
          p.code === ticket.projectId ||
          (ticket.projectName && p.name.toLowerCase() === ticket.projectName.toLowerCase())
      )?.id ||
      metadata?.projects?.find(
        (p) =>
          ticket.customerName &&
          p.clientName &&
          (p.clientName.toLowerCase().includes(ticket.customerName.toLowerCase()) ||
            ticket.customerName.toLowerCase().includes(p.clientName.toLowerCase()))
      )?.id;

    if (!targetProjId) return;

    try {
      const projRes = await projectService.getProjectById(targetProjId);
      if (!projRes.success || !projRes.data) return;

      const project = projRes.data;

      // 1. Sync Customer or Lead details to the Project
      // Project module standard format: "CustomerName (ContactName)"
      const clientNameFormatted = ticket.customerName
        ? ticket.contactName
          ? `${ticket.customerName} (${ticket.contactName})`
          : ticket.customerName
        : project.clientName;

      const projectPayload: Record<string, any> = {
        clientName: clientNameFormatted,
      };
      if (ticket.contactId) {
        projectPayload.contactId = ticket.contactId;
      }
      if (ticket.contactEmail) {
        projectPayload.clientEmail = ticket.contactEmail;
      }
      if (ticket.contactPhone) {
        projectPayload.clientPhone = ticket.contactPhone;
      }

      // 2. Sync Modules / Tasks to the Project
      const currentModules: ProjectModuleItem[] = Array.isArray(project.modules)
        ? [...project.modules]
        : [];

      const updatedModules = [...currentModules];

      tasksToSync.forEach((t) => {
        const isDone = t.status === 'Completed' || t.status === 'Resolved';
        const modStatus: ProjectModuleItem['status'] = isDone ? 'Completed' : 'In Progress';
        const modProgress = isDone ? 100 : t.status === 'In Progress' ? 50 : 0;
        const taskAssignee =
          t.assignedTo ||
          primaryAssignee ||
          ticket.teamLeadName ||
          ticket.assignedToName ||
          'Technical Support';

        // Check if module already exists by refNumber or taskName
        const existingIdx = updatedModules.findIndex((m) => {
          const mNameLower = (m.name || '').toLowerCase();
          const tNameLower = (t.taskName || '').toLowerCase();
          const tRef = (t.refNumber || '').toLowerCase();

          return (
            (tRef && mNameLower.includes(tRef)) ||
            mNameLower === tNameLower ||
            mNameLower.includes(tNameLower) ||
            tNameLower.includes(mNameLower)
          );
        });

        if (existingIdx >= 0) {
          updatedModules[existingIdx] = {
            ...updatedModules[existingIdx],
            name: `${t.refNumber} • ${t.taskName}`,
            description: '',
            assignedTo: taskAssignee,
            deadline: t.targetDate || updatedModules[existingIdx].deadline,
            status: modStatus,
            progress: modProgress,
            updatedAt: new Date().toISOString(),
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            taskRefNumber: t.refNumber,
            taskId: t.id,
          };
        } else {
          updatedModules.push({
            id: `mod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: `${t.refNumber} • ${t.taskName}`,
            description: '',
            assignedTo: taskAssignee,
            deadline: t.targetDate || new Date().toISOString().split('T')[0],
            progress: modProgress,
            status: modStatus,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            taskRefNumber: t.refNumber,
            taskId: t.id,
          });
        }

        // Also create/update in dynamic taskService
        try {
          taskService
            .createTask({
              projectId: project.projectId || project.id,
              projectName: project.name,
              title: `${t.refNumber} • ${t.taskName}`,
              description: '',
              assignedTo: taskAssignee,
              status: isDone ? 'Completed' : 'In Progress',
              priority: (t.priority as any) || 'Medium',
              dueDate: t.targetDate,
            })
            .catch(() => {});
        } catch (_) {}
      });

      // Compute overall project status based on all modules:
      // If ANY module or task is incomplete, status MUST be 'In Progress'
      // Only when ALL modules and tasks are completed (100%), status is 'Completed'
      const allModulesDone =
        updatedModules.length > 0 &&
        updatedModules.every(
          (m) => m.status === 'Completed' || (typeof m.progress === 'number' && m.progress === 100)
        );

      const computedProjectStatus = allModulesDone ? 'Completed' : 'In Progress';
      projectPayload.status = computedProjectStatus;

      await projectService.updateProject(project.id, projectPayload);
      await projectService.updateProjectModules(project.id, updatedModules);

      // Realtime event broadcast
      window.dispatchEvent(
        new CustomEvent('crm_projects_updated', { detail: { projectId: project.id } })
      );
    } catch (syncErr) {
      console.warn('Failed to sync tasks and client to project:', syncErr);
    }
  };

  // Add Task to Work in Progress table and synchronize to related Project
  const handleCreateTask = async () => {
    if (!newTaskName.trim() || !ticket) return;
    const count = ticketTasks.length + 1;
    const taskNameClean = newTaskName.trim();
    const assignedPerson =
      newTaskAssignee.trim() ||
      ticket.teamLeadName ||
      ticket.assignedToName ||
      'Technical Support';
    const dueDateStr = newTaskDueDate || new Date().toISOString().split('T')[0];
    const notesClean = newTaskNotes.trim();

    const newTask: TicketTaskItem = {
      id: `task-${Date.now()}`,
      refNumber: `TSK-${String(count).padStart(2, '0')}`,
      taskName: taskNameClean,
      assignedTo: assignedPerson,
      targetDate: dueDateStr,
      priority: newTaskPriority,
      status: 'Pending',
      notes: notesClean || undefined,
    };
    const updated = [...ticketTasks, newTask];
    setTicketTasks(updated);
    try {
      localStorage.setItem(`crm_ticket_tasks_${ticket.id}`, JSON.stringify(updated));
    } catch (_) {}

    await syncTasksAndClientToProject(updated, assignedPerson);

    // Persist newly created task to database table support_ticket_tasks
    createTicketTaskApi(ticket.id, newTask)
      .then((createdDbTask) => {
        if (createdDbTask && createdDbTask.id) {
          setTicketTasks((prev) =>
            prev.map((t) => (t.refNumber === newTask.refNumber ? { ...t, id: createdDbTask.id } : t))
          );
        }
      })
      .catch((err) => console.warn('Failed to persist task to DB:', err));

    setNewTaskName('');
    setNewTaskAssignee('');
    setNewTaskDueDate('');
    setNewTaskNotes('');
    setAddTaskModalOpened(false);
    notifications.show({
      color: 'teal',
      icon: <IconCheck size={16} />,
      title: 'Task Created & Synced',
      message: ticket.projectName
        ? `Task added to Work in Progress and synced to Project "${ticket.projectName}".`
        : 'Task added to Work in Progress workspace.',
    });
  };

  const handleStartEditTask = (task: TicketTaskItem) => {
    setEditTaskName(task.taskName || '');
    setEditTaskAssignee(task.assignedTo || '');
    setEditTaskPriority(task.priority || 'Medium');
    setEditTaskDueDate(task.targetDate || '');
    setEditTaskStatus(task.status || 'Pending');
    setEditTaskNotes(task.notes || '');
    setEditingTaskInModal(true);
  };

  const handleSaveEditedTask = async () => {
    if (!viewingTask || !ticket) return;
    const updatedTask: TicketTaskItem = {
      ...viewingTask,
      taskName: editTaskName.trim() || viewingTask.taskName,
      assignedTo: editTaskAssignee.trim() || viewingTask.assignedTo,
      priority: editTaskPriority,
      targetDate: editTaskDueDate || viewingTask.targetDate,
      status: editTaskStatus,
      notes: editTaskNotes.trim() || undefined,
    };

    const updated = ticketTasks.map((t) =>
      (t.id && t.id === viewingTask.id) || (t.refNumber && t.refNumber === viewingTask.refNumber)
        ? updatedTask
        : t
    );
    setTicketTasks(updated);
    setViewingTask(updatedTask);
    setEditingTaskInModal(false);

    try {
      localStorage.setItem(`crm_ticket_tasks_${ticket.id}`, JSON.stringify(updated));
      if (ticketId && ticketId !== ticket.id) {
        localStorage.setItem(`crm_ticket_tasks_${ticketId}`, JSON.stringify(updated));
      }
    } catch (_) {}

    await syncTasksAndClientToProject(updated);

    updateTicketTaskApi(ticket.id, viewingTask.id || viewingTask.refNumber, {
      taskName: updatedTask.taskName,
      assignedTo: updatedTask.assignedTo,
      priority: updatedTask.priority,
      targetDate: updatedTask.targetDate,
      status: updatedTask.status,
      notes: updatedTask.notes,
    }).catch((err) => console.warn('Failed to update task in DB:', err));

    notifications.show({
      color: 'teal',
      icon: <IconCheck size={16} />,
      title: 'Task Updated',
      message: `Task ${formatRefNumber(updatedTask.refNumber, 'TSK')} updated successfully.`,
    });
  };

  const handleToggleTaskStatus = async (taskId: string) => {
    if (!ticket) return;
    const updated = ticketTasks.map((t) => {
      if (t.id === taskId || t.refNumber === taskId) {
        const nextStatus: Record<string, TicketTaskItem['status']> = {
          Pending: 'In Progress',
          'In Progress': 'Completed',
          Completed: 'Pending',
          Blocked: 'Pending',
        };
        const updatedT: TicketTaskItem = { ...t, status: nextStatus[t.status] || 'Completed' };
        return updatedT;
      }
      return t;
    });
    setTicketTasks(updated);
    try {
      localStorage.setItem(`crm_ticket_tasks_${ticket.id}`, JSON.stringify(updated));
      if (ticketId && ticketId !== ticket.id) {
        localStorage.setItem(`crm_ticket_tasks_${ticketId}`, JSON.stringify(updated));
      }
    } catch (_) {}

    await syncTasksAndClientToProject(updated);

    // Persist status change to database table support_ticket_tasks
    const target = updated.find((t) => t.id === taskId || t.refNumber === taskId);
    if (target) {
      updateTicketTaskApi(ticket.id, target.id || target.refNumber, { status: target.status }).catch((err) =>
        console.warn('Failed to update task status in DB:', err)
      );
    }
  };

  const handleDeleteTask = async (taskOrId: TicketTaskItem | string, index?: number) => {
    if (!ticket) return;

    const targetId = typeof taskOrId === 'string' ? taskOrId : taskOrId?.id;
    const targetRef = typeof taskOrId === 'string' ? taskOrId : taskOrId?.refNumber;
    const targetName = typeof taskOrId === 'string' ? taskOrId : taskOrId?.taskName;

    const targetTask = ticketTasks.find(
      (t, i) =>
        (index !== undefined && i === index) ||
        (targetId && t.id && t.id === targetId) ||
        (targetRef && t.refNumber && t.refNumber === targetRef) ||
        (targetName && t.taskName && t.taskName === targetName)
    );

    const updated = ticketTasks.filter((t, i) => {
      if (index !== undefined && i === index) return false;
      if (targetId && t.id && t.id === targetId) return false;
      if (targetRef && t.refNumber && t.refNumber === targetRef) return false;
      if (targetName && t.taskName && t.taskName === targetName) return false;
      return true;
    });

    setTicketTasks(updated);

    // Save to localStorage across all potential keys and mark initialized
    try {
      localStorage.setItem(`crm_ticket_tasks_${ticket.id}`, JSON.stringify(updated));
      localStorage.setItem(`crm_ticket_tasks_initialized_${ticket.id}`, 'true');
      if (ticketId && ticketId !== ticket.id) {
        localStorage.setItem(`crm_ticket_tasks_${ticketId}`, JSON.stringify(updated));
        localStorage.setItem(`crm_ticket_tasks_initialized_${ticketId}`, 'true');
      }
      if (ticket.ticketNumber) {
        localStorage.setItem(`crm_ticket_tasks_${ticket.ticketNumber}`, JSON.stringify(updated));
      }
    } catch (_) {}

    // Persist deletion to database table support_ticket_tasks
    if (targetTask) {
      deleteTicketTaskApi(ticket.id, targetTask.id || targetTask.refNumber).catch((err) =>
        console.warn('Failed to delete task from DB:', err)
      );
    }

    notifications.show({
      color: 'red',
      icon: <IconTrash size={16} />,
      title: 'Task Removed',
      message: targetTask
        ? `Task "${targetTask.refNumber ? `${targetTask.refNumber} • ` : ''}${targetTask.taskName}" removed.`
        : 'Task removed from Work in Progress.',
    });

    // Remove from related project if present
    if (targetTask && (ticket.projectId || ticket.projectName)) {
      try {
        const targetProjId =
          ticket.projectId ||
          metadata?.projects?.find(
            (p) =>
              p.id === ticket.projectId ||
              (ticket.projectName && p.name.toLowerCase() === ticket.projectName.toLowerCase())
          )?.id;

        if (targetProjId) {
          const projRes = await projectService.getProjectById(targetProjId);
          if (projRes.success && projRes.data && Array.isArray(projRes.data.modules)) {
            const updatedModules = projRes.data.modules.filter(
              (m) =>
                !(targetTask.refNumber && m.name.includes(targetTask.refNumber)) &&
                !(targetTask.taskName && m.name.includes(targetTask.taskName)) &&
                !(targetTask.id && m.id === targetTask.id)
            );

            // Recompute project status after deleting the task
            const allDoneAfterDelete =
              updatedModules.length > 0 &&
              updatedModules.every(
                (m) => m.status === 'Completed' || (typeof m.progress === 'number' && m.progress === 100)
              );
            const statusAfterDelete = allDoneAfterDelete ? 'Completed' : 'In Progress';

            await projectService.updateProject(projRes.data.id, { status: statusAfterDelete });
            await projectService.updateProjectModules(projRes.data.id, updatedModules);
            window.dispatchEvent(
              new CustomEvent('crm_projects_updated', { detail: { projectId: projRes.data.id } })
            );
          }
        }
      } catch (_) {}
    }
  };

  const handleProceedToResolutionClick = () => {
    if (completedTasks.length === 0) {
      notifications.show({
        title: 'No Completed Tasks',
        message: 'Please complete at least one task before proceeding to resolution.',
        color: 'orange',
        icon: <IconAlertTriangle size={16} />,
      });
      return;
    }

    let targetTasks = ticketTasks.filter((t) => selectedTaskIds.includes(t.id || t.refNumber));
    if (targetTasks.length === 0) {
      if (completedTasks.length === 1) {
        setSelectedTaskIds([completedTasks[0].id || completedTasks[0].refNumber]);
        targetTasks = [completedTasks[0]];
      } else {
        notifications.show({
          title: 'Select Completed Task',
          message: 'Please select the completed task(s) you wish to resolve.',
          color: 'blue',
          icon: <IconAlertTriangle size={16} />,
        });
        return;
      }
    }

    const taskNames = targetTasks.map((t) => `${formatRefNumber(t.refNumber, 'TSK')}: ${t.taskName}`).join(', ');
    if (taskNames && (!resolutionDesc || resolutionDesc.startsWith('Resolution completed for'))) {
      setResolutionDesc(`Resolution completed for ${taskNames}.`);
    }

    setResolutionModalOpened(true);
  };

  // Resolve Ticket Submit
  const handleResolveSubmit = async () => {
    if (!ticket) return;
    if (!resolutionDesc.trim()) {
      notifications.show({
        title: 'Fixed Details Required',
        message: 'Please provide fixed details of the resolution.',
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      });
      return;
    }
    setResolving(true);
    try {
      const nowIso = new Date().toISOString();
      const targetIds = selectedTaskIds.length > 0
        ? selectedTaskIds
        : completedTasks.map((t) => t.id || t.refNumber);

      const updated = ticketTasks.map((t) => {
        const isTarget = targetIds.includes(t.id || t.refNumber);
        if (isTarget) {
          return {
            ...t,
            status: 'Resolved' as const,
            resolutionDescription: resolutionDesc.trim(),
            rootCause: rootCause.trim() || undefined,
            workaround: workaround.trim() || undefined,
            resolvedAt: nowIso,
            resolvedBy: currentUser?.name || ticket.assignedToName || 'Technical Support',
          };
        }
        return t;
      });

      setTicketTasks(updated);
      setSelectedTaskIds([]);

      try {
        localStorage.setItem(`crm_ticket_tasks_${ticket.id}`, JSON.stringify(updated));
        if (ticketId && ticketId !== ticket.id) {
          localStorage.setItem(`crm_ticket_tasks_${ticketId}`, JSON.stringify(updated));
        }
      } catch (_) {}

      // Persist resolved tasks in DB
      await syncTicketTasksApi(ticket.id, updated).catch((err) =>
        console.warn('Failed to sync tasks to DB:', err)
      );

      await syncTasksAndClientToProject(updated);

      // Check if ALL tasks in Work in Progress are completed and resolved:
      // Ticket status only becomes 'Resolved' when all tasks in Work in Progress are resolved!
      const remainingUnresolvedTasks = updated.filter((t) => t.status !== 'Resolved');
      const allTasksResolved = updated.length > 0 && remainingUnresolvedTasks.length === 0;

      if (allTasksResolved) {
        // ALL tasks completed & resolved -> change ticket status to Resolved
        await resolveTicket(ticket.id, {
          resolution_description: resolutionDesc.trim(),
          root_cause: rootCause.trim() || undefined,
          workaround: workaround.trim() || undefined,
          skipTaskCheck: true,
        });
        setResolutionModalOpened(false);
        setActiveTab('closed');
        await fetchTicketById(ticket.id);
        notifications.show({
          color: 'teal',
          icon: <IconCheck size={16} />,
          title: 'Ticket Fully Resolved',
          message: `All tasks completed and resolved! Ticket ${ticket.ticketNumber} status is now Resolved.`,
        });
      } else {
        // There are still tasks remaining in Work in Progress!
        // Ticket status MUST NOT become 'Resolved'. Ensure it remains 'In Progress'.
        if (ticket.status !== 'In Progress') {
          try {
            await changeStatus(ticket.id, 'In Progress', {
              reason: `Task resolved. ${remainingUnresolvedTasks.length} task(s) still remaining in Work in Progress.`,
            });
          } catch (_) {}
        }
        setResolutionModalOpened(false);
        setActiveTab('closed');
        await fetchTicketById(ticket.id);
        notifications.show({
          color: 'blue',
          icon: <IconCheck size={16} />,
          title: 'Task Resolved & Moved',
          message: `Task moved to Resolved section. Ticket status remains "In Progress" until all tasks are completed (${remainingUnresolvedTasks.length} task(s) still in Work in Progress).`,
        });
      }
    } catch {
      // handled by context
    } finally {
      setResolving(false);
    }
  };

  const handleReopenSubmit = async () => {
    if (!ticket) return;
    if (!reopenReason.trim()) {
      notifications.show({
        title: 'Reopen Reason Required',
        message: 'Please state the reason for reopening this ticket.',
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      });
      return;
    }
    setReopening(true);
    try {
      await reopenTicket(ticket.id, { reason: reopenReason.trim() });
      setReopenPromptOpened(false);
      setReopenReason('');
      setActiveTab('in_progress');
      await fetchTicketById(ticket.id);
    } catch {
      // handled by context
    } finally {
      setReopening(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket) return;
    setDeleteLoading(true);
    try {
      await deleteTicket(ticket.id);
      setDeleteModalOpened(false);
      onBack();
    } catch {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="lg">
        <Paper p="xl" radius="md" withBorder>
          <Text c="dimmed">Loading ticket details...</Text>
        </Paper>
      </Container>
    );
  }

  if (!ticket) {
    return (
      <Container size="md" py="xl">
        <Paper p="2.5rem" radius="lg" withBorder style={{ textAlign: 'center' }}>
          <ThemeIcon size={56} radius="xl" color="red" variant="light" mb="md" style={{ margin: '0 auto' }}>
            <IconAlertTriangle size={28} />
          </ThemeIcon>
          <Text fw={700} size="lg">
            Ticket Not Found
          </Text>
          <Text size="sm" c="dimmed" mt={4} mb="xl">
            The requested ticket does not exist or has been deleted.
          </Text>
          <Button
            size="sm"
            color="blue"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onBack}
            style={{ borderRadius: 10, fontWeight: 700 }}
          >
            Back to Support Tickets
          </Button>
        </Paper>
      </Container>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'New': return 'teal';
      case 'Assigned': return 'blue';
      case 'In Progress': return 'indigo';
      case 'Pending Customer': return 'orange';
      case 'On Hold': return 'yellow';
      case 'Resolved': return 'green';
      case 'Closed': return 'gray';
      case 'Reopened': return 'grape';
      case 'Cancelled': return 'red';
      default: return 'blue';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Call': return 'teal';
      case 'Meeting': return 'blue';
      case 'Note': return 'indigo';
      case 'Email': return 'cyan';
      case 'WhatsApp': return 'green';
      case 'Ticket Created': return 'indigo';
      default: return 'blue';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'teal';
      case 'Completed': return 'teal';
      case 'In Progress': return 'blue';
      case 'Pending': return 'yellow';
      case 'Blocked': return 'red';
      default: return 'gray';
    }
  };

  const SECTIONS: Array<{ id: TicketSectionType; label: string; icon: React.FC<any> }> = [
    { id: 'activities', label: 'Activities', icon: IconHistory },
    { id: 'in_progress', label: 'Work in Progress', icon: IconClock },
    { id: 'closed', label: 'Resolved', icon: IconCircleCheck },
  ];

  const currentStageLabel =
    activeTab === 'activities' ? 'Activities' : activeTab === 'in_progress' ? 'Work in Progress' : 'Resolved';

  return (
    <Box style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '16px 20px' }}>
      <Stack gap="md">

        {/* ========================================================================= */}
        {/* 1. TOP BREADCRUMBS & STATUS / STAGE BADGES (Exact Deal Pipeline Layout)    */}
        {/* ========================================================================= */}
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap={6} align="center">
            <Text
              size="13px"
              fw={500}
              style={{
                color: isDark ? '#94A3B8' : '#64748B',
                cursor: 'pointer',
              }}
              onClick={onBack}
            >
              Support Tickets
            </Text>
            <IconChevronRight size={13} color="#94A3B8" />
            <Text
              size="13px"
              fw={700}
              style={{
                color: isDark ? '#F8FAFC' : '#0F172A',
                cursor: ticket.customerId && onNavigateToCustomer ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (ticket.customerId && onNavigateToCustomer) {
                  onNavigateToCustomer(ticket.customerId);
                }
              }}
            >
              {ticket.customerName || ticket.reportedBy || 'Customer'}
            </Text>
            <IconChevronRight size={13} color="#94A3B8" />
            <Text
              size="13px"
              fw={600}
              style={{ color: isDark ? '#60A5FA' : '#2563EB', fontFamily: 'monospace' }}
            >
              {ticket.ticketNumber}
            </Text>
          </Group>

          <Group gap="xs" align="center">
            <Badge
              size="sm"
              variant="light"
              color={getStatusBadgeColor(ticket.status)}
              radius="xl"
              style={{ fontWeight: 700 }}
            >
              {ticket.status}
            </Badge>
            <Badge
              size="sm"
              variant="outline"
              color="indigo"
              radius="xl"
              style={{ fontWeight: 600 }}
            >
              Stage: {currentStageLabel}
            </Badge>

            {/* Ticket Management Quick Actions */}
            <Group gap={4} ml="xs">
              <Tooltip label="Edit Ticket Details">
                <ActionIcon variant="light" color="indigo" size="sm" radius="md" onClick={() => setEditModalOpened(true)}>
                  <IconEdit size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Change Status">
                <ActionIcon variant="light" color="blue" size="sm" radius="md" onClick={() => setStatusModalOpened(true)}>
                  <IconClock size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete Ticket">
                <ActionIcon variant="light" color="red" size="sm" radius="md" onClick={() => setDeleteModalOpened(true)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Group>

        {/* Collapsible Ticket Overview Bar */}
        <Paper
          withBorder
          radius="md"
          p="xs"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
          }}
        >
          <Group justify="space-between" align="center">
            <Group gap="md">
              <Text size="xs" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                {ticket.subject}
              </Text>
              <Text size="xs" c="dimmed">•</Text>
              <Text size="xs" c="dimmed">
                Customer: <strong style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>{ticket.customerName || '—'}</strong>
              </Text>
              <Text size="xs" c="dimmed">•</Text>
              <Text size="xs" c="dimmed">
                Priority: <strong style={{ color: ticket.priority === 'Critical' ? '#EF4444' : '#F59E0B' }}>{ticket.priority}</strong>
              </Text>
              <Text size="xs" c="dimmed">•</Text>
              <Text size="xs" c="dimmed">
                Assigned: <strong style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>{ticket.assignedToName || ticket.assignedTeam || 'Unassigned'}</strong>
              </Text>
            </Group>
            <UnstyledButton
              onClick={() => setOverviewOpened((o) => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Text size="11px" fw={600} c="blue">
                {overviewOpened ? 'Hide Details' : 'View Full Details'}
              </Text>
              {overviewOpened ? <IconChevronUp size={13} color="#2563EB" /> : <IconChevronDown size={13} color="#2563EB" />}
            </UnstyledButton>
          </Group>

          <Collapse in={overviewOpened}>
            <Divider my="xs" />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mt="xs">
              <Box>
                <Text size="11px" c="dimmed" fw={600} tt="uppercase">Problem Description</Text>
                <Text size="xs" mt={2} style={{ whiteSpace: 'pre-wrap' }}>{ticket.description || '—'}</Text>
              </Box>
              <Box>
                <Text size="11px" c="dimmed" fw={600} tt="uppercase">Project & Contact</Text>
                <Text size="xs" mt={2}>
                  Project: <strong>{ticket.projectName || '—'}</strong>
                </Text>
                <Text size="xs" mt={1}>
                  Contact: <strong>{ticket.contactName || '—'}</strong> {ticket.contactPhone ? `(${ticket.contactPhone})` : ''} {ticket.contactEmail ? `• ${ticket.contactEmail}` : ''}
                </Text>
                <Text size="xs" mt={1}>
                  Service Contract: <strong>{ticket.contractTitle ? `${ticket.contractTitle}${ticket.contractType ? ` (${ticket.contractType})` : ''}` : 'Not Linked'}</strong>
                </Text>
              </Box>
              <Box>
                <Text size="11px" c="dimmed" fw={600} tt="uppercase">SLA & Reported</Text>
                <Text size="xs" mt={2}>
                  Reported: {new Date(ticket.reportedAt).toLocaleDateString('en-GB')} by {ticket.reportedBy}
                </Text>
                <Text size="xs" mt={1}>
                  Due Date: {(ticket.resolutionDueAt || ticket.targetResolutionDate) ? new Date(ticket.resolutionDueAt || ticket.targetResolutionDate!).toLocaleDateString('en-GB') : '—'}
                </Text>
              </Box>
            </SimpleGrid>
          </Collapse>
        </Paper>

        {/* ========================================================================= */}
        {/* 2. HORIZONTAL SECTION TABS (Deal Pipeline Underline Style)                */}
        {/* ========================================================================= */}
        <Box
          mb="xs"
          style={{
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <Group gap="xl" wrap="nowrap" style={{ minWidth: 'max-content' }}>
            {SECTIONS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <UnstyledButton
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '14px 6px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    borderBottom: isActive ? '3px solid #2563EB' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    marginBottom: -1,
                  }}
                >
                  <Icon
                    size={16}
                    color={isActive ? '#2563EB' : isDark ? '#94A3B8' : '#64748B'}
                    stroke={isActive ? 2.4 : 1.8}
                  />
                  <Text
                    size="14px"
                    fw={isActive ? 700 : 500}
                    style={{
                      color: isActive ? (isDark ? '#93C5FD' : '#2563EB') : isDark ? '#94A3B8' : '#64748B',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </Text>
                  {tab.id === 'activities' && displayActivities.length > 0 && (
                    <Badge size="xs" variant="filled" color="blue" circle>
                      {displayActivities.length}
                    </Badge>
                  )}
                  {tab.id === 'closed' && (ticket.status === 'Resolved' || ticket.status === 'Closed') && (
                    <Badge size="xs" variant="light" color="teal">
                      ✓
                    </Badge>
                  )}
                </UnstyledButton>
              );
            })}
          </Group>
        </Box>

        {/* ========================================================================= */}
        {/* TAB 1: ACTIVITIES (Exact Table & Header Format from Screenshot)           */}
        {/* ========================================================================= */}
        {activeTab === 'activities' && (
          <Box>
            {/* Header Toolbar */}
            <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">
              <div>
                <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
                  Activities
                </Text>
                <Text size="xs" c="dimmed">
                  Track customer communications, call logs, and chronological activity for {ticket.ticketNumber}.
                </Text>
              </div>

              <Group gap="sm">
                <Button
                  size="sm"
                  leftSection={<IconPhoneCall size={14} />}
                  onClick={handleOpenLogActivity}
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                    color: '#FFF',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  Log Activity
                </Button>

                <Button
                  size="sm"
                  variant="light"
                  color="blue"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={handleProceedToInProgress}
                  style={{ borderRadius: 10, fontWeight: 700 }}
                >
                  Proceed to Work in Progress
                </Button>
              </Group>
            </Group>

            {/* Activities Table View (Exact Paper & Table Styling from Deal Pipeline) */}
            <Paper
              radius="lg"
              style={{
                background: isDark ? '#111827' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
                marginTop: 16,
              }}
            >
              <Table.ScrollContainer minWidth={850}>
                <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
                  <Table.Thead
                    style={{
                      background: isDark ? '#0F172A' : '#FBFBFC',
                      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
                    }}
                  >
                    <Table.Tr>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                        ACTIVITY / REF
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                        TYPE / MODE
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                        DATE & TIME
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                        DETAILS / SUMMARY
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                        STATUS
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                        ACTIONS
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {displayActivities.map((act) => {
                      const isCall = act.type === 'Call';
                      const isMeeting = act.type === 'Meeting';
                      const isWhatsApp = act.type === 'WhatsApp';
                      const isEmail = act.type === 'Email';
                      const isInit = act.type === 'Ticket Created';
                      const isNote = act.type === 'Note';

                      return (
                        <Table.Tr
                          key={act.id}
                          onClick={() => handleSelectActivity(act)}
                          style={{
                            cursor: 'pointer',
                            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                          }}
                        >
                          {/* 1. ACTIVITY / REF */}
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap">
                              <Box
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 10,
                                  background: isCall
                                    ? isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5'
                                    : isMeeting
                                    ? isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF'
                                    : isWhatsApp
                                    ? isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5'
                                    : isEmail
                                    ? isDark ? 'rgba(13, 148, 136, 0.18)' : '#F0FDFA'
                                    : isInit
                                    ? isDark ? 'rgba(79, 70, 229, 0.18)' : '#EEF2FF'
                                    : isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF',
                                  color: isCall
                                    ? '#059669'
                                    : isMeeting
                                    ? '#2563EB'
                                    : isWhatsApp
                                    ? '#10B981'
                                    : isEmail
                                    ? '#0D9488'
                                    : isInit
                                    ? '#4F46E5'
                                    : '#2563EB',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: 14,
                                  flexShrink: 0,
                                  border: isCall
                                    ? isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #A7F3D0'
                                    : isMeeting
                                    ? isDark ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid #BFDBFE'
                                    : isWhatsApp
                                    ? isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #A7F3D0'
                                    : isEmail
                                    ? isDark ? '1px solid rgba(13, 148, 136, 0.25)' : '1px solid #99F6E4'
                                    : isInit
                                    ? isDark ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid #E0E7FF'
                                    : isDark ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid #BFDBFE',
                                }}
                              >
                                {isCall ? (
                                  <IconPhoneCall size={19} stroke={1.8} />
                                ) : isMeeting ? (
                                  <IconCalendar size={19} stroke={1.8} />
                                ) : isWhatsApp ? (
                                  <IconBrandWhatsapp size={19} stroke={1.8} />
                                ) : isEmail ? (
                                  <IconMail size={19} stroke={1.8} />
                                ) : isNote ? (
                                  <IconMessageDots size={19} stroke={1.8} />
                                ) : (
                                  <IconFileDescription size={19} stroke={1.8} />
                                )}
                              </Box>
                              <div>
                                <Text
                                  size="sm"
                                  fw={700}
                                  style={{
                                    color: isDark ? '#F8FAFC' : '#0F172A',
                                    cursor: 'pointer',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectActivity(act);
                                  }}
                                >
                                  {formatRefNumber(act.refNumber, 'ACT')}
                                </Text>
                                <Group gap={6} mt={2}>
                                  <Text size="11px" c="dimmed">
                                    {act.customerName || ticket.customerName}
                                  </Text>
                                  <Text size="11px" c="dimmed">•</Text>
                                  <Text size="11px" c="dimmed">
                                    {act.contactPerson || ticket.contactName || 'Customer Contact'}
                                  </Text>
                                </Group>
                              </div>
                            </Group>
                          </Table.Td>

                          {/* 2. TYPE / MODE */}
                          <Table.Td>
                            <Badge size="sm" variant="filled" color={getTypeBadgeColor(act.type)} radius="sm">
                              {act.type}
                            </Badge>
                          </Table.Td>

                          {/* 3. DATE & TIME */}
                          <Table.Td>
                            <Group gap={6}>
                              <IconCalendar size={14} color="#94A3B8" />
                              <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                                {act.date}
                              </Text>
                            </Group>
                            <Text size="11px" c="dimmed" mt={2}>
                              {act.time}
                            </Text>
                          </Table.Td>

                          {/* 4. DETAILS / SUMMARY */}
                          <Table.Td style={{ maxWidth: 320 }}>
                            <Text size="xs" fw={500} lineClamp={1} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                              {act.summary}
                            </Text>
                            {act.assignee && (
                              <Text size="11px" c="dimmed" mt={2}>
                                Logged by: {act.assignee}
                              </Text>
                            )}
                          </Table.Td>

                          {/* 5. STATUS */}
                          <Table.Td>
                            <Badge
                              size="sm"
                              variant="light"
                              color={
                                act.status === 'Completed'
                                  ? 'teal'
                                  : act.status === 'Scheduled'
                                  ? 'blue'
                                  : act.status === 'Rescheduled'
                                  ? 'orange'
                                  : act.status === 'Cancelled'
                                  ? 'red'
                                  : act.status === 'Follow-up'
                                  ? 'yellow'
                                  : 'teal'
                              }
                              radius="xl"
                            >
                              {act.status}
                            </Badge>
                          </Table.Td>

                          {/* 6. ACTIONS */}
                          <Table.Td onClick={(e) => e.stopPropagation()}>
                            <Group gap={4} justify="flex-end" wrap="nowrap">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                size="sm"
                                title="View Details"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectActivity(act);
                                }}
                              >
                                <IconEye size={15} />
                              </ActionIcon>
                              {act.id.startsWith('act-user-') && (
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="sm"
                                  title="Delete Activity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteActivity(act.id);
                                  }}
                                >
                                  <IconTrash size={15} />
                                </ActionIcon>
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
          </Box>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: WORK IN PROGRESS WORKSPACE (Exact Table & Header Format from Screenshot) */}
        {/* ========================================================================= */}
        {activeTab === 'in_progress' && (
          <Box>
            {/* Header Toolbar */}
            <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">
              <div>
                <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
                  Work in Progress Workspace
                </Text>
                <Text size="xs" c="dimmed">
                  Technical diagnostics, troubleshooting tasks, root cause analysis, and resolution for {ticket.ticketNumber}.
                </Text>
              </div>

              <Group gap="sm">
                <Button
                  size="sm"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setAddTaskModalOpened(true)}
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                    color: '#FFF',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  Add Task
                </Button>

                <Button
                  size="sm"
                  variant="light"
                  color="blue"
                  leftSection={<IconUserCheck size={14} />}
                  onClick={() => setAssignModalOpened(true)}
                  style={{ borderRadius: 10, fontWeight: 700 }}
                >
                  Assign / Reassign
                </Button>

                <Button
                  size="sm"
                  variant="light"
                  color="teal"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={handleProceedToResolutionClick}
                  style={{ borderRadius: 10, fontWeight: 700 }}
                >
                  Proceed to Resolution {selectedTaskIds.length > 0 ? `(${selectedTaskIds.length})` : ''}
                </Button>
              </Group>
            </Group>

            {/* In Progress Table View */}
            <Paper
              radius="lg"
              style={{
                background: isDark ? '#111827' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
                marginTop: 16,
              }}
            >
              <Table.ScrollContainer minWidth={850}>
                <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
                  <Table.Thead
                    style={{
                      background: isDark ? '#0F172A' : '#FBFBFC',
                      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
                    }}
                  >
                    <Table.Tr>
                      <Table.Th style={{ width: 44, padding: '8px 8px', textAlign: 'center' }}>
                        {completedTasks.length > 0 && (
                          <Checkbox
                            size="xs"
                            color="teal"
                            aria-label="Select all completed tasks"
                            checked={selectedTaskIds.length > 0 && selectedTaskIds.length === completedTasks.length}
                            indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < completedTasks.length}
                            onChange={(e) => {
                              if (e.currentTarget.checked) {
                                setSelectedTaskIds(completedTasks.map((t) => t.id || t.refNumber));
                              } else {
                                setSelectedTaskIds([]);
                              }
                            }}
                            title="Select all completed tasks"
                          />
                        )}
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                        TASK / WORK LOG
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                        ASSIGNED TO
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                        TARGET DATE
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                        PRIORITY
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                        STATUS
                      </Table.Th>
                      <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                        ACTIONS
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {inProgressTasks.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px' }}>
                          <Stack align="center" gap="xs">
                            <ThemeIcon size={44} radius="xl" variant="light" color="blue">
                              <IconTools size={22} />
                            </ThemeIcon>
                            <Text fw={600} size="sm" c="dimmed">
                              No tasks in Work in Progress workspace
                            </Text>
                            <Text size="xs" c="dimmed" maw={440}>
                              Technical diagnostics, troubleshooting tasks, and resolution steps for this ticket will appear here.
                            </Text>
                            <Button
                              size="xs"
                              variant="light"
                              leftSection={<IconPlus size={14} />}
                              onClick={() => setAddTaskModalOpened(true)}
                              mt="xs"
                            >
                              Add First Task
                            </Button>
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      inProgressTasks.map((task, index) => {
                        const isSelected = selectedTaskIds.includes(task.id || task.refNumber);
                        return (
                          <Table.Tr
                            key={task.id || `task-row-${index}`}
                            onClick={() => {
                              setViewingTask(task);
                              setEditingTaskInModal(false);
                            }}
                            style={{
                              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                              cursor: 'pointer',
                              background: isSelected
                                ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4')
                                : undefined,
                            }}
                            title="Click to view full task details"
                          >
                            {/* Checkbox column (Visible ONLY for Completed tasks) */}
                            <Table.Td style={{ width: 44, padding: '8px 8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              {task.status === 'Completed' ? (
                                <Checkbox
                                  size="xs"
                                  color="teal"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const id = task.id || task.refNumber;
                                    if (e.currentTarget.checked) {
                                      setSelectedTaskIds((prev) => [...prev, id]);
                                    } else {
                                      setSelectedTaskIds((prev) => prev.filter((x) => x !== id));
                                    }
                                  }}
                                  title="Select completed task to resolve"
                                />
                              ) : null}
                            </Table.Td>

                            {/* 1. TASK / WORK LOG */}
                            <Table.Td>
                              <Group gap="sm" wrap="nowrap">
                                <Box
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    background: isDark ? 'rgba(79, 70, 229, 0.18)' : '#EEF2FF',
                                    color: isDark ? '#A5B4FC' : '#4F46E5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: 14,
                                    flexShrink: 0,
                                    border: isDark ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid #E0E7FF',
                                  }}
                                >
                                  <IconTools size={19} stroke={1.8} />
                                </Box>
                                <div>
                                  <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                                    {task.taskName}
                                  </Text>
                                  <Group gap={6} mt={2}>
                                    <Text size="11px" c="dimmed">{formatRefNumber(task.refNumber, 'TSK')}</Text>
                                  </Group>
                                </div>
                              </Group>
                            </Table.Td>

                        {/* 2. ASSIGNED TO */}
                        <Table.Td>
                          <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                            {task.assignedTo}
                          </Text>
                        </Table.Td>

                        {/* 3. TARGET DATE */}
                        <Table.Td>
                          <Group gap={6}>
                            <IconCalendar size={14} color="#94A3B8" />
                            <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                              {task.targetDate}
                            </Text>
                          </Group>
                        </Table.Td>

                        {/* 4. PRIORITY */}
                        <Table.Td>
                          <Badge size="sm" variant="light" color={task.priority === 'Critical' ? 'red' : task.priority === 'High' ? 'orange' : 'blue'}>
                            {task.priority}
                          </Badge>
                        </Table.Td>

                        {/* 5. STATUS */}
                        <Table.Td onClick={(e) => e.stopPropagation()}>
                          <Badge
                            size="sm"
                            variant="filled"
                            color={getTaskStatusColor(task.status)}
                            radius="sm"
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTaskStatus(task.id || task.refNumber);
                            }}
                            title="Click to toggle status"
                          >
                            {task.status}
                          </Badge>
                        </Table.Td>

                        {/* 6. ACTIONS */}
                        <Table.Td onClick={(e) => e.stopPropagation()}>
                          <Group gap={4} justify="flex-end" wrap="nowrap">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              size="sm"
                              title="View Task Details"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingTask(task);
                                setEditingTaskInModal(false);
                              }}
                            >
                              <IconEye size={15} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="indigo"
                              size="sm"
                              title="Edit Task"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingTask(task);
                                handleStartEditTask(task);
                              }}
                            >
                              <IconEdit size={15} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              title="Delete Task"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task, index);
                              }}
                            >
                              <IconTrash size={15} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  }))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          </Box>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: RESOLVED (Exact Table & Header Format from Screenshot)             */}
        {/* ========================================================================= */}
        {activeTab === 'closed' && (
          <Box>
            {/* Header Toolbar */}
            <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">
              <div>
                <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
                  Resolved Workspace
                </Text>
                <Text size="xs" c="dimmed">
                  Final resolution details, root cause analysis, customer sign-off, and resolution history for {ticket.ticketNumber}.
                </Text>
              </div>

              <Group gap="sm">
                {ticket.status === 'Resolved' || ticket.status === 'Closed' ? (
                  <Button
                    size="sm"
                    color="grape"
                    leftSection={<IconRotateClockwise size={14} />}
                    onClick={() => setReopenPromptOpened(true)}
                    style={{ borderRadius: 10, fontWeight: 700 }}
                  >
                    Reopen Ticket
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    leftSection={<IconCircleCheck size={14} />}
                    onClick={() => setResolutionModalOpened(true)}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                      color: '#FFF',
                      borderRadius: 10,
                      fontWeight: 700,
                    }}
                  >
                    Record Resolution & Resolve
                  </Button>
                )}
              </Group>
            </Group>

            {/* If Resolved, Show Resolution Table */}
            {resolvedTasks.length > 0 || ticket.status === 'Resolved' || ticket.status === 'Closed' || ticket.resolutionDescription ? (
              <Paper
                radius="lg"
                style={{
                  background: isDark ? '#111827' : '#FFFFFF',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                  overflow: 'hidden',
                  boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
                  marginTop: 16,
                }}
              >
                <Table.ScrollContainer minWidth={850}>
                  <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
                    <Table.Thead
                      style={{
                        background: isDark ? '#0F172A' : '#FBFBFC',
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
                      }}
                    >
                      <Table.Tr>
                        <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                          RESOLVED TASK / WORK LOG
                        </Table.Th>
                        <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                          RESOLVED BY
                        </Table.Th>
                        <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                          DATE & TIME
                        </Table.Th>
                        <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                          ROOT CAUSE & WORKAROUND
                        </Table.Th>
                        <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                          STATUS
                        </Table.Th>
                        <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                          ACTIONS
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody>
                      {resolvedTasks.length > 0 ? (
                        resolvedTasks.map((resTask, idx) => (
                          <Table.Tr
                            key={resTask.id || `res-task-${idx}`}
                            onClick={() => {
                              setViewingTask(resTask);
                              setEditingTaskInModal(false);
                            }}
                            style={{
                              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                              cursor: 'pointer',
                            }}
                            title="Click to view resolved task details"
                          >
                            <Table.Td>
                              <Group gap="sm" wrap="nowrap">
                                <Box
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    background: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: 14,
                                    flexShrink: 0,
                                    border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #A7F3D0',
                                  }}
                                >
                                  <IconCircleCheck size={19} stroke={1.8} />
                                </Box>
                                <div>
                                  <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                                    {formatRefNumber(resTask.refNumber, 'TSK')} • {resTask.taskName}
                                  </Text>
                                  <Text size="11px" c="dimmed">
                                    {resTask.resolutionDescription || ticket.resolutionDescription || 'Task verified and resolved.'}
                                  </Text>
                                </div>
                              </Group>
                            </Table.Td>

                            <Table.Td>
                              <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                                {resTask.resolvedBy || resTask.assignedTo || ticket.assignedToName || 'Technical Support'}
                              </Text>
                            </Table.Td>

                            <Table.Td>
                              <Group gap={6}>
                                <IconCalendar size={14} color="#94A3B8" />
                                <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                                  {resTask.resolvedAt
                                    ? new Date(resTask.resolvedAt).toISOString().split('T')[0]
                                    : ticket.resolvedAt
                                    ? new Date(ticket.resolvedAt).toISOString().split('T')[0]
                                    : new Date().toISOString().split('T')[0]}
                                </Text>
                              </Group>
                            </Table.Td>

                            <Table.Td style={{ maxWidth: 300 }}>
                              <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                                Cause: {resTask.rootCause || ticket.rootCause || 'Defect resolved and verified.'}
                              </Text>
                              {(resTask.workaround || ticket.workaround) && (
                                <Text size="11px" c="dimmed" mt={2}>
                                  Workaround: {resTask.workaround || ticket.workaround}
                                </Text>
                              )}
                            </Table.Td>

                            <Table.Td>
                              <Badge size="sm" variant="filled" color="teal" radius="sm">
                                Resolved
                              </Badge>
                            </Table.Td>

                            <Table.Td onClick={(e) => e.stopPropagation()}>
                              <Group gap={4} justify="flex-end" wrap="nowrap">
                                <ActionIcon
                                  variant="subtle"
                                  color="blue"
                                  size="sm"
                                  title="View Task Details"
                                  onClick={() => {
                                    setViewingTask(resTask);
                                    setEditingTaskInModal(false);
                                  }}
                                >
                                  <IconEye size={15} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="subtle"
                                  color="grape"
                                  size="sm"
                                  title="Reopen Task (Move back to In Progress)"
                                  onClick={async () => {
                                    const updated = ticketTasks.map((t) =>
                                      (t.id && t.id === resTask.id) || (t.refNumber && t.refNumber === resTask.refNumber)
                                        ? { ...t, status: 'In Progress' as const }
                                        : t
                                    );
                                    setTicketTasks(updated);
                                    try {
                                      localStorage.setItem(`crm_ticket_tasks_${ticket.id}`, JSON.stringify(updated));
                                    } catch (_) {}
                                    await syncTasksAndClientToProject(updated);
                                    updateTicketTaskApi(ticket.id, resTask.id || resTask.refNumber, { status: 'In Progress' }).catch(() => {});
                                    notifications.show({
                                      color: 'blue',
                                      icon: <IconRotateClockwise size={16} />,
                                      title: 'Task Reopened',
                                      message: `Task ${formatRefNumber(resTask.refNumber, 'TSK')} moved back to Work in Progress.`,
                                    });
                                  }}
                                >
                                  <IconRotateClockwise size={15} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      ) : (
                        <Table.Tr
                          style={{
                            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                          }}
                        >
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap">
                              <Box
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 10,
                                  background: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
                                  color: '#059669',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: 14,
                                  flexShrink: 0,
                                  border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #A7F3D0',
                                }}
                              >
                                <IconCircleCheck size={19} stroke={1.8} />
                              </Box>
                              <div>
                                <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                                  RES-01
                                </Text>
                                <Text size="11px" c="dimmed">
                                  {ticket.resolutionDescription || 'Issue successfully resolved and verified'}
                                </Text>
                              </div>
                            </Group>
                          </Table.Td>

                          <Table.Td>
                            <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                              {ticket.assignedToName || ticket.reportedBy || 'Support Team'}
                            </Text>
                          </Table.Td>

                          <Table.Td>
                            <Group gap={6}>
                              <IconCalendar size={14} color="#94A3B8" />
                              <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                                {ticket.resolvedAt
                                  ? new Date(ticket.resolvedAt).toISOString().split('T')[0]
                                  : (ticket.updatedAt ? new Date(ticket.updatedAt).toISOString().split('T')[0] : '—')}
                              </Text>
                            </Group>
                          </Table.Td>

                          <Table.Td style={{ maxWidth: 300 }}>
                            <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                              Cause: {ticket.rootCause || 'Defect identified and resolved.'}
                            </Text>
                            {ticket.workaround && (
                              <Text size="11px" c="dimmed" mt={2}>
                                Workaround: {ticket.workaround}
                              </Text>
                            )}
                          </Table.Td>

                          <Table.Td>
                            <Badge size="sm" variant="filled" color="teal" radius="sm">
                              {ticket.status}
                            </Badge>
                          </Table.Td>

                          <Table.Td>
                            <Group gap={4} justify="flex-end" wrap="nowrap">
                              <ActionIcon
                                variant="subtle"
                                color="grape"
                                size="sm"
                                title="Reopen Ticket"
                                onClick={() => setReopenPromptOpened(true)}
                              >
                                <IconRotateClockwise size={15} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Paper>
            ) : (
              /* Resolution Pending Card */
              <Paper
                radius="lg"
                p="3rem"
                style={{
                  background: isDark ? '#111827' : '#FFFFFF',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                  textAlign: 'center',
                  marginTop: 16,
                }}
              >
                <ThemeIcon size={56} radius="xl" color="teal" variant="light" mb="md" style={{ margin: '0 auto' }}>
                  <IconCircleCheck size={28} />
                </ThemeIcon>
                <Text fw={700} size="16px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
                  Resolution Pending
                </Text>
                <Text size="sm" c="dimmed" mt={4} mb="lg" style={{ maxWidth: 450, margin: '8px auto 24px' }}>
                  This ticket is currently active. When diagnostics and hotfixes are complete, record the resolution summary and root cause analysis to close the ticket.
                </Text>
                <Group justify="center" gap="sm">
                  <Button
                    size="sm"
                    leftSection={<IconCircleCheck size={15} />}
                    onClick={() => setResolutionModalOpened(true)}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                      color: '#FFF',
                      borderRadius: 10,
                      fontWeight: 700,
                    }}
                  >
                    Record Resolution & Resolve
                  </Button>
                </Group>
              </Paper>
            )}
          </Box>
        )}

      </Stack>

      {/* ========================================================================= */}
      {/* MODALS & DIALOGS                                                          */}
      {/* ========================================================================= */}

      {/* 1.0 Meeting Details & Requirements Modal (Opened when selecting a Meeting activity) */}
      <MeetingDetailsModal
        opened={!!selectedMeetingForModal}
        onClose={() => {
          setSelectedMeetingForModal(null);
          setSelectedMeetingActivityId(null);
        }}
        meeting={selectedMeetingForModal}
        onMeetingUpdated={(updatedMeeting) => {
          setSelectedMeetingForModal(updatedMeeting);
          setCustomActivities((prev) => {
            const updated = prev.map((act) => {
              if (act.id === selectedMeetingActivityId || act.meetingId === updatedMeeting.id) {
                return {
                  ...act,
                  title: updatedMeeting.title || act.title,
                  date: updatedMeeting.meetingDate || updatedMeeting.date || act.date,
                  time: updatedMeeting.startTime || updatedMeeting.meetingTime || act.time,
                  status: updatedMeeting.status || updatedMeeting.meetingStatus || act.status,
                  summary: updatedMeeting.purpose || updatedMeeting.title || act.summary,
                  details: updatedMeeting.notes || updatedMeeting.description || act.details,
                  meetingData: updatedMeeting,
                };
              }
              return act;
            });
            if (ticket) {
              try {
                localStorage.setItem(`crm_ticket_activities_${ticket.id}`, JSON.stringify(updated));
              } catch (_) {}
            }
            return updated;
          });
        }}
      />

      {/* 1.1 Call / Activity Details Modal (Opened for any activity except Meeting) */}
      <CallDetailsModal
        call={selectedCallForModal}
        opened={!!selectedCallForModal}
        onClose={() => {
          setSelectedCallForModal(null);
          setSelectedCallActivityId(null);
        }}
        onEdit={(call) => {
          setSelectedCallForModal(null);
          setSelectedCallActivityId(null);
          handleOpenLogActivity();
        }}
        onDelete={(call) => {
          setSelectedCallForModal(null);
          setSelectedCallActivityId(null);
          handleDeleteActivity(call.id);
        }}
      />

      {/* 1. View Activity Details Modal */}
      <Modal
        opened={!!viewingActivity}
        onClose={() => setViewingActivity(null)}
        centered
        radius="md"
        size="lg"
        title={
          <Group gap="xs">
            <IconFileDescription size={18} color="#2563EB" />
            <Text fw={700} size="sm">
              Activity Details • {formatRefNumber(viewingActivity?.refNumber, 'ACT')}
            </Text>
          </Group>
        }
      >
        {viewingActivity && (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Text size="md" fw={700}>{viewingActivity.title}</Text>
                <Text size="xs" c="dimmed">
                  {viewingActivity.customerName} • Contact: {viewingActivity.contactPerson}
                </Text>
              </div>
              <Badge variant="light" color={getTypeBadgeColor(viewingActivity.type)}>
                {viewingActivity.type}
              </Badge>
            </Group>

            <Divider />

            <SimpleGrid cols={2} spacing="xs">
              <Box>
                <Text size="11px" c="dimmed" fw={600} tt="uppercase">Logged By</Text>
                <Text size="xs" fw={500} mt={2}>{viewingActivity.assignee || 'Support Team'}</Text>
              </Box>
              <Box>
                <Text size="11px" c="dimmed" fw={600} tt="uppercase">Date & Time</Text>
                <Text size="xs" fw={500} mt={2}>{viewingActivity.date} at {viewingActivity.time}</Text>
              </Box>
            </SimpleGrid>

            <Box>
              <Text size="11px" c="dimmed" fw={600} tt="uppercase">Details / Discussion Points</Text>
              <Paper withBorder p="sm" radius="md" mt="xs" style={{ background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#F8FAFC' }}>
                <Text size="xs" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {viewingActivity.details || viewingActivity.summary}
                </Text>
              </Paper>
            </Box>

            <Group justify="flex-end" mt="xs">
              <Button size="sm" variant="default" onClick={() => setViewingActivity(null)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* 2. Add Task Modal (In Progress Workspace) */}
      <Modal
        opened={addTaskModalOpened}
        onClose={() => setAddTaskModalOpened(false)}
        centered
        radius="md"
        size="md"
        title={
          <Group gap="xs">
            <IconTools size={18} color="#2563EB" />
            <Text fw={700} size="sm">
              Add Diagnostic Task / Work Log
            </Text>
          </Group>
        }
      >
        <Stack gap="sm">
          {ticket.projectName && (
            <Paper
              p="xs"
              radius="md"
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
                border: isDark ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid #BFDBFE',
              }}
            >
              <Group gap="xs" wrap="nowrap">
                <ThemeIcon size={24} radius="sm" color="blue" variant="light">
                  <IconFolders size={14} />
                </ThemeIcon>
                <div>
                  <Text size="11px" fw={700} style={{ color: isDark ? '#93C5FD' : '#1D4ED8' }}>
                    Syncs to Project: {ticket.projectName}
                  </Text>
                  <Text size="10.5px" c="dimmed">
                    This task will be automatically created in the Projects Management module.
                  </Text>
                </div>
              </Group>
            </Paper>
          )}
          <TextInput
            label="Task Name *"
            placeholder="Enter task name"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.currentTarget.value)}
            required
          />
          <SimpleGrid cols={2} spacing="sm">
            <TextInput
              label="Assigned To"
              placeholder="Assignee name or role"
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.currentTarget.value)}
            />
            <Select
              label="Priority"
              data={['Low', 'Medium', 'High', 'Critical']}
              value={newTaskPriority}
              onChange={(v) => setNewTaskPriority(v || 'Medium')}
            />
          </SimpleGrid>
          <TextInput
            label="Target Date"
            type="date"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.currentTarget.value)}
          />
          <Textarea
            label="Notes / Instructions"
            placeholder="Technical details, branch name, or reproduction instructions..."
            value={newTaskNotes}
            onChange={(e) => setNewTaskNotes(e.currentTarget.value)}
            minRows={2}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" size="sm" onClick={() => setAddTaskModalOpened(false)}>
              Cancel
            </Button>
            <Button size="sm" color="blue" onClick={handleCreateTask}>
              Create Task
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 2.5 View & Edit Task Details Modal (In Progress Workspace) */}
      <Modal
        opened={!!viewingTask}
        onClose={() => {
          setViewingTask(null);
          setEditingTaskInModal(false);
        }}
        centered
        radius="md"
        size="lg"
        title={
          <Group gap="xs">
            <IconTools size={18} color="#2563EB" />
            <Text fw={700} size="sm">
              {editingTaskInModal ? 'Edit Task' : 'Task Details'} • {formatRefNumber(viewingTask?.refNumber, 'TSK')}
            </Text>
          </Group>
        }
      >
        {viewingTask && (
          editingTaskInModal ? (
            <Stack gap="sm">
              <TextInput
                label="Task Name *"
                placeholder="Task name"
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.currentTarget.value)}
                required
              />
              <SimpleGrid cols={2} spacing="sm">
                <TextInput
                  label="Assigned To"
                  placeholder="Assignee name"
                  value={editTaskAssignee}
                  onChange={(e) => setEditTaskAssignee(e.currentTarget.value)}
                />
                <Select
                  label="Priority"
                  data={['Low', 'Medium', 'High', 'Critical']}
                  value={editTaskPriority}
                  onChange={(v) => setEditTaskPriority(v || 'Medium')}
                />
              </SimpleGrid>
              <SimpleGrid cols={2} spacing="sm">
                <TextInput
                  label="Target Date"
                  type="date"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.currentTarget.value)}
                />
                <Select
                  label="Status"
                  data={['Pending', 'In Progress', 'Completed', 'Blocked']}
                  value={editTaskStatus}
                  onChange={(v) => setEditTaskStatus((v as any) || 'Pending')}
                />
              </SimpleGrid>
              <Textarea
                label="Task Notes / Description"
                placeholder="Technical details, troubleshooting logs, reproduction steps..."
                value={editTaskNotes}
                onChange={(e) => setEditTaskNotes(e.currentTarget.value)}
                minRows={4}
                autosize
              />
              <Group justify="flex-end" mt="xs">
                <Button variant="default" size="sm" onClick={() => setEditingTaskInModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" color="blue" onClick={handleSaveEditedTask}>
                  Save Changes
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                  <Text size="md" fw={700} style={{ wordBreak: 'break-word', color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    {viewingTask.taskName}
                  </Text>
                  <Text size="xs" c="dimmed" mt={3}>
                    {ticket?.ticketNumber} • {ticket?.customerName || 'Customer'}
                    {ticket?.projectName ? ` • Project: ${ticket.projectName}` : ''}
                  </Text>
                </div>
                <Group gap={6} wrap="nowrap">
                  <Badge
                    size="sm"
                    variant="light"
                    color={
                      viewingTask.priority === 'Critical'
                        ? 'red'
                        : viewingTask.priority === 'High'
                        ? 'orange'
                        : 'blue'
                    }
                  >
                    {viewingTask.priority} Priority
                  </Badge>
                  <Badge
                    size="sm"
                    variant="filled"
                    color={getTaskStatusColor(viewingTask.status)}
                    radius="sm"
                  >
                    {viewingTask.status}
                  </Badge>
                </Group>
              </Group>

              <Divider />

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <Box>
                  <Text size="11px" c="dimmed" fw={600} tt="uppercase">Assigned To</Text>
                  <Text size="xs" fw={600} mt={3} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                    {viewingTask.assignedTo || 'Unassigned'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} tt="uppercase">Target Due Date</Text>
                  <Group gap={6} mt={3}>
                    <IconCalendar size={14} color="#64748B" />
                    <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                      {viewingTask.targetDate || '—'}
                    </Text>
                  </Group>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} tt="uppercase">Associated Ticket</Text>
                  <Text size="xs" fw={500} mt={3} style={{ color: isDark ? '#93C5FD' : '#2563EB' }}>
                    {ticket?.ticketNumber}: {ticket?.subject}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} tt="uppercase">Related Project</Text>
                  <Text size="xs" fw={500} mt={3} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                    {ticket?.projectName || '—'}
                  </Text>
                </Box>
              </SimpleGrid>

              <Box>
                <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                  Task Description / Work Log Notes
                </Text>
                <Paper
                  withBorder
                  p="sm"
                  radius="md"
                  mt="xs"
                  style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#F8FAFC',
                    maxHeight: 260,
                    overflowY: 'auto',
                  }}
                >
                  <Text size="xs" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, wordBreak: 'break-word' }}>
                    {viewingTask.notes || 'No extra notes or steps provided for this task.'}
                  </Text>
                </Paper>
              </Box>

              <Group justify="space-between" align="center" mt="xs">
                <Button
                  size="xs"
                  variant="light"
                  color={viewingTask.status === 'Completed' ? 'blue' : 'teal'}
                  leftSection={<IconCheck size={14} />}
                  onClick={() => {
                    handleToggleTaskStatus(viewingTask.id || viewingTask.refNumber);
                    const nextStatusMap: Record<string, TicketTaskItem['status']> = {
                      Pending: 'In Progress',
                      'In Progress': 'Completed',
                      Completed: 'Pending',
                      Blocked: 'Pending',
                    };
                    const next = nextStatusMap[viewingTask.status] || 'Completed';
                    setViewingTask((prev) => (prev ? { ...prev, status: next } : null));
                  }}
                >
                  {viewingTask.status === 'Completed'
                    ? 'Reopen Task (Pending)'
                    : viewingTask.status === 'In Progress'
                    ? 'Mark Completed'
                    : 'Start Task (In Progress)'}
                </Button>

                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    leftSection={<IconEdit size={14} />}
                    onClick={() => handleStartEditTask(viewingTask)}
                  >
                    Edit Task
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => {
                      const taskToDel = viewingTask;
                      setViewingTask(null);
                      handleDeleteTask(taskToDel);
                    }}
                  >
                    Delete Task
                  </Button>
                  <Button size="xs" variant="default" onClick={() => setViewingTask(null)}>
                    Close
                  </Button>
                </Group>
              </Group>
            </Stack>
          )
        )}
      </Modal>

      {/* 3. Record Resolution Modal */}
      <Modal
        opened={resolutionModalOpened}
        onClose={() => setResolutionModalOpened(false)}
        centered
        radius="md"
        size="lg"
        title={
          <Group gap="xs">
            <IconCircleCheck size={18} color="#059669" />
            <Text fw={700} size="sm">
              Record Resolution & Close Ticket
            </Text>
          </Group>
        }
      >
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            Document the exact resolution and root cause to complete the SLA for {ticket.ticketNumber}.
          </Text>
          {/* Pre-filled Task field */}
          <TextInput
            label="Task"
            value={
              resolvingTaskItems.length > 0
                ? resolvingTaskItems
                    .map((t) => `${formatRefNumber(t.refNumber, 'TSK')} • ${t.taskName}`)
                    .join(', ')
                : completedTasks.length > 0
                ? completedTasks
                    .map((t) => `${formatRefNumber(t.refNumber, 'TSK')} • ${t.taskName}`)
                    .join(', ')
                : 'No task selected'
            }
            readOnly
            required
            leftSection={<IconCheck size={16} color="#059669" />}
            styles={{
              input: {
                fontWeight: 600,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                color: isDark ? '#38BDF8' : '#0284C7',
              },
            }}
          />
          <Textarea
            label="Fixed Details"
            placeholder="Provide fixed details of how this issue was resolved..."
            minRows={3}
            value={resolutionDesc}
            onChange={(e) => setResolutionDesc(e.currentTarget.value)}
            required
          />
          <SimpleGrid cols={2} spacing="sm">
            <TextInput
              label="Root Cause"
              placeholder="e.g. Null pointer in payment webhook"
              value={rootCause}
              onChange={(e) => setRootCause(e.currentTarget.value)}
            />
            <TextInput
              label="Workaround (if any)"
              placeholder="e.g. Flush browser cache"
              value={workaround}
              onChange={(e) => setWorkaround(e.currentTarget.value)}
            />
          </SimpleGrid>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" size="sm" onClick={() => setResolutionModalOpened(false)} disabled={resolving}>
              Cancel
            </Button>
            <Button
              size="sm"
              color="teal"
              loading={resolving}
              onClick={handleResolveSubmit}
              leftSection={<IconCircleCheck size={15} />}
            >
              Resolve & Close Ticket
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 4. Reopen Ticket Modal */}
      <Modal
        opened={reopenPromptOpened}
        onClose={() => !reopening && setReopenPromptOpened(false)}
        centered
        radius="md"
        title={
          <Group gap="xs">
            <IconRotateClockwise size={18} color="#7C3AED" />
            <Text fw={700} size="sm">
              Reopen Support Ticket
            </Text>
          </Group>
        }
      >
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            Explain why this ticket is being reopened (e.g. recurrence in production, customer feedback).
          </Text>
          <Textarea
            label="Reopen Reason *"
            placeholder="e.g. Customer reported issue still persists after hotfix deployment."
            minRows={3}
            value={reopenReason}
            onChange={(e) => setReopenReason(e.currentTarget.value)}
            required
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" size="sm" onClick={() => setReopenPromptOpened(false)} disabled={reopening}>
              Cancel
            </Button>
            <Button
              color="grape"
              size="sm"
              loading={reopening}
              onClick={handleReopenSubmit}
              leftSection={<IconRotateClockwise size={15} />}
            >
              Reopen Ticket
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 5. Assignment Modal */}
      <TicketAssignmentModal
        opened={assignModalOpened}
        onClose={() => setAssignModalOpened(false)}
        ticket={ticket}
        tasks={ticketTasks}
        onSuccess={async (assignmentInfo) => {
          if (ticket) {
            // Whatever name the user gives (team lead name or custom/selected team name), that shows in the Assigned To column
            const finalAssignee =
              assignmentInfo?.finalAssigneeName ||
              assignmentInfo?.teamLeadName ||
              (metadata?.employees || []).find((e) => e.id === assignmentInfo?.teamLeadId)?.name ||
              assignmentInfo?.team ||
              ticket.teamLeadName ||
              ticket.assignedToName ||
              'Assigned';

            const targetTaskVal = assignmentInfo?.assignedTask;

            const updatedTasks = ticketTasks.map((t) => {
              const isMatch =
                !targetTaskVal ||
                targetTaskVal === 'ALL' ||
                t.id === targetTaskVal ||
                t.taskName === targetTaskVal ||
                t.refNumber === targetTaskVal;

              if (isMatch) {
                return { ...t, assignedTo: finalAssignee, status: 'In Progress' as const };
              }
              return t;
            });
            setTicketTasks(updatedTasks);
            try {
              localStorage.setItem(`crm_ticket_tasks_${ticket.id}`, JSON.stringify(updatedTasks));
            } catch (_) {}

            // Synchronize tasks and related customer/lead to the related project in Projects Management
            await syncTasksAndClientToProject(updatedTasks, finalAssignee);

            // Persist updated tasks to database table support_ticket_tasks
            syncTicketTasksApi(ticket.id, updatedTasks).catch((err) =>
              console.warn('Failed to sync tasks to DB:', err)
            );

            notifications.show({
              color: 'teal',
              icon: <IconCheck size={16} />,
              title: 'Assignment & Project Synced',
              message: ticket.projectName
                ? `Assigned task(s) and customer details synchronized to Project "${ticket.projectName}".`
                : 'Assigned task(s) and customer details synchronized to Project Management.',
            });
          }
          await fetchTicketById(ticket.id);
        }}
      />

      {/* 6. Status Modal */}
      <TicketStatusModal
        opened={statusModalOpened}
        onClose={() => setStatusModalOpened(false)}
        ticket={ticket}
        onSuccess={async () => {
          await fetchTicketById(ticket.id);
        }}
      />

      {/* 7. Edit Ticket Modal */}
      <CreateTicketModal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        initialData={ticket}
        isEdit={true}
        onSuccess={async () => {
          setEditModalOpened(false);
          await fetchTicketById(ticket.id);
        }}
      />

      {/* 8. Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => !deleteLoading && setDeleteModalOpened(false)}
        centered
        radius="md"
        title={
          <Group gap="xs">
            <IconAlertTriangle size={18} color="#EF4444" />
            <Text fw={700} size="sm">
              Delete Support Ticket
            </Text>
          </Group>
        }
      >
        <Stack gap="sm">
          <Text size="sm">
            Are you sure you want to delete ticket <strong style={{ fontFamily: 'monospace' }}>{ticket.ticketNumber}</strong>?
          </Text>
          <Text size="xs" c="dimmed">
            This action cannot be undone. All comments, history, and attachments associated with this ticket will be permanently removed.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" size="sm" onClick={() => setDeleteModalOpened(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button color="red" size="sm" loading={deleteLoading} onClick={handleDeleteTicket} leftSection={<IconTrash size={15} />}>
              Delete Ticket
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 9. Log Activity Modal (ContactModal with title="Update logs") */}
      <ContactModal
        opened={logActivityModalOpened}
        onClose={() => {
          setLogActivityModalOpened(false);
          setSelectedContactForLogs(null);
        }}
        contact={selectedContactForLogs}
        title="Update logs"
        showContactMode={true}
        onSuccess={handleLogActivitySuccess}
      />

    </Box>
  );
};

export default TicketDetailsPage;
