import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Text,
  Group,
  Stack,
  Button,
  Badge,
  Paper,
  Table,
  ThemeIcon,
  Modal,
  ActionIcon,
  Tooltip,
  Center,
  Loader,
  Divider,
  Menu,
} from '@mantine/core';
import {
  IconReceipt,
  IconPlus,
  IconArrowRight,
  IconPrinter,
  IconDownload,
  IconCheck,
  IconRefresh,
  IconClock,
  IconEye,
  IconEdit,
  IconCreditCard,
  IconFileInvoice,
  IconArrowLeft,
  IconX,
  IconCash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Lead, LeadInvoiceItem, Contract } from '../../../../types/lead';
import { leadService } from '../../../../services/leadService';
import { Invoice, BillingSettings } from '../../../../types/billing';
import { billingService } from '../../../../services/billingService';
import { useInvoicePdfDownload } from '../../../../hooks/useInvoicePdfDownload';
import { InvoiceModal } from '../../../billing/components/InvoiceModal';
import { InvoicePrintModal } from '../../../billing/components/InvoicePrintModal';
import { InvoiceDocument } from '../../../billing/components/InvoiceDocument';
import { RecordPaymentModal } from '../../../invoices/components/RecordPaymentModal';
import dayjs from 'dayjs';

export const INVOICE_STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft', color: '#64748B' },
  { value: 'Sent', label: 'Sent', color: '#3B82F6' },
  { value: 'Viewed', label: 'Viewed', color: '#8B5CF6' },
  { value: 'Partially Paid', label: 'Partially Paid', color: '#F59E0B' },
  { value: 'Paid', label: 'Paid', color: '#10B981' },
  { value: 'Overdue', label: 'Overdue', color: '#EF4444' },
  { value: 'Cancelled', label: 'Cancelled', color: '#94A3B8' },
  { value: 'Void', label: 'Void', color: '#DC2626' },
];

export interface LeadInvoiceSectionProps {
  lead: Lead;
  isDark: boolean;
  invoices?: LeadInvoiceItem[];
  onUpdateInvoices?: (invoices: LeadInvoiceItem[]) => void;
  onNavigateSection?: (section: any) => void;
}

export const LeadInvoiceSection: React.FC<LeadInvoiceSectionProps> = ({
  lead,
  isDark,
  invoices: initialInvoices = [],
  onUpdateInvoices,
  onNavigateSection,
}) => {
  // Backend dynamic data state
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [backendInvoices, setBackendInvoices] = useState<Invoice[]>([]);

  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [modalKey, setModalKey] = useState<number>(0);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [autoPrint, setAutoPrint] = useState<boolean>(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [recordPaymentOpened, setRecordPaymentOpened] = useState<boolean>(false);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    if (lead?.id) {
      leadService
        .getContracts({ leadId: lead.id, limit: 100 })
        .then((res) => {
          if (res && res.data) setContracts(res.data);
        })
        .catch(() => {});
    }
  }, [lead?.id]);

  const leadContractValue = useMemo(() => {
    if (contracts.length > 0) {
      const matched = payingInvoice
        ? contracts.find(
            (c) =>
              (payingInvoice.projectName && c.projectName?.toLowerCase() === payingInvoice.projectName.toLowerCase()) ||
              c.id === payingInvoice.projectId
          ) || contracts[0]
        : contracts[0];
      const val = Number(matched.finalContractAmount || matched.contractValue || (matched as any).totalAmount || 0);
      if (val > 0) return val;
    }
    if ((lead as any)?.dealValue) {
      return Number((lead as any).dealValue);
    }
    return payingInvoice?.grandTotal || 0;
  }, [contracts, payingInvoice, lead]);

  const { triggerDownload, HiddenInvoiceDownloadContainer } = useInvoicePdfDownload();

  useEffect(() => {
    billingService.getSettings().then(setSettings).catch(() => {});
  }, []);

  // Fetch real invoices from backend
  const fetchInvoices = useCallback(async () => {
    try {
      const invoicesRes = await billingService.getInvoices().catch(() => []);
      const invoiceList: Invoice[] = Array.isArray(invoicesRes)
        ? invoicesRes
        : Array.isArray((invoicesRes as any)?.data)
        ? (invoicesRes as any).data
        : [];
      const leadNameLower = (lead.name || '').trim().toLowerCase();
      const leadCompanyLower = (lead.companyName || '').trim().toLowerCase();

      // Filter invoices belonging to this lead
      const matching = invoiceList.filter((inv: Invoice) => {
        if (inv.contactId && (inv.contactId === lead.id || inv.contactId === lead.leadId)) {
          return true;
        }
        if (inv.contactName) {
          const c = inv.contactName.toLowerCase();
          if (leadNameLower && c.includes(leadNameLower)) return true;
        }
        if (inv.companyName) {
          const comp = inv.companyName.toLowerCase();
          if (leadCompanyLower && comp.includes(leadCompanyLower)) return true;
        }
        return false;
      });

      setBackendInvoices(matching);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lead]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Unified list of invoice items for display
  const unifiedInvoices = useMemo(() => {
    if (backendInvoices.length > 0) {
      return backendInvoices.map((inv) => {
        const pName = (inv.projectName || inv.projectTitle || '').trim();
        const rawTitle = pName || inv.items?.[0]?.itemName || inv.notes || 'IT Services Invoice';
        const mainTitle = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : 'IT Services Invoice';
        const moduleNames = (inv.items || []).map((it) => it.itemName).filter(Boolean);
        
        // Filter out duplicate or redundant module names that simply match the project title
        const filteredModules = moduleNames.filter(
          (m) =>
            m.toLowerCase().trim() !== mainTitle.toLowerCase().trim() &&
            !mainTitle.toLowerCase().startsWith(m.toLowerCase().trim())
        );

        const subtitle = filteredModules.length > 0 ? filteredModules.join(', ') : '';

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          title: mainTitle,
          subtitle,
          issueDate: inv.invoiceDate ? dayjs(inv.invoiceDate).format('DD MMM YYYY') : '—',
          dueDate: inv.dueDate ? dayjs(inv.dueDate).format('DD MMM YYYY') : '—',
          amount: inv.subtotal || 0,
          taxAmount: inv.taxAmount || 0,
          totalAmount: inv.grandTotal || 0,
          status: (inv.status || 'Draft') as any,
          type: 'Tax Invoice' as const,
          description: inv.notes || '',
          rawInvoice: inv,
        };
      });
    }

    // When no backend invoices exist for this lead, return empty list
    return [];
  }, [backendInvoices]);

  const renderStatusBadge = (status: string) => {
    const s = (status || 'Draft').toLowerCase();

    let bg = isDark ? 'rgba(148, 163, 184, 0.12)' : '#F8FAFC';
    let color = isDark ? '#94A3B8' : '#64748B';
    let border = isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0';
    let dotColor = '#94A3B8';
    let label = status || 'Draft';

    if (s === 'paid') {
      bg = isDark ? 'rgba(16, 185, 129, 0.14)' : '#ECFDF5';
      color = isDark ? '#34D399' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0';
      dotColor = '#10B981';
      label = 'Paid';
    } else if (s === 'partially paid') {
      bg = isDark ? 'rgba(245, 158, 11, 0.14)' : '#FFFBEB';
      color = isDark ? '#FBBF24' : '#B45309';
      border = isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A';
      dotColor = '#F59E0B';
      label = 'Partially Paid';
    } else if (s === 'sent') {
      bg = isDark ? 'rgba(59, 130, 246, 0.14)' : '#EFF6FF';
      color = isDark ? '#60A5FA' : '#1D4ED8';
      border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';
      dotColor = '#3B82F6';
      label = 'Sent';
    } else if (s === 'viewed') {
      bg = isDark ? 'rgba(139, 92, 246, 0.14)' : '#F5F3FF';
      color = isDark ? '#A78BFA' : '#6D28D9';
      border = isDark ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE';
      dotColor = '#8B5CF6';
      label = 'Viewed';
    } else if (s === 'overdue') {
      bg = isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2';
      color = isDark ? '#F87171' : '#B91C1C';
      border = isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA';
      dotColor = '#EF4444';
      label = 'Overdue';
    } else if (s === 'cancelled') {
      bg = isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9';
      color = isDark ? '#94A3B8' : '#475569';
      border = isDark ? 'rgba(148, 163, 184, 0.25)' : '#CBD5E1';
      dotColor = '#94A3B8';
      label = 'Cancelled';
    } else if (s === 'void') {
      bg = isDark ? 'rgba(220, 38, 38, 0.14)' : '#FEF2F2';
      color = isDark ? '#F87171' : '#991B1B';
      border = isDark ? 'rgba(220, 38, 38, 0.3)' : '#FCA5A5';
      dotColor = '#DC2626';
      label = 'Void';
    } else if (s === 'draft') {
      bg = isDark ? 'rgba(100, 116, 139, 0.14)' : '#F8FAFC';
      color = isDark ? '#94A3B8' : '#475569';
      border = isDark ? 'rgba(100, 116, 139, 0.25)' : '#E2E8F0';
      dotColor = '#64748B';
      label = 'Draft';
    } else if (s === 'unpaid' || s === 'issued' || s === 'pending') {
      bg = isDark ? 'rgba(249, 115, 22, 0.12)' : '#FFF7ED';
      color = isDark ? '#FB923C' : '#C2410C';
      border = isDark ? 'rgba(249, 115, 22, 0.25)' : '#FFEDD5';
      dotColor = '#EA580C';
      label = status || 'Unpaid';
    }

    return (
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 9999,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          boxShadow: isDark ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <Box
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />
        {label}
      </Box>
    );
  };

  const handleInvoiceSuccess = async () => {
    await fetchInvoices();
    setCreateModalOpened(false);
    setEditingInvoice(null);
    notifications.show({
      title: 'Invoice Saved',
      message: 'Tax invoice updated and live synced with billing records.',
      color: 'teal',
    });
    if (onUpdateInvoices) {
      onUpdateInvoices(backendInvoices as any);
    }
  };

  const handleStatusChange = async (inv: any, newStatus: string) => {
    try {
      setLoading(true);
      const invoiceObj = resolveInvoiceObject(inv);
      const patchData: any = { status: newStatus };
      if (newStatus === 'Paid') {
        patchData.amountPaid = invoiceObj.grandTotal;
        patchData.outstandingBalance = 0;
      } else if (newStatus === 'Issued' || newStatus === 'Unpaid') {
        patchData.status = 'Issued';
        patchData.amountPaid = 0;
        patchData.outstandingBalance = invoiceObj.grandTotal;
      }

      await billingService.updateInvoice(invoiceObj.id, patchData);

      notifications.show({
        title: 'Invoice Status Updated',
        message: `${invoiceObj.invoiceNumber} status updated to ${newStatus}.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      await fetchInvoices();
      if (onUpdateInvoices) {
        onUpdateInvoices(backendInvoices as any);
      }
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update invoice status.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRecordPayment = (inv: any) => {
    setPayingInvoice(resolveInvoiceObject(inv));
    setRecordPaymentOpened(true);
  };

  const handleQuickMarkPaid = async (inv: any) => {
    try {
      setLoading(true);
      const invoiceObj = resolveInvoiceObject(inv);
      await billingService.updateInvoice(invoiceObj.id, {
        status: 'Paid',
      });

      notifications.show({
        title: 'Invoice Paid & Live Synced',
        message: `${invoiceObj.invoiceNumber} marked as Paid. Transaction automatically logged in Payments tab.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      await fetchInvoices();
      if (onUpdateInvoices) {
        onUpdateInvoices(backendInvoices as any);
      }
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not mark invoice as Paid.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUnpaid = async (inv: any) => {
    try {
      setLoading(true);
      const invoiceObj = resolveInvoiceObject(inv);
      await billingService.updateInvoice(invoiceObj.id, {
        status: 'Issued',
        amountPaid: 0,
      });
      notifications.show({
        title: 'Invoice Status Updated',
        message: `${invoiceObj.invoiceNumber} marked as Unpaid / Issued.`,
        color: 'blue',
        icon: <IconClock size={16} />,
      });
      await fetchInvoices();
      if (onUpdateInvoices) {
        onUpdateInvoices(backendInvoices as any);
      }
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update status.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveInvoiceObject = (item: any): Invoice => {
    if (item.rawInvoice) return item.rawInvoice;
    return {
      id: item.id,
      invoiceNumber: item.invoiceNumber,
      contactName: lead.name,
      companyName: lead.companyName || undefined,
      contactEmail: lead.email || undefined,
      contactPhone: lead.phone || undefined,
      clientAddress: lead.address || undefined,
      invoiceDate: item.issueDate,
      dueDate: item.dueDate,
      subtotal: item.amount,
      discountAmount: 0,
      taxAmount: item.taxAmount,
      grandTotal: item.totalAmount,
      amountPaid: item.status === 'Paid' ? item.totalAmount : 0,
      outstandingBalance: item.status === 'Paid' ? 0 : item.totalAmount,
      status: item.status === 'Paid' ? 'Paid' : 'Issued',
      paymentTerms: 'Due within 30 days',
      notes: item.description,
      items: [
        {
          itemName: item.title,
          itemType: 'Service',
          description: item.description,
          quantity: 1,
          unitPrice: item.amount,
          discount: 0,
          taxRate: 18,
          taxAmount: item.taxAmount,
          totalAmount: item.totalAmount,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handlePrint = (item: any, autoDownload = false) => {
    setAutoPrint(autoDownload);
    setPrintingInvoice(resolveInvoiceObject(item));
  };



  const handleOpenCreateInvoice = () => {
    setEditingInvoice(null);
    setModalKey((k) => k + 1);
    setCreateModalOpened(true);
  };

  if (createModalOpened) {
    return (
      <Box p={{ base: 'xs', sm: 'sm' }}>
        <InvoiceModal
          key={createModalOpened ? (editingInvoice ? `edit-${editingInvoice.id}-${modalKey}` : `fresh-${modalKey}`) : 'closed'}
          opened={createModalOpened}
          onClose={() => {
            setCreateModalOpened(false);
            setEditingInvoice(null);
          }}
          invoice={editingInvoice}
          onSuccess={handleInvoiceSuccess}
          initialLead={lead}
          asScreen={true}
        />
      </Box>
    );
  }

  return (
    <Box>
      {/* Top Header */}
      <Group justify="space-between" align="center" mb="lg" wrap="wrap" gap="sm">
        <div>
          <Group gap="xs" align="center">
            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
              <IconFileInvoice size={20} />
            </ThemeIcon>
            <div>
              <Group gap={8} align="center">
                <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Billing & Tax Invoices
                </Text>
                <Badge size="xs" variant="light" color="blue">
                  Live Synced
                </Badge>
              </Group>
            </div>
          </Group>
        </div>

        <Group gap="xs">
          <Button
            size="sm"
            leftSection={<IconPlus size={15} />}
            onClick={handleOpenCreateInvoice}
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFF',
              borderRadius: 10,
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            Create Invoice
          </Button>

          {onNavigateSection && (
            <Button
              size="sm"
              variant="default"
              rightSection={<IconArrowRight size={15} />}
              onClick={() => onNavigateSection('payments')}
              style={{ borderRadius: 10, fontWeight: 600, borderColor: isDark ? '#374151' : '#E2E8F0' }}
            >
              Go to Payments
            </Button>
          )}
        </Group>
      </Group>

      {/* Invoices List / Table */}
      <Paper
        p="md"
        radius="16px"
        style={{
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.03)',
          overflow: 'hidden',
        }}
      >
        <Group justify="space-between" align="center" mb="sm">
          <Text fw={750} size="sm" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
            Tax Invoices
          </Text>
          <Badge size="xs" variant="light" color="blue">
            {unifiedInvoices.length} Invoice{unifiedInvoices.length === 1 ? '' : 's'}
          </Badge>
        </Group>

        {loading ? (
          <Center py="xl">
            <Loader size="sm" color="blue" />
          </Center>
        ) : unifiedInvoices.length === 0 ? (
          <Center py={40}>
            <Stack align="center" gap="xs">
              <ThemeIcon size={44} radius="xl" color="gray" variant="light">
                <IconReceipt size={22} />
              </ThemeIcon>
              <Text fw={700} size="sm" style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                No Invoices Raised Yet
              </Text>
              <Text size="xs" c="dimmed" style={{ maxWidth: 340, textAlign: 'center' }}>
                No tax invoices have been generated for {lead.name}. Click below to build a GST invoice using the full invoice generator.
              </Text>
              <Button
                size="xs"
                color="blue"
                variant="light"
                leftSection={<IconPlus size={13} />}
                onClick={handleOpenCreateInvoice}
                mt={4}
              >
                Create Tax Invoice
              </Button>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={750}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead>
                <Table.Tr style={{ borderBottom: isDark ? '1px solid #334155' : '1px solid #E2E8F0' }}>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    INVOICE #
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    TITLE / SCOPE
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    DATES
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    BASE + GST
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    TOTAL AMOUNT
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    STATUS
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, textAlign: 'right' }}>
                    ACTIONS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {unifiedInvoices.map((inv) => (
                  <Table.Tr key={inv.id} style={{ borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9' }}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <ThemeIcon size="sm" radius="md" color="blue" variant="light">
                          <IconFileInvoice size={12} />
                        </ThemeIcon>
                        <Text fw={750} size="12px" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          {inv.invoiceNumber}
                        </Text>
                      </Group>
                    </Table.Td>

                    <Table.Td>
                      <Text fw={650} size="12px" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }} lineClamp={1}>
                        {inv.title}
                      </Text>
                      {inv.subtitle && (
                        <Text size="10px" c="dimmed" lineClamp={1} mt={2}>
                          {inv.subtitle}
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td>
                      <Box>
                        <Text fw={650} size="12px" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          {inv.issueDate}
                        </Text>
                        {inv.dueDate && inv.dueDate !== '—' && (
                          <Text size="10.5px" c="dimmed" mt={2} fw={500}>
                            Due: {inv.dueDate}
                          </Text>
                        )}
                      </Box>
                    </Table.Td>

                    <Table.Td>
                      <Box>
                        <Text fw={700} size="12px" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          ₹{Number(inv.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Text size="10.5px" c="dimmed" mt={2} fw={500}>
                          + GST ₹{Number(inv.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Box>
                    </Table.Td>

                    <Table.Td>
                      <Text fw={800} size="13px" style={{ color: '#2563EB' }}>
                        ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>

                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Menu shadow="md" width={200} position="bottom-start" withinPortal radius="md">
                        <Menu.Target>
                          <Tooltip label="Click to update status" withArrow>
                            <Box style={{ display: 'inline-block', cursor: 'pointer' }}>
                              {renderStatusBadge(inv.status)}
                            </Box>
                          </Tooltip>
                        </Menu.Target>
                        <Menu.Dropdown p="xs">
                          <Menu.Label>Update Status</Menu.Label>
                          {INVOICE_STATUS_OPTIONS.map((opt) => {
                            const isSelected = (inv.status || '').toLowerCase() === opt.value.toLowerCase();
                            return (
                              <Menu.Item
                                key={opt.value}
                                leftSection={
                                  <Box
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      backgroundColor: opt.color,
                                    }}
                                  />
                                }
                                rightSection={isSelected ? <IconCheck size={14} color="#10B981" /> : undefined}
                                onClick={() => handleStatusChange(inv, opt.value)}
                                style={{
                                  fontWeight: isSelected ? 700 : 500,
                                  backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : undefined,
                                }}
                              >
                                {opt.label}
                              </Menu.Item>
                            );
                          })}
                          <Divider my={4} />
                          <Menu.Item
                            leftSection={<IconCreditCard size={14} color="#2563EB" />}
                            onClick={() => handleOpenRecordPayment(inv)}
                          >
                            <Text size="12px" fw={500}>
                              Record Custom Payment...
                            </Text>
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap={6} justify="flex-end" wrap="nowrap">
                        {inv.status !== 'Paid' && (
                          <Tooltip label="Record Payment" withArrow>
                            <ActionIcon
                              variant="light"
                              color="teal"
                              size="sm"
                              radius="md"
                              onClick={() => handleOpenRecordPayment(inv)}
                            >
                              <IconCash size={15} />
                            </ActionIcon>
                          </Tooltip>
                        )}

                        <Tooltip label="View Invoice (Full Screen & PDF)" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="sm"
                            radius="md"
                            onClick={() => {
                              setAutoPrint(false);
                              setPrintingInvoice(resolveInvoiceObject(inv));
                            }}
                          >
                            <IconEye size={15} />
                          </ActionIcon>
                        </Tooltip>

                        {/* Unified Print / Download Single Button */}
                        <Menu shadow="md" width={190} position="bottom-end" withinPortal radius="md">
                          <Menu.Target>
                            <Tooltip label="Print / Download Invoice" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="indigo"
                                size="sm"
                                radius="md"
                              >
                                <IconPrinter size={15} />
                              </ActionIcon>
                            </Tooltip>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Label>Print & Download</Menu.Label>
                            <Menu.Item
                              leftSection={<IconDownload size={14} color="#4F46E5" />}
                              onClick={() => triggerDownload(resolveInvoiceObject(inv))}
                            >
                              Download PDF
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconPrinter size={14} color="#2563EB" />}
                              onClick={() => {
                                setAutoPrint(false);
                                setPrintingInvoice(resolveInvoiceObject(inv));
                              }}
                            >
                              Print Tax Invoice
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>

                        <Menu shadow="md" width={180} position="bottom-end" withinPortal radius="md">
                          <Menu.Target>
                            <Tooltip label="Update Status" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="teal"
                                size="sm"
                                radius="md"
                              >
                                <IconRefresh size={15} />
                              </ActionIcon>
                            </Tooltip>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Label>Update Status</Menu.Label>
                            {INVOICE_STATUS_OPTIONS.map((opt) => {
                              const isSelected = (inv.status || '').toLowerCase() === opt.value.toLowerCase();
                              return (
                                <Menu.Item
                                  key={opt.value}
                                  leftSection={
                                    <Box
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: opt.color,
                                      }}
                                    />
                                  }
                                  rightSection={isSelected ? <IconCheck size={14} color="#10B981" /> : undefined}
                                  onClick={() => handleStatusChange(inv, opt.value)}
                                  style={{
                                    fontWeight: isSelected ? 700 : 500,
                                    backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : undefined,
                                  }}
                                >
                                  {opt.label}
                                </Menu.Item>
                              );
                            })}
                          </Menu.Dropdown>
                        </Menu>

                        {inv.rawInvoice && (
                          <Tooltip label="Edit Invoice" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              radius="md"
                              onClick={() => {
                                setEditingInvoice(inv.rawInvoice);
                                setModalKey((k) => k + 1);
                                setCreateModalOpened(true);
                              }}
                            >
                              <IconEdit size={15} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* Full-Screen Invoice Document Viewer, Print & PDF Modal */}
      {(printingInvoice || viewingInvoice) && (
        <InvoicePrintModal
          opened={Boolean(printingInvoice || viewingInvoice)}
          onClose={() => {
            setPrintingInvoice(null);
            setViewingInvoice(null);
            setAutoPrint(false);
          }}
          invoice={printingInvoice || viewingInvoice}
          autoPrint={autoPrint}
        />
      )}

      {/* Create / Edit Invoice Modal */}
      {createModalOpened && (
        <InvoiceModal
          key={modalKey}
          opened={createModalOpened}
          onClose={() => {
            setCreateModalOpened(false);
            setEditingInvoice(null);
          }}
          onSuccess={handleInvoiceSuccess}
          invoice={editingInvoice}
          initialLead={lead}
        />
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        opened={recordPaymentOpened}
        onClose={() => setRecordPaymentOpened(false)}
        invoice={payingInvoice}
        contractValue={leadContractValue}
        onSuccess={async () => {
          await fetchInvoices();
          setRecordPaymentOpened(false);
          if (onUpdateInvoices) {
            onUpdateInvoices(backendInvoices as any);
          }
        }}
      />

      {/* Hidden PDF Generation Container */}
      {HiddenInvoiceDownloadContainer}
    </Box>
  );
};

export default LeadInvoiceSection;
