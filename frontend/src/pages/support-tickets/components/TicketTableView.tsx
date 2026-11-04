import React, { useState } from 'react';
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
  SimpleGrid,
} from '@mantine/core';
import {
  IconEye,
  IconEdit,
  IconTrash,
  IconClock,
  IconUserCheck,
  IconUserPlus,
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconAlertTriangle,
  IconTicket,
  IconBuilding,
  IconFolder,
  IconFileText,
} from '@tabler/icons-react';
import { SupportTicket, TicketStatus, TicketPriority } from '../../../types/supportTicket';

interface TicketTableViewProps {
  tickets: SupportTicket[];
  loading?: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (p: number) => void;
  onView: (ticket: SupportTicket) => void;
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
  onEdit,
  onDelete,
  onAssign,
  onChangeStatus,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  // 1. Sleek Modern STATUS Capsule Badge matching CRM contact format
  const renderStatusBadge = (status: TicketStatus) => {
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

  // 2. TAG PRIORITY Badge matching CRM contact format
  const renderPriorityBadge = (priority: TicketPriority) => {
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#2563EB';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    switch (priority) {
      case 'Critical':
        bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
        color = isDark ? '#FCA5A5' : '#DC2626';
        border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
        break;
      case 'High':
        bg = isDark ? 'rgba(249, 115, 22, 0.16)' : '#FFF7ED';
        color = isDark ? '#FB923C' : '#C2410C';
        border = isDark ? 'rgba(249, 115, 22, 0.35)' : '#FFEDD5';
        break;
      case 'Medium':
        bg = isDark ? 'rgba(245, 158, 11, 0.16)' : '#FFFBEB';
        color = isDark ? '#FCD34D' : '#D97706';
        border = isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A';
        break;
      case 'Low':
        bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
        color = isDark ? '#93C5FD' : '#2563EB';
        border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';
        break;
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
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: color,
            display: 'inline-block',
          }}
        />
        <span>{priority}</span>
      </Box>
    );
  };

  // 3. ASSIGNED OWNER Badge matching CRM contact format
  const renderAssignedBadge = (ticket: SupportTicket) => {
    if (ticket.assignedToName) {
      return (
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
          <span>{ticket.assignedToName}</span>
          <IconChevronDown size={11} stroke={2} style={{ opacity: 0.7 }} />
        </Badge>
      );
    }

    return (
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
    );
  };

  return (
    <Box style={{ width: '100%' }}>
      {/* 1. Main Table Card */}
      <Paper
        radius="16px"
        style={{
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 112, 243, 0.04)',
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
                <Table.Th style={{ width: 100, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                  ID
                </Table.Th>
                <Table.Th style={{ minWidth: 130, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                  COMPANY
                </Table.Th>
                <Table.Th style={{ minWidth: 100, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                  PROJECT
                </Table.Th>
                <Table.Th style={{ width: 120, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                  ISSUE TYPE
                </Table.Th>
                <Table.Th style={{ width: 105, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                  TAG PRIORITY
                </Table.Th>
                <Table.Th style={{ minWidth: 125, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                  ASSIGNED TEAM
                </Table.Th>
                <Table.Th style={{ width: 125, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                  ASSIGNED OWNER
                </Table.Th>
                <Table.Th style={{ width: 105, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                  REPORTED DATE
                </Table.Th>
                <Table.Th style={{ width: 105, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                  DUE DATE
                </Table.Th>
                <Table.Th style={{ width: 115, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 8px' }}>
                  STATUS
                </Table.Th>
                <Table.Th style={{ width: 95, textAlign: 'center', whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '10px 4px' }}>
                  ACTIONS
                </Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {tickets.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={11} style={{ textAlign: 'center', padding: '48px 16px' }}>
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
                  const isExpanded = expandedId === ticket.id;
                  const isOverdue = ticket.isOverdue;

                  return (
                    <React.Fragment key={ticket.id}>
                      <Table.Tr
                        style={{
                          height: 52,
                          cursor: 'pointer',
                          transition: 'background 0.12s ease',
                          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                          backgroundColor: isExpanded
                            ? (isDark ? 'rgba(14, 165, 233, 0.12)' : '#F0F9FF')
                            : undefined,
                        }}
                        onClick={() => setExpandedId((prev) => (prev === ticket.id ? null : ticket.id))}
                      >
                        {/* 1. ID with expand chevron */}
                        <Table.Td style={{ width: 100, whiteSpace: 'nowrap', padding: '8px 8px', verticalAlign: 'middle' }}>
                          <Group gap={4} wrap="nowrap" align="center">
                            <ActionIcon
                              size={18}
                              variant="subtle"
                              color={isExpanded ? 'blue' : 'gray'}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId((prev) => (prev === ticket.id ? null : ticket.id));
                              }}
                              title={isExpanded ? 'Collapse ticket details' : 'Click to show details'}
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
                              {ticket.ticketNumber}
                            </Text>
                          </Group>
                          {ticket.reopenedCount > 0 && (
                            <Badge size="xs" color="grape" variant="outline" mt={2} ml={22} style={{ display: 'block', width: 'fit-content' }}>
                              Reopened ({ticket.reopenedCount})
                            </Badge>
                          )}
                        </Table.Td>

                        {/* 2. COMPANY / CUSTOMER */}
                        <Table.Td style={{ minWidth: 130, padding: '8px 8px', verticalAlign: 'middle' }}>
                          <Tooltip label={ticket.customerName || ''} withArrow multiline maw={240} disabled={!ticket.customerName}>
                            <Text
                              size="12.5px"
                              fw={600}
                              truncate
                              style={{
                                color: isDark ? '#F8FAFC' : '#1E293B',
                                maxWidth: 160,
                              }}
                            >
                              {ticket.customerName || '—'}
                            </Text>
                          </Tooltip>
                          {ticket.contactName && (
                            <Text size="10.5px" c="dimmed" truncate style={{ maxWidth: 160 }}>
                              {ticket.contactName}
                            </Text>
                          )}
                        </Table.Td>

                        {/* 3. PROJECT */}
                        <Table.Td style={{ minWidth: 100, padding: '8px 8px', verticalAlign: 'middle' }}>
                          <Text size="12px" fw={500} truncate style={{ color: ticket.projectName ? (isDark ? '#CBD5E1' : '#334155') : (isDark ? '#64748B' : '#94A3B8'), maxWidth: 130 }}>
                            {ticket.projectName || '—'}
                          </Text>
                        </Table.Td>

                        {/* 4. ISSUE TYPE */}
                        <Table.Td style={{ width: 120, whiteSpace: 'nowrap', padding: '8px 8px', verticalAlign: 'middle' }}>
                          <Badge variant="dot" color="gray" size="sm" style={{ whiteSpace: 'nowrap' }}>
                            {ticket.issueType}
                          </Badge>
                        </Table.Td>

                        {/* 5. TAG PRIORITY */}
                        <Table.Td style={{ width: 105, whiteSpace: 'nowrap', padding: '8px 8px', verticalAlign: 'middle' }}>
                          {renderPriorityBadge(ticket.priority)}
                        </Table.Td>

                        {/* 6. ASSIGNED TEAM */}
                        <Table.Td style={{ minWidth: 125, padding: '8px 8px', verticalAlign: 'middle' }}>
                          <Text size="12px" truncate style={{ color: ticket.assignedTeam ? (isDark ? '#CBD5E1' : '#334155') : (isDark ? '#64748B' : '#94A3B8'), maxWidth: 150 }}>
                            {ticket.assignedTeam || '—'}
                          </Text>
                        </Table.Td>

                        {/* 7. ASSIGNED OWNER */}
                        <Table.Td
                          style={{ width: 125, whiteSpace: 'nowrap', padding: '8px 8px', verticalAlign: 'middle' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssign(ticket);
                          }}
                        >
                          <Tooltip label={ticket.assignedToName ? `Assigned to ${ticket.assignedToName} (Click to reassign)` : 'Click to assign employee'} withArrow>
                            <UnstyledButton style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                              {renderAssignedBadge(ticket)}
                            </UnstyledButton>
                          </Tooltip>
                        </Table.Td>

                        {/* 8. REPORTED DATE */}
                        <Table.Td style={{ width: 105, whiteSpace: 'nowrap', padding: '8px 8px', verticalAlign: 'middle' }}>
                          <Text size="12px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                            {formatDate(ticket.reportedAt)}
                          </Text>
                        </Table.Td>

                        {/* 9. DUE DATE */}
                        <Table.Td style={{ width: 105, whiteSpace: 'nowrap', padding: '8px 8px', verticalAlign: 'middle' }}>
                          <Group gap={4} wrap="nowrap">
                            {isOverdue && (
                              <Tooltip label="Resolution SLA Overdue">
                                <IconAlertTriangle size={14} color="#EF4444" />
                              </Tooltip>
                            )}
                            <Text
                              size="12px"
                              fw={isOverdue ? 700 : 500}
                              style={{ color: isOverdue ? '#EF4444' : (isDark ? '#94A3B8' : '#64748B') }}
                            >
                              {formatDate(ticket.resolutionDueAt)}
                            </Text>
                          </Group>
                        </Table.Td>

                        {/* 10. STATUS */}
                        <Table.Td
                          style={{ width: 115, whiteSpace: 'nowrap', padding: '8px 8px', verticalAlign: 'middle' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeStatus(ticket);
                          }}
                        >
                          <Tooltip label="Click to change status" withArrow>
                            <UnstyledButton style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                              {renderStatusBadge(ticket.status)}
                            </UnstyledButton>
                          </Tooltip>
                        </Table.Td>

                        {/* 11. ACTIONS (3 Inline Action Icons matching CRM contacts format) */}
                        <Table.Td style={{ width: 95, textAlign: 'center', verticalAlign: 'middle', padding: '8px 4px' }} onClick={(e) => e.stopPropagation()}>
                          <Group gap={3} justify="center" wrap="nowrap">
                            <Tooltip label="View Ticket" withArrow>
                              <ActionIcon
                                variant="light"
                                size="sm"
                                radius="md"
                                color="blue"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onView(ticket);
                                }}
                              >
                                <IconEye size={15} />
                              </ActionIcon>
                            </Tooltip>

                            <Tooltip label="Edit Details" withArrow>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                radius="md"
                                color="indigo"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(ticket);
                                }}
                              >
                                <IconEdit size={15} />
                              </ActionIcon>
                            </Tooltip>

                            <Tooltip label="Delete Ticket" withArrow>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                radius="md"
                                color="red"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onDelete) onDelete(ticket);
                                }}
                              >
                                <IconTrash size={15} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>

                      {/* Expandable Sub-Row */}
                      {isExpanded && (
                        <Table.Tr
                          style={{
                            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                          }}
                        >
                          <Table.Td colSpan={11} p="sm">
                            <Box
                              p="sm"
                              style={{
                                borderRadius: 10,
                                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                              }}
                            >
                              <Stack gap="xs">
                                <Group justify="space-between" align="center">
                                  <Text size="xs" fw={700} style={{ color: isDark ? '#93C5FD' : '#1D4ED8' }}>
                                    Subject: {ticket.subject}
                                  </Text>
                                  <Text size="11px" c="dimmed">
                                    Source: {ticket.source} | Affected Module: {ticket.affectedModule || 'General'}
                                  </Text>
                                </Group>

                                <Text size="xs" style={{ color: isDark ? '#CBD5E1' : '#475569', whiteSpace: 'pre-line' }}>
                                  {ticket.description || 'No description provided.'}
                                </Text>

                                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs" pt="xs" style={{ borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #F1F5F9' }}>
                                  <Group gap={6}>
                                    <IconBuilding size={14} color="#64748B" />
                                    <Text size="11px" c="dimmed">Customer: <b>{ticket.customerName || 'None'}</b></Text>
                                  </Group>
                                  <Group gap={6}>
                                    <IconFolder size={14} color="#64748B" />
                                    <Text size="11px" c="dimmed">Project: <b>{ticket.projectName || 'None'}</b></Text>
                                  </Group>
                                  <Group gap={6}>
                                    <IconFileText size={14} color="#64748B" />
                                    <Text size="11px" c="dimmed">Contract: <b>{ticket.contractTitle || 'None'}</b></Text>
                                  </Group>
                                </SimpleGrid>
                              </Stack>
                            </Box>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Box>
      </Paper>

      {/* 2. Unified Pagination Footer Card matching CRM contacts format */}
      <Paper
        mt="sm"
        p="sm"
        radius="16px"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 2px 10px rgba(0, 112, 243, 0.04)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap">
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
