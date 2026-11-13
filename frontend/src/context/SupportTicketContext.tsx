import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  SupportTicket,
  TicketFilters,
  TicketDropdownMetadata,
  TicketComment,
  TicketAttachment,
} from '../types/supportTicket';
import {
  fetchTicketsApi,
  fetchTicketByIdApi,
  fetchTicketMetadataApi,
  createTicketApi,
  updateTicketApi,
  deleteTicketApi,
  changeTicketStatusApi,
  reassignTicketApi,
  addTicketCommentApi,
  uploadTicketAttachmentsApi,
  resolveTicketApi,
  reopenTicketApi,
  fetchTicketStatsApi,
} from '../services/supportTicketService';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

interface SupportTicketContextType {
  tickets: SupportTicket[];
  totalTickets: number;
  loading: boolean;
  page: number;
  setPage: (p: number) => void;
  limit: number;
  setLimit: (l: number) => void;
  metadata: TicketDropdownMetadata | null;
  stats: { all: number; my: number; unassigned: number; new?: number; inProgress?: number; complete?: number };
  fetchStats: () => Promise<void>;
  activeTab: 'all' | 'my' | 'unassigned';
  setActiveTab: (tab: 'all' | 'my' | 'unassigned') => void;
  filters: TicketFilters;
  setFilters: React.Dispatch<React.SetStateAction<TicketFilters>>;
  resetFilters: () => void;
  selectedTicket: SupportTicket | null;
  setSelectedTicket: (ticket: SupportTicket | null) => void;
  fetchTickets: (customFilters?: TicketFilters, targetPage?: number) => Promise<void>;
  fetchTicketById: (id: string) => Promise<SupportTicket | null>;
  createTicket: (data: Partial<SupportTicket>, attachments?: File[]) => Promise<SupportTicket>;
  updateTicket: (id: string, data: Partial<SupportTicket>) => Promise<SupportTicket>;
  deleteTicket: (id: string) => Promise<SupportTicket>;
  changeStatus: (id: string, status: string, payload?: Record<string, any>) => Promise<SupportTicket>;
  reassignTicket: (id: string, assignmentData: any) => Promise<SupportTicket>;
  addComment: (id: string, data: { type: 'public_reply' | 'internal_note'; message: string; attachments?: any[] }) => Promise<TicketComment>;
  uploadAttachments: (id: string, files: File[]) => Promise<TicketAttachment[]>;
  resolveTicket: (id: string, payload: { resolution_description: string; root_cause?: string; workaround?: string; skipTaskCheck?: boolean; [key: string]: any }) => Promise<SupportTicket>;
  reopenTicket: (id: string, payload: { reason: string }) => Promise<SupportTicket>;
}

const SupportTicketContext = createContext<SupportTicketContextType | undefined>(undefined);

const initialFilters: TicketFilters = {
  search: '',
  status: 'All',
  priority: 'All',
  issueType: 'All',
  assignedTeam: 'All',
  assignedTo: 'All',
  viewTab: 'all',
};

export const SupportTicketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [totalTickets, setTotalTickets] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [metadata, setMetadata] = useState<TicketDropdownMetadata | null>(null);
  const [stats, setStats] = useState<{ all: number; my: number; unassigned: number }>({ all: 0, my: 0, unassigned: 0 });
  const [activeTab, setActiveTabState] = useState<'all' | 'my' | 'unassigned'>('all');
  const [filters, setFilters] = useState<TicketFilters>(initialFilters);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const s = await fetchTicketStatsApi();
      setStats(s);
    } catch (_) {}
  }, []);

  // Synchronize activeTab with filters.viewTab
  const setActiveTab = (tab: 'all' | 'my' | 'unassigned') => {
    setActiveTabState(tab);
    setPage(1);
    setFilters((prev) => ({ ...prev, viewTab: tab }));
  };

  const resetFilters = () => {
    setFilters({ ...initialFilters, viewTab: activeTab });
    setPage(1);
  };

  // Load dropdown metadata and stats once
  useEffect(() => {
    let isMounted = true;
    fetchTicketMetadataApi()
      .then((data) => {
        if (isMounted) setMetadata(data);
      })
      .catch((err) => console.warn('Failed to load ticket metadata:', err));
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [fetchStats]);

  // Fetch tickets function
  const fetchTickets = useCallback(
    async (customFilters?: TicketFilters, targetPage?: number) => {
      setLoading(true);
      try {
        const queryFilters = customFilters || filters;
        const currentPage = targetPage !== undefined ? targetPage : page;
        const res = await fetchTicketsApi(queryFilters, currentPage, limit);
        setTickets(res.tickets);
        setTotalTickets(res.total);
      } catch (err: any) {
        console.error('Failed to fetch support tickets:', err);
        notifications.show({
          title: 'Error Loading Tickets',
          message: err.message || 'Could not load tickets from server.',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Single ticket fetcher
  const fetchTicketById = async (id: string): Promise<SupportTicket | null> => {
    try {
      const ticket = await fetchTicketByIdApi(id);
      setSelectedTicket(ticket);
      return ticket;
    } catch (err: any) {
      console.warn('Failed to fetch ticket by ID:', id, err?.message);
      setSelectedTicket(null);
      return null;
    }
  };

  // Create ticket
  const createTicket = async (data: Partial<SupportTicket>, attachments?: File[]): Promise<SupportTicket> => {
    try {
      const created = await createTicketApi(data);
      if (attachments && attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((file) => formData.append('attachments', file));
        await uploadTicketAttachmentsApi(created.id, formData).catch((e) =>
          console.warn('Attachment upload failed:', e)
        );
      }
      notifications.show({
        title: 'Ticket Created',
        message: `Ticket ${created.ticketNumber} created successfully.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      fetchTickets();
      fetchStats();
      return created;
    } catch (err: any) {
      notifications.show({
        title: 'Ticket Creation Failed',
        message: err.message || 'Unable to create ticket.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      throw err;
    }
  };

  // Update ticket
  const updateTicket = async (id: string, data: Partial<SupportTicket>): Promise<SupportTicket> => {
    try {
      const updated = await updateTicketApi(id, data);
      setSelectedTicket((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
      fetchTickets();
      fetchStats();
      notifications.show({
        title: 'Ticket Updated',
        message: `Ticket details updated successfully.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      return updated;
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update ticket details.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      throw err;
    }
  };

  // Delete ticket
  const deleteTicket = async (id: string): Promise<SupportTicket> => {
    try {
      const deleted = await deleteTicketApi(id);
      setSelectedTicket((prev) => (prev && prev.id === id ? null : prev));
      fetchTickets();
      fetchStats();
      notifications.show({
        title: 'Ticket Deleted',
        message: `Ticket ${deleted?.ticketNumber || ''} deleted successfully.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      return deleted;
    } catch (err: any) {
      notifications.show({
        title: 'Delete Failed',
        message: err.message || 'Could not delete ticket.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      throw err;
    }
  };

  // Change Status
  const changeStatus = async (id: string, status: string, payload?: Record<string, any>): Promise<SupportTicket> => {
    try {
      const updated = await changeTicketStatusApi(id, status, payload);
      setSelectedTicket((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
      fetchTickets();
      fetchStats();
      notifications.show({
        title: 'Status Updated',
        message: `Ticket status changed to ${status}.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      return updated;
    } catch (err: any) {
      notifications.show({
        title: 'Status Transition Denied',
        message: err.message || 'Illegal or blocked status transition.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      throw err;
    }
  };

  // Reassign Ticket
  const reassignTicket = async (id: string, assignmentData: any): Promise<SupportTicket> => {
    try {
      const updated = await reassignTicketApi(id, assignmentData);
      setSelectedTicket((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
      fetchTickets();
      fetchStats();
      notifications.show({
        title: 'Ticket Reassigned',
        message: `Ticket reassigned successfully.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      return updated;
    } catch (err: any) {
      notifications.show({
        title: 'Reassignment Failed',
        message: err.message || 'Could not reassign ticket.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      throw err;
    }
  };

  // Add Comment
  const addComment = async (
    id: string,
    data: { type: 'public_reply' | 'internal_note'; message: string; attachments?: any[] }
  ): Promise<TicketComment> => {
    try {
      const comment = await addTicketCommentApi(id, data);
      setSelectedTicket((prev) => {
        if (!prev || prev.id !== id) return prev;
        return {
          ...prev,
          comments: [...(prev.comments || []), comment],
        };
      });
      notifications.show({
        title: data.type === 'internal_note' ? 'Internal Note Added' : 'Public Reply Sent',
        message: 'Message added to ticket conversation.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      return comment;
    } catch (err: any) {
      notifications.show({
        title: 'Comment Failed',
        message: err.message || 'Could not add comment.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      throw err;
    }
  };

  // Upload Attachments
  const uploadAttachments = async (id: string, files: File[]): Promise<TicketAttachment[]> => {
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('attachments', f));
      const added = await uploadTicketAttachmentsApi(id, formData);
      setSelectedTicket((prev) => {
        if (!prev || prev.id !== id) return prev;
        return {
          ...prev,
          attachments: [...added, ...(prev.attachments || [])],
        };
      });
      notifications.show({
        title: 'Attachments Uploaded',
        message: `${files.length} file(s) attached successfully.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      return added;
    } catch (err: any) {
      notifications.show({
        title: 'Upload Failed',
        message: err.message || 'Failed to upload attachments.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      throw err;
    }
  };

  // Resolve Ticket
  const resolveTicket = async (
    id: string,
    payload: { resolution_description: string; root_cause?: string; workaround?: string; skipTaskCheck?: boolean; [key: string]: any }
  ): Promise<SupportTicket> => {
    try {
      const updated = await resolveTicketApi(id, payload);
      setSelectedTicket((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
      fetchTickets();
      fetchStats();
      notifications.show({
        title: 'Ticket Resolved',
        message: `Ticket ${updated.ticketNumber} marked as resolved.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      return updated;
    } catch (err: any) {
      notifications.show({
        title: 'Resolution Failed',
        message: err.message || 'Resolution description is mandatory.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      throw err;
    }
  };

  // Reopen Ticket
  const reopenTicket = async (id: string, payload: { reason: string }): Promise<SupportTicket> => {
    try {
      const updated = await reopenTicketApi(id, payload);
      setSelectedTicket((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
      fetchTickets();
      fetchStats();
      notifications.show({
        title: 'Ticket Reopened',
        message: `Ticket ${updated.ticketNumber} reopened. Reopen count: ${updated.reopenedCount}`,
        color: 'orange',
        icon: <IconAlertCircle size={16} />,
      });
      return updated;
    } catch (err: any) {
      notifications.show({
        title: 'Reopen Failed',
        message: err.message || 'Could not reopen ticket.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      throw err;
    }
  };

  return (
    <SupportTicketContext.Provider
      value={{
        tickets,
        totalTickets,
        loading,
        page,
        setPage,
        limit,
        setLimit,
        metadata,
        stats,
        fetchStats,
        activeTab,
        setActiveTab,
        filters,
        setFilters,
        resetFilters,
        selectedTicket,
        setSelectedTicket,
        fetchTickets,
        fetchTicketById,
        createTicket,
        updateTicket,
        deleteTicket,
        changeStatus,
        reassignTicket,
        addComment,
        uploadAttachments,
        resolveTicket,
        reopenTicket,
      }}
    >
      {children}
    </SupportTicketContext.Provider>
  );
};

const defaultSupportTicketContext: SupportTicketContextType = {
  tickets: [],
  totalTickets: 0,
  loading: false,
  page: 1,
  setPage: () => {},
  limit: 20,
  setLimit: () => {},
  metadata: null,
  stats: { all: 0, my: 0, unassigned: 0 },
  fetchStats: async () => {},
  activeTab: 'all',
  setActiveTab: () => {},
  filters: initialFilters,
  setFilters: () => {},
  resetFilters: () => {},
  selectedTicket: null,
  setSelectedTicket: () => {},
  fetchTickets: async () => {},
  fetchTicketById: async () => null,
  createTicket: async () => ({} as any),
  updateTicket: async () => ({} as any),
  deleteTicket: async () => ({} as any),
  changeStatus: async () => ({} as any),
  reassignTicket: async () => ({} as any),
  addComment: async () => ({} as any),
  uploadAttachments: async () => [],
  resolveTicket: async () => ({} as any),
  reopenTicket: async () => ({} as any),
};

export const useSupportTicket = (): SupportTicketContextType => {
  const context = useContext(SupportTicketContext);
  if (!context) {
    console.warn('useSupportTicket was called outside SupportTicketProvider, using safe fallback context');
    return defaultSupportTicketContext;
  }
  return context;
};

export default SupportTicketContext;

