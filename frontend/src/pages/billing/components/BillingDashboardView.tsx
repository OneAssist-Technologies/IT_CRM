import React, { useState, useEffect } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  LoadingOverlay,
  Box,
  SimpleGrid,
  Progress,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconFileInvoice,
  IconCash,
  IconReceipt2,
  IconClock,
  IconAlertTriangle,
  IconPlus,
  IconRefresh,
  IconArrowRight,
  IconPrinter,
  IconDownload,
  IconTrendingUp,
} from '@tabler/icons-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { notifications } from '@mantine/notifications';
import { BillingDashboardData, Invoice } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import { InvoicePrintModal } from './InvoicePrintModal';

interface BillingDashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenCreateQuotation: () => void;
  onOpenCreateInvoice: () => void;
  onOpenRecordPayment: () => void;
}

export const BillingDashboardView: React.FC<BillingDashboardViewProps> = ({
  onNavigateTab,
  onOpenCreateQuotation,
  onOpenCreateInvoice,
  onOpenRecordPayment,
}) => {
  const isDark = useComputedColorScheme('light') === 'dark';
  const [data, setData] = useState<BillingDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await billingService.getDashboard();
      setData(res);
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to load billing dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const kpis = data?.kpis || {
    totalInvoiced: 0,
    totalCollected: 0,
    outstandingAmount: 0,
    overdueAmount: 0,
    totalInvoicesCount: 0,
    unpaidInvoicesCount: 0,
  };

  const handlePrintUpcomingInvoice = async (invoiceId: string, autoDownload = false) => {
    try {
      setAutoPrint(autoDownload);
      const inv = await billingService.getInvoiceById(invoiceId);
      if (inv) setPrintingInvoice(inv);
    } catch (err: any) {
      notifications.show({ color: 'red', message: 'Failed to fetch invoice details' });
    }
  };

  return (
    <Stack gap="md" style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Paper
          p="md"
          withBorder
          radius="md"
          style={{
            background: isDark ? 'linear-gradient(135deg, #1E293B, #0F172A)' : 'linear-gradient(135deg, #F0F9FF, #E0F2FE)',
            borderLeft: '4px solid #0EA5E9',
          }}
        >
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                Total Invoiced
              </Text>
              <Text size="24px" fw={900} c={isDark ? '#38BDF8' : '#0284C7'} mt={4}>
                ₹{kpis.totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <Text size="11px" c="dimmed" mt={2}>
                {kpis.totalInvoicesCount} Invoices Generated
              </Text>
            </Box>
            <Box
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: isDark ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0EA5E9',
              }}
            >
              <IconFileInvoice size={24} />
            </Box>
          </Group>
        </Paper>

        <Paper
          p="md"
          withBorder
          radius="md"
          style={{
            background: isDark ? 'linear-gradient(135deg, #1E293B, #0F172A)' : 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
            borderLeft: '4px solid #10B981',
          }}
        >
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                Total Collected
              </Text>
              <Text size="24px" fw={900} c={isDark ? '#4ADE80' : '#15803D'} mt={4}>
                ₹{kpis.totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <Text size="11px" c="dimmed" mt={2}>
                {kpis.totalInvoiced > 0
                  ? `${((kpis.totalCollected / kpis.totalInvoiced) * 100).toFixed(1)}% Realization Rate`
                  : '0% Realization Rate'}
              </Text>
            </Box>
            <Box
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
              }}
            >
              <IconCash size={24} />
            </Box>
          </Group>
        </Paper>

        <Paper
          p="md"
          withBorder
          radius="md"
          style={{
            background: isDark ? 'linear-gradient(135deg, #1E293B, #0F172A)' : 'linear-gradient(135deg, #FEFCE8, #FEF9C3)',
            borderLeft: '4px solid #EAB308',
          }}
        >
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                Outstanding Receivables
              </Text>
              <Text size="24px" fw={900} c={isDark ? '#FACC15' : '#A16207'} mt={4}>
                ₹{kpis.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <Text size="11px" c="dimmed" mt={2}>
                {kpis.unpaidInvoicesCount} Pending Invoices
              </Text>
            </Box>
            <Box
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: isDark ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EAB308',
              }}
            >
              <IconClock size={24} />
            </Box>
          </Group>
        </Paper>

        <Paper
          p="md"
          withBorder
          radius="md"
          style={{
            background: isDark ? 'linear-gradient(135deg, #1E293B, #0F172A)' : 'linear-gradient(135deg, #FEF2F2, #FEE2E2)',
            borderLeft: '4px solid #EF4444',
          }}
        >
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                Overdue Amount
              </Text>
              <Text size="24px" fw={900} c={isDark ? '#F87171' : '#B91C1C'} mt={4}>
                ₹{kpis.overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <Text size="11px" c="dimmed" mt={2}>
                Immediate Attention Required
              </Text>
            </Box>
            <Box
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
              }}
            >
              <IconAlertTriangle size={24} />
            </Box>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Quick Action Shortcuts Banner */}
      <Paper p="sm" withBorder radius="md" style={{ background: isDark ? '#1E293B' : '#F8FAFC' }}>
        <Group justify="space-between" wrap="wrap">
          <Group gap="xs">
            <IconTrendingUp size={20} color="#0EA5E9" />
            <Text fw={700} size="sm">Quick Billing Actions:</Text>
          </Group>
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<IconPlus size={14} />}
              onClick={onOpenCreateQuotation}
            >
              New Quotation
            </Button>
            <Button
              size="xs"
              variant="light"
              color="indigo"
              leftSection={<IconPlus size={14} />}
              onClick={onOpenCreateInvoice}
            >
              Create Tax Invoice
            </Button>
            <Button
              size="xs"
              variant="filled"
              color="green"
              leftSection={<IconCash size={14} />}
              onClick={onOpenRecordPayment}
            >
              Record Payment
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconRefresh size={14} />}
              onClick={fetchDashboard}
            >
              Sync
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Main Grid: Monthly Trends Chart + Project Billing Progress */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {/* Monthly Billing Trends */}
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between" mb="sm">
            <Text fw={700} size="sm">
              Monthly Invoicing vs Collection Trends
            </Text>
            <Badge size="xs" variant="outline" color="blue">Last 6 Months</Badge>
          </Group>
          <Box style={{ height: 260, width: '100%' }}>
            {data?.monthlyTrends && data.monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(val: any) => `₹${Number(val).toLocaleString('en-IN')}`}
                    contentStyle={{ borderRadius: 8, fontSize: 12, background: isDark ? '#1E293B' : '#FFFFFF' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="invoiced" name="Invoiced" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Group justify="center" align="center" style={{ height: '100%' }}>
                <Text size="xs" c="dimmed">No billing data for trends yet</Text>
              </Group>
            )}
          </Box>
        </Paper>

        {/* Project Billing Progress */}
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between" mb="sm">
            <Text fw={700} size="sm">
              Project Billing Progress
            </Text>
            <Button
              variant="subtle"
              size="xs"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => onNavigateTab('contracts')}
            >
              View Contracts
            </Button>
          </Group>

          <Stack gap="xs" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {data?.projectBillingProgress && data.projectBillingProgress.length > 0 ? (
              data.projectBillingProgress.map((proj) => (
                <Paper key={proj.id} p="xs" withBorder radius="sm">
                  <Group justify="space-between" mb={4}>
                    <Box style={{ maxWidth: '60%' }}>
                      <Text fw={700} size="xs" truncate>{proj.name}</Text>
                      <Text size="10px" c="dimmed" truncate>{proj.clientName}</Text>
                    </Box>
                    <Box style={{ textAlign: 'right' }}>
                      <Text fw={700} size="xs">
                        ₹{Number(proj.totalInvoiced).toLocaleString('en-IN')} / ₹{Number(proj.contractValue).toLocaleString('en-IN')}
                      </Text>
                      <Text size="10px" c="green" fw={600}>
                        ₹{Number(proj.totalCollected).toLocaleString('en-IN')} Collected
                      </Text>
                    </Box>
                  </Group>
                  <Progress
                    value={proj.progressPercentage}
                    size="xs"
                    color={proj.progressPercentage >= 100 ? 'green' : 'blue'}
                  />
                </Paper>
              ))
            ) : (
              <Group justify="center" align="center" style={{ height: 200 }}>
                <Text size="xs" c="dimmed">No active project contracts linked</Text>
              </Group>
            )}
          </Stack>
        </Paper>
      </SimpleGrid>

      {/* Bottom Grid: Upcoming Due Invoices & Recent Payments */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {/* Upcoming Due Invoices */}
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <IconClock size={18} color="#EAB308" />
              <Text fw={700} size="sm">Upcoming Due & Overdue Invoices</Text>
            </Group>
            <Button
              variant="subtle"
              size="xs"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => onNavigateTab('invoices')}
            >
              View All
            </Button>
          </Group>

          <Table.ScrollContainer minWidth={520}>
            <Table striped highlightOnHover verticalSpacing="xs" style={{ minWidth: 520 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Invoice #</Table.Th>
                  <Table.Th>Client</Table.Th>
                  <Table.Th>Due Date</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Balance (₹)</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data?.upcomingDueInvoices && data.upcomingDueInvoices.length > 0 ? (
                  data.upcomingDueInvoices.map((inv) => (
                    <Table.Tr key={inv.id}>
                      <Table.Td>
                        <Text fw={700} size="xs" c="blue">{inv.invoiceNumber}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} size="xs" truncate>{inv.clientName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          color={inv.isOverdue ? 'red' : 'yellow'}
                          variant="light"
                        >
                          {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text fw={700} size="xs" c={inv.isOverdue ? 'red' : undefined}>
                          ₹{Number(inv.outstandingBalance).toLocaleString('en-IN')}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="Download PDF">
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="indigo"
                              onClick={() => handlePrintUpcomingInvoice(inv.id, true)}
                            >
                              <IconDownload size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Print Tax Invoice">
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="blue"
                              onClick={() => handlePrintUpcomingInvoice(inv.id, false)}
                            >
                              <IconPrinter size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                      <Text size="xs" c="dimmed">No pending due invoices</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>

        {/* Recent Payments */}
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <IconCash size={18} color="#10B981" />
              <Text fw={700} size="sm">Recent Payment Receipts</Text>
            </Group>
            <Button
              variant="subtle"
              size="xs"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => onNavigateTab('payments')}
            >
              View All
            </Button>
          </Group>

          <Table.ScrollContainer minWidth={520}>
            <Table striped highlightOnHover verticalSpacing="xs" style={{ minWidth: 520 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Payment #</Table.Th>
                  <Table.Th>Client</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Method</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Amount (₹)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data?.recentPayments && data.recentPayments.length > 0 ? (
                  data.recentPayments.map((pay) => (
                    <Table.Tr key={pay.id}>
                      <Table.Td>
                        <Text fw={700} size="xs" c="green">{pay.paymentNumber}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} size="xs" truncate>{pay.clientName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="11px">{new Date(pay.paymentDate).toLocaleDateString('en-IN')}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" variant="outline" color="blue">
                          {pay.paymentMethod}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text fw={800} size="xs" c="green">
                          ₹{Number(pay.amountReceived).toLocaleString('en-IN')}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                      <Text size="xs" c="dimmed">No payments recorded yet</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </SimpleGrid>

      {/* Invoice Print Modal */}
      <InvoicePrintModal
        opened={Boolean(printingInvoice)}
        onClose={() => {
          setPrintingInvoice(null);
          setAutoPrint(false);
        }}
        invoice={printingInvoice}
        autoPrint={autoPrint}
      />
    </Stack>
  );
};
