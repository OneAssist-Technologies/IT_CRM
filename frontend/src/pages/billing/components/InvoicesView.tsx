import React, { useState, useEffect } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Button,
  TextInput,
  Select,
  Table,
  ActionIcon,
  Tooltip,
  LoadingOverlay,
  Box,
  Center,
  Badge,
  Divider,
  Modal,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconPrinter,
  IconDownload,
  IconEdit,
  IconCash,
  IconX,
  IconRefresh,
  IconFileInvoice,
  IconEye,
  IconArrowLeft,
  IconUpload,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Invoice, BillingSettings } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import { useInvoicePdfDownload } from '../../../hooks/useInvoicePdfDownload';
import { InvoiceModal } from './InvoiceModal';
import { InvoicePrintModal } from './InvoicePrintModal';
import { InvoiceDocument } from './InvoiceDocument';
import { CancelInvoiceModal } from './CancelInvoiceModal';
import { APP_LOGO_URL } from '../../../config/env';

interface InvoicesViewProps {
  onAddNew?: () => void;
  onRecordPayment?: (invoice: Invoice) => void;
  initialOrderId?: string;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  onAddNew,
  onRecordPayment,
  initialOrderId,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals State
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [isImportModal, setIsImportModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);

  const { triggerDownload, HiddenInvoiceDownloadContainer } = useInvoicePdfDownload();

  useEffect(() => {
    billingService.getSettings().then(setSettings).catch(() => {});
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await billingService.getInvoices({
        search: search.trim() || undefined,
        status: statusFilter,
        salesOrderId: initialOrderId || undefined,
      });
      const invoiceList = Array.isArray(data) ? data : ((data as any)?.data || []);
      setInvoices(invoiceList);
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to load invoices' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, initialOrderId]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchInvoices();
    }
  };

  const renderStatusBadge = (status: string, dueDate: string, balance: number) => {
    const isOverdue = new Date(dueDate) < new Date() && balance > 0 && status !== 'Cancelled' && status !== 'Paid';
    if (isOverdue) {
      return (
        <Box
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 12px',
            borderRadius: 100,
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2',
            color: isDark ? '#FCA5A5' : '#DC2626',
            border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #FECACA',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.02em',  
            whiteSpace: 'nowrap',
          }}
        >
          Overdue
        </Box>
      );
    }

    const sLow = status.toLowerCase();
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (sLow === 'paid') {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    } else if (sLow === 'partially paid') {
      bg = isDark ? 'rgba(245, 158, 11, 0.14)' : '#FFFBEB';
      color = isDark ? '#FCD34D' : '#B45309';
      border = isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A';
    } else if (sLow === 'issued') {
      bg = isDark ? 'rgba(79, 70, 229, 0.16)' : '#EEF2FF';
      color = isDark ? '#818CF8' : '#4F46E5';
      border = isDark ? 'rgba(79, 70, 229, 0.35)' : '#C7D2FE';
    } else if (sLow === 'cancelled') {
      bg = isDark ? 'rgba(148, 163, 184, 0.16)' : '#F1F5F9';
      color = isDark ? '#CBD5E1' : '#475569';
      border = isDark ? 'rgba(148, 163, 184, 0.35)' : '#E2E8F0';
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
        {status}
      </Box>
    );
  };

  const handleOpenCreate = () => {
    setIsImportModal(false);
    setEditingInvoice(null);
    setModalKey((k) => k + 1);
    setCreateModalOpened(true);
  };

  const handleOpenImport = () => {
    setIsImportModal(true);
    setEditingInvoice(null);
    setModalKey((k) => k + 1);
    setCreateModalOpened(true);
  };

  return (
    <Stack gap="md">
      {/* 1. Filter Toolbar matching CallLogs / Contacts */}
      <Paper
        p="sm"
        radius="lg"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="xs" wrap="wrap" style={{ flex: 1 }}>
            <TextInput
              placeholder="Search by invoice #, client, company..."
              leftSection={<IconSearch size={15} color={isDark ? '#94A3B8' : '#64748B'} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              onKeyDown={handleSearchKeyDown}
              size="sm"
              radius="md"
              style={{ minWidth: 260 }}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              }}
            />
            <Select
              placeholder="All Statuses"
              data={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Issued', label: 'Issued' },
                { value: 'Partially Paid', label: 'Partially Paid' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Overdue', label: 'Overdue' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v || 'All')}
              size="sm"
              radius="md"
              style={{ width: 140 }}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              }}
            />
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="md"
              onClick={fetchInvoices}
              title="Refresh Invoices"
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Group>

          <Group gap="xs">
            <Button
              leftSection={<IconUpload size={15} />}
              radius="md"
              size="sm"
              variant="light"
              color="indigo"
              onClick={handleOpenImport}
              style={{ fontWeight: 600, fontSize: 13, height: 36 }}
            >
              Import Invoice
            </Button>

            <Button
              leftSection={<IconPlus size={16} stroke={2.5} />}
              radius="md"
              size="sm"
              onClick={onAddNew || handleOpenCreate}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 13,
                height: 36,
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                border: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Create Tax Invoice
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* 2. Table Container matching CallLogTableView */}
      <Paper
        radius="lg"
        style={{
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
          position: 'relative',
        }}
      >
        <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />

        {invoices.length === 0 && !loading ? (
          <Center p="3.5rem">
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
                <IconFileInvoice size={32} stroke={1.8} />
              </Box>
              <Text fw={700} size="lg" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                No Tax Invoices Found
              </Text>
              <Text size="sm" c="dimmed" style={{ maxWidth: 420, textAlign: 'center' }}>
                No tax invoices match your filter criteria. Click below to generate an invoice.
              </Text>
              <Button
                mt="xs"
                radius="md"
                leftSection={<IconFileInvoice size={16} />}
                onClick={onAddNew || handleOpenCreate}
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                }}
              >
                + Create Tax Invoice
              </Button>
            </Stack>
          </Center>
        ) : (
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
                    INVOICE NUMBER
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    CLIENT / COMPANY
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    ISSUE DATE
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    DUE DATE
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                    TOTAL AMOUNT
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                    PAID AMOUNT
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                    BALANCE DUE
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    STATUS
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                    ACTIONS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {invoices.map((inv) => {
                  const initialLetter = (inv.contactName || 'C').charAt(0).toUpperCase();

                  return (
                    <Table.Tr key={inv.id}>
                      {/* Invoice Number */}
                      <Table.Td>
                        <Text
                          fw={700}
                          size="sm"
                          style={{
                            color: isDark ? '#818CF8' : '#4F46E5',
                            cursor: 'pointer',
                          }}
                          onClick={() => setPrintingInvoice(inv)}
                        >
                          {inv.invoiceNumber}
                        </Text>
                        {inv.milestoneName && (
                          <Text size="11px" c="dimmed">
                            Phase: {inv.milestoneName}
                          </Text>
                        )}
                      </Table.Td>

                      {/* Client / Company with Avatar Box */}
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
                          <div>
                            <Text fw={700} size="sm" style={{ color: isDark ? '#F9FAFB' : '#0F172A' }}>
                              {inv.contactName}
                            </Text>
                            {inv.companyName && (
                              <Text size="xs" c="dimmed">
                                {inv.companyName}
                              </Text>
                            )}
                          </div>
                        </Group>
                      </Table.Td>

                      {/* Issue Date */}
                      <Table.Td>
                        <Text size="xs" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </Table.Td>

                      {/* Due Date */}
                      <Table.Td>
                        <Text
                          size="xs"
                          fw={new Date(inv.dueDate) < new Date() && inv.outstandingBalance > 0 ? 700 : 500}
                          style={{
                            color: new Date(inv.dueDate) < new Date() && inv.outstandingBalance > 0 ? '#EF4444' : isDark ? '#94A3B8' : '#64748B',
                          }}
                        >
                          {new Date(inv.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </Table.Td>

                      {/* Total */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text fw={700} size="sm" style={{ color: isDark ? '#F9FAFB' : '#0F172A' }}>
                          ₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      {/* Paid */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text fw={600} size="sm" style={{ color: isDark ? '#10B981' : '#047857' }}>
                          ₹{Number(inv.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      {/* Balance */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text
                          fw={800}
                          size="sm"
                          style={{
                            color: inv.outstandingBalance > 0 ? '#EF4444' : '#10B981',
                          }}
                        >
                          ₹{Number(inv.outstandingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      {/* Status */}
                      <Table.Td>{renderStatusBadge(inv.status, inv.dueDate, inv.outstandingBalance)}</Table.Td>

                      {/* Actions */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={6} justify="flex-end" wrap="nowrap">
                          <Tooltip label="View Invoice">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              radius="md"
                              size="sm"
                              onClick={() => setViewingInvoice(inv)}
                              title="View Invoice"
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Download PDF">
                            <ActionIcon
                              variant="subtle"
                              color="indigo"
                              radius="md"
                              size="sm"
                              onClick={() => triggerDownload(inv)}
                              title="Download PDF"
                            >
                              <IconDownload size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Print Tax Invoice">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              radius="md"
                              size="sm"
                              onClick={() => {
                                setAutoPrint(false);
                                setPrintingInvoice(inv);
                              }}
                              title="Print Invoice"
                            >
                              <IconPrinter size={16} />
                            </ActionIcon>
                          </Tooltip>

                          {inv.status !== 'Paid' && inv.status !== 'Cancelled' && onRecordPayment && (
                            <Tooltip label="Record Payment for Invoice">
                              <ActionIcon
                                variant="subtle"
                                color="teal"
                                radius="md"
                                size="sm"
                                onClick={() => onRecordPayment(inv)}
                              >
                                <IconCash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}

                          {inv.status !== 'Cancelled' && inv.amountPaid === 0 && (
                            <Tooltip label="Cancel Invoice">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                radius="md"
                                size="sm"
                                onClick={() => setCancellingInvoice(inv)}
                              >
                                <IconX size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}

                          {inv.status !== 'Cancelled' && inv.status !== 'Paid' && (
                            <Tooltip label="Edit Invoice">
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                radius="md"
                                size="sm"
                                onClick={() => {
                                  setEditingInvoice(inv);
                                  setModalKey((k) => k + 1);
                                  setCreateModalOpened(true);
                                }}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* Modals */}
      <InvoiceModal
        key={createModalOpened ? (editingInvoice ? `edit-${editingInvoice.id}-${modalKey}` : `fresh-${modalKey}`) : 'closed'}
        opened={createModalOpened}
        isImport={isImportModal}
        onClose={() => {
          setCreateModalOpened(false);
          setIsImportModal(false);
          setEditingInvoice(null);
        }}
        invoice={editingInvoice}
        defaultSalesOrderId={initialOrderId}
        onSuccess={fetchInvoices}
      />

      <InvoicePrintModal
        opened={Boolean(printingInvoice)}
        onClose={() => {
          setPrintingInvoice(null);
          setAutoPrint(false);
        }}
        invoice={printingInvoice}
        autoPrint={autoPrint}
      />

      <CancelInvoiceModal
        opened={Boolean(cancellingInvoice)}
        onClose={() => setCancellingInvoice(null)}
        invoice={cancellingInvoice}
        onSuccess={fetchInvoices}
      />

      {/* Invoice View Popup Modal */}
      <Modal
        opened={Boolean(viewingInvoice)}
        onClose={() => setViewingInvoice(null)}
        size="960px"
        radius="16px"
        centered
        withCloseButton={false}
        padding={0}
        overlayProps={{
          backgroundOpacity: 0.6,
          blur: 5,
        }}
        styles={{
          content: {
            overflow: 'hidden',
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderRadius: 16,
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          },
          body: {
            padding: 0,
          },
        }}
      >
        {viewingInvoice && (
          <Box>
            {/* Modal Top Header - Completely Flush */}
            <Box
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group gap="sm" align="center" wrap="nowrap">
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                    border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #C7D2FE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={APP_LOGO_URL}
                    alt="OneAssist"
                    style={{ width: 18, height: 18, objectFit: 'contain' }}
                  />
                </Box>
                <Text fw={800} size="md" c={isDark ? '#FFFFFF' : '#0F172A'} style={{ whiteSpace: 'nowrap' }}>
                  Invoice #{viewingInvoice.invoiceNumber}
                </Text>
                {renderStatusBadge(viewingInvoice.status, viewingInvoice.dueDate, viewingInvoice.outstandingBalance)}
              </Group>

              <Group gap="xs" align="center" wrap="nowrap">
                <Button
                  size="xs"
                  variant="filled"
                  color="indigo"
                  leftSection={<IconDownload size={14} />}
                  onClick={() => triggerDownload(viewingInvoice)}
                  style={{
                    background: '#4F46E5',
                    fontWeight: 600,
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                  }}
                >
                  Download PDF
                </Button>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  radius="md"
                  onClick={() => setViewingInvoice(null)}
                >
                  <IconX size={18} />
                </ActionIcon>
              </Group>
            </Box>

            {/* Modal Body with Scrollable Invoice Preview */}
            <Box
              style={{
                maxHeight: 'calc(88vh - 75px)',
                overflowY: 'auto',
                padding: '24px 20px 40px 20px',
                display: 'flex',
                justifyContent: 'center',
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
              }}
            >
              <Box
                style={{
                  width: '100%',
                  maxWidth: 880,
                  boxShadow: isDark
                    ? '0 8px 30px rgba(0,0,0,0.35)'
                    : '0 8px 30px rgba(15,23,42,0.06)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <InvoiceDocument invoice={viewingInvoice} settings={settings} />
              </Box>
            </Box>
          </Box>
        )}
      </Modal>

      {/* Hidden PDF Generation Container */}
      {HiddenInvoiceDownloadContainer}
    </Stack>
  );
};
