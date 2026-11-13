import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  Text,
  Badge,
  Group,
  Button,
  ActionIcon,
  Tooltip,
  Skeleton,
  Stack,
  ThemeIcon,
  Menu,
  UnstyledButton,
  Loader,
  ScrollArea,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconFileSpreadsheet,
  IconEye,
  IconTrash,
  IconUserCheck,
  IconUserX,
  IconUserPlus,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { ImportBatch } from '../../../types/contact';
import { useEmployee } from '../../../context/EmployeeContext';
import { useCRM } from '../../../context/CRMContext';
import { usePermissions } from '../../../context/AccessControlContext';
import contactService from '../../../services/contactService';

export interface BulkImportHistoryTableProps {
  batches: ImportBatch[];
  loading: boolean;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasPrev?: boolean;
    hasNext?: boolean;
  };
  onPageChange: (newPage: number) => void;
  onSelectBatch: (batch: ImportBatch) => void;
  onDeleteBatch?: (batch: ImportBatch) => void;
  onBatchUpdated?: (updatedBatch: ImportBatch) => void;
}

export const BulkImportHistoryTable: React.FC<BulkImportHistoryTableProps> = ({
  batches,
  loading,
  pagination,
  onPageChange,
  onSelectBatch,
  onDeleteBatch,
  onBatchUpdated,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { employees, fetchEmployees } = useEmployee();
  const { currentUser } = useCRM();
  const { isSuperAdmin } = usePermissions();

  const [assigningBatchId, setAssigningBatchId] = useState<string | null>(null);
  const [localBatches, setLocalBatches] = useState<ImportBatch[]>(batches);

  useEffect(() => {
    setLocalBatches(batches);
  }, [batches]);

  useEffect(() => {
    if (!employees || employees.length === 0) {
      fetchEmployees();
    }
  }, []);

  const handleAssignOwner = async (batch: ImportBatch, targetId: string | null) => {
    try {
      setAssigningBatchId(batch.batchId);
      const res = await contactService.assignImportBatch(batch.batchId, targetId);
      if (res.success && res.batch) {
        setLocalBatches((prev) =>
          prev.map((b) => (b.batchId === batch.batchId ? { ...b, ...res.batch } : b))
        );
        notifications.show({
          title: 'Owner Assigned',
          message:
            res.message ||
            (res.batch.assignedToName
              ? `Assigned to ${res.batch.assignedToName} successfully.`
              : 'Batch unassigned.'),
          color: 'teal',
        });
        onBatchUpdated?.(res.batch);
      }
    } catch (err: any) {
      console.error('Error assigning owner to batch:', err);
      notifications.show({
        title: 'Assignment Failed',
        message: err.message || 'Could not assign owner to batch.',
        color: 'red',
      });
    } finally {
      setAssigningBatchId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const totalRecords = pagination.total || batches.length || 0;
  const startRecord = totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, totalRecords);

  return (
    <Box>
      <Paper
        radius="16px"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 4px 20px rgba(0, 112, 243, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box style={{ overflowX: 'auto', width: '100%', minHeight: 160 }}>
          <Table
            verticalSpacing="sm"
            horizontalSpacing="md"
            highlightOnHover
            style={{
              minWidth: 750,
              borderCollapse: 'separate',
              borderSpacing: 0,
            }}
          >
            <Table.Thead
              style={{
                background: isDark ? '#0F172A' : '#F8FAFC',
                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Table.Tr style={{ height: 44 }}>
                <Table.Th
                  style={{
                    color: isDark ? '#94A3B8' : '#64748B',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    minWidth: 260,
                  }}
                >
                  FILE NAME
                </Table.Th>
                <Table.Th
                  style={{
                    color: isDark ? '#94A3B8' : '#64748B',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    width: 120,
                    textAlign: 'center',
                  }}
                >
                  IMPORTED
                </Table.Th>
                <Table.Th
                  style={{
                    color: isDark ? '#94A3B8' : '#64748B',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    minWidth: 160,
                  }}
                >
                  UPLOAD DATE
                </Table.Th>
                <Table.Th
                  style={{
                    color: isDark ? '#94A3B8' : '#64748B',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    minWidth: 150,
                  }}
                >
                  ASSIGNED OWNER
                </Table.Th>
                <Table.Th
                  style={{
                    color: isDark ? '#94A3B8' : '#64748B',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    width: 140,
                    textAlign: 'center',
                  }}
                >
                  ACTIONS
                </Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <Skeleton height={20} width="80%" radius="sm" />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={20} width={40} mx="auto" radius="sm" />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={20} width={120} radius="sm" />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={20} width={90} radius="sm" />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={20} width={70} mx="auto" radius="sm" />
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : localBatches.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Stack align="center" justify="center" py={40} gap="xs">
                      <ThemeIcon
                        size={48}
                        radius="xl"
                        style={{
                          backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : '#E0F2FE',
                          color: '#0284C7',
                        }}
                      >
                        <IconFileSpreadsheet size={24} />
                      </ThemeIcon>
                      <Text fw={600} size="sm" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        No Import Batches Found
                      </Text>
                      <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                        Upload your first CSV or Excel file using the "Import CSV" button above.
                      </Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                localBatches.map((batch) => (
                  <Table.Tr
                    key={batch.batchId || batch.id}
                    onClick={() => onSelectBatch(batch)}
                    style={{
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      borderBottom: isDark
                        ? '1px solid rgba(255, 255, 255, 0.05)'
                        : '1px solid #F1F5F9',
                    }}
                  >
                    {/* 1. File Name only */}
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <ThemeIcon
                          size={32}
                          radius="md"
                          style={{
                            backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#E0F2FE',
                            color: '#0284C7',
                            flexShrink: 0,
                          }}
                        >
                          <IconFileSpreadsheet size={18} stroke={1.8} />
                        </ThemeIcon>
                        <Text
                          fw={700}
                          size="13px"
                          style={{
                            color: isDark ? '#F8FAFC' : '#0F172A',
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {batch.fileName || 'bulk_contacts.csv'}
                        </Text>
                      </Group>
                    </Table.Td>

                    {/* 2. Successfully Imported */}
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Badge
                        variant="light"
                        color="teal"
                        size="sm"
                        radius="md"
                        styles={{
                          root: {
                            fontWeight: 700,
                            fontSize: 12,
                            padding: '0 8px',
                            height: 22,
                          },
                        }}
                      >
                        {batch.importedCount || 0}
                      </Badge>
                    </Table.Td>

                    {/* 3. Upload Date */}
                    <Table.Td>
                      <Group gap={5} wrap="nowrap">
                        <IconCalendar size={13} style={{ color: isDark ? '#64748B' : '#94A3B8' }} />
                        <Text size="12.5px" style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
                          {formatDate(batch.createdAt)}
                        </Text>
                      </Group>
                    </Table.Td>

                    {/* 4. Assigned Owner with Quick Assign Menu (Super Admin Only) */}
                    <Table.Td
                      style={{ minWidth: 160, whiteSpace: 'nowrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isSuperAdmin ? (
                        <Tooltip
                          label={`Imported & Assigned to ${batch.assignedToName || batch.createdBy || 'Assigned'}`}
                          withArrow
                          position="top"
                        >
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
                              },
                            }}
                          >
                            <IconUserCheck size={12} stroke={2.2} />
                            <span>{batch.assignedToName || batch.createdBy || 'Assigned'}</span>
                          </Badge>
                        </Tooltip>
                      ) : (
                        <Menu
                          shadow="lg"
                          width={250}
                          position="bottom-start"
                          radius="md"
                          withinPortal
                        >
                          <Menu.Target>
                            <Tooltip
                              label={
                                (batch.assignedToName || batch.createdBy)
                                  ? `Assigned to ${batch.assignedToName || batch.createdBy} (Click to change)`
                                  : 'Click to assign owner'
                              }
                              withArrow
                              position="top"
                            >
                              <UnstyledButton
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  transition: 'transform 0.12s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.03)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                {assigningBatchId === batch.batchId ? (
                                  <Badge
                                    radius="xl"
                                    styles={{
                                      root: {
                                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                                        color: isDark ? '#94A3B8' : '#64748B',
                                        padding: '4px 10px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                      },
                                    }}
                                  >
                                    <Loader size={12} color="blue" />
                                    Assigning...
                                  </Badge>
                                ) : (
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
                                    <span>{batch.assignedToName || batch.createdBy || 'Super Admin'}</span>
                                    <IconChevronDown size={11} stroke={2} style={{ opacity: 0.7 }} />
                                  </Badge>
                                )}
                              </UnstyledButton>
                            </Tooltip>
                          </Menu.Target>

                        <Menu.Dropdown p="xs" onClick={(e) => e.stopPropagation()}>
                          <Menu.Label>ASSIGNED OWNER</Menu.Label>

                          {/* 1. Assign to Me / Assigned for Me option */}
                          <Menu.Item
                            leftSection={<IconUserCheck size={15} color="#0284C7" stroke={2.2} />}
                            rightSection={
                              (currentUser?.name &&
                                batch.assignedToName &&
                                batch.assignedToName.toLowerCase() === currentUser.name.toLowerCase()) ||
                              (currentUser?.id && batch.assignedTo === currentUser.id) ? (
                                <Badge size="xs" color="teal" variant="light">
                                  Current
                                </Badge>
                              ) : undefined
                            }
                            onClick={() => handleAssignOwner(batch, 'me')}
                          >
                            <Box>
                              <Text size="13px" fw={600} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                                Assigned for Me
                              </Text>
                              <Text size="11px" c="dimmed">
                                {currentUser?.name ? `${currentUser.name} (You)` : 'Assign to currently logged-in account'}
                              </Text>
                            </Box>
                          </Menu.Item>

                          <Menu.Divider />
                          <Menu.Label>EMPLOYEES LIST</Menu.Label>

                          <ScrollArea.Autosize mah={200} type="scroll">
                            {employees && employees.length > 0 ? (
                              employees.map((emp) => {
                                const isCurrent =
                                  batch.assignedTo === emp.id ||
                                  batch.assignedTo === emp.empCode ||
                                  (batch.assignedToName &&
                                    batch.assignedToName.toLowerCase() === emp.name.toLowerCase());
                                return (
                                  <Menu.Item
                                    key={emp.id}
                                    leftSection={
                                      <IconUserCheck
                                        size={14}
                                        color={isCurrent ? '#10B981' : undefined}
                                      />
                                    }
                                    rightSection={
                                      isCurrent ? (
                                        <Badge size="xs" color="teal" variant="light">
                                          Current
                                        </Badge>
                                      ) : undefined
                                    }
                                    onClick={() => handleAssignOwner(batch, emp.id)}
                                  >
                                    <Box>
                                      <Text size="13px" fw={isCurrent ? 700 : 500}>
                                        {emp.name}
                                      </Text>
                                      {(emp.designation || emp.department || emp.empCode) && (
                                        <Text size="10.5px" c="dimmed">
                                          {[emp.designation, emp.empCode ? `(${emp.empCode})` : '']
                                            .filter(Boolean)
                                            .join(' ')}
                                        </Text>
                                      )}
                                    </Box>
                                  </Menu.Item>
                                );
                              })
                            ) : (
                              <Menu.Item disabled>No employees available</Menu.Item>
                            )}
                          </ScrollArea.Autosize>

                          {batch.assignedToName && (
                            <>
                              <Menu.Divider />
                              <Menu.Item
                                color="red"
                                leftSection={<IconUserX size={14} />}
                                onClick={() => handleAssignOwner(batch, null)}
                              >
                                <Text size="12.5px" fw={600}>
                                  Unassign Owner
                                </Text>
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                      )}
                    </Table.Td>

                    {/* 5. Actions */}
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Group gap={6} justify="center" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="xs"
                          variant="light"
                          color="blue"
                          radius="md"
                          leftSection={<IconEye size={13} />}
                          onClick={() => onSelectBatch(batch)}
                          styles={{
                            root: {
                              fontSize: 11.5,
                              fontWeight: 600,
                              height: 28,
                              padding: '0 9px',
                            },
                          }}
                        >
                          View Details
                        </Button>
                        {onDeleteBatch && isSuperAdmin && (
                          <Tooltip label="Delete Batch & Records" position="top" withArrow>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              radius="md"
                              onClick={() => onDeleteBatch(batch)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Box>

        {/* Integrated Pagination Footer docked at the bottom of the Card */}
        <Box
          p="sm"
          style={{
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
            backgroundColor: isDark ? '#0F172A' : '#FAFCFF',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap">
            <Text size="13px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              Showing {startRecord} to {endRecord} of {totalRecords} import batches
            </Text>

            <Group gap={6} align="center">
              {/* Previous */}
              <Button
                variant="default"
                size="xs"
                radius="md"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                leftSection={<IconChevronLeft size={13} />}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Previous
              </Button>

              {/* Page number pill */}
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
                {pagination.page}
              </Box>

              <Text size="12px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                of {pagination.totalPages || 1}
              </Text>

              {/* Next */}
              <Button
                variant="default"
                size="xs"
                radius="md"
                disabled={pagination.page >= (pagination.totalPages || 1)}
                onClick={() => onPageChange(pagination.page + 1)}
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
        </Box>
      </Paper>
    </Box>
  );
};
