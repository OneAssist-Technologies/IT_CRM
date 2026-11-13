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
  IconBrandWhatsapp,
  IconTrash,
  IconEye,
  IconUser,
  IconBuilding,
  IconCalendar,
  IconClock,
  IconPhone,
  IconPlus,
} from '@tabler/icons-react';
import { ActivityLogItem } from '../../../types/callLog';
import { useEmployee } from '../../../context/EmployeeContext';

interface WhatsAppTableViewProps {
  items: ActivityLogItem[];
  onViewDetails: (item: ActivityLogItem) => void;
  onDelete: (item: ActivityLogItem) => void;
  onAddNew: () => void;
  loading?: boolean;
}

export const WhatsAppTableView: React.FC<WhatsAppTableViewProps> = ({
  items,
  onViewDetails,
  onDelete,
  onAddNew,
  loading = false,
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

  const renderStatusBadge = (statusVal?: string | null) => {
    const st = (statusVal || 'Msg Sent').trim();
    const sLow = st.toLowerCase();
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (sLow.includes('sent') || sLow.includes('replied')) {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    } else if (sLow.includes('follow')) {
      bg = isDark ? 'rgba(249, 115, 22, 0.16)' : '#FFF7ED';
      color = isDark ? '#FB923C' : '#C2410C';
      border = isDark ? 'rgba(249, 115, 22, 0.35)' : '#FFEDD5';
    } else if (sLow.includes('interest') && !sLow.includes('not')) {
      bg = isDark ? 'rgba(13, 148, 136, 0.16)' : '#F0FDFA';
      color = isDark ? '#2DD4BF' : '#0F766E';
      border = isDark ? 'rgba(13, 148, 136, 0.35)' : '#99F6E4';
    } else if (sLow.includes('fail') || sLow.includes('not interest') || sLow.includes('not intrest')) {
      bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#B91C1C';
      border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
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

  const renderMessageTypeBadge = (type?: string) => {
    const t = type || 'Outgoing';
    return (
      <Group gap={6} wrap="nowrap">
        <Box
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
            color: isDark ? '#4ADE80' : '#16A34A',
          }}
        >
          <IconBrandWhatsapp size={14} />
        </Box>
        <Text size="12px" fw={600} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
          {t}
        </Text>
      </Group>
    );
  };

  if (!loading && items.length === 0) {
    return (
      <Paper
        p="xl"
        radius="lg"
        style={{
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
        }}
      >
        <Center py={40}>
          <Stack align="center" gap="sm">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#4ADE80' : '#16A34A',
              }}
            >
              <IconBrandWhatsapp size={32} />
            </Box>
            <Text fw={700} size="lg" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
              No WhatsApp Activity Found
            </Text>
            <Text size="sm" c="dimmed" ta="center" style={{ maxWidth: 360 }}>
              There are no recorded WhatsApp communications matching your filter criteria. Log messages from contact updates or directly here.
            </Text>
            <Button
              mt="xs"
              leftSection={<IconPlus size={16} />}
              onClick={onAddNew}
              radius="md"
              style={{
                background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                color: '#FFFFFF',
              }}
            >
              Log WhatsApp Message
            </Button>
          </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <Paper
      radius="lg"
      style={{
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
        overflow: 'hidden',
      }}
    >
      <Box style={{ overflowX: 'auto' }}>
        <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
          <Table.Thead
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
            }}
          >
            <Table.Tr>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', letterSpacing: '0.04em' }}>
                ACTIVITY ID
              </Table.Th>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', letterSpacing: '0.04em' }}>
                TYPE
              </Table.Th>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', letterSpacing: '0.04em' }}>
                CONTACT / COMPANY
              </Table.Th>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', letterSpacing: '0.04em' }}>
                WHATSAPP NO.
              </Table.Th>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', letterSpacing: '0.04em' }}>
                LOGGED BY
              </Table.Th>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', letterSpacing: '0.04em' }}>
                DATE & TIME
              </Table.Th>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', letterSpacing: '0.04em' }}>
                STATUS
              </Table.Th>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', letterSpacing: '0.04em', textAlign: 'right' }}>
                ACTIONS
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => {
              const company = item.customerName || (item.metadata as any)?.companyName || '';
              const phone = item.phoneNumber || item.phone || (item.metadata as any)?.phoneNumber || (item.metadata as any)?.phone || '—';

              return (
                <Table.Tr
                  key={item.id}
                  style={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onClick={() => onViewDetails(item)}
                >
                  {/* Activity ID */}
                  <Table.Td>
                    <Text size="xs" fw={700} style={{ color: isDark ? '#4ADE80' : '#16A34A', fontFamily: 'monospace' }}>
                      {item.activityNumber || `WA-${item.id.slice(0, 6)}`}
                    </Text>
                  </Table.Td>

                  {/* Message Type */}
                  <Table.Td>{renderMessageTypeBadge(item.messageType)}</Table.Td>

                  {/* Contact & Company */}
                  <Table.Td>
                    <Stack gap={2}>
                      <Group gap={6} wrap="nowrap">
                        <IconUser size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                        <Text size="xs" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          {item.contactName || 'Contact'}
                        </Text>
                      </Group>
                      {company && (
                        <Group gap={6} wrap="nowrap">
                          <IconBuilding size={12} color={isDark ? '#64748B' : '#94A3B8'} />
                          <Text size="11px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                            {company}
                          </Text>
                        </Group>
                      )}
                    </Stack>
                  </Table.Td>

                  {/* Phone */}
                  <Table.Td>
                    <Group gap={5} wrap="nowrap">
                      <IconPhone size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                      <Text size="xs" fw={500} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                        {phone}
                      </Text>
                    </Group>
                  </Table.Td>

                  {/* Performed By */}
                  <Table.Td>
                    <Text size="xs" fw={500} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                      {getPerformerName(item.performedBy, item.performedById)}
                    </Text>
                  </Table.Td>

                  {/* Date & Time */}
                  <Table.Td>
                    <Stack gap={2}>
                      <Group gap={5} wrap="nowrap">
                        <IconCalendar size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                        <Text size="xs" fw={600} style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          {item.activityDate || '—'}
                        </Text>
                      </Group>
                      <Group gap={5} wrap="nowrap">
                        <IconClock size={11} color={isDark ? '#64748B' : '#94A3B8'} />
                        <Text size="11px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                          {item.activityTime || '10:00 AM'}
                        </Text>
                      </Group>
                    </Stack>
                  </Table.Td>

                  {/* Status Badge + Next Follow */}
                  <Table.Td>
                    <Stack gap={3} align="flex-start">
                      {renderStatusBadge(item.status)}
                      {item.nextFollowDate && (
                        <Text size="10px" fw={600} style={{ color: isDark ? '#FBBF24' : '#D97706' }}>
                          Follow: {item.nextFollowDate}
                        </Text>
                      )}
                    </Stack>
                  </Table.Td>

                  {/* Actions */}
                  <Table.Td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <Group gap="xs" justify="flex-end">
                      <Tooltip label="View Details" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="sm"
                          radius="md"
                          onClick={() => onViewDetails(item)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          radius="md"
                          onClick={() => onDelete(item)}
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
      </Box>
    </Paper>
  );
};

