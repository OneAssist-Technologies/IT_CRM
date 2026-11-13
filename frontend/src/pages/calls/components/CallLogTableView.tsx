import React from 'react';
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
} from '@mantine/core';
import {
  IconPhoneCall,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconEdit,
  IconTrash,
  IconUser,
  IconBuilding,
  IconCalendar,
  IconClock,
  IconPhone,
  IconEye,
} from '@tabler/icons-react';
import { CallLog, CallStatus, CallType } from '../../../types/callLog';

interface CallLogTableViewProps {
  calls: CallLog[];
  onEdit: (call: CallLog) => void;
  onDelete: (call: CallLog) => void;
  onAddNew: () => void;
  onViewDetails: (call: CallLog) => void;
  loading?: boolean;
}

export const CallLogTableView: React.FC<CallLogTableViewProps> = ({
  calls,
  onEdit,
  onDelete,
  onAddNew,
  onViewDetails,
  loading = false,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  // Format Status Badge matching Meetings design
  const renderStatusBadge = (statusVal?: string | null) => {
    const st = (statusVal || 'Completed').trim();
    const sLow = st.toLowerCase();
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (sLow.includes('complet')) {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    } else if (sLow.includes('follow')) {
      bg = isDark ? 'rgba(139, 92, 246, 0.16)' : '#F5F3FF';
      color = isDark ? '#C4B5FD' : '#7C3AED';
      border = isDark ? 'rgba(139, 92, 246, 0.35)' : '#DDD6FE';
    } else if (sLow.includes('miss')) {
      bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#B91C1C';
      border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
    } else if (sLow.includes('busy')) {
      bg = isDark ? 'rgba(249, 115, 22, 0.16)' : '#FFF7ED';
      color = isDark ? '#FB923C' : '#C2410C';
      border = isDark ? 'rgba(249, 115, 22, 0.35)' : '#FFEDD5';
    } else if (sLow.includes('no answer') || sLow.includes('answer')) {
      bg = isDark ? 'rgba(245, 158, 11, 0.14)' : '#FFFBEB';
      color = isDark ? '#FCD34D' : '#B45309';
      border = isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A';
    } else if (sLow.includes('not interest') || sLow.includes('not intrest')) {
      bg = isDark ? 'rgba(244, 63, 94, 0.16)' : '#FFF1F2';
      color = isDark ? '#FDA4AF' : '#E11D48';
      border = isDark ? 'rgba(244, 63, 94, 0.35)' : '#FECDD3';
    } else if (sLow.includes('interest') || sLow.includes('intrest')) {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#10B981' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
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
          color,
          border: `1px solid ${border}`,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        {st}
      </Box>
    );
  };

  // Format Call Type Badge
  const renderCallTypeBadge = (type: CallType) => {
    const isIncoming = type === 'Incoming';
    return (
      <Group gap={6} wrap="nowrap">
        <Box
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isIncoming
              ? isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5'
              : isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF',
            color: isIncoming ? '#10B981' : '#2563EB',
          }}
        >
          {isIncoming ? <IconPhoneIncoming size={13} /> : <IconPhoneOutgoing size={13} />}
        </Box>
        <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
          {type}
        </Text>
      </Group>
    );
  };

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const parts = dateString.split('T')[0].split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else {
          const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
      const d = new Date(dateString);
      return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Empty State
  if (!loading && calls.length === 0) {
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
                background: isDark ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#818CF8' : '#4F46E5',
              }}
            >
              <IconPhoneCall size={32} stroke={1.8} />
            </Box>
            <Text fw={700} size="lg" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
              No Call Logs Found
            </Text>
            <Text size="sm" c="dimmed" style={{ maxWidth: 420 }}>
              No call records match your current view. Click below to log a new call.
            </Text>
            <Button
              mt="xs"
              radius="md"
              leftSection={<IconPhoneCall size={16} />}
              onClick={onAddNew}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
              }}
            >
              + Log Call
            </Button>
          </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <>
      {/* DESKTOP / TABLET VIEW: Full Table Container matching Meetings Design */}
      <Paper
        visibleFrom="sm"
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
                  CONTACT / COMPANY
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  ASSIGNED EMPLOYEE
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  PHONE NUMBER
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  CALL TYPE
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  DURATION
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  STATUS
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  DATE & TIME
                </Table.Th>
                <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                  ACTIONS
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {calls.map((call) => {
                const initialLetter = (call.contactName || 'C').charAt(0).toUpperCase();

                return (
                  <Table.Tr
                    key={call.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewDetails(call)}
                  >
                    {/* 1. Contact / Company */}
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Box
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: isDark ? '#1E293B' : '#EEF2FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDark ? '#818CF8' : '#4F46E5',
                            fontWeight: 700,
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          {initialLetter}
                        </Box>
                        <Stack gap={2}>
                          <Text
                            fw={700}
                            size="sm"
                            style={{
                              color: isDark ? '#F9FAFB' : '#0F172A',
                            }}
                          >
                            {call.contactName}
                          </Text>
                          {call.companyName && (
                            <Group gap={4} wrap="nowrap">
                              <IconBuilding size={12} color={isDark ? '#64748B' : '#94A3B8'} />
                              <Text size="11px" style={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 500 }}>
                                {call.companyName}
                              </Text>
                            </Group>
                          )}
                        </Stack>
                      </Group>
                    </Table.Td>

                    {/* 2. Assigned Employee */}
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <IconUser size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                        <Text fw={600} size="sm" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          {call.employeeName}
                        </Text>
                      </Group>
                    </Table.Td>

                    {/* 3. Phone Number */}
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <IconPhone size={14} color={isDark ? '#38BDF8' : '#0284C7'} />
                        <Text size="xs" fw={600} style={{ color: isDark ? '#38BDF8' : '#0284C7' }}>
                          {call.phoneNumber}
                        </Text>
                      </Group>
                    </Table.Td>

                    {/* 4. Call Type */}
                    <Table.Td>{renderCallTypeBadge(call.callType)}</Table.Td>

                    {/* 5. Duration */}
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <IconClock size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                        <Text size="xs" fw={700} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                          {call.duration}
                        </Text>
                      </Group>
                    </Table.Td>

                    {/* 6. Status */}
                    <Table.Td>{renderStatusBadge(call.status)}</Table.Td>

                    {/* 7. Date & Time */}
                    <Table.Td>
                      <Stack gap={2}>
                        <Group gap={6} wrap="nowrap">
                          <IconCalendar size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                          <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                            {formatDisplayDate(call.callDate)}
                          </Text>
                        </Group>
                        <Group gap={6} wrap="nowrap">
                          <IconClock size={12} color={isDark ? '#64748B' : '#94A3B8'} />
                          <Text size="11px" c="dimmed">
                            {call.callTime}
                          </Text>
                        </Group>
                      </Stack>
                    </Table.Td>

                    {/* 8. Actions */}
                    <Table.Td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="View Call Details" withArrow position="top">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="sm"
                            radius="md"
                            onClick={() => onViewDetails(call)}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Edit Call" withArrow position="top">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            radius="md"
                            onClick={() => onEdit(call)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Delete Call" withArrow position="top">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            radius="md"
                            onClick={() => onDelete(call)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {/* MOBILE CARDS VIEW (Hidden on Tablet / Desktop) */}
      <Stack hiddenFrom="sm" gap="md" mt="md">
        {calls.map((call) => (
          <Paper
            key={call.id}
            p="md"
            radius="lg"
            style={{
              background: isDark ? '#111827' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
              cursor: 'pointer',
            }}
            onClick={() => onViewDetails(call)}
          >
            <Group justify="space-between" align="flex-start" mb="xs">
              <div>
                <Text fw={700} size="sm" style={{ color: isDark ? '#F9FAFB' : '#0F172A' }}>
                  {call.contactName}
                </Text>
                {call.companyName && (
                  <Group gap={4} wrap="nowrap" mt={1}>
                    <IconBuilding size={12} color={isDark ? '#64748B' : '#94A3B8'} />
                    <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 500 }}>
                      {call.companyName}
                    </Text>
                  </Group>
                )}
                <Text size="xs" c="dimmed" mt={call.companyName ? 1 : 2}>
                  Assigned: {call.employeeName}
                </Text>
              </div>
              {renderStatusBadge(call.status)}
            </Group>

            <Group gap="xs" mb="xs">
              {renderCallTypeBadge(call.callType)}
              <Text size="xs" fw={700} style={{ color: isDark ? '#38BDF8' : '#0284C7' }}>
                {call.phoneNumber}
              </Text>
              <Text size="xs" c="dimmed">
                • {call.duration}
              </Text>
            </Group>

            <Group justify="space-between" align="center" pt="xs" style={{ borderTop: isDark ? '1px solid #1F2937' : '1px solid #F1F5F9' }}>
              <Text size="xs" c="dimmed">
                {formatDisplayDate(call.callDate)} {call.callTime}
              </Text>
              <Group gap={4} onClick={(e) => e.stopPropagation()}>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => onEdit(call)}>
                  <IconEdit size={15} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onDelete(call)}>
                  <IconTrash size={15} />
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>
    </>
  );
};
