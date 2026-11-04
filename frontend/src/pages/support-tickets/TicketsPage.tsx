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
} from '@tabler/icons-react';
import { useSupportTicket } from '../../context/SupportTicketContext';
import { SupportTicket, TicketFilters } from '../../types/supportTicket';
import { TicketTableView } from './components/TicketTableView';
import { CreateTicketModal } from './CreateTicketModal';
import { TicketAssignmentModal } from './components/TicketAssignmentModal';
import { TicketStatusModal } from './components/TicketStatusModal';
import {
  DateFilterControl,
  DateFilterValue,
  DEFAULT_DATE_FILTER,
  isDateMatchingFilter,
} from '../../components/common/DateFilterControl';

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
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    metadata,
    stats,
    deleteTicket,
  } = useSupportTicket();

  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  // Search input state
  const [searchInput, setSearchInput] = useState<string>(filters.search || '');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);

  // Modals state
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

  const statusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'New', label: 'New' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Pending Customer', label: 'Pending Customer' },
    { value: 'On Hold', label: 'On Hold' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Reopened', label: 'Reopened' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: 'All', label: 'All Priorities' },
    { value: 'Critical', label: 'Critical' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ];

  const issueTypeOptions = [
    { value: 'All', label: 'All Issue Types' },
    { value: 'Bug', label: 'Bug' },
    { value: 'Technical Issue', label: 'Technical Issue' },
    { value: 'UI / Design Issue', label: 'UI / Design Issue' },
    { value: 'Performance Issue', label: 'Performance Issue' },
    { value: 'Feature Request', label: 'Feature Request' },
    { value: 'Change Request', label: 'Change Request' },
    { value: 'General Support', label: 'General Support' },
  ];

  const employeeOptions = useMemo(() => {
    return [
      { value: 'All', label: 'All Assignees' },
      ...(metadata?.employees || []).map((emp: any) => ({ value: emp.id, label: emp.name })),
    ];
  }, [metadata?.employees]);

  // Client-side date filter matching if applied
  const filteredTickets = useMemo(() => {
    if (dateFilter.type === 'ALL') return tickets;
    return tickets.filter((t) => isDateMatchingFilter(t.reportedAt || t.createdAt, dateFilter));
  }, [tickets, dateFilter]);

  return (
    <Box p={{ base: 'xs', sm: 'sm' }} style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* 1. Header Toolbar matching CRM Contacts & Leads Format */}
      <Paper
        p="sm"
        radius="16px"
        mb="sm"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 2px 10px rgba(0, 112, 243, 0.04)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap={8}>
          {/* Left: Modern Capsule Segmented Tabs */}
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              padding: 2.5,
              borderRadius: 10,
              border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #E2E8F0',
              flexShrink: 0,
            }}
          >
            {/* Tab: All Tickets */}
            <UnstyledButton
              onClick={() => setActiveTab('all')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'all'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'all'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'all'
                    ? isDark
                      ? '#60A5FA'
                      : '#2563EB'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'all' ? 700 : 500,
                fontSize: 12.5,
                transition: 'all 0.15s ease',
              }}
            >
              <span>All Tickets</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'all'
                      ? '#2563EB'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'all'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {stats?.all ?? totalTickets}
              </Box>
            </UnstyledButton>

            {/* Tab: My Tickets */}
            <UnstyledButton
              onClick={() => setActiveTab('my')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'my'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'my'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'my'
                    ? isDark
                      ? '#818CF8'
                      : '#4F46E5'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'my' ? 700 : 500,
                fontSize: 12.5,
                transition: 'all 0.15s ease',
              }}
            >
              <span>My Tickets</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'my'
                      ? '#4F46E5'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'my'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {stats?.my ?? 0}
              </Box>
            </UnstyledButton>

            {/* Tab: Unassigned Tickets */}
            <UnstyledButton
              onClick={() => setActiveTab('unassigned')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'unassigned'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'unassigned'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'unassigned'
                    ? isDark
                      ? '#FBBF24'
                      : '#D97706'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'unassigned' ? 700 : 500,
                fontSize: 12.5,
                transition: 'all 0.15s ease',
              }}
            >
              <span>Unassigned Tickets</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'unassigned'
                      ? '#D97706'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'unassigned'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {stats?.unassigned ?? 0}
              </Box>
            </UnstyledButton>
          </Box>

          {/* Right: Search, Filter Selects & Create Ticket Button in Single Row */}
          <Group gap={6} align="center" wrap="wrap" style={{ flexShrink: 1, minWidth: 0, justifyContent: 'flex-end' }}>
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} style={{ width: 150 }}>
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

            {/* Status Select */}
            <Select
              data={statusOptions}
              value={filters.status || 'All'}
              onChange={(val) => setFilters((prev: TicketFilters) => ({ ...prev, status: val || 'All' }))}
              size="sm"
              radius="md"
              style={{ width: 112 }}
              comboboxProps={{ width: 160, position: 'bottom-start', withinPortal: true, shadow: 'md' }}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  fontSize: 12.5,
                  height: 36,
                },
                option: {
                  fontSize: 12.5,
                  padding: '7px 12px',
                  whiteSpace: 'nowrap',
                },
              }}
            />

            {/* Priority Select */}
            <Select
              data={priorityOptions}
              value={filters.priority || 'All'}
              onChange={(val) => setFilters((prev: TicketFilters) => ({ ...prev, priority: val || 'All' }))}
              size="sm"
              radius="md"
              style={{ width: 110 }}
              comboboxProps={{ width: 150, position: 'bottom-start', withinPortal: true, shadow: 'md' }}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  fontSize: 12.5,
                  height: 36,
                },
                option: {
                  fontSize: 12.5,
                  padding: '7px 12px',
                  whiteSpace: 'nowrap',
                },
              }}
            />

            {/* Issue Type Select */}
            <Select
              data={issueTypeOptions}
              value={filters.issueType || 'All'}
              onChange={(val) => setFilters((prev: TicketFilters) => ({ ...prev, issueType: val || 'All' }))}
              size="sm"
              radius="md"
              style={{ width: 125 }}
              comboboxProps={{ width: 180, position: 'bottom-start', withinPortal: true, shadow: 'md' }}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  fontSize: 12.5,
                  height: 36,
                },
                option: {
                  fontSize: 12.5,
                  padding: '7px 12px',
                  whiteSpace: 'nowrap',
                },
              }}
            />

            {/* Assignee Select */}
            <Select
              data={employeeOptions}
              value={filters.assignedTo || 'All'}
              onChange={(val) => setFilters((prev: TicketFilters) => ({ ...prev, assignedTo: val || 'All' }))}
              size="sm"
              radius="md"
              style={{ width: 125 }}
              comboboxProps={{ width: 190, position: 'bottom-start', withinPortal: true, shadow: 'md' }}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  fontSize: 12.5,
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
            <DateFilterControl value={dateFilter} onChange={setDateFilter} width={104} />

            {/* Create Ticket Button */}
            <Button
              size="sm"
              radius="md"
              leftSection={<IconPlus size={15} stroke={2.5} />}
              onClick={() => setCreateModalOpened(true)}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 12.5,
                height: 36,
                padding: '0 12px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Create Ticket
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* 2. Main Ticket Table View with Pagination Footer */}
      <TicketTableView
        tickets={filteredTickets}
        loading={loading}
        total={totalTickets}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onView={onViewTicket}
        onEdit={handleOpenEdit}
        onDelete={(ticket) => setDeleteTarget(ticket)}
        onAssign={handleOpenAssign}
        onChangeStatus={handleOpenStatus}
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

      {/* 5. Change Status Modal */}
      <TicketStatusModal
        opened={statusModalOpened}
        onClose={() => {
          setStatusModalOpened(false);
          setActionTicket(null);
        }}
        ticket={actionTicket}
      />

      {/* 6. Delete Ticket Confirmation Dialog */}
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
