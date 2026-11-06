import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Button,
  Group,
  TextInput,
  Select,
  useComputedColorScheme,
  ActionIcon,
  UnstyledButton,
  Modal,
  Stack,
  Text,
  Badge,
  ThemeIcon,
} from '@mantine/core';
import {
  IconSearch,
  IconPlus,
  IconX,
  IconTrash,
  IconAlertTriangle,
  IconUser,
} from '@tabler/icons-react';
import { useSupportTicket } from '../../context/SupportTicketContext';
import { SupportTicket, TicketFilters } from '../../types/supportTicket';
import { TicketTableView } from './components/TicketTableView';
import { CreateTicketModal } from './CreateTicketModal';
import { TicketAssignmentModal } from './components/TicketAssignmentModal';
import { TicketStatusModal } from './components/TicketStatusModal';
import { TicketDetailsModal } from './components/TicketDetailsModal';
import {
  DateFilterControl,
  DateFilterValue,
  DEFAULT_DATE_FILTER,
  isDateMatchingFilter,
} from '../../components/common/DateFilterControl';

export type TicketActiveTab = 'ALL' | 'NEW' | 'IN_PROGRESS' | 'COMPLETE';

interface TicketsPageProps {
  onViewTicket: (ticket: SupportTicket) => void;
}

export const TicketsPage: React.FC<TicketsPageProps> = ({ onViewTicket }) => {
  const {
    tickets,
    totalTickets,
    loading,
    page,
    setPage,
    limit,
    filters,
    setFilters,
    metadata,
    stats,
    deleteTicket,
  } = useSupportTicket();

  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  // Segmented Tab state
  const [activeTab, setActiveTab] = useState<TicketActiveTab>('ALL');

  // Search input state
  const [searchInput, setSearchInput] = useState<string>(filters.search || '');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);

  // Modals state
  const [detailsModalOpened, setDetailsModalOpened] = useState<boolean>(false);
  const [selectedViewTicket, setSelectedViewTicket] = useState<SupportTicket | null>(null);
  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);
  const [assignModalOpened, setAssignModalOpened] = useState<boolean>(false);
  const [statusModalOpened, setStatusModalOpened] = useState<boolean>(false);
  const [actionTicket, setActionTicket] = useState<SupportTicket | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupportTicket | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Sync searchInput if filters.search resets
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  // Debounced search typing
  useEffect(() => {
    const handler = setTimeout(() => {
      if ((filters.search || '') !== searchInput) {
        setFilters((prev: TicketFilters) => ({ ...prev, search: searchInput }));
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput, filters.search, setFilters]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFilters((prev: TicketFilters) => ({ ...prev, search: searchInput }));
  };

  const handleTabChange = (tab: TicketActiveTab) => {
    setActiveTab(tab);
    setPage(1);
    if (tab === 'NEW') {
      setFilters((prev: TicketFilters) => ({ ...prev, status: 'New', viewTab: 'all' }));
    } else if (tab === 'IN_PROGRESS') {
      setFilters((prev: TicketFilters) => ({ ...prev, status: 'In Progress', viewTab: 'all' }));
    } else if (tab === 'COMPLETE') {
      setFilters((prev: TicketFilters) => ({ ...prev, status: 'Resolved', viewTab: 'all' }));
    } else {
      setFilters((prev: TicketFilters) => ({ ...prev, status: 'All', viewTab: 'all' }));
    }
  };

  const handleViewTicketDetails = (ticket: SupportTicket) => {
    setSelectedViewTicket(ticket);
    setDetailsModalOpened(true);
  };

  const handleOpenEdit = (ticket: SupportTicket) => {
    setActionTicket(ticket);
    setEditModalOpened(true);
  };

  const handleOpenAssign = (ticket: SupportTicket) => {
    setActionTicket(ticket);
    setAssignModalOpened(true);
  };

  const handleOpenStatus = (ticket: SupportTicket) => {
    setActionTicket(ticket);
    setStatusModalOpened(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteTicket(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // notification handled by context
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalCount = stats?.all ?? totalTickets;
  const newCount = stats?.new ?? tickets.filter((t) => t.status === 'New' || t.status === 'Assigned').length;
  const inProgressCount = stats?.inProgress ?? tickets.filter((t) => t.status === 'In Progress').length;
  const completedCount = stats?.complete ?? tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  const assigneeOptions = useMemo(() => {
    return [
      { value: 'All', label: 'All Assignees' },
      { value: 'Unassigned', label: 'Unassigned Tickets' },
      ...(metadata?.employees || []).map((emp: any) => ({
        value: emp.id,
        label: `Assigned: ${emp.name}`,
      })),
    ];
  }, [metadata?.employees]);

  // Client-side date filter matching if applied
  const filteredTickets = useMemo(() => {
    if (dateFilter.type === 'ALL') return tickets;
    return tickets.filter((t) => isDateMatchingFilter(t.reportedAt || t.createdAt, dateFilter));
  }, [tickets, dateFilter]);

  return (
    <Box p={{ base: 'xs', sm: 'sm' }} style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* 1. Header Toolbar matching Lead Module UI & Format */}
      <Paper
        p="sm"
        style={{
          borderRadius: 12,
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          {/* Left: Modern Segmented Tabs */}
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              padding: 3,
              borderRadius: 10,
              border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #E2E8F0',
              flexShrink: 0,
            }}
          >
            {/* 1. All */}
            <UnstyledButton
              onClick={() => handleTabChange('ALL')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'ALL'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'ALL'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'ALL'
                    ? isDark
                      ? '#60A5FA'
                      : '#2563EB'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'ALL' ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.15s ease',
              }}
            >
              <span>All</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'ALL'
                      ? '#2563EB'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'ALL'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {totalCount}
              </Box>
            </UnstyledButton>

            {/* 2. New */}
            <UnstyledButton
              onClick={() => handleTabChange('NEW')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'NEW'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'NEW'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'NEW'
                    ? isDark
                      ? '#60A5FA'
                      : '#2563EB'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'NEW' ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.15s ease',
              }}
            >
              <span>New</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'NEW'
                      ? '#2563EB'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'NEW'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {newCount}
              </Box>
            </UnstyledButton>

            {/* 3. In Progress */}
            <UnstyledButton
              onClick={() => handleTabChange('IN_PROGRESS')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'IN_PROGRESS'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'IN_PROGRESS'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'IN_PROGRESS'
                    ? isDark
                      ? '#F59E0B'
                      : '#D97706'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'IN_PROGRESS' ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.15s ease',
              }}
            >
              <span>In Progress</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'IN_PROGRESS'
                      ? '#D97706'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'IN_PROGRESS'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {inProgressCount}
              </Box>
            </UnstyledButton>

            {/* 4. Complete / Resolved */}
            <UnstyledButton
              onClick={() => handleTabChange('COMPLETE')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'COMPLETE'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'COMPLETE'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'COMPLETE'
                    ? isDark
                      ? '#34D399'
                      : '#059669'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'COMPLETE' ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.15s ease',
              }}
            >
              <span>Complete</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'COMPLETE'
                      ? '#059669'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'COMPLETE'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {completedCount}
              </Box>
            </UnstyledButton>
          </Box>

          {/* Right: Search, Filter Selects, Date & Add Ticket Button */}
          <Group gap={8} align="center" wrap="wrap" style={{ flexShrink: 0 }}>
            {/* Search tickets... */}
            <form onSubmit={handleSearchSubmit} style={{ width: 190 }}>
              <TextInput
                placeholder="Search tickets..."
                leftSection={<IconSearch size={14} color="#94A3B8" />}
                rightSection={
                  searchInput ? (
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      onClick={() => {
                        setSearchInput('');
                        setFilters((prev: TicketFilters) => ({ ...prev, search: '' }));
                      }}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  ) : null
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setFilters((prev: TicketFilters) => ({ ...prev, search: searchInput }));
                  }
                }}
                onBlur={() => setFilters((prev: TicketFilters) => ({ ...prev, search: searchInput }))}
                size="sm"
                radius="md"
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                    fontSize: 12.5,
                    height: 36,
                  },
                }}
              />
            </form>

            {/* Assignee Filter Dropdown */}
            <Select
              placeholder="All Assignees"
              size="sm"
              radius="md"
              leftSection={<IconUser size={14} color="#6366F1" />}
              value={filters.assignedTo || 'All'}
              data={assigneeOptions}
              onChange={(val) => {
                setFilters((prev: TicketFilters) => ({ ...prev, assignedTo: val || 'All' }));
              }}
              style={{ width: 155 }}
              comboboxProps={{ width: 195, position: 'bottom-start', withinPortal: true, shadow: 'md' }}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  fontSize: 12.5,
                  fontWeight: 500,
                  height: 36,
                },
                option: {
                  fontSize: 12.5,
                  padding: '7px 12px',
                  whiteSpace: 'nowrap',
                },
              }}
            />

            {/* Date Filter */}
            <DateFilterControl value={dateFilter} onChange={setDateFilter} width={125} />

            {/* + Add Ticket Button */}
            <Button
              size="sm"
              radius="md"
              leftSection={<IconPlus size={15} stroke={2.5} />}
              onClick={() => setCreateModalOpened(true)}
              style={{
                background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 12.5,
                height: 36,
                padding: '0 14px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Add Ticket
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* 2. Main Ticket Table View with Pagination Footer matching Lead module */}
      <TicketTableView
        tickets={filteredTickets}
        loading={loading}
        total={totalTickets}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onView={onViewTicket}
        onViewDetails={handleViewTicketDetails}
        onEdit={handleOpenEdit}
        onDelete={(ticket) => setDeleteTarget(ticket)}
        onAssign={handleOpenAssign}
        onChangeStatus={handleOpenStatus}
      />

      {/* Ticket Details Modal - Opens when clicking View Ticket or table row */}
      <TicketDetailsModal
        opened={detailsModalOpened}
        onClose={() => {
          setDetailsModalOpened(false);
          setSelectedViewTicket(null);
        }}
        ticket={selectedViewTicket}
        onEdit={(ticket) => {
          handleOpenEdit(ticket);
        }}
        onOpenWorkspace={(ticket) => {
          onViewTicket(ticket);
        }}
      />

      {/* 3. Create Ticket Modal */}
      <CreateTicketModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        onSuccess={() => setCreateModalOpened(false)}
      />

      {/* 4. Edit Ticket Modal */}
      <CreateTicketModal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setActionTicket(null);
        }}
        ticket={actionTicket}
        onSuccess={() => {
          setEditModalOpened(false);
          setActionTicket(null);
        }}
      />

      {/* 5. Assign Ticket Modal */}
      <TicketAssignmentModal
        opened={assignModalOpened}
        onClose={() => {
          setAssignModalOpened(false);
          setActionTicket(null);
        }}
        ticket={actionTicket}
      />

      {/* 6. Change Status Modal */}
      <TicketStatusModal
        opened={statusModalOpened}
        onClose={() => {
          setStatusModalOpened(false);
          setActionTicket(null);
        }}
        ticket={actionTicket}
      />

      {/* 7. Delete Ticket Confirmation Dialog */}
      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        centered
        radius="lg"
        padding="lg"
        withCloseButton={false}
        styles={{
          content: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            boxShadow: isDark
              ? '0 20px 45px -10px rgba(0, 0, 0, 0.6)'
              : '0 20px 45px -10px rgba(0, 0, 0, 0.12)',
            borderRadius: 16,
          },
          body: {
            padding: 24,
          },
        }}
      >
        <Stack gap="md">
          <Group align="flex-start" wrap="nowrap" gap="md">
            <ThemeIcon
              size={44}
              radius="xl"
              style={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                color: '#EF4444',
                flexShrink: 0,
              }}
            >
              <IconAlertTriangle size={22} stroke={2} />
            </ThemeIcon>

            <Box style={{ flex: 1 }}>
              <Text fw={700} size="md" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.3 }}>
                Delete Support Ticket
              </Text>
              <Text size="sm" mt={4} style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Are you sure you want to delete this ticket? This action cannot be undone.
              </Text>
            </Box>
          </Group>

          {/* Ticket Details Highlight Card */}
          {deleteTarget && (
            <Paper
              p="sm"
              radius="md"
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group justify="space-between" align="center" wrap="nowrap">
                <Box style={{ minWidth: 0 }}>
                  <Text fw={600} size="sm" truncate style={{ color: isDark ? '#F8FAFC' : '#1E293B' }}>
                    {deleteTarget.subject}
                  </Text>
                  {deleteTarget.customerName && (
                    <Text size="xs" truncate style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      {deleteTarget.customerName}
                    </Text>
                  )}
                </Box>
                <Badge
                  variant="filled"
                  color="blue"
                  radius="sm"
                  size="sm"
                  style={{ fontWeight: 600, flexShrink: 0, fontFamily: 'monospace' }}
                >
                  {deleteTarget.ticketNumber}
                </Badge>
              </Group>
            </Paper>
          )}

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button
              variant="default"
              radius="md"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1',
                color: isDark ? '#CBD5E1' : '#475569',
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              radius="md"
              size="sm"
              loading={deleteLoading}
              onClick={handleConfirmDelete}
              leftSection={<IconTrash size={15} stroke={2} />}
              style={{
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                fontWeight: 600,
              }}
            >
              Confirm Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default TicketsPage;
