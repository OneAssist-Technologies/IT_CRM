import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Text,
  Group,
  Button,
  ActionIcon,
  Tooltip,
  useComputedColorScheme,
  Modal,
  Table,
  Badge,
  Alert,
  ThemeIcon,
  ScrollArea,
  Stack,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconDownload,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
  IconAlertTriangle,
  IconPhone,
  IconMail,
  IconEye,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Contact, ImportBatch, FailedRowInfo } from '../../../types/contact';
import contactService from '../../../services/contactService';
import { ContactTableView } from './ContactTableView';
import { ContactModal } from './ContactModal';

export interface BatchDetailsViewProps {
  batchId: string;
  onBack: () => void;
  onViewContact: (contact: Contact) => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (contact: Contact) => void;
  onQualifyContact: (contact: Contact) => void;
  onAssignContact?: (contact: Contact) => void;
}

export const BatchDetailsView: React.FC<BatchDetailsViewProps> = ({
  batchId,
  onBack,
  onViewContact,
  onEditContact,
  onDeleteContact,
  onQualifyContact,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [batchLoading, setBatchLoading] = useState<boolean>(true);

  // Update Contact Popup Modal State
  const [updateModalOpened, setUpdateModalOpened] = useState<boolean>(false);
  const [selectedContactToUpdate, setSelectedContactToUpdate] = useState<Contact | null>(null);

  // Failed Rows Modal State
  const [failedModalOpened, setFailedModalOpened] = useState<boolean>(false);

  // Batch Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });

  // Fetch batch metadata and details
  const fetchBatchDetails = useCallback(async () => {
    try {
      setBatchLoading(true);
      const res = await contactService.getImportBatchDetails(batchId);
      if (res.success && res.batch) {
        setBatch(res.batch);
      }
    } catch (err: any) {
      console.error('Failed to fetch batch details:', err);
      notifications.show({
        title: 'Error loading batch',
        message: err.message || 'Could not retrieve batch details.',
        color: 'red',
      });
    } finally {
      setBatchLoading(false);
    }
  }, [batchId]);

  // Fetch contacts for this batch
  const fetchBatchContacts = useCallback(async () => {
    try {
      setContactsLoading(true);
      const res = await contactService.getBatchContacts(batchId, {
        page,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (res.success) {
        // Keep all contacts in the batch (including Qualified) visible with their status
        setContacts(res.data || []);
        if (res.pagination) {
          setPagination({
            total: res.pagination.total ?? 0,
            page: res.pagination.page ?? page,
            limit: res.pagination.limit ?? limit,
            totalPages: res.pagination.totalPages ?? 1,
            hasPrev: res.pagination.hasPrev ?? page > 1,
            hasNext: res.pagination.hasNext ?? page < (res.pagination.totalPages || 1),
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch batch contacts:', err);
      notifications.show({
        title: 'Error loading contacts',
        message: err.message || 'Could not retrieve contacts for this batch.',
        color: 'red',
      });
    } finally {
      setContactsLoading(false);
    }
  }, [batchId, page, limit]);

  useEffect(() => {
    fetchBatchDetails();
  }, [fetchBatchDetails]);

  useEffect(() => {
    fetchBatchContacts();
  }, [fetchBatchContacts]);

  useEffect(() => {
    const handleContactsUpdated = () => {
      fetchBatchContacts();
    };
    window.addEventListener('crm_contacts_updated', handleContactsUpdated);
    return () => {
      window.removeEventListener('crm_contacts_updated', handleContactsUpdated);
    };
  }, [fetchBatchContacts]);

  const formatDate = (dateStr?: string) => {
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

  const handleDownloadFailedReport = () => {
    if (!batch) return;
    const failedRows: FailedRowInfo[] = Array.isArray(batch.failedRows) ? batch.failedRows : [];
    if (failedRows.length === 0) {
      notifications.show({
        title: 'No Failed Rows',
        message: 'This batch has 0 failed rows.',
        color: 'teal',
      });
      return;
    }

    const headers = ['Row Number', 'Contact Name', 'Phone Number', 'Email', 'Failure Reason'];
    const rows = failedRows.map((r) => [
      r.row || '—',
      `"${String(r.name || '—').replace(/"/g, '""')}"`,
      `"${String(r.phone || '—').replace(/"/g, '""')}"`,
      `"${String(r.email || '—').replace(/"/g, '""')}"`,
      `"${String(r.reason || r.message || 'Validation error').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${batch.batchId}_failed_rows_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const startRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  const handleContactRowClick = (contact: Contact) => {
    setSelectedContactToUpdate(contact);
    setUpdateModalOpened(true);
  };

  const handleContactUpdated = (updatedContact: Contact) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === updatedContact.id ||
        c.contactId === updatedContact.id ||
        c.id === updatedContact.contactId ||
        c.contactId === updatedContact.contactId
          ? { ...c, ...updatedContact }
          : c
      )
    );
  };

  return (
    <Box>
      {/* 1. Header Toolbar & Back Navigation */}
      <Paper
        p="md"
        radius="16px"
        mb="md"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="xs">
            <Button
              variant="default"
              size="sm"
              radius="md"
              leftSection={<IconArrowLeft size={16} />}
              onClick={onBack}
              styles={{
                root: {
                  height: 36,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                  fontWeight: 600,
                  fontSize: 12.5,
                },
              }}
            >
              Back to Import History
            </Button>
            <Box ml={4}>
              <Text fw={700} size="sm" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                {batch?.fileName || 'Batch Contacts'}
              </Text>
              <Text size="11.5px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Uploaded on {formatDate(batch?.createdAt)} {batch?.createdBy ? `by ${batch.createdBy}` : ''}
              </Text>
            </Box>
          </Group>

          <Group gap="xs">
            {batch && (batch.failedCount || 0) > 0 && (
              <Button
                variant="light"
                color="red"
                size="xs"
                radius="md"
                leftSection={<IconAlertTriangle size={13} />}
                onClick={() => setFailedModalOpened(true)}
                styles={{
                  root: {
                    height: 36,
                    fontSize: 12,
                    fontWeight: 600,
                  },
                }}
              >
                Failed Rows ({batch.failedCount})
              </Button>
            )}
            <Tooltip label="Refresh Batch" position="top" withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                radius="md"
                onClick={() => {
                  fetchBatchDetails();
                  fetchBatchContacts();
                }}
                loading={batchLoading || contactsLoading}
                styles={{
                  root: {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                  },
                }}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* Failed rows alert if any */}
      {batch && (batch.failedCount || 0) > 0 && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title={`${batch.failedCount} rows failed to import`}
          color="red"
          variant="light"
          radius="md"
          mb="md"
          styles={{
            root: {
              border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #FECACA',
            },
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <Text size="sm">
              Some contacts from {batch.fileName} could not be imported due to duplicate phone numbers or formatting errors.
            </Text>
            <Button
              size="xs"
              variant="filled"
              color="red"
              radius="md"
              leftSection={<IconEye size={13} />}
              onClick={() => setFailedModalOpened(true)}
            >
              View Reasons ({batch.failedCount})
            </Button>
          </Group>
        </Alert>
      )}

      {/* Contacts Table View */}
      <Box>
          <ContactTableView
            contacts={contacts}
            activeTab="BULK_IMPORT"
            loading={contactsLoading}
            onView={handleContactRowClick}
            onRowClick={handleContactRowClick}
            onEdit={handleContactRowClick}
            onDelete={onDeleteContact}
            onAddNew={() => {}}
            onQualify={onQualifyContact}
            onTabChange={() => {}}
            onContactUpdated={handleContactUpdated}
          />

          {/* Pagination for Batch Contacts */}
          <Paper
            mt="md"
            p="md"
            radius="16px"
            style={{
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap">
              <Text size="13px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Showing {startRecord} to {endRecord} of {pagination.total} contacts in this batch
              </Text>

              <Group gap={6} align="center">
                <Button
                  variant="default"
                  size="xs"
                  radius="md"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(Math.max(1, pagination.page - 1))}
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
                  {pagination.page}
                </Box>

                <Text size="12px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  of {pagination.totalPages || 1}
                </Text>

                <Button
                  variant="default"
                  size="xs"
                  radius="md"
                  disabled={pagination.page >= (pagination.totalPages || 1)}
                  onClick={() => setPage(pagination.page + 1)}
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

        {/* Update Contact Modal Popup on row click */}
        <ContactModal
          opened={updateModalOpened}
          onClose={() => {
            setUpdateModalOpened(false);
            setSelectedContactToUpdate(null);
          }}
          contact={selectedContactToUpdate}
          title="Update contact"
          showContactMode={true}
          onSuccess={() => {
            fetchBatchContacts();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
            }
          }}
        />

        {/* Failed Rows & Reasons Modal Popup */}
        <Modal
          opened={failedModalOpened}
          onClose={() => setFailedModalOpened(false)}
          size="lg"
          radius="lg"
          padding="xl"
          centered
          styles={{
            header: {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
              padding: '16px 20px',
            },
            body: {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              padding: 20,
            },
            content: {
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
              maxWidth: 840,
            },
          }}
          title={
            <Group gap="xs">
              <ThemeIcon
                size={38}
                radius="md"
                style={{
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2',
                  color: '#EF4444',
                }}
              >
                <IconAlertTriangle size={20} stroke={2} />
              </ThemeIcon>
              <div>
                <Group gap="xs" align="center">
                  <Text fw={700} size="md" style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}>
                    Failed Rows & Reasons
                  </Text>
                  <Badge color="red" variant="light" size="sm">
                    {batch?.failedCount || (batch?.failedRows as any)?.length || 0} Failed Rows
                  </Badge>
                </Group>
                <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  {batch?.fileName || 'Uploaded file'} • Review why these contacts could not be imported
                </Text>
              </div>
            </Group>
          }
        >
          <Stack gap="md">
            <ScrollArea.Autosize mah={420} type="auto">
              <Table
                verticalSpacing="sm"
                horizontalSpacing="md"
                striped
                highlightOnHover
                styles={{
                  table: {
                    fontSize: 13,
                  },
                  th: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#94A3B8' : '#64748B',
                    fontWeight: 700,
                    fontSize: 11.5,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    borderBottom: isDark ? '1px solid #334155' : '#E2E8F0',
                  },
                  td: {
                    borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9',
                    color: isDark ? '#F1F5F9' : '#1E293B',
                  },
                }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 80, textAlign: 'center' }}>Row</Table.Th>
                    <Table.Th>Contact</Table.Th>
                    <Table.Th>Phone / Email</Table.Th>
                    <Table.Th>Failure Reason</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Array.isArray(batch?.failedRows) && batch!.failedRows.length > 0 ? (
                    batch!.failedRows.map((fRow: FailedRowInfo, idx: number) => (
                      <Table.Tr key={idx}>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Badge variant="outline" color="gray" size="sm" radius="sm">
                            Row {fRow.row || idx + 1}
                          </Badge>
                        </Table.Td>

                        <Table.Td>
                          <Text fw={600} size="sm">
                            {fRow.name || '—'}
                          </Text>
                        </Table.Td>

                        <Table.Td>
                          <Group gap={6} wrap="nowrap">
                            <IconPhone size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                            <Text size="xs" fw={500}>
                              {fRow.phone || '—'}
                            </Text>
                          </Group>
                          {fRow.email && (
                            <Group gap={6} wrap="nowrap" mt={2}>
                              <IconMail size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                              <Text size="xs" c="dimmed">
                                {fRow.email}
                              </Text>
                            </Group>
                          )}
                        </Table.Td>

                        <Table.Td>
                          <Badge
                            color="red"
                            variant="light"
                            radius="md"
                            size="md"
                            styles={{
                              root: {
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: 12,
                                padding: '6px 10px',
                                height: 'auto',
                                whiteSpace: 'normal',
                                lineHeight: 1.35,
                                textAlign: 'left',
                                display: 'inline-flex',
                                alignItems: 'flex-start',
                              },
                            }}
                          >
                            {fRow.reason || fRow.message || 'Validation error'}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={4} style={{ textAlign: 'center', padding: '24px 0' }}>
                        <Text size="sm" c="dimmed">
                          No failed row records found for this batch.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>

            {/* Footer Actions */}
            <Group justify="space-between" align="center" mt="xs" pt="xs" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #F1F5F9' }}>
              <Button
                variant="default"
                size="xs"
                radius="md"
                leftSection={<IconDownload size={14} color="#0284C7" />}
                onClick={handleDownloadFailedReport}
                styles={{
                  root: {
                    fontWeight: 600,
                    fontSize: 12,
                  },
                }}
              >
                Download CSV Report
              </Button>

              <Button
                variant="filled"
                color="blue"
                size="xs"
                radius="md"
                onClick={() => setFailedModalOpened(false)}
                styles={{
                  root: {
                    fontWeight: 600,
                    fontSize: 12,
                    paddingLeft: 18,
                    paddingRight: 18,
                  },
                }}
              >
                Close
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Box>
    );
  };
