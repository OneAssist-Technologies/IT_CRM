import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Group,
  Stack,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Text,
  Paper,
  Box,
  Divider,
  Alert,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCash, IconAlertCircle, IconCheck, IconReceipt } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Invoice, PaymentMethod } from '../../../types/billing';
import { billingService } from '../../../services/billingService';

interface RecordPaymentModalProps {
  opened: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
  contractValue?: number;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  opened,
  onClose,
  invoice,
  onSuccess,
  contractValue,
}) => {
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState('');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      // Amount Received field is fetched from invoice total as requested
      setAmountReceived(invoice.grandTotal || invoice.outstandingBalance || 0);
      setPaymentDate(new Date());
      setPaymentMethod('Bank Transfer');
      setTransactionReference('');
      setBankName(invoice.bankDetails?.bankName || 'HDFC Bank');
      setNotes(`Settlement payment for ${invoice.invoiceNumber}`);
      setError(null);
    }
  }, [invoice, opened]);

  if (!invoice) return null;

  const outstanding = Number(invoice.outstandingBalance || 0);
  const currencySymbol = invoice.currency === 'USD' ? '$' : invoice.currency === 'EUR' ? '€' : '₹';
  const resolvedContractValue = contractValue ?? (invoice as any)?.contractValue ?? invoice.grandTotal ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amountReceived <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (amountReceived > outstanding + 0.01) {
      setError(
        `Payment amount (${currencySymbol}${amountReceived.toLocaleString('en-IN')}) exceeds the outstanding balance (${currencySymbol}${outstanding.toLocaleString('en-IN')}). Overpayments are strictly disallowed.`
      );
      return;
    }

    try {
      setSubmitting(true);
      const dateStr = paymentDate
        ? paymentDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      await billingService.recordPayment({
        clientName: invoice.companyName || invoice.contactName,
        contactId: invoice.contactId,
        paymentDate: dateStr,
        amountReceived,
        paymentMethod,
        transactionReference: transactionReference.trim() || undefined,
        bankName: paymentMethod === 'Bank Transfer' ? (bankName.trim() || undefined) : undefined,
        notes: notes.trim() || undefined,
        invoiceId: invoice.id,
        allocations: [{ invoiceId: invoice.id, amountAllocated: Math.min(amountReceived, outstanding > 0 ? outstanding : amountReceived) }],
      });

      notifications.show({
        title: 'Payment Recorded',
        message: `Payment of ${currencySymbol}${amountReceived.toLocaleString('en-IN')} successfully applied to ${invoice.invoiceNumber}.`,
        color: 'teal',
        icon: <IconCheck size={18} />,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedNewBalance = Math.max(0, outstanding - (Number(amountReceived) || 0));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Box
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(16, 185, 129, 0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <IconCash size={20} />
          </Box>
          <Box>
            <Text fw={700} size="sm">
              Record Payment
            </Text>
            <Text size="xs" c="dimmed">
              Invoice #{invoice.invoiceNumber} • {invoice.companyName || invoice.contactName}
            </Text>
          </Box>
        </Group>
      }
      centered
      radius="md"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md" mt="xs">
          {/* Invoice Summary Box */}
          <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">
                Contract Value:
              </Text>
              <Text size="xs" fw={700}>
                {currencySymbol}{resolvedContractValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </Group>
            {resolvedContractValue !== invoice.grandTotal && (
              <Group justify="space-between" mb={4}>
                <Text size="xs" c="dimmed">
                  Invoice Total:
                </Text>
                <Text size="xs" fw={600}>
                  {currencySymbol}{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </Group>
            )}
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">
                Amount Received:
              </Text>
              <Text size="xs" fw={600} c="teal">
                {currencySymbol}{invoice.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </Group>
            <Divider my={6} />
            <Group justify="space-between">
              <Text size="sm" fw={700} c="red">
                Outstanding:
              </Text>
              <Text size="sm" fw={800} c="red">
                {currencySymbol}{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </Group>
          </Paper>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md" title="Validation Error">
              {error}
            </Alert>
          )}

          {/* Amount Input */}
          <NumberInput
            label="Amount Received"
            description={`Fetched from invoice total (${currencySymbol}${invoice.grandTotal.toLocaleString('en-IN')})`}
            required
            min={1}
            value={amountReceived}
            onChange={(val) => setAmountReceived(Number(val) || 0)}
            prefix={currencySymbol + ' '}
            thousandSeparator=","
            decimalScale={2}
            size="md"
            styles={{ input: { fontWeight: 700, fontSize: 16 } }}
          />

          <Group grow>
            <DateInput
              label="Payment Date"
              value={paymentDate}
              onChange={setPaymentDate}
              required
              clearable={false}
              maxDate={new Date()}
            />

            <Select
              label="Payment Method"
              required
              data={[
                { value: 'Bank Transfer', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
                { value: 'UPI', label: 'UPI / QR Code' },
                { value: 'Credit Card', label: 'Credit Card / Gateway' },
                { value: 'Cheque', label: 'Cheque / DD' },
                { value: 'Cash', label: 'Cash' },
              ]}
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(val || 'Bank Transfer')}
            />
          </Group>

          {paymentMethod === 'Bank Transfer' ? (
            <Group grow>
              <TextInput
                label="Transaction Reference"
                placeholder="e.g. HDFC98234120 / UTR Ref"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.currentTarget.value)}
                description="Bank reference number or UTR for audit"
              />
              <TextInput
                label="Bank Name"
                placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                value={bankName}
                onChange={(e) => setBankName(e.currentTarget.value)}
                description="Receiving or remitting bank name"
              />
            </Group>
          ) : (
            <TextInput
              label="Transaction Reference"
              placeholder="e.g. UPI-89341 / UTR / Ref ID"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.currentTarget.value)}
              description="Transaction reference or receipt number for audit"
            />
          )}

          <Textarea
            label="Payment Notes"
            placeholder="Add any internal transaction remarks or confirmation details..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />

          {/* Balance Preview */}
          <Paper p="xs" radius="sm" style={{ backgroundColor: calculatedNewBalance === 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)' }}>
            <Group justify="space-between">
              <Text size="xs" fw={600}>
                {calculatedNewBalance === 0 ? 'Invoice will be marked as FULLY PAID' : 'Remaining balance after payment:'}
              </Text>
              <Text size="xs" fw={800} c={calculatedNewBalance === 0 ? 'teal' : 'blue'}>
                {currencySymbol}{calculatedNewBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </Group>
          </Paper>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="teal"
              loading={submitting}
              leftSection={<IconReceipt size={16} />}
              disabled={amountReceived <= 0}
            >
              Record Payment
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
