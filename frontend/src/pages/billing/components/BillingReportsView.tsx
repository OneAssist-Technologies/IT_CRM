import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Button,
  TextInput,
  Table,
  Badge,
  LoadingOverlay,
  Box,
  SimpleGrid,
  Progress,
  Divider,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconChartBar,
  IconClock,
  IconReceiptTax,
  IconUsers,
  IconPrinter,
  IconRefresh,
  IconDownload,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { BillingReportsData } from '../../../types/billing';
import { billingService } from '../../../services/billingService';

export const BillingReportsView: React.FC = () => {
  const isDark = useComputedColorScheme('light') === 'dark';
  const [data, setData] = useState<BillingReportsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await billingService.getReports({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setData(res);
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to load billing reports' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const aging = data?.agingSummary || {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOverdue: 0,
  };

  const tax = data?.taxSummary || {
    totalTaxableAmount: 0,
    totalTaxAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
  };

  const totalAgingBuckets =
    aging.current + aging.days1_30 + aging.days31_60 + aging.days61_90 + aging.days90Plus || 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Stack gap="md" style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />

      {/* Date Filter & Actions */}
      <Paper p="md" withBorder radius="md">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="sm" wrap="wrap">
            <MeetingDatePicker
              label="From Date"
              placeholder="DD-MM-YYYY"
              value={startDate}
              onChange={(val: string) => setStartDate(val)}
            />
            <MeetingDatePicker
              label="To Date"
              placeholder="DD-MM-YYYY"
              value={endDate}
              onChange={(val: string) => setEndDate(val)}
            />
            <Button
              variant="light"
              color="blue"
              size="xs"
              mt={20}
              leftSection={<IconRefresh size={14} />}
              onClick={fetchReports}
            >
              Apply Filter
            </Button>
          </Group>

          <Group gap="xs">
            <Button
              variant="outline"
              color="gray"
              size="xs"
              leftSection={<IconPrinter size={14} />}
              onClick={handlePrint}
            >
              Print Report
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Section 1: Accounts Receivable Aging Analysis */}
      <Paper p="md" withBorder radius="md">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconClock size={20} color="#F59E0B" />
            <Text fw={700} size="md">
              Accounts Receivable Aging Analysis
            </Text>
          </Group>
          <Text size="xs" fw={700} c="red">
            Total Overdue: ₹{aging.totalOverdue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          Breakdown of outstanding invoices categorized by days past payment due date.
        </Text>

        <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm" mb="md">
          <Paper p="sm" withBorder radius="md" style={{ borderLeft: '3px solid #10B981' }}>
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">Current (Not Due)</Text>
            <Text size="lg" fw={800} c="green">
              ₹{aging.current.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text size="10px" c="dimmed">
              {((aging.current / totalAgingBuckets) * 100).toFixed(1)}% of AR
            </Text>
          </Paper>

          <Paper p="sm" withBorder radius="md" style={{ borderLeft: '3px solid #EAB308' }}>
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">1 - 30 Days Overdue</Text>
            <Text size="lg" fw={800} c="yellow">
              ₹{aging.days1_30.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text size="10px" c="dimmed">
              {((aging.days1_30 / totalAgingBuckets) * 100).toFixed(1)}% of AR
            </Text>
          </Paper>

          <Paper p="sm" withBorder radius="md" style={{ borderLeft: '3px solid #F97316' }}>
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">31 - 60 Days Overdue</Text>
            <Text size="lg" fw={800} c="orange">
              ₹{aging.days31_60.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text size="10px" c="dimmed">
              {((aging.days31_60 / totalAgingBuckets) * 100).toFixed(1)}% of AR
            </Text>
          </Paper>

          <Paper p="sm" withBorder radius="md" style={{ borderLeft: '3px solid #EF4444' }}>
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">61 - 90 Days Overdue</Text>
            <Text size="lg" fw={800} c="red">
              ₹{aging.days61_90.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text size="10px" c="dimmed">
              {((aging.days61_90 / totalAgingBuckets) * 100).toFixed(1)}% of AR
            </Text>
          </Paper>

          <Paper p="sm" withBorder radius="md" style={{ borderLeft: '3px solid #7F1D1D' }}>
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">90+ Days (Critical)</Text>
            <Text size="lg" fw={900} c="red">
              ₹{aging.days90Plus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text size="10px" c="dimmed">
              {((aging.days90Plus / totalAgingBuckets) * 100).toFixed(1)}% of AR
            </Text>
          </Paper>
        </SimpleGrid>
      </Paper>

      {/* Section 2: Tax / GST Compliance Summary */}
      <Paper p="md" withBorder radius="md">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconReceiptTax size={20} color="#0EA5E9" />
            <Text fw={700} size="md">
              Tax & GST Compliance Summary (GSTR-1 Ready)
            </Text>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="sm" mt="sm">
          <Paper p="sm" withBorder radius="md">
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">Taxable Base Value</Text>
            <Text size="lg" fw={800}>
              ₹{tax.totalTaxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </Paper>
          <Paper p="sm" withBorder radius="md">
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">CGST (Central Tax)</Text>
            <Text size="lg" fw={800} c="blue">
              ₹{tax.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </Paper>
          <Paper p="sm" withBorder radius="md">
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">SGST (State Tax)</Text>
            <Text size="lg" fw={800} c="blue">
              ₹{tax.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </Paper>
          <Paper p="sm" withBorder radius="md">
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">IGST (Integrated Tax)</Text>
            <Text size="lg" fw={800} c="indigo">
              ₹{tax.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </Paper>
          <Paper p="sm" withBorder radius="md" style={{ background: isDark ? '#1E293B' : '#EFF6FF' }}>
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">Total GST Collected</Text>
            <Text size="lg" fw={900} c="blue">
              ₹{tax.totalTaxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </Paper>
        </SimpleGrid>
      </Paper>

      {/* Section 3: Client-Wise Outstanding Balances */}
      <Paper p="md" withBorder radius="md">
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconUsers size={20} color="#6366F1" />
            <Text fw={700} size="md">
              Client-Wise Outstanding & Collection Summary
            </Text>
          </Group>
        </Group>

        <Box style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Client Name</Table.Th>
                <Table.Th>Company</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Invoices</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Total Invoiced (₹)</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Total Paid (₹)</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Outstanding Balance (₹)</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {!data?.clientSummaries || data.clientSummaries.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                    <Text c="dimmed">No client billing transactions found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                data.clientSummaries.map((c, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <Text fw={700} size="sm">{c.clientName}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c={c.companyName ? undefined : 'dimmed'}>
                        {c.companyName || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Badge size="xs" variant="light" color="blue">
                        {c.invoiceCount}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={600}>
                        ₹{Number(c.totalInvoiced).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={600} c="green">
                        ₹{Number(c.totalPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text
                        size="sm"
                        fw={800}
                        c={c.outstandingBalance > 0 ? 'red' : 'green'}
                      >
                        ₹{Number(c.outstandingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Box>
      </Paper>
    </Stack>
  );
};
