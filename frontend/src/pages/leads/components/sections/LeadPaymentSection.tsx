import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Text,
  Group,
  Stack,
  Button,
  Badge,
  Paper,
  Table,
  SimpleGrid,
  ThemeIcon,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Center,
  Loader,
  Divider,
  ActionIcon,
} from '@mantine/core';
import {
  IconCreditCard,
  IconPlus,
  IconArrowRight,
  IconBuildingBank,
  IconQrcode,
  IconReceipt,
  IconCash,
  IconPrinter,
  IconUser,
  IconMail,
  IconPhone,
  IconFileText,
  IconX,
  IconNotes,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Lead, LeadPaymentRecord, LeadInvoiceItem, Contract } from '../../../../types/lead';
import { Invoice, Payment } from '../../../../types/billing';
import { billingService } from '../../../../services/billingService';
import { leadService } from '../../../../services/leadService';
import dayjs from 'dayjs';

export interface LeadPaymentSectionProps {
  lead: Lead;
  isDark: boolean;
  payments?: LeadPaymentRecord[];
  invoices?: LeadInvoiceItem[];
  contract?: any;
  onUpdatePayments?: (payments: LeadPaymentRecord[]) => void;
  onNavigateSection?: (section: any) => void;
}

export const LeadPaymentSection: React.FC<LeadPaymentSectionProps> = ({
  lead,
  isDark,
  payments: initialPayments = [],
  invoices: initialInvoices = [],
  contract: initialContract,
  onUpdatePayments,
  onNavigateSection,
}) => {
  // Backend dynamic data state
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [backendPayments, setBackendPayments] = useState<Payment[]>([]);
  const [backendInvoices, setBackendInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);



  // Modal State
  const [modalOpened, setModalOpened] = useState<boolean>(false);
  const [receiptModalOpened, setReceiptModalOpened] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Form State
  const [amount, setAmount] = useState<number | string>('');
  const [method, setMethod] = useState<string>('Bank Transfer (NEFT/IMPS)');
  const [referenceId, setReferenceId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [bankName, setBankName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch real invoices, payments, & contracts from backend
  const fetchBillingData = useCallback(async () => {
    try {
      const [paymentsRes, invoicesRes, contractsRes] = await Promise.all([
        billingService.getPayments().catch(() => []),
        billingService.getInvoices().catch(() => []),
        leadService.getContracts({ leadId: lead?.id || undefined, limit: 100 }).catch(() => ({ data: [] })),
      ]);

      const leadNameLower = (lead.name || '').trim().toLowerCase();
      const leadCompanyLower = (lead.companyName || '').trim().toLowerCase();

      const invoiceList: Invoice[] = Array.isArray(invoicesRes)
        ? invoicesRes
        : Array.isArray((invoicesRes as any)?.data)
        ? (invoicesRes as any).data
        : [];

      // Filter invoices belonging to this lead
      const matchingInvoices = invoiceList.filter((inv: Invoice) => {
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

      const matchingInvoiceIds = new Set(matchingInvoices.map((inv) => inv.id));
      const matchingInvoiceNums = new Set(matchingInvoices.map((inv) => (inv.invoiceNumber || '').toLowerCase()));

      const paymentList: Payment[] = Array.isArray(paymentsRes)
        ? paymentsRes
        : Array.isArray((paymentsRes as any)?.data)
        ? (paymentsRes as any).data
        : [];

      // Filter payments belonging to this lead or allocated to its invoices
      const matchingPayments = paymentList.filter((p) => {
        if (p.contactId && (p.contactId === lead.id || p.contactId === lead.leadId)) {
          return true;
        }
        if (p.clientName) {
          const c = p.clientName.toLowerCase();
          if (leadNameLower && c.includes(leadNameLower)) return true;
          if (leadCompanyLower && c.includes(leadCompanyLower)) return true;
        }
        if (
          Array.isArray(p.allocations) &&
          p.allocations.some(
            (a: any) =>
              (a.invoiceId && matchingInvoiceIds.has(a.invoiceId)) ||
              (a.invoice?.id && matchingInvoiceIds.has(a.invoice.id)) ||
              (a.invoice?.invoiceNumber && matchingInvoiceNums.has(a.invoice.invoiceNumber.toLowerCase()))
          )
        ) {
          return true;
        }
        return false;
      });

      const loadedContracts: Contract[] = Array.isArray((contractsRes as any)?.data)
        ? (contractsRes as any).data
        : Array.isArray(contractsRes)
        ? (contractsRes as any)
        : [];

      setBackendPayments(matchingPayments);
      setBackendInvoices(matchingInvoices);
      setContracts(loadedContracts);
    } catch (err: any) {
      console.error('Error fetching lead billing data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lead]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Unified list of payment items for display
  const unifiedPayments = useMemo(() => {
    // 1. Direct Backend payments
    const fromBackend = backendPayments.map((p) => ({
      id: p.id,
      receiptNumber: p.paymentNumber || p.transactionReference || `PAY-${p.id.slice(0, 6)}`,
      date: p.paymentDate ? dayjs(p.paymentDate).format('YYYY-MM-DD') : '—',
      amount: p.amountReceived || 0,
      method: p.paymentMethod || 'Bank Transfer',
      referenceId: p.transactionReference || '—',
      bankName: p.bankName || '',
      invoiceNumber:
        p.allocations?.[0]?.invoice?.invoiceNumber ||
        (p.allocations?.[0] as any)?.invoiceNumber ||
        'Advance / Unallocated',
      invoiceId: p.allocations?.[0]?.invoiceId || (p.allocations?.[0] as any)?.invoice?.id,
      status: 'Confirmed',
      notes: p.notes || '',
    }));

    // Find invoice IDs/numbers that already have an explicit backend payment
    const recordedInvoiceIds = new Set<string>();
    const recordedInvoiceNumbers = new Set<string>();
    backendPayments.forEach((p) => {
      (p.allocations || []).forEach((a: any) => {
        if (a.invoiceId) recordedInvoiceIds.add(a.invoiceId);
        if (a.invoice?.id) recordedInvoiceIds.add(a.invoice.id);
        if (a.invoice?.invoiceNumber) recordedInvoiceNumbers.add(String(a.invoice.invoiceNumber).toLowerCase());
      });
      if (p.transactionReference) {
        recordedInvoiceNumbers.add(String(p.transactionReference).toLowerCase());
      }
    });

    // 2. Auto-fetch payments from any invoices marked as 'Paid' or with amountPaid > 0
    const autoPaidFromInvoices = backendInvoices
      .filter(
        (inv) =>
          (inv.status === 'Paid' || (inv.amountPaid && inv.amountPaid > 0)) &&
          !recordedInvoiceIds.has(inv.id) &&
          !recordedInvoiceNumbers.has((inv.invoiceNumber || '').toLowerCase())
      )
      .map((inv) => ({
        id: `auto-pay-${inv.id}`,
        receiptNumber: `REC-${inv.invoiceNumber}`,
        date: inv.paidAt
          ? dayjs(inv.paidAt).format('YYYY-MM-DD')
          : inv.invoiceDate
          ? dayjs(inv.invoiceDate).format('YYYY-MM-DD')
          : dayjs().format('YYYY-MM-DD'),
        amount: inv.amountPaid || inv.grandTotal,
        method: inv.bankDetails?.paymentMethod || 'Bank Transfer',
        referenceId: `SETTLE-${inv.invoiceNumber}`,
        bankName: inv.bankDetails?.bankName || 'HDFC Bank',
        invoiceNumber: inv.invoiceNumber,
        invoiceId: inv.id,
        status: 'Confirmed',
        notes: `Settled payment for invoice ${inv.invoiceNumber}`,
      }));

    const combined = [...fromBackend, ...autoPaidFromInvoices];

    if (combined.length > 0) {
      return combined;
    }

    // Filter out dummy 'TXN-882910' mock records so clean leads start with 0 records
    const customLocal = (initialPayments || []).filter(
      (p) => p.receiptNumber !== 'TXN-882910'
    );

    return customLocal.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      date: p.date,
      amount: p.amount || 0,
      method: p.method,
      referenceId: p.referenceId || '—',
      bankName: '',
      invoiceNumber: p.invoiceNumber || 'Advance / General',
      invoiceId: undefined,
      status: p.status || 'Confirmed',
      notes: p.notes || '',
    }));
  }, [backendPayments, backendInvoices, initialPayments]);

  // Available invoices for dropdown
  const availableInvoices = useMemo(() => {
    if (backendInvoices.length > 0) {
      return backendInvoices.map((inv) => {
        const bal = Number(inv.outstandingBalance ?? inv.grandTotal ?? 0);
        const total = Number(inv.grandTotal ?? 0);
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber || 'INV',
          label: `${inv.invoiceNumber || 'INV'} — Balance: ₹${bal.toLocaleString('en-IN')} (Total: ₹${total.toLocaleString('en-IN')})`,
          outstanding: bal,
        };
      });
    }

    // Fallback to dealData invoices
    return (initialInvoices || []).map((inv) => {
      const tot = Number(inv.totalAmount ?? 0);
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || 'INV',
        label: `${inv.invoiceNumber || 'INV'} — ${inv.title || 'Invoice'} (₹${tot.toLocaleString('en-IN')})`,
        outstanding: inv.status === 'Paid' ? 0 : tot,
      };
    });
  }, [backendInvoices, initialInvoices]);

  // Financial metrics calculations
  const totalContractAmount = useMemo(() => {
    if (contracts.length > 0) {
      return contracts.reduce((acc, curr) => acc + (Number(curr.finalContractAmount || curr.contractValue) || 0), 0);
    }
    if (initialContract) {
      return Number(initialContract.finalContractAmount || initialContract.contractValue || (initialContract as any).totalAmount || 0);
    }
    if ((lead as any)?.dealValue) {
      return Number((lead as any).dealValue);
    }
    return backendInvoices.reduce((acc, inv) => acc + (Number(inv.grandTotal) || 0), 0);
  }, [contracts, initialContract, lead, backendInvoices]);

  const totalInvoiced = useMemo(() => {
    if (backendInvoices.length > 0) {
      return backendInvoices.reduce((acc, inv) => acc + (Number(inv.grandTotal) || 0), 0);
    }
    return (initialInvoices || []).reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
  }, [backendInvoices, initialInvoices]);

  const totalReceived = useMemo(() => {
    return unifiedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [unifiedPayments]);

  const outstandingBalance = useMemo(() => {
    if (backendInvoices.length > 0) {
      const invBal = backendInvoices.reduce((acc, inv) => acc + (Number(inv.outstandingBalance) || 0), 0);
      if (invBal > 0) return invBal;
    }
    const baseTarget = totalInvoiced > 0 ? totalInvoiced : totalContractAmount;
    return Math.max(0, baseTarget - totalReceived);
  }, [backendInvoices, totalInvoiced, totalContractAmount, totalReceived]);

  // Helper to determine Contract Value for each payment row
  const getPaymentContractValue = useCallback(
    (p: (typeof unifiedPayments)[0]) => {
      const inv = backendInvoices.find(
        (i) =>
          (p.invoiceId && i.id === p.invoiceId) ||
          (i.invoiceNumber && p.invoiceNumber && i.invoiceNumber.toLowerCase() === p.invoiceNumber.toLowerCase())
      );
      if (inv && (inv as any).contractId) {
        const matchedCnt = contracts.find(
          (c) => c.id === (inv as any).contractId || c.contractId === (inv as any).contractId
        );
        if (matchedCnt) {
          const val = Number(matchedCnt.finalContractAmount || matchedCnt.contractValue || (matchedCnt as any).totalAmount);
          if (val > 0) return val;
        }
      }
      if (contracts.length > 0) {
        const val = Number(contracts[0].finalContractAmount || contracts[0].contractValue || (contracts[0] as any).totalAmount);
        if (val > 0) return val;
      }
      if (initialContract) {
        const val = Number(initialContract.finalContractAmount || initialContract.contractValue || (initialContract as any).totalAmount);
        if (val > 0) return val;
      }
      if (totalContractAmount > 0) {
        return totalContractAmount;
      }
      if (inv && Number(inv.grandTotal || (inv as any).totalAmount) > 0) {
        return Number(inv.grandTotal || (inv as any).totalAmount);
      }
      return 0;
    },
    [backendInvoices, contracts, initialContract, totalContractAmount]
  );

  // Helper to determine Outstanding Amount for each payment row
  const getPaymentOutstandingAmount = useCallback(
    (p: (typeof unifiedPayments)[0], contractVal: number) => {
      const inv = backendInvoices.find(
        (i) =>
          (p.invoiceId && i.id === p.invoiceId) ||
          (i.invoiceNumber && p.invoiceNumber && i.invoiceNumber.toLowerCase() === p.invoiceNumber.toLowerCase())
      );
      if (inv && inv.outstandingBalance !== undefined && inv.outstandingBalance !== null) {
        return Math.max(0, Number(inv.outstandingBalance));
      }
      if (contractVal > 0) {
        return Math.max(0, contractVal - totalReceived);
      }
      return outstandingBalance;
    },
    [backendInvoices, totalReceived, outstandingBalance]
  );

  // Handle Record Payment
  const handleRecordPayment = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      notifications.show({
        title: 'Amount Required',
        message: 'Please enter a valid received payment amount.',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      const clientLabel = lead.companyName
        ? `${lead.companyName} (${lead.name})`
        : lead.name;

      const payload = {
        clientName: clientLabel,
        contactId: lead.id,
        paymentDate: new Date().toISOString().split('T')[0],
        amountReceived: numAmount,
        paymentMethod: method,
        transactionReference: referenceId.trim() || `REF-${Date.now()}`,
        bankName: bankName.trim() || undefined,
        notes: notes.trim() || undefined,
        invoiceId: selectedInvoiceId && selectedInvoiceId !== 'advance' ? selectedInvoiceId : undefined,
        allocations:
          selectedInvoiceId && selectedInvoiceId !== 'advance'
            ? [{ invoiceId: selectedInvoiceId, amountAllocated: numAmount }]
            : [],
      };

      await billingService.recordPayment(payload);

      notifications.show({
        title: 'Payment Recorded',
        message: `₹${numAmount.toLocaleString('en-IN')} received via ${method}.`,
        color: 'teal',
      });

      // Reset form
      setModalOpened(false);
      setAmount('');
      setReferenceId('');
      setBankName('');
      setNotes('');
      setSelectedInvoiceId(null);

      // Re-fetch dynamic data from backend
      await fetchBillingData();

      // Parent callback if available
      if (onUpdatePayments) {
        const newLocalPayment: LeadPaymentRecord = {
          id: `pay-${Date.now()}`,
          receiptNumber: payload.transactionReference,
          date: payload.paymentDate,
          amount: numAmount,
          method: method as any,
          referenceId: payload.transactionReference,
          invoiceNumber: selectedInvoiceId || 'Advance / General',
          status: 'Confirmed',
          notes: notes.trim(),
        };
        onUpdatePayments([newLocalPayment, ...(initialPayments || [])]);
      }
    } catch (err: any) {
      notifications.show({
        title: 'Failed to Record Payment',
        message: err.message || 'Could not save payment to database.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Payment Details Modal
  const handleOpenReceipt = (pay: any, contractVal?: number, outstandingVal?: number) => {
    setSelectedReceipt({
      ...pay,
      contractVal: contractVal ?? pay.contractVal ?? 0,
      outstandingVal: outstandingVal ?? pay.outstandingVal ?? 0,
    });
    setReceiptModalOpened(true);
  };

  const matchedInvoiceForReceipt = useMemo(() => {
    if (!selectedReceipt) return null;
    return (
      backendInvoices.find(
        (inv) =>
          (selectedReceipt.invoiceId && inv.id === selectedReceipt.invoiceId) ||
          (inv.invoiceNumber &&
            selectedReceipt.invoiceNumber &&
            inv.invoiceNumber.toLowerCase() === selectedReceipt.invoiceNumber.toLowerCase())
      ) || null
    );
  }, [selectedReceipt, backendInvoices]);

  const matchedContractForReceipt = useMemo(() => {
    if (!selectedReceipt) return null;
    if (matchedInvoiceForReceipt && (matchedInvoiceForReceipt as any).contractId) {
      const c = contracts.find(
        (cnt) =>
          cnt.id === (matchedInvoiceForReceipt as any).contractId ||
          cnt.contractId === (matchedInvoiceForReceipt as any).contractId
      );
      if (c) return c;
    }
    if (contracts.length > 0) return contracts[0];
    if (initialContract) return initialContract;
    return null;
  }, [selectedReceipt, matchedInvoiceForReceipt, contracts, initialContract]);

  // Print Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <Box>
      {/* Top Header */}
      <Group justify="space-between" align="center" mb="lg" wrap="wrap" gap="sm">
        <div>
          <Group gap="xs" align="center">
            <ThemeIcon size="lg" radius="md" color="teal" variant="light">
              <IconCreditCard size={20} />
            </ThemeIcon>
            <div>
              <Group gap={8} align="center">
                <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Payment Transactions & Receipts
                </Text>
                <Badge size="xs" variant="light" color="teal">
                  Live Synced
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                All payment installments, contract values, and reconciliation records for this lead.
              </Text>
            </div>
          </Group>
        </div>

        <Group gap="xs">
          <Button
            size="sm"
            leftSection={<IconPlus size={15} />}
            onClick={() => {
              setAmount(outstandingBalance > 0 ? outstandingBalance : '');
              setModalOpened(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
              color: '#FFF',
              borderRadius: 10,
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            Record Payment
          </Button>

          {onNavigateSection && (
            <Button
              size="sm"
              variant="default"
              rightSection={<IconArrowRight size={15} />}
              onClick={() => onNavigateSection('progress')}
              style={{ borderRadius: 10, fontWeight: 600, borderColor: isDark ? '#374151' : '#E2E8F0' }}
            >
              Go to Progress
            </Button>
          )}
        </Group>
      </Group>

      {/* Payment Records Table (Clean, compact, no inline expansion) */}
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
          <Group gap="xs">
            <Text fw={750} size="sm" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
              Transaction History & Bank References
            </Text>
            <Badge size="xs" variant="light" color="teal">
              {unifiedPayments.length} Payment{unifiedPayments.length === 1 ? '' : 's'}
            </Badge>
          </Group>
        </Group>

        {loading ? (
          <Center py="xl">
            <Loader size="sm" color="teal" />
          </Center>
        ) : unifiedPayments.length === 0 ? (
          <Center py={40}>
            <Stack align="center" gap="xs">
              <ThemeIcon size={44} radius="xl" color="gray" variant="light">
                <IconReceipt size={22} />
              </ThemeIcon>
              <Text fw={700} size="sm" style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                No Payments Recorded Yet
              </Text>
              <Text size="xs" c="dimmed" style={{ maxWidth: 320, textAlign: 'center' }}>
                No payment transactions have been logged for {lead.name}. Click below to record an advance or milestone payment.
              </Text>
              <Button
                size="xs"
                color="teal"
                variant="light"
                leftSection={<IconPlus size={13} />}
                onClick={() => setModalOpened(true)}
                mt={4}
              >
                Record Advance Payment
              </Button>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={880}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead>
                <Table.Tr style={{ borderBottom: isDark ? '1px solid #334155' : '1px solid #E2E8F0' }}>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    RECEIPT / REF
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    DATE
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    METHOD
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    INVOICE #
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    CONTRACT VALUE
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>
                    AMOUNT PAID
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, textAlign: 'right' }}>
                    OUTSTANDING AMOUNT
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {unifiedPayments.map((p) => {
                  const contractVal = getPaymentContractValue(p);
                  const outstandingVal = getPaymentOutstandingAmount(p, contractVal);

                  return (
                    <Table.Tr
                      key={p.id}
                      onClick={() => handleOpenReceipt(p, contractVal, outstandingVal)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Receipt / Ref */}
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <ThemeIcon size="sm" radius="xl" color="teal" variant="light">
                            <IconReceipt size={12} />
                          </ThemeIcon>
                          <div>
                            <Text fw={700} size="12px" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                              {p.receiptNumber}
                            </Text>
                            {p.referenceId && p.referenceId !== '—' && (
                              <Text size="10px" ff="monospace" c="dimmed">
                                Ref: {p.referenceId}
                              </Text>
                            )}
                          </div>
                        </Group>
                      </Table.Td>

                      {/* Date */}
                      <Table.Td>
                        <Text size="12px" c="dimmed">
                          {p.date}
                        </Text>
                      </Table.Td>

                      {/* Method */}
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          {p.method.toLowerCase().includes('bank') ? (
                            <IconBuildingBank size={14} color="#6366F1" />
                          ) : p.method.toLowerCase().includes('upi') ? (
                            <IconQrcode size={14} color="#10B981" />
                          ) : p.method.toLowerCase().includes('cash') ? (
                            <IconCash size={14} color="#10B981" />
                          ) : (
                            <IconCreditCard size={14} color="#F59E0B" />
                          )}
                          <Text size="12px" fw={600} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                            {p.method}
                          </Text>
                        </Group>
                      </Table.Td>

                      {/* Invoice Number */}
                      <Table.Td>
                        <Badge size="xs" variant="light" color="blue">
                          {p.invoiceNumber}
                        </Badge>
                      </Table.Td>

                      {/* Contract Value */}
                      <Table.Td>
                        <Text fw={700} size="13px" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          {contractVal > 0 ? `₹${contractVal.toLocaleString('en-IN')}` : '—'}
                        </Text>
                      </Table.Td>

                      {/* Amount Paid */}
                      <Table.Td>
                        <Text fw={800} size="13px" style={{ color: '#10B981' }}>
                          ₹{(Number(p.amount) || 0).toLocaleString('en-IN')}
                        </Text>
                      </Table.Td>

                      {/* Outstanding Amount */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text
                          fw={700}
                          size="13px"
                          style={{
                            color: outstandingVal > 0 ? '#F59E0B' : '#10B981',
                          }}
                        >
                          ₹{outstandingVal.toLocaleString('en-IN')}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* Modal: Record Payment */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        size="md"
        radius="16px"
        title={
          <Group gap="xs">
            <ThemeIcon color="teal" size="sm" radius="md">
              <IconCreditCard size={14} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Record Received Payment for {lead.name}
            </Text>
          </Group>
        }
      >
        <Stack gap="sm">
          <NumberInput
            label="Received Amount (INR ₹)"
            placeholder="e.g. 50000"
            value={amount}
            onChange={setAmount}
            min={1}
            required
          />

          <Select
            label="Payment Method"
            data={[
              'Bank Transfer (NEFT/IMPS)',
              'UPI',
              'Credit Card',
              'Cheque',
              'Cash',
            ]}
            value={method}
            onChange={(val) => setMethod(val || 'Bank Transfer (NEFT/IMPS)')}
            required
          />

          <Select
            label="Allocated Invoice"
            placeholder="Select invoice or record as advance"
            value={selectedInvoiceId}
            onChange={setSelectedInvoiceId}
            clearable
            data={[
              { value: 'advance', label: '⭐ Advance Payment (Kickoff / Unallocated)' },
              ...availableInvoices.map((inv) => ({
                value: inv.id || inv.invoiceNumber,
                label: inv.label,
              })),
            ]}
          />

          <TextInput
            label="UTR / Transaction Reference ID"
            placeholder="e.g. SBIN002948172 or UPI-981249"
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
          />

          <TextInput
            label="Bank Name (Optional)"
            placeholder="e.g. HDFC Bank, SBI, ICICI"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />

          <TextInput
            label="Payment Notes"
            placeholder="e.g. Advance 40% cleared via RTGS"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" size="xs" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button
              size="xs"
              color="teal"
              loading={submitting}
              onClick={handleRecordPayment}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#FFF',
                fontWeight: 700,
              }}
            >
              Confirm & Save Payment ✓
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: PAYMENT DETAILS POPUP                                             */}
      {/* ========================================================================= */}
      <Modal
        opened={receiptModalOpened}
        onClose={() => setReceiptModalOpened(false)}
        size="820px"
        radius="lg"
        centered
        withCloseButton={false}
        styles={{
          content: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
          },
          body: {
            padding: '24px 28px',
            maxHeight: 'calc(92vh - 20px)',
            overflowY: 'auto',
          },
        }}
      >
        {selectedReceipt && (
          <Stack gap="lg">
            {/* Modal Header */}
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                <ThemeIcon size="xl" radius="md" color="teal" variant="light">
                  <IconReceipt size={24} />
                </ThemeIcon>
                <div>
                  <Group gap="xs" align="center">
                    <Text fw={800} size="lg" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      Payment Details
                    </Text>
                    <Badge size="xs" color="teal" variant="filled">
                      {selectedReceipt.status || 'Confirmed'}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={2}>
                    Receipt #{selectedReceipt.receiptNumber} • {selectedReceipt.date} • {lead.companyName || lead.name}
                  </Text>
                </div>
              </Group>

              <Group gap="xs" align="center">
                <ActionIcon
                  size="md"
                  variant="subtle"
                  color="gray"
                  onClick={() => setReceiptModalOpened(false)}
                >
                  <IconX size={18} />
                </ActionIcon>
              </Group>
            </Group>

            <Divider color={isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'} />

            {/* Financial Overview Highlight Cards */}
            <Paper
              p="md"
              radius="md"
              style={{
                background: isDark ? '#1E293B' : '#F0FDF4',
                border: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #BBF7D0',
              }}
            >
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Box>
                  <Text size="11px" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>
                    Contract Value
                  </Text>
                  <Text size="lg" fw={800} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }} mt={2}>
                    {selectedReceipt.contractVal > 0
                      ? `₹${Number(selectedReceipt.contractVal).toLocaleString('en-IN')}`
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>
                    Amount Paid
                  </Text>
                  <Text size="lg" fw={900} style={{ color: '#10B981' }} mt={2}>
                    ₹{(Number(selectedReceipt.amount) || 0).toLocaleString('en-IN')}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>
                    Outstanding Amount
                  </Text>
                  <Text
                    size="lg"
                    fw={800}
                    style={{
                      color: (selectedReceipt.outstandingVal || 0) > 0 ? '#F59E0B' : '#10B981',
                    }}
                    mt={2}
                  >
                    ₹{(Number(selectedReceipt.outstandingVal) || 0).toLocaleString('en-IN')}
                  </Text>
                </Box>
              </SimpleGrid>
            </Paper>

            {/* A. Lead Information */}
            <Paper
              p="md"
              radius="md"
              style={{
                background: isDark ? '#1F2937' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group gap="xs" mb="sm">
                <ThemeIcon size="sm" radius="sm" color="blue" variant="light">
                  <IconUser size={14} />
                </ThemeIcon>
                <Text fw={750} size="sm" style={{ color: isDark ? '#F1F5F9' : '#0F172A', letterSpacing: '0.3px' }}>
                  A. Lead Information
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Lead Name
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {lead.name || '—'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Company Name
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {lead.companyName || lead.displayCompany || '—'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Contact Person
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {lead.name || (lead as any).contactPerson || '—'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Email
                  </Text>
                  <Group gap={4} mt={2}>
                    <IconMail size={13} color="#64748B" />
                    <Text size="sm" fw={600} style={{ color: isDark ? '#60A5FA' : '#2563EB' }}>
                      {lead.email || '—'}
                    </Text>
                  </Group>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Phone Number
                  </Text>
                  <Group gap={4} mt={2}>
                    <IconPhone size={13} color="#64748B" />
                    <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }}>
                      {lead.phone || '—'}
                    </Text>
                  </Group>
                </Box>
              </SimpleGrid>
            </Paper>

            {/* B. Transaction & Banking Information */}
            <Paper
              p="md"
              radius="md"
              style={{
                background: isDark ? '#1F2937' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group gap="xs" mb="sm">
                <ThemeIcon size="sm" radius="sm" color="teal" variant="light">
                  <IconBuildingBank size={14} />
                </ThemeIcon>
                <Text fw={750} size="sm" style={{ color: isDark ? '#F1F5F9' : '#0F172A', letterSpacing: '0.3px' }}>
                  B. Payment & Banking Information
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Receipt / Payment Number
                  </Text>
                  <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {selectedReceipt.receiptNumber}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Payment Date
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {selectedReceipt.date}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Payment Method
                  </Text>
                  <Group gap={6} mt={2}>
                    {selectedReceipt.method?.toLowerCase().includes('bank') ? (
                      <IconBuildingBank size={14} color="#6366F1" />
                    ) : selectedReceipt.method?.toLowerCase().includes('upi') ? (
                      <IconQrcode size={14} color="#10B981" />
                    ) : (
                      <IconCreditCard size={14} color="#F59E0B" />
                    )}
                    <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }}>
                      {selectedReceipt.method}
                    </Text>
                  </Group>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Bank Name
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {selectedReceipt.bankName ||
                      matchedInvoiceForReceipt?.bankDetails?.bankName ||
                      (selectedReceipt.method?.toLowerCase().includes('bank') ? 'HDFC Bank' : '—')}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Transaction Reference / UTR
                  </Text>
                  <Text size="sm" fw={600} ff="monospace" style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {selectedReceipt.referenceId && selectedReceipt.referenceId !== '—'
                      ? selectedReceipt.referenceId
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Reconciliation Status
                  </Text>
                  <Badge size="xs" color="teal" variant="light" mt={4}>
                    {selectedReceipt.status || 'Confirmed'}
                  </Badge>
                </Box>
              </SimpleGrid>
            </Paper>

            {/* C. Invoice & Contract Information */}
            <Paper
              p="md"
              radius="md"
              style={{
                background: isDark ? '#1F2937' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group gap="xs" mb="sm">
                <ThemeIcon size="sm" radius="sm" color="violet" variant="light">
                  <IconFileText size={14} />
                </ThemeIcon>
                <Text fw={750} size="sm" style={{ color: isDark ? '#F1F5F9' : '#0F172A', letterSpacing: '0.3px' }}>
                  C. Invoice & Contract Information
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Linked Invoice #
                  </Text>
                  <Badge size="xs" color="blue" variant="light" mt={4}>
                    {selectedReceipt.invoiceNumber}
                  </Badge>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Invoice Total
                  </Text>
                  <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {matchedInvoiceForReceipt?.grandTotal
                      ? `₹${Number(matchedInvoiceForReceipt.grandTotal).toLocaleString('en-IN')}`
                      : selectedReceipt.contractVal > 0
                      ? `₹${Number(selectedReceipt.contractVal).toLocaleString('en-IN')}`
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Contract ID
                  </Text>
                  <Badge size="xs" color="indigo" variant="light" style={{ fontFamily: 'monospace', marginTop: 4 }}>
                    {matchedContractForReceipt?.contractId ||
                      matchedContractForReceipt?.id ||
                      (matchedInvoiceForReceipt as any)?.contractId ||
                      'CNT-2026-001'}
                  </Badge>
                </Box>
                <Box style={{ gridColumn: 'span 2' }}>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Payment Terms
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {matchedContractForReceipt?.paymentDueTerms ||
                      matchedContractForReceipt?.customPaymentDueTerms ||
                      'Net 15 Days (Advance 30%, Milestone Delivery)'}
                  </Text>
                </Box>
              </SimpleGrid>
            </Paper>

            {/* D. Payment Notes */}
            <Paper
              p="md"
              radius="md"
              style={{
                background: isDark ? '#1F2937' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group gap="xs" mb="xs">
                <ThemeIcon size="sm" radius="sm" color="orange" variant="light">
                  <IconNotes size={14} />
                </ThemeIcon>
                <Text fw={750} size="sm" style={{ color: isDark ? '#F1F5F9' : '#0F172A', letterSpacing: '0.3px' }}>
                  D. Payment Notes & Remarks
                </Text>
              </Group>
              <Text size="sm" style={{ color: isDark ? '#E2E8F0' : '#334155', fontStyle: selectedReceipt.notes ? 'normal' : 'italic' }}>
                {selectedReceipt.notes || `Settlement payment logged for ${selectedReceipt.invoiceNumber}`}
              </Text>
            </Paper>

            {/* Footer Actions */}
            <Group justify="flex-end" gap="xs" mt="sm">
              <Button
                variant="default"
                size="sm"
                leftSection={<IconPrinter size={15} />}
                onClick={handlePrintReceipt}
              >
                Print Receipt
              </Button>
              <Button
                size="sm"
                color="teal"
                onClick={() => setReceiptModalOpened(false)}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  color: '#FFF',
                  fontWeight: 700,
                }}
              >
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
};

export default LeadPaymentSection;
