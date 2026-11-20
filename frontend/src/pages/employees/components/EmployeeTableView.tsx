import React from 'react';
import {
  Table,
  Group,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Box,
  Paper,
  Stack,
  Avatar,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconUserCheck,
  IconUserX,
  IconMail,
  IconPhone,
  IconCalendar,
  IconId,
} from '@tabler/icons-react';
import { Employee, EmployeeStatus } from '../../../types/employee';

interface EmployeeTableViewProps {
  employees: Employee[];
  onViewDetails: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: EmployeeStatus) => void;
}

export const EmployeeTableView: React.FC<EmployeeTableViewProps> = ({
  employees,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  // Format dates cleanly like "08 Oct 2026"
  const formatJoiningDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusDisplay = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('ACT') || s.includes('LIVE') || s === '' || !status) {
      return {
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
        color: isDark ? '#34D399' : '#059669',
        border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
        dot: '#10B981',
        label: 'LIVE',
      };
    }
    if (s.includes('INACT') || s.includes('RELIEV') || s.includes('TERM') || s.includes('NOTIC')) {
      return {
        bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
        color: isDark ? '#F87171' : '#DC2626',
        border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
        dot: '#EF4444',
        label: 'INACTIVE',
      };
    }
    if (s.includes('PROB')) {
      return {
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
        color: isDark ? '#FBBF24' : '#D97706',
        border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
        dot: '#F59E0B',
        label: 'PROBATION',
      };
    }
    return {
      bg: isDark ? '#1E293B' : '#F8FAFC',
      color: isDark ? '#94A3B8' : '#475569',
      border: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
      dot: '#94A3B8',
      label: status || 'ACTIVE',
    };
  };

  const tableBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9';
  const thColor = isDark ? '#94A3B8' : '#64748B';
  const nameColor = isDark ? '#F8FAFC' : '#0F172A';
  const emailColor = isDark ? '#818CF8' : '#4F46E5';
  const subtextColor = isDark ? '#CBD5E1' : '#334155';
  const dimmedColor = isDark ? '#94A3B8' : '#64748B';
  const trHoverBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC';

  return (
    <>
      {/* DESKTOP / TABLET SCROLLABLE TABLE */}
      <Box visibleFrom="sm" style={{ width: '100%' }}>
        <Table.ScrollContainer minWidth={860}>
          <Table verticalSpacing="lg" horizontalSpacing="md" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <Table.Thead>
              <Table.Tr style={{ borderBottom: `1px solid ${tableBorder}` }}>
                <Table.Th style={{ color: thColor, fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '14px' }}>
                  NAME
                </Table.Th>
                <Table.Th style={{ color: thColor, fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '14px' }}>
                  OFFICIAL EMAIL
                </Table.Th>
                <Table.Th style={{ color: thColor, fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '14px' }}>
                  CONTACT
                </Table.Th>
                <Table.Th style={{ color: thColor, fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '14px' }}>
                  ROLE
                </Table.Th>
                <Table.Th style={{ color: thColor, fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '14px' }}>
                  EMP ID
                </Table.Th>
                <Table.Th style={{ color: thColor, fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '14px' }}>
                  STATUS
                </Table.Th>
                <Table.Th style={{ color: thColor, fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '14px' }}>
                  JOINING
                </Table.Th>
                <Table.Th style={{ color: thColor, fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '14px', textAlign: 'right' }}>
                  ACTIONS
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {employees.map((emp) => {
                const statusConfig = getStatusDisplay(emp.status);
                const s = (emp.status || '').toUpperCase().trim();
                const isInactive = s.includes('INACT') || s.includes('RELIEV') || s.includes('TERM') || s.includes('NOTIC');
                const isActive = !isInactive;

                return (
                  <Table.Tr
                    key={emp.id}
                    style={{
                      borderBottom: `1px solid ${tableBorder}`,
                      transition: 'background-color 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => onEdit(emp)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = trHoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* 1. NAME */}
                    <Table.Td style={{ padding: '16px 12px' }}>
                      <Text fw={700} size="14px" style={{ color: nameColor }}>
                        {emp.name}
                      </Text>
                    </Table.Td>

                    {/* 2. OFFICIAL EMAIL */}
                    <Table.Td style={{ padding: '16px 12px' }}>
                      <Text
                        size="13px"
                        fw={500}
                        style={{
                          color: emailColor,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {emp.email}
                      </Text>
                    </Table.Td>

                    {/* 3. CONTACT */}
                    <Table.Td style={{ padding: '16px 12px' }}>
                      <Text size="13px" fw={500} style={{ color: subtextColor }}>
                        {emp.phone || '—'}
                      </Text>
                    </Table.Td>

                    {/* 4. ROLE */}
                    <Table.Td style={{ padding: '16px 12px' }}>
                      {emp.role ? (
                        <Badge
                          variant="filled"
                          radius="xl"
                          size="md"
                          style={{
                            backgroundColor: isDark ? '#1E293B' : '#EEF2F6',
                            color: isDark ? '#CBD5E1' : '#475569',
                            fontWeight: 600,
                            fontSize: '12px',
                            textTransform: 'none',
                            padding: '4px 12px',
                            boxShadow: 'none',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
                          }}
                        >
                          {emp.role}
                        </Badge>
                      ) : (
                        <Text size="13px" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>

                    {/* 5. EMP ID */}
                    <Table.Td style={{ padding: '16px 12px' }}>
                      <Text size="13px" fw={500} style={{ color: subtextColor, letterSpacing: '0.02em' }}>
                        {emp.empCode}
                      </Text>
                    </Table.Td>

                    {/* 6. STATUS */}
                    <Table.Td style={{ padding: '16px 12px' }}>
                      <Badge
                        variant="outline"
                        radius="xl"
                        size="md"
                        leftSection={
                          <Box
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: statusConfig.dot,
                              marginRight: 4,
                            }}
                          />
                        }
                        style={{
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.color,
                          borderColor: statusConfig.border,
                          fontWeight: 700,
                          fontSize: '11px',
                          letterSpacing: '0.04em',
                          padding: '4px 10px',
                        }}
                      >
                        {statusConfig.label}
                      </Badge>
                    </Table.Td>

                    {/* 7. JOINING */}
                    <Table.Td style={{ padding: '16px 12px' }}>
                      <Text size="13px" fw={500} style={{ color: dimmedColor }}>
                        {formatJoiningDate(emp.joiningDate)}
                      </Text>
                    </Table.Td>

                    {/* 8. INLINE ACTIONS */}
                    <Table.Td style={{ padding: '16px 12px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <Group gap={6} justify="flex-end" wrap="nowrap">
                        {/* 1. Edit Action */}
                        <Tooltip label="Edit Employee" withArrow position="top">
                          <ActionIcon
                            variant="subtle"
                            size="32px"
                            radius="md"
                            onClick={() => onEdit(emp)}
                            style={{
                              backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF',
                              color: isDark ? '#38BDF8' : '#0284C7',
                              border: isDark ? '1px solid rgba(14, 165, 233, 0.3)' : '1px solid #BAE6FD',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <IconEdit size={16} stroke={1.8} />
                          </ActionIcon>
                        </Tooltip>

                        {/* 2. Status Toggle Action */}
                        <Tooltip
                          label={isActive ? 'Mark as Inactive' : 'Mark as Active'}
                          withArrow
                          position="top"
                        >
                          <ActionIcon
                            variant="subtle"
                            size="32px"
                            radius="md"
                            onClick={() => onStatusChange(emp.id, isActive ? 'Inactive' : 'Active')}
                            style={{
                              backgroundColor: isActive
                                ? isDark
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : '#FFFBEB'
                                : isDark
                                ? 'rgba(16, 185, 129, 0.15)'
                                : '#F0FDF4',
                              color: isActive
                                ? isDark
                                  ? '#FBBF24'
                                  : '#D97706'
                                : isDark
                                ? '#34D399'
                                : '#16A34A',
                              border: isActive
                                ? isDark
                                  ? '1px solid rgba(245, 158, 11, 0.3)'
                                  : '1px solid #FDE68A'
                                : isDark
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : '1px solid #BBF7D0',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isActive ? (
                              <IconUserX size={16} stroke={1.8} />
                            ) : (
                              <IconUserCheck size={16} stroke={1.8} />
                            )}
                          </ActionIcon>
                        </Tooltip>

                        {/* 3. Delete Action */}
                        <Tooltip label="Delete Employee" withArrow position="top">
                          <ActionIcon
                            variant="subtle"
                            size="32px"
                            radius="md"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${emp.name}?`)) {
                                onDelete(emp.id);
                              }
                            }}
                            style={{
                              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                              color: isDark ? '#F87171' : '#DC2626',
                              border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #FECACA',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <IconTrash size={16} stroke={1.8} />
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
      </Box>

      {/* MOBILE / SMALL SCREEN RESPONSIVE CARD VIEW */}
      <Stack hiddenFrom="sm" gap="sm" style={{ width: '100%' }}>
        {employees.map((emp) => {
          const statusConfig = getStatusDisplay(emp.status);
          const s = (emp.status || '').toUpperCase().trim();
          const isInactive = s.includes('INACT') || s.includes('RELIEV') || s.includes('TERM') || s.includes('NOTIC');
          const isActive = !isInactive;

          return (
            <Paper
              key={emp.id}
              p="sm"
              radius="14px"
              style={{
                background: isDark ? '#111827' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
                cursor: 'pointer',
              }}
              onClick={() => onEdit(emp)}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs">
                <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <Avatar
                    radius="md"
                    size="md"
                    color="blue"
                    styles={{
                      placeholder: {
                        background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                        color: '#FFF',
                        fontWeight: 700,
                      },
                    }}
                  >
                    {(emp.name || 'E').charAt(0).toUpperCase()}
                  </Avatar>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} size="sm" truncate style={{ color: nameColor }}>
                      {emp.name}
                    </Text>
                    <Group gap={6} align="center">
                      <IconId size={12} color="#94A3B8" />
                      <Text size="xs" c="dimmed">
                        {emp.empCode}
                      </Text>
                    </Group>
                  </Box>
                </Group>

                <Badge
                  variant="outline"
                  radius="xl"
                  size="xs"
                  style={{
                    backgroundColor: statusConfig.bg,
                    color: statusConfig.color,
                    borderColor: statusConfig.border,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {statusConfig.label}
                </Badge>
              </Group>

              {/* Details Rows */}
              <Stack gap={4} mb="xs">
                {emp.role && (
                  <Group gap={6} wrap="nowrap">
                    <Badge variant="light" size="xs" color="gray" radius="sm">
                      {emp.role}
                    </Badge>
                  </Group>
                )}
                <Group gap={6} wrap="nowrap">
                  <IconMail size={13} color={emailColor} style={{ flexShrink: 0 }} />
                  <Text size="xs" truncate style={{ color: emailColor }}>
                    {emp.email}
                  </Text>
                </Group>
                {emp.phone && (
                  <Group gap={6} wrap="nowrap">
                    <IconPhone size={13} color="#64748B" style={{ flexShrink: 0 }} />
                    <Text size="xs" c="dimmed">
                      {emp.phone}
                    </Text>
                  </Group>
                )}
                {emp.joiningDate && (
                  <Group gap={6} wrap="nowrap">
                    <IconCalendar size={13} color="#64748B" style={{ flexShrink: 0 }} />
                    <Text size="xs" c="dimmed">
                      Joined: {formatJoiningDate(emp.joiningDate)}
                    </Text>
                  </Group>
                )}
              </Stack>

              {/* Action Buttons */}
              <Group justify="flex-end" gap={8} pt="xs" style={{ borderTop: `1px solid ${tableBorder}` }} onClick={(e) => e.stopPropagation()}>
                <ActionIcon
                  variant="light"
                  size="sm"
                  color="blue"
                  radius="md"
                  onClick={() => onEdit(emp)}
                >
                  <IconEdit size={14} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  size="sm"
                  color={isActive ? 'orange' : 'teal'}
                  radius="md"
                  onClick={() => onStatusChange(emp.id, isActive ? 'Inactive' : 'Active')}
                >
                  {isActive ? <IconUserX size={14} /> : <IconUserCheck size={14} />}
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  size="sm"
                  color="red"
                  radius="md"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete ${emp.name}?`)) {
                      onDelete(emp.id);
                    }
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </>
  );
};
