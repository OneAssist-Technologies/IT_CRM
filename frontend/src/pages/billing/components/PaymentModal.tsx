import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Button,
  Group,
  Stack,
  Text,
  NumberInput,
  Grid,
  Table,
  Textarea,
  Paper,
  Box,
  Alert,
  ActionIcon,
  useComputedColorScheme,
} from '@mantine/core';
import { IconCash, IconAlertCircle, IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Invoice, PaymentMethod } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import { contactService } from '../../../services/contactService';
import { Contact } from '../../../types/contact';

interface PaymentModalProps {
  opened: boolean;
  onClose: () => void;
  preselectedInvoice?: Invoice | null;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  opened,
  onClose,
  preselectedInvoice,
  onSuccess,
}) => {
  const isDark = useComputedColorScheme('light') === 'dark';
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([]);

  // Form State
  const [contactId, setContactId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Allocations mapping: invoiceId -> amount
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Load Contacts
  useEffect(() => {
    if (opened) {
      contactService.getContacts({ limit: 100 }).then((res) => {
        if (res?.data) setContacts(res.data);
      }).catch(() => {});
    }
  }, [opened]);

  // Load Open Invoices when contact or opened changes
  useEffect(() => {
    if (opened) {
      billingService.getInvoices().then((data) => {
        const invList: Invoice[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
          ? (data as any).data
          : [];
        const unpaid = invList.filter(
          (inv: Invoice) => inv.status !== 'Cancelled' && inv.status !== 'Paid' && inv.outstandingBalance > 0
        );
        setOpenInvoices(unpaid);
      }).catch(() => {});
    }
  }, [opened]);

  // Prefill if preselectedInvoice
  useEffect(() => {
    if (preselectedInvoice) {
      setContactId(preselectedInvoice.contactId || '');
      setClientName(preselectedInvoice.contactName || '');
      setAmountReceived(Number(preselectedInvoice.outstandingBalance) || 0);
      setAllocations({
        [preselectedInvoice.id]: Number(preselectedInvoice.outstandingBalance) || 0,
      });
    } else {
      setContactId('');
      setClientName('');
      setAmountReceived(0);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Bank Transfer');
      setTransactionReference('');
      setBankName('');
      setNotes('');
      setAllocations({});
    }
  }, [preselectedInvoice, opened]);

  // Filter invoices for selected contact if chosen
  const clientInvoices = openInvoices.filter(
    (inv) => !contactId || inv.contactId === contactId || inv.contactName === clientName
  );

  const handleSelectContact = (val: string | null) => {
    setContactId(val || '');
    if (!val) return;
    const found = contacts.find((c) => c.id === val);
    if (found) {
      setClientName(found.name || '');
    }
  };

  const handleAllocationChange = (invId: string, val: number | string, maxBalance: number) => {
    const num = Math.min(maxBalance, Math.max(0, Number(val) || 0));
    const next = { ...allocations, [invId]: num };
    setAllocations(next);

    // Sum allocated
    const sumAlloc = Object.values(next).reduce((acc, a) => acc + (Number(a) || 0), 0);
    if (sumAlloc > amountReceived) {
      setAmountReceived(sumAlloc);
    }
  };

  const totalAllocated = Object.values(allocations).reduce((acc, a) => acc + (Number(a) || 0), 0);
  const unallocatedAmount = Math.max(0, amountReceived - totalAllocated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      notifications.show({ color: 'red', message: 'Client Name is required' });
      return;
    }
    if (amountReceived <= 0) {
      notifications.show({ color: 'red', message: 'Amount received must be greater than 0' });
      return;
    }

    try {
      setSubmitting(true);
      const allocationList = Object.entries(allocations)
        .filter(([_, amt]) => amt > 0)
        .map(([invoiceId, amountAllocated]) => ({
          invoiceId,
          amountAllocated,
        }));

      await billingService.recordPayment({
        contactId: contactId || null,
        clientName,
        paymentDate,
        amountReceived,
        paymentMethod,
        transactionReference: transactionReference || null,
        bankName: bankName || null,
        notes: notes || null,
        allocations: allocationList.length > 0 ? allocationList : undefined,
      });

      notifications.show({
        color: 'green',
        title: 'Payment Recorded',
        message: `Successfully recorded payment of ₹${amountReceived.toLocaleString('en-IN')}`,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to record payment' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="880px"
      centered
      yOffset="5vh"
      withCloseButton={false}
      radius="lg"
      styles={{
        content: {
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.22)',
          maxWidth: '95vw',
        },
        body: {
          padding: '24px 28px',
        },
      }}
      closeOnClickOutside={!submitting}
    >
      {/* Header matching existing CRM modals */}
      <Group justify="space-between" align="flex-start" mb="lg">
        <Group gap="md">
          <Box
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#818CF8' : '#4F46E5',
            }}
          >
            <IconCash size={22} stroke={1.8} />
          </Box>
          <div>
            <Text fw={800} size="19px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
              Record Client Payment
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              Log remittance details and allocate against open tax invoices
            </Text>
          </div>
        </Group>

        <ActionIcon
          variant="subtle"
          color="gray"
          size="md"
          radius="100px"
          onClick={onClose}
        >
          <IconX size={18} />
        </ActionIcon>
      </Group>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Client & Payment Info */}
          <Paper p="md" withBorder radius="lg" style={{ background: isDark ? '#111827' : '#F8FAFC', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0' }}>
            <Grid gutter="sm">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Select Existing CRM Contact"
                  placeholder="Choose contact"
                  data={contacts.map((c) => ({
                    value: c.id,
                    label: `${c.name} ${c.companyName ? `(${c.companyName})` : ''}`,
                  }))}
                  value={contactId}
                  onChange={handleSelectContact}
                  searchable
                  clearable
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Client Name"
                  placeholder="e.g. Acme Innovations"
                  value={clientName}
                  onChange={(e) => setClientName(e.currentTarget.value)}
                  required
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label="Amount Received (₹)"
                  placeholder="e.g. 50000"
                  value={amountReceived}
                  onChange={(val) => setAmountReceived(Number(val) || 0)}
                  min={0.01}
                  required
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <MeetingDatePicker
                  label="Payment Date"
                  placeholder="DD-MM-YYYY"
                  value={paymentDate}
                  onChange={(val: string) => setPaymentDate(val)}
                  required
                  zIndex={3000}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Select
                  label="Payment Method"
                  data={[
                    { value: 'Bank Transfer', label: 'Bank Transfer (NEFT/RTGS)' },
                    { value: 'UPI', label: 'UPI / QR Code' },
                    { value: 'Cheque', label: 'Cheque' },
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Payment Gateway', label: 'Payment Gateway' },
                  ]}
                  value={paymentMethod}
                  onChange={(v) => setPaymentMethod((v as PaymentMethod) || 'Bank Transfer')}
                  required
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <TextInput
                  label="Transaction / UTR Reference #"
                  placeholder="e.g. CMS123456789"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.currentTarget.value)}
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <TextInput
                  label="Remitting Bank Name"
                  placeholder="e.g. ICICI Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.currentTarget.value)}
                  radius="md"
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Invoices Allocation Section */}
          <Paper p="sm" withBorder radius="lg" style={{ background: isDark ? '#111827' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0' }}>
            <Group justify="space-between" mb="xs">
              <Text fw={700} size="sm">
                Allocate to Open Tax Invoices
              </Text>
              <Text size="xs" c={unallocatedAmount > 0 ? 'yellow' : 'green'} fw={600}>
                Allocated: ₹{totalAllocated.toLocaleString('en-IN')} | Unallocated: ₹{unallocatedAmount.toLocaleString('en-IN')}
              </Text>
            </Group>

            {clientInvoices.length === 0 ? (
              <Alert color="indigo" radius="md" icon={<IconAlertCircle size={16} />}>
                No pending invoices found for this client. Payment will be stored as an advance receipt.
              </Alert>
            ) : (
              <Box style={{ overflowX: 'auto' }}>
                <Table striped highlightOnHover withTableBorder style={{ minWidth: 500 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94A3B8' : '#64748B' }}>Invoice #</Table.Th>
                      <Table.Th style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94A3B8' : '#64748B', textAlign: 'right' }}>Total (₹)</Table.Th>
                      <Table.Th style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94A3B8' : '#64748B', textAlign: 'right' }}>Outstanding (₹)</Table.Th>
                      <Table.Th style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94A3B8' : '#64748B', width: 140, textAlign: 'right' }}>Allocate (₹)</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {clientInvoices.map((inv) => (
                      <Table.Tr key={inv.id}>
                        <Table.Td>
                          <Text fw={700} size="xs" c="indigo">{inv.invoiceNumber}</Text>
                          <Text size="10px" c="dimmed">Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="xs">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="xs" fw={700} c="red">₹{Number(inv.outstandingBalance).toLocaleString('en-IN')}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <NumberInput
                            value={allocations[inv.id] || 0}
                            onChange={(val) => handleAllocationChange(inv.id, val, inv.outstandingBalance)}
                            min={0}
                            max={inv.outstandingBalance}
                            size="xs"
                            radius="sm"
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
            )}
          </Paper>

          {/* Notes */}
          <Textarea
            label="Remarks / Notes"
            placeholder="e.g. Advance paid against Milestone 1"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            minRows={2}
            radius="md"
          />

          <Group justify="flex-end" gap="sm" mt="sm">
            <Button
              variant="default"
              radius="md"
              onClick={onClose}
              disabled={submitting}
              style={{ fontWeight: 600, minWidth: 90 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              radius="md"
              loading={submitting}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                minWidth: 150,
                border: 'none',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              }}
            >
              Record Payment
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
