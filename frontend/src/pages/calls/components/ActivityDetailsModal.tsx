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
  IconClock,
  IconCalendar,
  IconUser,
  IconPhone,
  IconMail,
  IconBuilding,
  IconTrash,
  IconNotes,
  IconBrandWhatsapp,
  IconActivity,
} from '@tabler/icons-react';
import { ActivityLogItem } from '../../../types/callLog';
import { useEmployee } from '../../../context/EmployeeContext';

interface ActivityDetailsModalProps {
  activity: ActivityLogItem | null;
  opened: boolean;
  onClose: () => void;
  onDelete: (activity: ActivityLogItem) => void;
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({
  activity,
  opened,
  onClose,
  onDelete,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { employees } = useEmployee();

  const getPerformerName = (performedBy?: string, performedById?: string | null) => {
    if (!performedBy && !performedById) return 'Staff';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(performedBy || '');
    if (!isUuid && performedBy && performedBy !== 'Staff') return performedBy;
    const emp = employees.find(
      (e) =>
        (performedBy && (e.id === performedBy || e.empCode === performedBy)) ||
        (performedById && (e.id === performedById || e.empCode === performedById))
    );
    return emp ? emp.name : (performedBy || 'Staff');
  };

  if (!activity) return null;

  const isWhatsapp = activity.type === 'whatsapp';
  const isEmail = activity.type === 'email';

  const renderStatusBadge = (st: string) => {
    const s = (st || '').toLowerCase();
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (s.includes('sent') || s.includes('replied')) {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    } else if (s.includes('follow')) {
      bg = isDark ? 'rgba(249, 115, 22, 0.16)' : '#FFF7ED';
      color = isDark ? '#FB923C' : '#C2410C';
      border = isDark ? 'rgba(249, 115, 22, 0.35)' : '#FFEDD5';
    } else if (s.includes('interest') && !s.includes('not')) {
      bg = isDark ? 'rgba(13, 148, 136, 0.16)' : '#F0FDFA';
      color = isDark ? '#2DD4BF' : '#0F766E';
      border = isDark ? 'rgba(13, 148, 136, 0.35)' : '#99F6E4';
    } else if (s.includes('fail') || s.includes('not interest') || s.includes('not intrest')) {
      bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#B91C1C';
      border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
    } else if (s.includes('draft')) {
      bg = isDark ? 'rgba(148, 163, 184, 0.16)' : '#F1F5F9';
      color = isDark ? '#CBD5E1' : '#475569';
      border = isDark ? 'rgba(148, 163, 184, 0.35)' : '#CBD5E1';
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
                  ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7')
                  : isEmail
                  ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE')
                  : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'),
                color: isWhatsapp
                  ? (isDark ? '#4ADE80' : '#16A34A')
                  : isEmail
                  ? (isDark ? '#60A5FA' : '#2563EB')
                  : (isDark ? '#FBBF24' : '#D97706'),
              }}
            >
              {isWhatsapp ? (
                <IconBrandWhatsapp size={24} stroke={2} />
              ) : isEmail ? (
                <IconMail size={24} stroke={2} />
              ) : (
                <IconActivity size={24} stroke={2} />
              )}
            </Box>
            <div>
              <Group gap="xs" align="center">
                <Text size="lg" fw={700} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {activity.activityNumber || 'Activity Details'}
                </Text>
                {renderStatusBadge(activity.status)}
              </Group>
              <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                Channel: <strong style={{ textTransform: 'capitalize' }}>{activity.type}</strong> • Type: <strong>{activity.messageType || activity.emailType || activity.activityType || 'Standard'}</strong>
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            <Tooltip label="Delete Record" withArrow>
              <ActionIcon
                variant="subtle"
                color="red"
                size="lg"
                radius="md"
                onClick={() => onDelete(activity)}
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
                  {activity.contactName || '—'}
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
                  {activity.customerName || (activity.metadata as any)?.companyName || '—'}
                </Text>
              </div>
            </Group>

            {/* Phone or Email */}
            {isEmail ? (
              <Group gap="sm" align="flex-start" wrap="nowrap">
                <IconMail size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
                <div>
                  <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                    Email Address
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                    {activity.email || (activity.metadata as any)?.email || '—'}
                  </Text>
                </div>
              </Group>
            ) : (
              <Group gap="sm" align="flex-start" wrap="nowrap">
                <IconPhone size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
                <div>
                  <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                    Phone / WhatsApp Number
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                    {activity.phoneNumber || activity.phone || (activity.metadata as any)?.phoneNumber || (activity.metadata as any)?.phone || '—'}
                  </Text>
                </div>
              </Group>
            )}

            {/* Performed / Sent By */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconUser size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  Logged / Sent By
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {getPerformerName(activity.performedBy, activity.performedById)}
                </Text>
              </div>
            </Group>

            {/* Activity Date */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconCalendar size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  Date
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {activity.activityDate || '—'}
                </Text>
              </div>
            </Group>

            {/* Activity Time */}
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <IconClock size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
              <div>
                <Text size="11px" fw={600} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                  Time
                </Text>
                <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {activity.activityTime || '—'}
                </Text>
              </div>
            </Group>

            {/* Next Follow-up Date (if any) */}
            {activity.nextFollowDate && (
              <Group gap="sm" align="flex-start" wrap="nowrap" style={{ gridColumn: '1 / -1' }}>
                <IconCalendar size={18} color={isDark ? '#F59E0B' : '#D97706'} style={{ marginTop: 2 }} />
                <div>
                  <Text size="11px" fw={600} style={{ color: isDark ? '#FBBF24' : '#D97706', textTransform: 'uppercase' }}>
                    Next Follow-up Date
                  </Text>
                  <Text size="sm" fw={700} style={{ color: isDark ? '#FDE68A' : '#B45309' }}>
                    {activity.nextFollowDate}
                  </Text>
                </div>
              </Group>
            )}
          </SimpleGrid>
        </Box>

        {/* Description / Message Content / Notes */}
        {activity.description && (
          <Box>
            <Group gap="xs" mb={6}>
              <IconNotes size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text size="xs" fw={700} style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
                Activity Description & Notes
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
              {activity.description}
            </Box>
          </Box>
        )}

        {/* Modal Footer */}
        <Group justify="flex-end" pt="xs">
          <Button variant="default" radius="md" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

