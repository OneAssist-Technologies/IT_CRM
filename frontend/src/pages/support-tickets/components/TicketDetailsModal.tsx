import React from 'react';
import {
  Modal,
  Group,
  Stack,
  Text,
  Badge,
  Paper,
  Box,
  Button,
  SimpleGrid,
  useComputedColorScheme,
  ActionIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import {
  IconFileDescription,
  IconEdit,
  IconBuilding,
  IconUser,
  IconPhoneCall,
  IconMail,
  IconBriefcase,
  IconCalendar,
  IconClock,
  IconAlertTriangle,
  IconCheck,
  IconFileText,
  IconCircleCheck,
  IconLayersLinked,
  IconDeviceDesktop,
  IconShieldCheck,
  IconPaperclip,
} from '@tabler/icons-react';
import { SupportTicket, TicketStatus } from '../../../types/supportTicket';

interface TicketDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  onEdit?: (ticket: SupportTicket) => void;
  onOpenWorkspace?: (ticket: SupportTicket) => void;
}

export const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({
  opened,
  onClose,
  ticket,
  onEdit,
  onOpenWorkspace,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  if (!ticket) return null;

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

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })} • ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch {
      return dateStr;
    }
  };

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
        bg = isDark ? 'rgba(234, 179, 8, 0.16)' : '#FEFCE8';
        color = isDark ? '#FDE047' : '#A16207';
        border = isDark ? 'rgba(234, 179, 8, 0.35)' : '#FEF08A';
        break;
      case 'On Hold':
        bg = isDark ? 'rgba(249, 115, 22, 0.16)' : '#FFF7ED';
        color = isDark ? '#FDBA74' : '#C2410C';
        border = isDark ? 'rgba(249, 115, 22, 0.35)' : '#FED7AA';
        break;
      case 'Resolved':
        bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
        color = isDark ? '#6EE7B7' : '#059669';
        border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
        break;
      case 'Closed':
        bg = isDark ? 'rgba(100, 116, 139, 0.16)' : '#F1F5F9';
        color = isDark ? '#CBD5E1' : '#475569';
        border = isDark ? 'rgba(100, 116, 139, 0.35)' : '#CBD5E1';
        break;
      case 'Reopened':
        bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
        color = isDark ? '#FCA5A5' : '#DC2626';
        border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
        break;
      default:
        bg = isDark ? 'rgba(148, 163, 184, 0.16)' : '#F8FAFC';
        color = isDark ? '#E2E8F0' : '#64748B';
        border = isDark ? 'rgba(148, 163, 184, 0.3)' : '#E2E8F0';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 20,
          fontSize: '12px',
          fontWeight: 700,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    let color = 'gray';
    switch (priority) {
      case 'Critical':
        color = 'red';
        break;
      case 'High':
        color = 'orange';
        break;
      case 'Medium':
        color = 'blue';
        break;
      case 'Low':
        color = 'gray';
        break;
      default:
        color = 'blue';
    }

    return (
      <Badge color={color} variant="light" size="sm" radius="md" style={{ fontWeight: 700 }}>
        {priority} Priority
      </Badge>
    );
  };

  const cardBg = isDark ? '#111827' : '#F8FAFC';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';

  const isResolvedOrClosed =
    ticket.status === 'Resolved' ||
    ticket.status === 'Closed' ||
    Boolean(ticket.resolvedAt) ||
    Boolean(ticket.resolutionDescription);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="820px"
      radius="16px"
      padding="xl"
      title={
        <Group gap="xs" align="center">
          <Box
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
              border: isDark ? '1px solid rgba(37, 99, 235, 0.4)' : '1px solid #BFDBFE',
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: '13px',
              color: isDark ? '#93C5FD' : '#2563EB',
            }}
          >
            {ticket.ticketNumber}
          </Box>
          <Text size="sm" c="dimmed">
            Ticket Details
          </Text>
        </Group>
      }
      styles={{
        header: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          paddingBottom: 14,
        },
        content: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        },
        body: {
          paddingTop: 18,
        },
      }}
    >
      <Stack gap="lg">
        {/* Header Title & Status Row */}
        <Box>
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
            <Box style={{ flex: 1, minWidth: 260 }}>
              <Text
                fw={800}
                size="20px"
                style={{
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                }}
              >
                {ticket.subject}
              </Text>
              <Group gap="xs" mt={6} align="center">
                <Text size="xs" c="dimmed">
                  Reported on {formatDateTime(ticket.reportedAt || ticket.createdAt)}
                </Text>
                {ticket.reportedBy && (
                  <>
                    <Text size="xs" c="dimmed">•</Text>
                    <Text size="xs" c="dimmed">
                      by <strong style={{ color: isDark ? '#E2E8F0' : '#334155' }}>{ticket.reportedBy}</strong>
                    </Text>
                  </>
                )}
              </Group>
            </Box>

            <Group gap="xs" align="center">
              {getPriorityBadge(ticket.priority)}
              {renderStatusBadge(ticket.status)}
            </Group>
          </Group>
        </Box>

        {/* 1. Problem Description Card */}
        <Paper
          p="md"
          radius="12px"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${cardBorder}`,
          }}
        >
          <Group gap={6} mb={8} align="center">
            <IconFileText size={16} color="#2563EB" />
            <Text fw={700} size="12px" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.04em' }}>
              Problem / Issue Description
            </Text>
          </Group>
          <Text
            size="14px"
            style={{
              color: isDark ? '#E2E8F0' : '#1E293B',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}
          >
            {ticket.description || 'No detailed description provided.'}
          </Text>

          {ticket.errorMessage && (
            <Box
              mt="xs"
              p="xs"
              style={{
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                border: isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #FECACA',
              }}
            >
              <Text size="11px" fw={700} c="red" tt="uppercase">Error Message</Text>
              <Text size="xs" style={{ fontFamily: 'monospace', color: isDark ? '#FCA5A5' : '#DC2626' }}>
                {ticket.errorMessage}
              </Text>
            </Box>
          )}
        </Paper>

        {/* 2. Two-Column Metadata Information */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {/* Left Column: Customer & Project */}
          <Paper
            p="md"
            radius="12px"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
            }}
          >
            <Group gap={6} mb="sm" align="center">
              <IconBuilding size={16} color="#059669" />
              <Text fw={700} size="12px" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.04em' }}>
                Customer & Project
              </Text>
            </Group>

            <Stack gap="xs">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Company:</Text>
                <Text size="xs" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A', textAlign: 'right' }}>
                  {ticket.customerName || 'Internal Company'}
                </Text>
              </Group>

              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Project:</Text>
                <Text size="xs" fw={600} style={{ color: isDark ? '#93C5FD' : '#2563EB', textAlign: 'right' }}>
                  {ticket.projectName || '—'}
                </Text>
              </Group>

              <Divider style={{ borderColor: cardBorder }} />

              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Contact Person:</Text>
                <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B', textAlign: 'right' }}>
                  {ticket.contactName || '—'}
                </Text>
              </Group>

              {ticket.contactPhone && (
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Phone:</Text>
                  <Group gap={4} wrap="nowrap">
                    <IconPhoneCall size={12} color="#10B981" />
                    <a
                      href={`tel:${ticket.contactPhone}`}
                      style={{
                        fontSize: '12px',
                        color: isDark ? '#6EE7B7' : '#059669',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      {ticket.contactPhone}
                    </a>
                  </Group>
                </Group>
              )}

              {ticket.contactEmail && (
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Email:</Text>
                  <Group gap={4} wrap="nowrap">
                    <IconMail size={12} color="#3B82F6" />
                    <a
                      href={`mailto:${ticket.contactEmail}`}
                      style={{
                        fontSize: '12px',
                        color: isDark ? '#93C5FD' : '#2563EB',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      {ticket.contactEmail}
                    </a>
                  </Group>
                </Group>
              )}

              {ticket.contractTitle && (
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Contract:</Text>
                  <Text size="xs" fw={500} style={{ color: isDark ? '#CBD5E1' : '#475569', textAlign: 'right' }}>
                    {ticket.contractTitle} {ticket.contractType ? `(${ticket.contractType})` : ''}
                  </Text>
                </Group>
              )}
            </Stack>
          </Paper>

          {/* Right Column: Ticket Metadata & SLA */}
          <Paper
            p="md"
            radius="12px"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
            }}
          >
            <Group gap={6} mb="sm" align="center">
              <IconClock size={16} color="#7C3AED" />
              <Text fw={700} size="12px" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.04em' }}>
                Ticket Details & SLA
              </Text>
            </Group>

            <Stack gap="xs">
              <Group justify="space-between" align="center" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Issue Type:</Text>
                <Badge size="xs" variant="outline" color="indigo" radius="md">
                  {ticket.issueType || 'General Bug'}
                </Badge>
              </Group>

              <Group justify="space-between" align="center" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Module:</Text>
                <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                  {ticket.affectedModule || 'General'}
                </Text>
              </Group>

              <Group justify="space-between" align="center" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Environment:</Text>
                <Text size="xs" fw={500} style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                  {ticket.environment || 'Production'}
                </Text>
              </Group>

              <Divider style={{ borderColor: cardBorder }} />

              <Group justify="space-between" align="center" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Assigned To:</Text>
                <Text size="xs" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  {ticket.assignedToName || ticket.assignedTeam || 'Unassigned'}
                </Text>
              </Group>

              <Group justify="space-between" align="center" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Due Date:</Text>
                <Group gap={6}>
                  <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                    {formatDate(ticket.resolutionDueAt || ticket.targetResolutionDate)}
                  </Text>
                  {ticket.isOverdue && (
                    <Badge color="red" size="xs" variant="filled">
                      Overdue
                    </Badge>
                  )}
                </Group>
              </Group>

              <Group justify="space-between" align="center" wrap="nowrap">
                <Text size="xs" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Source:</Text>
                <Text size="xs" fw={500} style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                  {ticket.source || 'Customer'}
                </Text>
              </Group>
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* 3. Resolution Details Card (When Resolved / Closed) */}
        {isResolvedOrClosed && (
          <Paper
            p="md"
            radius="12px"
            style={{
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #BBF7D0',
            }}
          >
            <Group justify="space-between" align="center" mb="xs">
              <Group gap={6}>
                <IconCircleCheck size={18} color="#059669" />
                <Text fw={700} size="13px" c={isDark ? '#6EE7B7' : '#059669'}>
                  Resolution & Fixed Details
                </Text>
              </Group>
              {ticket.resolvedAt && (
                <Text size="11px" c="dimmed">
                  Resolved on {formatDateTime(ticket.resolvedAt)}
                </Text>
              )}
            </Group>

            <Stack gap="xs">
              <Box>
                <Text size="11px" fw={700} c="dimmed" tt="uppercase">Fixed Details / Description</Text>
                <Text size="13px" mt={2} style={{ color: isDark ? '#F1F5F9' : '#0F172A', whiteSpace: 'pre-wrap' }}>
                  {ticket.resolutionDescription || 'Resolution completed.'}
                </Text>
              </Box>

              {(ticket.rootCause || ticket.workaround) && (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt={4}>
                  {ticket.rootCause && (
                    <Box>
                      <Text size="11px" fw={700} c="dimmed" tt="uppercase">Root Cause</Text>
                      <Text size="12px" mt={2} style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
                        {ticket.rootCause}
                      </Text>
                    </Box>
                  )}
                  {ticket.workaround && (
                    <Box>
                      <Text size="11px" fw={700} c="dimmed" tt="uppercase">Workaround</Text>
                      <Text size="12px" mt={2} style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
                        {ticket.workaround}
                      </Text>
                    </Box>
                  )}
                </SimpleGrid>
              )}
            </Stack>
          </Paper>
        )}

        {/* 4. Attachments (If any) */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <Paper
            p="sm"
            radius="12px"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
            }}
          >
            <Group gap={6} mb="xs" align="center">
              <IconPaperclip size={15} color="#64748B" />
              <Text fw={700} size="12px" tt="uppercase" c="dimmed">
                Attachments ({ticket.attachments.length})
              </Text>
            </Group>
            <Group gap="xs">
              {ticket.attachments.map((att, idx) => (
                <Badge
                  key={att.id || idx}
                  variant="light"
                  color="blue"
                  size="md"
                  radius="md"
                  leftSection={<IconPaperclip size={12} />}
                >
                  {att.fileName}
                </Badge>
              ))}
            </Group>
          </Paper>
        )}

        {/* Modal Footer Controls */}
        <Group justify="space-between" align="center" pt="md" style={{ borderTop: `1px solid ${cardBorder}` }}>
          {onOpenWorkspace ? (
            <Button
              variant="subtle"
              color="blue"
              size="sm"
              radius="md"
              leftSection={<IconLayersLinked size={15} />}
              onClick={() => {
                onClose();
                onOpenWorkspace(ticket);
              }}
            >
              Open Ticket Sections / Workspace →
            </Button>
          ) : (
            <Box />
          )}

          <Group gap="xs">
            {onEdit && (
              <Button
                variant="default"
                size="sm"
                radius="md"
                leftSection={<IconEdit size={14} />}
                onClick={() => {
                  onClose();
                  onEdit(ticket);
                }}
              >
                Edit Ticket
              </Button>
            )}
            <Button
              color="blue"
              size="sm"
              radius="md"
              onClick={onClose}
            >
              Close
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};

