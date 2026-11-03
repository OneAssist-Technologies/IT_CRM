import React, { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Button,
  TextInput,
  Select,
  Table,
  ActionIcon,
  Tooltip,
  LoadingOverlay,
  Box,
  Pagination,
  Grid,
  ThemeIcon,
  Menu,
  useComputedColorScheme,
  Card,
  Divider,
  Badge,
  Modal,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconPlus,
  IconSearch,
  IconPrinter,
  IconEdit,
  IconCash,
  IconX,
  IconRefresh,
  IconFileInvoice,
  IconSend,
  IconEye,
  IconDotsVertical,
  IconDownload,
  IconFileCheck,
  IconAlertCircle,
  IconArrowUpRight,
  IconFilter,
  IconFilterOff,
  IconArrowLeft,
  IconReceipt2,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Invoice } from '../../types/billing';
import { billingService } from '../../services/billingService';
import { InvoiceStatusBadge, PaymentStatusBadge } from './components/InvoiceStatusBadge';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { CancelInvoiceModal } from './components/CancelInvoiceModal';
import { SendInvoiceModal } from './components/SendInvoiceModal';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { InvoiceDocument } from '../billing/components/InvoiceDocument';
import { BillingSettings } from '../../types/billing';
import { useInvoicePdfDownload } from '../../hooks/useInvoicePdfDownload';

interface InvoicesPageProps {
  onCreateNew: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({
  onCreateNew,
  onViewInvoice,
  onEditInvoice,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<Date | null>(null);
  const [dueDateFilter, setDueDateFilter] = useState<Date | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('10');
  const [totalCount, setTotalCount] = useState(0);

  // Modal targets
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [recordPaymentOpened, setRecordPaymentOpened] = useState(false);
  const [cancelModalOpened, setCancelModalOpened] = useState(false);
  const [sendModalOpened, setSendModalOpened] = useState(false);
  const [printModalOpened, setPrintModalOpened] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<BillingSettings | null>(null);

  const { triggerDownload, HiddenInvoiceDownloadContainer } = useInvoicePdfDownload();

  useEffect(() => {
    billingService.getSettings().then(setSettings).catch(() => {});
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const queryParams: any = {
        search: search.trim() || undefined,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        invoiceDate: invoiceDateFilter ? invoiceDateFilter.toISOString().split('T')[0] : undefined,
        dueDate: dueDateFilter ? dueDateFilter.toISOString().split('T')[0] : undefined,
        page,
        limit: parseInt(pageSize, 10),
      };

      const res = await billingService.getInvoices(queryParams);

      if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as any).data)) {
        setInvoices((res as any).data);
        if ((res as any).pagination) {
          setTotalCount((res as any).pagination.total || (res as any).data.length);
        } else {
          setTotalCount((res as any).data.length);
        }
      } else if (Array.isArray(res)) {
        setInvoices(res);
        setTotalCount(res.length);
      } else {
        setInvoices([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to load invoices' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, paymentStatusFilter, invoiceDateFilter, dueDateFilter, page, pageSize]);

  // Live update listener
  useEffect(() => {
    const handleUpdated = () => {
      fetchInvoices();
    };
    window.addEventListener('crm_invoices_updated', handleUpdated);
    return () => {
      window.removeEventListener('crm_invoices_updated', handleUpdated);
    };
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchInvoices();
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setPaymentStatusFilter('All');
    setInvoiceDateFilter(null);
    setDueDateFilter(null);
    setPage(1);
  };

  // Summary Metrics
  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.status !== 'Cancelled' ? Number(inv.grandTotal || 0) : 0), 0);
  const totalCollected = invoices.reduce((acc, inv) => acc + Number(inv.amountPaid || 0), 0);
  const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.status !== 'Cancelled' ? Number(inv.outstandingBalance || 0) : 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = invoices.filter((i) => i.dueDate < todayStr && i.outstandingBalance > 0 && i.status !== 'Cancelled').length;



  return (
    <Box pb={60}>
      {/* 1. Header Bar */}
      <Group justify="space-between" align="center" mb="lg">
        <Box>
          <Group gap="xs" align="center">
            <Title order={2} fw={800} style={{ letterSpacing: '-0.02em' }}>
              Invoices
            </Title>
            <Badge size="lg" color="blue" variant="light" radius="sm">
              {totalCount} Total
            </Badge>
          </Group>
          <Text size="xs" c="dimmed" mt={2}>
            Manage, generate, send, and track payments for client tax invoices with GST compliance
          </Text>
        </Box>

        <Group gap="xs">
          <Tooltip label="Refresh invoices">
            <ActionIcon variant="default" size="lg" radius="md" onClick={fetchInvoices} loading={loading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>

          <Button
            color="blue"
            size="md"
            radius="md"
            leftSection={<IconPlus size={18} />}
            onClick={onCreateNew}
            styles={{
              root: {
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
              },
            }}
          >
            Create Invoice
          </Button>
        </Group>
      </Group>

      {/* 2. Top Summary KPI Cards */}
      <Grid gutter="md" mb="lg">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" radius="md" withBorder style={{ background: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF' }}>
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                  Total Invoiced
                </Text>
                <Text size="xl" fw={900} c={isDark ? '#FFFFFF' : '#0F172A'} mt={4}>
                  ₹{totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </Text>
              </Box>
              <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                <IconFileInvoice size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" radius="md" withBorder style={{ background: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF' }}>
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                  Total Collected
                </Text>
                <Text size="xl" fw={900} c="teal" mt={4}>
                  ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </Text>
              </Box>
              <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                <IconCash size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" radius="md" withBorder style={{ background: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF' }}>
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                  Balance Due
                </Text>
                <Text size="xl" fw={900} c="orange" mt={4}>
                  ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </Text>
              </Box>
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <IconReceipt2 size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" radius="md" withBorder style={{ background: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF' }}>
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                  Overdue Invoices
                </Text>
                <Text size="xl" fw={900} c={overdueCount > 0 ? 'red' : 'dimmed'} mt={4}>
                  {overdueCount} {overdueCount === 1 ? 'Invoice' : 'Invoices'}
                </Text>
              </Box>
              <ThemeIcon size="lg" radius="md" color="red" variant="light">
                <IconAlertCircle size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* 3. Search and Filters Bar */}
      <Paper p="md" radius="md" withBorder mb="lg" style={{ background: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF' }}>
        <Grid gutter="sm" align="flex-end">
          <Grid.Col span={{ base: 12, md: 3.5 }}>
            <TextInput
              placeholder="Search by invoice #, customer name, GSTIN..."
              leftSection={<IconSearch size={16} />}
              rightSection={
                search ? (
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => {
                      setSearch('');
                      fetchInvoices();
                    }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <Select
              label="Invoice Status"
              data={['All', 'Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled']}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val || 'All');
                setPage(1);
              }}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <Select
              label="Payment Status"
              data={['All', 'Unpaid', 'Partially Paid', 'Paid', 'Overdue']}
              value={paymentStatusFilter}
              onChange={(val) => {
                setPaymentStatusFilter(val || 'All');
                setPage(1);
              }}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <DateInput
              label="Invoice Date"
              placeholder="Filter by date"
              clearable
              value={invoiceDateFilter}
              onChange={(d) => {
                setInvoiceDateFilter(d);
                setPage(1);
              }}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <DateInput
              label="Due Date"
              placeholder="Filter by due date"
              clearable
              value={dueDateFilter}
              onChange={(d) => {
                setDueDateFilter(d);
                setPage(1);
              }}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 'auto', md: 0.5 }}>
            <Tooltip label="Reset all filters">
              <ActionIcon
                variant="light"
                color="gray"
                size="input-sm"
                h={36}
                w={36}
                radius="md"
                onClick={handleClearFilters}
              >
                <IconFilterOff size={16} />
              </ActionIcon>
            </Tooltip>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* 4. Invoices Data Table */}
      <Paper radius="md" withBorder style={{ position: 'relative', overflow: 'hidden', background: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF' }}>
        <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />

        <Box style={{ overflowX: 'auto' }}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover style={{ minWidth: 1100, fontSize: 13 }}>
            <Table.Thead style={{ background: isDark ? 'var(--mantine-color-dark-6)' : '#F8FAFC' }}>
              <Table.Tr>
                <Table.Th style={{ width: 140 }}>Invoice Number</Table.Th>
                <Table.Th style={{ minWidth: 200 }}>Customer Name</Table.Th>
                <Table.Th style={{ width: 110 }}>Invoice Date</Table.Th>
                <Table.Th style={{ width: 110 }}>Due Date</Table.Th>
                <Table.Th style={{ width: 110, textAlign: 'right' }}>Subtotal</Table.Th>
                <Table.Th style={{ width: 100, textAlign: 'right' }}>Tax Amount</Table.Th>
                <Table.Th style={{ width: 120, textAlign: 'right' }}>Grand Total</Table.Th>
                <Table.Th style={{ width: 110, textAlign: 'right' }}>Amount Paid</Table.Th>
                <Table.Th style={{ width: 120, textAlign: 'right' }}>Balance Due</Table.Th>
                <Table.Th style={{ width: 110, textAlign: 'center' }}>Invoice Status</Table.Th>
                <Table.Th style={{ width: 110, textAlign: 'center' }}>Payment Status</Table.Th>
                <Table.Th style={{ width: 120, textAlign: 'center' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {invoices.length > 0 ? (
                invoices.map((inv) => {
                  const sym = inv.currency === 'USD' ? '$' : inv.currency === 'EUR' ? '€' : '₹';
                  const isOverdue = inv.dueDate < todayStr && inv.outstandingBalance > 0 && inv.status !== 'Cancelled' && inv.status !== 'Paid';

                  return (
                    <Table.Tr key={inv.id}>
                      {/* Invoice Number */}
                      <Table.Td>
                        <Text
                          size="xs"
                          fw={800}
                          c="blue"
                          style={{ cursor: 'pointer', letterSpacing: '-0.01em' }}
                          onClick={() => onViewInvoice(inv)}
                        >
                          {inv.invoiceNumber}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {inv.invoiceType || 'One-Time'}
                        </Text>
                      </Table.Td>

                      {/* Customer Name */}
                      <Table.Td>
                        <Text size="xs" fw={700} c={isDark ? '#FFFFFF' : '#0F172A'}>
                          {inv.companyName || inv.contactName}
                        </Text>
                        {inv.contactPerson && inv.contactPerson !== inv.companyName && (
                          <Text size="11px" c="dimmed">
                            Attn: {inv.contactPerson}
                          </Text>
                        )}
                        {inv.clientGst && (
                          <Text size="10px" c="dimmed">
                            GST: {inv.clientGst}
                          </Text>
                        )}
                      </Table.Td>

                      {/* Invoice Date */}
                      <Table.Td style={{ whiteSpace: 'nowrap' }}>
                        <Text size="xs" fw={500}>
                          {inv.invoiceDate}
                        </Text>
                      </Table.Td>

                      {/* Due Date */}
                      <Table.Td style={{ whiteSpace: 'nowrap' }}>
                        <Text size="xs" fw={isOverdue ? 800 : 500} c={isOverdue ? '#DC2626' : undefined}>
                          {inv.dueDate}
                        </Text>
                        {isOverdue && (
                          <Text size="10px" fw={700} c="red">
                            Overdue
                          </Text>
                        )}
                      </Table.Td>

                      {/* Subtotal */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={600}>
                          {sym}{Number(inv.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      {/* Tax Amount */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" c="dimmed">
                          {sym}{Number(inv.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      {/* Grand Total */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={800} c="#0284C7">
                          {sym}{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      {/* Amount Paid */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={700} c="teal">
                          {sym}{Number(inv.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      {/* Balance Due */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text
                          size="xs"
                          fw={900}
                          c={inv.outstandingBalance === 0 ? 'teal' : isOverdue ? 'red' : 'orange'}
                        >
                          {sym}{Number(inv.outstandingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      {/* Invoice Status */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        <InvoiceStatusBadge status={inv.status} size="xs" />
                      </Table.Td>

                      {/* Payment Status */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        <PaymentStatusBadge status={inv.paymentStatus || (inv.outstandingBalance === 0 ? 'Paid' : 'Unpaid')} size="xs" />
                      </Table.Td>

                      {/* Actions */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={4} justify="center" wrap="nowrap">
                          <Tooltip label="View Invoice (Full Screen & PDF)">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setAutoPrint(false);
                                setPrintModalOpened(true);
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Download PDF">
                            <ActionIcon
                              variant="subtle"
                              color="indigo"
                              size="sm"
                              onClick={() => triggerDownload(inv)}
                            >
                              <IconDownload size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Print Tax Invoice">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setAutoPrint(false);
                                setPrintModalOpened(true);
                              }}
                            >
                              <IconPrinter size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Menu position="bottom-end" shadow="md" width={180}>
                            <Menu.Target>
                              <ActionIcon variant="subtle" color="gray" size="sm">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<IconEye size={14} />}
                                onClick={() => onViewInvoice(inv)}
                              >
                                View Details
                              </Menu.Item>

                              <Menu.Item
                                leftSection={<IconPrinter size={14} />}
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setAutoPrint(false);
                                  setPrintModalOpened(true);
                                }}
                              >
                                View / Print Invoice
                              </Menu.Item>

                              {inv.status === 'Draft' && (
                                <Menu.Item
                                  leftSection={<IconEdit size={14} />}
                                  onClick={() => onEditInvoice(inv)}
                                >
                                  Edit Invoice
                                </Menu.Item>
                              )}

                              <Menu.Item
                                leftSection={<IconDownload size={14} />}
                                onClick={() => triggerDownload(inv)}
                              >
                                Download PDF
                              </Menu.Item>

                              {inv.status !== 'Cancelled' && (
                                <Menu.Item
                                  leftSection={<IconSend size={14} />}
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setSendModalOpened(true);
                                  }}
                                >
                                  Send Invoice
                                </Menu.Item>
                              )}

                              {inv.outstandingBalance > 0 && inv.status !== 'Cancelled' && (
                                <Menu.Item
                                  leftSection={<IconCash size={14} />}
                                  color="teal"
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setRecordPaymentOpened(true);
                                  }}
                                >
                                  Record Payment
                                </Menu.Item>
                              )}

                              {inv.status !== 'Cancelled' && inv.status !== 'Paid' && (
                                <>
                                  <Menu.Divider />
                                  <Menu.Item
                                    leftSection={<IconX size={14} />}
                                    color="red"
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      setCancelModalOpened(true);
                                    }}
                                  >
                                    Cancel Invoice
                                  </Menu.Item>
                                </>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={12} style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Stack align="center" gap="xs">
                      <IconFileInvoice size={36} color="gray" style={{ opacity: 0.5 }} />
                      <Text size="sm" fw={600} c="dimmed">
                        No invoices match the selected criteria.
                      </Text>
                      <Button variant="light" size="xs" onClick={onCreateNew} leftSection={<IconPlus size={14} />}>
                        Create First Invoice
                      </Button>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Box>

        {/* 5. Pagination Bar */}
        <Box p="md" style={{ borderTop: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : '#E2E8F0'}` }}>
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Showing {invoices.length} of {totalCount} records
              </Text>
              <Select
                size="xs"
                w={80}
                data={['10', '25', '50']}
                value={pageSize}
                onChange={(val) => {
                  setPageSize(val || '10');
                  setPage(1);
                }}
              />
              <Text size="xs" c="dimmed">per page</Text>
            </Group>

            <Pagination
              value={page}
              onChange={setPage}
              total={Math.ceil(totalCount / parseInt(pageSize, 10)) || 1}
              size="sm"
              radius="md"
            />
          </Group>
        </Box>
      </Paper>

      {/* Action Modals */}
      <RecordPaymentModal
        opened={recordPaymentOpened}
        onClose={() => setRecordPaymentOpened(false)}
        invoice={selectedInvoice}
        onSuccess={fetchInvoices}
      />

      <CancelInvoiceModal
        opened={cancelModalOpened}
        onClose={() => setCancelModalOpened(false)}
        invoice={selectedInvoice}
        onSuccess={fetchInvoices}
      />

      <SendInvoiceModal
        opened={sendModalOpened}
        onClose={() => setSendModalOpened(false)}
        invoice={selectedInvoice}
        onSuccess={fetchInvoices}
      />

      {/* Full-Screen Invoice Document Viewer, Print & PDF Modal */}
      <InvoicePrintModal
        opened={printModalOpened || Boolean(viewingInvoice)}
        onClose={() => {
          setPrintModalOpened(false);
          setViewingInvoice(null);
          setAutoPrint(false);
        }}
        invoice={selectedInvoice || viewingInvoice}
        autoPrint={autoPrint}
      />

      {/* Hidden PDF Generation Container */}
      {HiddenInvoiceDownloadContainer}
    </Box>
  );
};
