import React from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Box,
  Button,
  SimpleGrid,
  useComputedColorScheme,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconPhoneCall,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconClock,
  IconCalendar,
  IconUser,
  IconPhone,
  IconBuilding,
  IconEdit,
  IconTrash,
  IconNotes,
  IconBrandWhatsapp,
  IconMail,
} from '@tabler/icons-react';
import { CallLog } from '../../../types/callLog';
import { useEmployee } from '../../../context/EmployeeContext';

interface CallDetailsModalProps {
  call: CallLog | null;
  opened: boolean;
  onClose: () => void;
  onEdit: (call: CallLog) => void;
  onDelete: (call: CallLog) => void;
}

export const CallDetailsModal: React.FC<CallDetailsModalProps> = ({
  call,
  opened,
  onClose,
  onEdit,
  onDelete,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { employees } = useEmployee();

  if (!call) return null;

  const channel = (call as any).channel || 'Calls';
  const isWhatsapp = String(channel).toLowerCase() === 'whatsapp';
  const isEmail = String(channel).toLowerCase() === 'email';
  const isIncoming = call.callType?.toLowerCase() === 'incoming';

  const getEmployeeDisplayName = (empName?: string, empId?: string | null) => {
    if (!empName && !empId) return 'Staff';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(empName || '');
    if (!isUuid && empName && empName !== 'Staff') return empName;
    const emp = employees.find(
      (e) =>
        (empName && (e.id === empName || e.empCode === empName)) ||
        (empId && (e.id === empId || e.empCode === empId))
    );
    return emp ? emp.name : (empName || 'Staff');
  };

  const renderStatusBadge = (st: string) => {
    const s = (st || 'Completed').toLowerCase();
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (s.includes('complet')) {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    } else if (s.includes('follow')) {
      bg = isDark ? 'rgba(139, 92, 246, 0.16)' : '#F5F3FF';
      color = isDark ? '#C4B5FD' : '#7C3AED';
      border = isDark ? 'rgba(139, 92, 246, 0.35)' : '#DDD6FE';
    } else if (s.includes('miss')) {
      bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#B91C1C';
      border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
    } else if (s.includes('busy')) {
      bg = isDark ? 'rgba(249, 115, 22, 0.16)' : '#FFF7ED';
      color = isDark ? '#FB923C' : '#C2410C';
      border = isDark ? 'rgba(249, 115, 22, 0.35)' : '#FFEDD5';
    } else if (s.includes('no answer')) {
      bg = isDark ? 'rgba(245, 158, 11, 0.14)' : '#FFFBEB';
      color = isDark ? '#FCD34D' : '#B45309';
      border = isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A';
    } else if (s.includes('not interest') || s.includes('not intrest')) {
      bg = isDark ? 'rgba(244, 63, 94, 0.16)' : '#FFF1F2';
      color = isDark ? '#FDA4AF' : '#E11D48';
      border = isDark ? 'rgba(244, 63, 94, 0.35)' : '#FECDD3';
    } else if (s.includes('interest') || s.includes('intrest')) {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#10B981' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    }

    return (
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 12px',
          borderRadius: 100,
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {st}
      </Box>
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      radius="lg"
      padding="xl"
      withCloseButton={false}
      styles={{
        content: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      <Stack gap="lg">
        {/* Header Section */}
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <Box
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isWhatsapp
                  ? isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7'
                  : isEmail
                  ? isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE'
                  : isIncoming
                  ? isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7'
                  : isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                color: isWhatsapp
                  ? isDark ? '#4ADE80' : '#16A34A'
                  : isEmail
                  ? isDark ? '#60A5FA' : '#2563EB'
                  : isIncoming
                  ? isDark ? '#4ADE80' : '#16A34A'
                  : isDark ? '#60A5FA' : '#2563EB',
              }}
            >
              {isWhatsapp ? (
                <IconBrandWhatsapp size={24} stroke={2} />
              ) : isEmail ? (
                <IconMail size={24} stroke={2} />
              ) : isIncoming ? (
                <IconPhoneIncoming size={24} stroke={2} />
              ) : (
                <IconPhoneOutgoing size={24} stroke={2} />
              )}
            </Box>
            <div>
              <Group gap="xs" align="center">
                <Text size="lg" fw={700} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {call.callId}
                </Text>
                {renderStatusBadge(call.status)}
              </Group>
              <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                Channel: <strong>{channel}</strong> • Type: <strong>{call.callType || 'Outgoing'}</strong>
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            <Tooltip label="Edit Call" withArrow>
              <ActionIcon
                variant="subtle"
                color="blue"
                size="lg"
                radius="md"
                onClick={() => {
                  onClose();
                  onEdit(call);
                }}
              >
                <IconEdit size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete Record" withArrow>
              <ActionIcon
                variant="subtle"
                color="red"
                size="lg"
                radius="md"
                onClick={() => {
                  onClose();
                  onDelete(call);
                }}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* 2-Column Details Grid */}
        <Box
          p="md"
          style={{
            borderRadius: 12,
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
          }}
        >
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {/* Contact Person */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconUser size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  Contact Person
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {call.contactName || '—'}
                </Text>
              </div>
            </Group>

            {/* Company Name */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconBuilding size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  Company Name
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {call.companyName || '—'}
                </Text>
              </div>
            </Group>

            {/* Phone Number */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconPhone size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  Phone / WhatsApp Number
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {call.phoneNumber || '—'}
                </Text>
              </div>
            </Group>

            {/* Assigned Employee */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconUser size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  Logged / Sent By
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {getEmployeeDisplayName(call.employeeName, call.employeeId)}
                </Text>
              </div>
            </Group>

            {/* Date */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconCalendar size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  Date
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {formatDisplayDate(call.callDate)}
                </Text>
              </div>
            </Group>

            {/* Time */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconClock size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  Time
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {call.callTime || '—'}
                </Text>
              </div>
            </Group>

            {/* Duration */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconClock size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  Duration
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {call.duration || '—'}
                </Text>
              </div>
            </Group>

            {/* Call Type */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconPhoneCall size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  {channel !== 'Calls' ? `${channel} Type` : 'Call Type'}
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {call.callType || 'Outgoing'}
                </Text>
              </div>
            </Group>
          </SimpleGrid>
        </Box>

        {/* Description / Discussion Summary / Notes */}
        <Box>
          <Group gap="xs" mb={6}>
            <IconNotes size={16} color={isDark ? '#94A3B8' : '#64748B'} />
            <Text size="xs" fw={700} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
              {channel !== 'Calls' ? `${channel} Notes & Discussion Summary` : 'Call Notes & Discussion Summary'}
            </Text>
          </Group>
          <Box
            p="md"
            style={{
              borderRadius: 10,
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
              color: isDark ? '#E2E8F0' : '#1E293B',
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {call.description || 'Discussion points and activity notes recorded in CRM log.'}
          </Box>
        </Box>

        {/* Modal Footer */}
        <Group justify="flex-end" pt="xs" gap="sm">
          <Button
            variant="default"
            size="sm"
            radius="md"
            leftSection={<IconEdit size={15} />}
            onClick={() => {
              onClose();
              onEdit(call);
            }}
          >
            {channel !== 'Calls' ? `Edit ${channel}` : 'Edit Call'}
          </Button>
          <Button variant="default" size="sm" radius="md" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
