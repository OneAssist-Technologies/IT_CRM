import React from 'react';
import {
  Table,
  Group,
  Text,
  ActionIcon,
  Paper,
  Stack,
  Center,
  Button,
  Tooltip,
  useComputedColorScheme,
  Box,
} from '@mantine/core';
import {
  IconFileDescription,
  IconEdit,
  IconTrash,
  IconClock,
  IconUserPlus,
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconAlertTriangle,
  IconTicket,
  IconBuilding,
  IconPhoneCall,
  IconMail,
  IconCalendar,
} from '@tabler/icons-react';
import { SupportTicket, TicketStatus } from '../../../types/supportTicket';

interface TicketTableViewProps {
  tickets: SupportTicket[];
  loading?: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (p: number) => void;
  onView: (ticket: SupportTicket) => void;
  onViewDetails?: (ticket: SupportTicket) => void;
  onEdit: (ticket: SupportTicket) => void;
  onDelete?: (ticket: SupportTicket) => void;
  onAssign: (ticket: SupportTicket) => void;
  onChangeStatus: (ticket: SupportTicket) => void;
}

export const TicketTableView: React.FC<TicketTableViewProps> = ({
  tickets,
  loading = false,
  total,
  page,
  limit,
  onPageChange,
  onView,
  onViewDetails,
  onEdit,
  onDelete,
  onAssign,
  onChangeStatus,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const totalPages = Math.ceil(total / limit) || 1;
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Modern STATUS Capsule Badge matching Lead module
  const renderStatusBadge = (status: TicketStatus | string) => {
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    switch (status) {
      case 'New':
        bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
        color = isDark ? '#93C5FD' : '#1D4ED8';
        border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';
        break;
      case 'Assigned':
        bg = isDark ? 'rgba(99, 102, 241, 0.16)' : '#EEF2FF';
        color = isDark ? '#A5B4FC' : '#4F46E5';
        border = isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE';
        break;
      case 'In Progress':
        bg = isDark ? 'rgba(14, 165, 233, 0.16)' : '#F0F9FF';
        color = isDark ? '#7DD3FC' : '#0284C7';
        border = isDark ? 'rgba(14, 165, 233, 0.35)' : '#BAE6FD';
        break;
      case 'Pending Customer':
      case 'On Hold':
        bg = isDark ? 'rgba(234, 179, 8, 0.16)' : '#FEFCE8';
        color = isDark ? '#FACC15' : '#A16207';
        border = isDark ? 'rgba(234, 179, 8, 0.35)' : '#FEF08A';
        break;
      case 'Resolved':
        bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
        color = isDark ? '#6EE7B7' : '#047857';
        border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
        break;
      case 'Reopened':
        bg = isDark ? 'rgba(168, 85, 247, 0.16)' : '#FAF5FF';
        color = isDark ? '#D8B4FE' : '#7E22CE';
        border = isDark ? 'rgba(168, 85, 247, 0.35)' : '#E9D5FF';
        break;
      case 'Closed':
        bg = isDark ? 'rgba(148, 163, 184, 0.16)' : '#F8FAFC';
        color = isDark ? '#94A3B8' : '#64748B';
        border = isDark ? 'rgba(148, 163, 184, 0.35)' : '#CBD5E1';
        break;
      case 'Cancelled':
        bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
        color = isDark ? '#FCA5A5' : '#DC2626';
        border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
        break;
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
        {status}
      </Box>
    );
  };

  // Modern ASSIGNEE Badge / Interactive User Chip matching Lead module
  const renderAssigneeBadge = (ticket: SupportTicket) => {
    if (ticket.assignedToName) {
      const initial = ticket.assignedToName.trim().charAt(0).toUpperCase();
      return (
        <Box
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '3px 10px 3px 4px',
            borderRadius: 100,
            background: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
            border: isDark ? '1px solid rgba(99, 102, 241, 0.28)' : '1px solid #E0E7FF',
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
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {initial}
          </Box>
          <Text size="12.5px" fw={600} style={{ color: isDark ? '#A5B4FC' : '#4338CA' }}>
            {ticket.assignedToName}
          </Text>
          <IconChevronDown size={12} color="#6366F1" style={{ opacity: 0.8 }} />
        </Box>
      );
    }

    return (
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 100,
          background: isDark ? 'rgba(148, 163, 184, 0.1)' : '#F1F5F9',
          border: isDark ? '1px dashed rgba(148, 163, 184, 0.3)' : '1px dashed #CBD5E1',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <IconUserPlus size={12} color="#64748B" />
        <Text size="11.5px" fw={600} c="dimmed">
          Unassigned
        </Text>
        <IconChevronDown size={11} color="#94A3B8" />
      </Box>
    );
  };

  // Last Activity section matching Lead module format
  const renderLastActivity = (ticket: SupportTicket) => {
    return (
      <Stack gap={4} align="flex-start">
        <Group gap={6} wrap="nowrap">
          <IconClock size={14} color="#10B981" />
          <Text size="xs" fw={500}>
            Reported: {formatDate(ticket.reportedAt)}
          </Text>
        </Group>

        {ticket.isOverdue ? (
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
              color: isDark ? '#FCA5A5' : '#DC2626',
              border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #FECACA',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <IconAlertTriangle size={12} color="#DC2626" />
            <span>Overdue: {formatDate(ticket.resolutionDueAt)}</span>
          </Box>
        ) : ticket.resolutionDueAt ? (
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              background: isDark ? 'rgba(14, 165, 233, 0.12)' : '#F0F9FF',
              color: isDark ? '#7DD3FC' : '#0284C7',
              border: isDark ? '1px solid rgba(14, 165, 233, 0.28)' : '1px solid #BAE6FD',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <IconCalendar size={12} />
            <span>Due: {formatDate(ticket.resolutionDueAt)}</span>
          </Box>
        ) : (
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
              color: isDark ? '#94A3B8' : '#64748B',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            <IconTicket size={12} />
            <span>{ticket.priority} Priority</span>
          </Box>
        )}
      </Stack>
    );
  };

  return (
    <Box style={{ width: '100%', marginTop: 12 }}>
      {/* 1. Main Table Card matching Lead module layout */}
      <Paper
        style={{
          borderRadius: 12,
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 1px 4px rgba(0, 0, 0, 0.03)',
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
                  TICKET NAME
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  COMPANY / PROJECT
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
              {tickets.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <Center>
                      <Stack align="center" gap="xs">
                        <Box
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDark ? '#60A5FA' : '#0F172A',
                          }}
                        >
                          <IconTicket size={30} stroke={1.8} />
                        </Box>
                        <Text fw={700} size="md" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          {loading ? 'Loading tickets...' : 'No Tickets Found'}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ maxWidth: 360 }}>
                          {loading ? 'Fetching support tickets from server...' : 'No support tickets match your current filters.'}
                        </Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                tickets.map((ticket) => {
                  return (
                    <Table.Tr
                      key={ticket.id}
                      style={{
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                      }}
                      onClick={() => onView(ticket)}
                    >
                      {/* 1. Ticket Name */}
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
                              flexShrink: 0,
                            }}
                          >
                            {ticket.subject ? ticket.subject.trim().charAt(0).toUpperCase() : 'T'}
                          </Box>
                          <Box style={{ minWidth: 0 }}>
                            <Text
                              fw={700}
                              size="sm"
                              truncate
                              style={{
                                color: isDark ? '#F9FAFB' : '#0F172A',
                                maxWidth: 220,
                              }}
                            >
                              {ticket.subject}
                            </Text>
                            <Group gap={6} align="center" mt={1}>
                              <Text size="11px" c="dimmed" style={{ fontFamily: 'monospace' }}>
                                {ticket.ticketNumber} • {ticket.issueType || 'General'}
                              </Text>
                              {ticket.reopenedCount > 0 && (
                                <Text size="10px" fw={700} style={{ color: '#9333EA' }}>
                                  [Reopened]
                                </Text>
                              )}
                            </Group>
                          </Box>
                        </Group>
                      </Table.Td>

                      {/* 2. Company / Project */}
                      <Table.Td>
                        <Stack gap={2}>
                          <Group gap={6} wrap="nowrap">
                            <IconBuilding size={14} color="#64748B" />
                            <Text size="sm" fw={500} truncate style={{ maxWidth: 190 }}>
                              {ticket.customerName || 'Internal'}
                            </Text>
                          </Group>
                          {ticket.projectName && (
                            <Text size="11px" c="dimmed" truncate style={{ paddingLeft: 20, maxWidth: 180 }}>
                              {ticket.projectName}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>

                      {/* 3. Contact Info */}
                      <Table.Td>
                        <Stack gap={2}>
                          {(ticket.contactPhone || (ticket as any).customerPhone) && (
                            <Group gap={6} wrap="nowrap">
                              <IconPhoneCall size={14} color="#10B981" />
                              <Text size="xs" fw={500}>
                                {ticket.contactPhone || (ticket as any).customerPhone}
                              </Text>
                            </Group>
                          )}
                          {(ticket.contactEmail || (ticket as any).customerEmail) && (
                            <Group gap={6} wrap="nowrap">
                              <IconMail size={14} color="#3B82F6" />
                              <Text size="xs" style={{ color: '#2563EB' }} truncate maw={180}>
                                {ticket.contactEmail || (ticket as any).customerEmail}
                              </Text>
                            </Group>
                          )}
                          {!(ticket.contactPhone || (ticket as any).customerPhone) &&
                            !(ticket.contactEmail || (ticket as any).customerEmail) && (
                              <Text size="xs" c="dimmed">
                                No contact details
                              </Text>
                            )}
                        </Stack>
                      </Table.Td>

                      {/* 4. Assigned To */}
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Tooltip label="Click to assign or reassign" withArrow>
                          <Box
                            onClick={() => onAssign(ticket)}
                            style={{ display: 'inline-block', cursor: 'pointer' }}
                          >
                            {renderAssigneeBadge(ticket)}
                          </Box>
                        </Tooltip>
                      </Table.Td>

                      {/* 5. Status */}
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Tooltip label="Click to change status" withArrow>
                          <Box
                            onClick={() => onChangeStatus(ticket)}
                            style={{ display: 'inline-block', cursor: 'pointer' }}
                          >
                            <Stack gap={4} align="flex-start">
                              {renderStatusBadge(ticket.status)}
                              <Text size="11px" c="dimmed" style={{ paddingLeft: 4 }}>
                                {ticket.affectedModule || ticket.priority || 'General'}
                              </Text>
                            </Stack>
                          </Box>
                        </Tooltip>
                      </Table.Td>

                      {/* 6. Last Activity */}
                      <Table.Td style={{ minWidth: 220 }} onClick={(e) => e.stopPropagation()}>
                        {renderLastActivity(ticket)}
                      </Table.Td>

                      {/* 7. Actions */}
                      <Table.Td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <Group gap={6} justify="flex-end" wrap="nowrap">
                          <Tooltip label="View Ticket" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="teal"
                              size="md"
                              radius="md"
                              onClick={() => (onViewDetails ? onViewDetails(ticket) : onView(ticket))}
                            >
                              <IconFileDescription size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Edit Ticket" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="indigo"
                              size="md"
                              radius="md"
                              onClick={() => onEdit(ticket)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>

                          {onDelete && (
                            <Tooltip label="Delete Ticket" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="md"
                                radius="md"
                                onClick={() => onDelete(ticket)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {/* MOBILE VIEW: Responsive Touch Cards List */}
      <Stack hiddenFrom="sm" gap="sm" mt="md">
        {tickets.map((ticket) => {
          return (
            <Paper
              key={ticket.id}
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
                  onClick={() => onView(ticket)}
                >
                  <Box
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: isDark ? '#1E3A8A' : '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDark ? '#93C5FD' : '#2563EB',
                      fontWeight: 700,
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {ticket.subject ? ticket.subject.trim().charAt(0).toUpperCase() : 'T'}
                  </Box>
                  <Box style={{ overflow: 'hidden' }}>
                    <Text fw={700} size="14px" truncate style={{ color: isDark ? '#F9FAFB' : '#0F172A' }}>
                      {ticket.subject}
                    </Text>
                    <Text size="11px" c="dimmed" style={{ fontFamily: 'monospace' }}>
                      {ticket.ticketNumber} • {ticket.issueType || 'General'}
                    </Text>
                  </Box>
                </Group>

                <Box onClick={(e) => { e.stopPropagation(); onChangeStatus(ticket); }} style={{ cursor: 'pointer' }}>
                  {renderStatusBadge(ticket.status)}
                </Box>
              </Group>

              {/* Company & Contact */}
              <Group justify="space-between" align="center" mt="xs" pt="xs" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9' }}>
                <Group gap={6}>
                  <IconBuilding size={14} color="#64748B" />
                  <Text size="xs" fw={500}>
                    {ticket.customerName || 'Internal'}
                  </Text>
                </Group>
                <Box onClick={(e) => { e.stopPropagation(); onAssign(ticket); }}>
                  {renderAssigneeBadge(ticket)}
                </Box>
              </Group>

              {/* Footer: Date & Actions */}
              <Group justify="space-between" align="center" mt="xs">
                <Text size="xs" c="dimmed">
                  Reported: {formatDate(ticket.reportedAt)}
                </Text>
                <Group gap={4}>
                  <ActionIcon
                    variant="subtle"
                    color="teal"
                    size="sm"
                    onClick={() => (onViewDetails ? onViewDetails(ticket) : onView(ticket))}
                  >
                    <IconFileDescription size={15} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="indigo" size="sm" onClick={() => onEdit(ticket)}>
                    <IconEdit size={15} />
                  </ActionIcon>
                  {onDelete && (
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onDelete(ticket)}>
                      <IconTrash size={15} />
                    </ActionIcon>
                  )}
                </Group>
              </Group>
            </Paper>
          );
        })}
      </Stack>

      {/* 2. Unified Pagination Footer Card matching Lead module */}
      <Paper
        mt={12}
        p="sm"
        style={{
          borderRadius: 12,
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Text size="13px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            Showing {startRecord} to {endRecord} of {total} tickets
          </Text>

          <Group gap={6} align="center">
            <Button
              variant="default"
              size="xs"
              radius="md"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              leftSection={<IconChevronLeft size={13} />}
              style={{
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Previous
            </Button>

            <Box
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 28,
                height: 28,
                padding: '0 6px',
                borderRadius: 6,
                border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #CBD5E1',
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                color: isDark ? '#F8FAFC' : '#0F172A',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {page}
            </Box>

            <Text size="12px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              of {totalPages}
            </Text>

            <Button
              variant="default"
              size="xs"
              radius="md"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              rightSection={<IconChevronRight size={13} />}
              style={{
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Next
            </Button>
          </Group>
        </Group>
      </Paper>
    </Box>
  );
};

export default TicketTableView;
