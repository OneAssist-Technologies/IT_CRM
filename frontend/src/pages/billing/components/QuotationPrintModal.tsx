import React, { useRef, useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Group,
  Stack,
  Text,
  Paper,
  Box,
  Divider,
  Table,
  SimpleGrid,
  Grid,
} from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import { Quotation, BillingSettings } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import { printQuotationDirect } from '../utils/quotationPrint';

interface QuotationPrintModalProps {
  opened: boolean;
  onClose: () => void;
  quotation: Quotation | null;
}

/**
 * Converts Indian Rupee number into words (Crores, Lakhs, Thousands, Hundreds)
 */
function numberToWords(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  };

  const integerPart = Math.floor(Math.abs(num));
  if (integerPart === 0) return 'Zero Rupees Only';

  let remaining = integerPart;
  const crores = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  const lakhs = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;
  const hundreds = Math.floor(remaining / 100);
  remaining %= 100;

  const parts: string[] = [];
  if (crores > 0) parts.push(`${convertLessThanOneThousand(crores)} Crore`);
  if (lakhs > 0) parts.push(`${convertLessThanOneThousand(lakhs)} Lakh`);
  if (thousands > 0) parts.push(`${convertLessThanOneThousand(thousands)} Thousand`);
  if (hundreds > 0) parts.push(`${a[hundreds]} Hundred`);
  if (remaining > 0) {
    if (parts.length > 0) parts.push('and');
    parts.push(convertLessThanOneThousand(remaining));
  }

  return parts.join(' ') + ' Rupees Only';
}

export const QuotationPrintModal: React.FC<QuotationPrintModalProps> = ({
  opened,
  onClose,
  quotation,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<BillingSettings | null>(null);

  useEffect(() => {
    if (opened) {
      billingService.getSettings().then((s) => {
        if (s) setSettings(s);
      }).catch(() => {});
    }
  }, [opened]);

  if (!quotation) return null;

  const handlePrint = () => {
    printQuotationDirect(quotation, settings);
  };

  const companyName = settings?.companyName || 'OneAssist Technologies';
  const companyAddress = settings?.companyAddress || '';
  const companyGst = settings?.companyGst || '';
  const companyPan = settings?.companyPan || (companyGst && companyGst.length >= 12 ? companyGst.substring(2, 12) : '');

  const quotationDateFormatted = quotation.quotationDate
    ? new Date(quotation.quotationDate)
        .toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        })
        .toUpperCase()
    : 'N/A';

  const cleanQuotationNumber = quotation.quotationNumber
    ? quotation.quotationNumber.replace(/^QUO-/, '')
    : '001';

  // Calculate Item-wise discounts, Subtotals, Overall discount, and Totals
  let computedGrossSubtotal = 0;
  let computedTotalItemDiscount = 0;
  let computedTaxAmount = 0;

  const processedItems = (quotation.items || []).map((item) => {
    const qty = Number(item.quantity) || 1;
    const lineRate = Number(item.unitPrice) || 0;
    const lineGross = qty * lineRate;

    const rawDiscount = Number(item.discount) || 0;
    const discountType = item.discountType || (rawDiscount > 0 && rawDiscount <= 100 ? 'percentage' : 'fixed');

    let lineDiscAmt = 0;
    if (discountType === 'percentage') {
      lineDiscAmt = (lineGross * rawDiscount) / 100;
    } else {
      lineDiscAmt = Math.min(lineGross, rawDiscount);
    }
    lineDiscAmt = Number(lineDiscAmt.toFixed(2));

    const lineTaxable = Math.max(0, lineGross - lineDiscAmt);
    const taxRate = item.taxRate !== undefined && item.taxRate !== null ? Number(item.taxRate) : 18;
    const lineTax = item.taxAmount !== undefined && item.taxAmount !== null
      ? Number(item.taxAmount)
      : Number(((lineTaxable * taxRate) / 100).toFixed(2));

    const lineAmt = item.totalAmount !== undefined && item.totalAmount !== null
      ? Number(item.totalAmount)
      : Number((lineTaxable + lineTax).toFixed(2));

    computedGrossSubtotal += lineGross;
    computedTotalItemDiscount += lineDiscAmt;
    computedTaxAmount += lineTax;

    let discountDisplay = '—';
    if (lineDiscAmt > 0) {
      discountDisplay = `₹ ${lineDiscAmt.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    return {
      ...item,
      qty,
      lineRate,
      lineGross,
      rawDiscount,
      discountType,
      lineDiscAmt,
      lineTaxable,
      taxRate,
      lineTax,
      lineAmt,
      discountDisplay,
    };
  });

  computedGrossSubtotal = Number(computedGrossSubtotal.toFixed(2));
  computedTotalItemDiscount = Number(computedTotalItemDiscount.toFixed(2));

  // If quotation had no items or subtotal was directly stored, ensure consistent fallback
  const grossSubtotal = computedGrossSubtotal > 0
    ? computedGrossSubtotal
    : (Number(quotation.subtotal) || 0) + computedTotalItemDiscount;

  const totalItemDiscount = computedTotalItemDiscount;
  const netSubtotal = Math.max(0, grossSubtotal - totalItemDiscount);

  // Overall Discount
  const overallDiscType = quotation.discountType || 'percentage';
  const overallDiscVal = Number(quotation.discountValue) || 0;
  let overallDiscAmt = Number(quotation.discountAmount) || 0;
  if (overallDiscVal > 0 && !overallDiscAmt) {
    if (overallDiscType === 'percentage') {
      overallDiscAmt = Number(((netSubtotal * overallDiscVal) / 100).toFixed(2));
    } else {
      overallDiscAmt = Math.min(netSubtotal, overallDiscVal);
    }
  }

  // Taxable Amount after all discounts
  const taxableAmount = Math.max(0, netSubtotal - overallDiscAmt);

  // GST Amount
  const gstAmount = Number(quotation.taxAmount) > 0 ? Number(quotation.taxAmount) : Number(computedTaxAmount.toFixed(2));

  // Grand Total
  const grandTotal = Number(quotation.grandTotal) > 0 ? Number(quotation.grandTotal) : Number((taxableAmount + gstAmount).toFixed(2));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="960px"
      styles={{
        content: {
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.18)',
          overflow: 'hidden',
          maxWidth: '94vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        },
        header: {
          padding: '14px 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
        },
        body: {
          padding: '24px 28px',
          backgroundColor: '#FFFFFF',
          overflowY: 'auto',
          maxHeight: 'calc(92vh - 65px)',
        },
      }}
      title={
        <Group justify="space-between" align="center" style={{ width: '100%', paddingRight: 32 }}>
          <Text fw={700} size="15px" style={{ color: '#0F172A' }}>
            Quotation Document: {quotation.quotationNumber}
          </Text>
          <Button
            leftSection={<IconPrinter size={15} />}
            size="xs"
            variant="filled"
            style={{
              background: '#7C3AED',
              color: '#FFFFFF',
              fontWeight: 700,
              borderRadius: 8,
              height: 32,
              padding: '0 14px',
            }}
            onClick={handlePrint}
          >
            Print / Save PDF
          </Button>
        </Group>
      }
      centered
      radius="lg"
    >
      {/* Printable Canvas */}
      <Box
        ref={printRef}
        className="printable-document"
        style={{
          width: '100%',
          maxWidth: 880,
          margin: '0 auto',
          background: '#FFFFFF',
          color: '#0F172A',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
          {/* Header Row: Quotation Title & Number (Left) vs Logo (Right) */}
          <Group justify="space-between" align="flex-start" mb="md">
            <Box>
              <Text
                fw={800}
                style={{
                  fontSize: 28,
                  color: '#7C3AED',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                Quotation {quotation.revisionName && (
                  <Text span size="18px" fw={700} c="#7C3AED" ml={8}>
                    [{quotation.revisionName}]
                  </Text>
                )}
              </Text>

              <Group gap="xs" mt={10}>
                <Text size="11px" c="#64748B" fw={500} style={{ width: 85 }}>
                  Quotation#
                </Text>
                <Text size="12px" fw={700} c="#0F172A">
                  {quotation.quotationNumber || cleanQuotationNumber}
                </Text>
              </Group>

              {quotation.version && quotation.version > 1 && (
                <Group gap="xs" mt={4}>
                  <Text size="11px" c="#64748B" fw={500} style={{ width: 85 }}>
                    Revision
                  </Text>
                  <Text size="12px" fw={700} c="#7C3AED">
                    {quotation.revisionName || `V${quotation.version}`} (Original: {quotation.originalQuotationNumber || cleanQuotationNumber})
                  </Text>
                </Group>
              )}

              {quotation.projectName && (
                <Group gap="xs" mt={4}>
                  <Text size="11px" c="#64748B" fw={500} style={{ width: 85 }}>
                    Project
                  </Text>
                  <Text size="12px" fw={700} c="#0F172A">
                    {quotation.projectName}
                  </Text>
                </Group>
              )}

              <Group gap="xs" mt={4}>
                <Text size="11px" c="#64748B" fw={500} style={{ width: 85 }}>
                  Quotation Date
                </Text>
                <Text size="12px" fw={700} c="#0F172A">
                  {quotationDateFormatted}
                </Text>
              </Group>
            </Box>

            {/* Top Right Logo: OneAssist Technologies */}
            <Group gap="xs" align="center">
              <Box
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(14, 165, 233, 0.12))',
                  border: '1px solid rgba(79, 70, 229, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.12)',
                  flexShrink: 0,
                }}
              >
                <img
                  src="/oneassist-logo.png"
                  alt="OneAssist Technologies"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
              <Box>
                <Text
                  fw={900}
                  size="16px"
                  c="#0F172A"
                  style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}
                >
                  OneAssist <Text span inherit c="#0EA5E9">CRM</Text>
                </Text>
                <Text
                  fw={700}
                  size="9.5px"
                  c="#64748B"
                  tt="uppercase"
                  style={{ letterSpacing: '0.06em', lineHeight: 1.1 }}
                >
                  Technologies Pvt Ltd
                </Text>
              </Box>
            </Group>
          </Group>

          {/* Quotation By & Quotation To Gray Boxes */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md" mb="xs">
            {/* Left Card: Quotation by OneAssist */}
            <Box
              p="sm"
              style={{
                background: '#F1F5F9',
                borderRadius: 6,
                fontSize: 11,
              }}
            >
              <Group align="flex-start" wrap="nowrap" mb={6}>
                <Text size="11px" c="#64748B" style={{ width: 80, flexShrink: 0 }}>
                  Quotation by
                </Text>
                <Text size="11px" fw={700} c="#0F172A">
                  {companyName}
                </Text>
              </Group>
              {companyAddress ? (
                <Group align="flex-start" wrap="nowrap" mb={6}>
                  <Text size="11px" c="#64748B" style={{ width: 80, flexShrink: 0 }}>
                    Address
                  </Text>
                  <Text size="11px" c="#334155" style={{ lineHeight: 1.4 }}>
                    {companyAddress}
                  </Text>
                </Group>
              ) : null}
              <Group align="flex-start" wrap="nowrap" mb={4}>
                <Text size="11px" c="#64748B" style={{ width: 80, flexShrink: 0 }}>
                  GSTIN
                </Text>
                <Text size="11px" fw={600} c="#0F172A">
                  {companyGst || 'Unregistered'}
                </Text>
              </Group>
              {companyPan ? (
                <Group align="flex-start" wrap="nowrap">
                  <Text size="11px" c="#64748B" style={{ width: 80, flexShrink: 0 }}>
                    PAN
                  </Text>
                  <Text size="11px" fw={600} c="#0F172A">
                    {companyPan}
                  </Text>
                </Group>
              ) : null}
            </Box>

            {/* Right Card: Quotation to */}
            <Box
              p="sm"
              style={{
                background: '#F1F5F9',
                borderRadius: 6,
                fontSize: 11,
              }}
            >
              <Group align="flex-start" wrap="nowrap" mb={6}>
                <Text size="11px" c="#64748B" style={{ width: 80, flexShrink: 0 }}>
                  Quotation to
                </Text>
                <Text size="11px" fw={700} c="#0F172A">
                  {quotation.companyName || quotation.contactName || 'Client'}
                </Text>
              </Group>
              <Group align="flex-start" wrap="nowrap" mb={6}>
                <Text size="11px" c="#64748B" style={{ width: 80, flexShrink: 0 }}>
                  Address
                </Text>
                <Text size="11px" c="#334155" style={{ lineHeight: 1.4 }}>
                  {quotation.clientAddress || 'Client Registered Address'}
                </Text>
              </Group>
              <Group align="flex-start" wrap="nowrap">
                <Text size="11px" c="#64748B" style={{ width: 80, flexShrink: 0 }}>
                  GSTIN / PAN
                </Text>
                <Text size="11px" fw={600} c="#0F172A">
                  {quotation.clientGst || '—'}
                </Text>
              </Group>
            </Box>
          </SimpleGrid>

          {/* Supply Information Row */}
          <Group justify="center" gap={60} my="md">
            <Text size="11px">
              <Text span c="#64748B">
                Place of Supply
              </Text>{' '}
              <Text span fw={700} c="#0F172A" ml={6}>
                Tamil Nadu
              </Text>
            </Text>
            <Text size="11px">
              <Text span c="#64748B">
                Country of Supply
              </Text>{' '}
              <Text span fw={700} c="#0F172A" ml={6}>
                India
              </Text>
            </Text>
          </Group>

          {/* Items Table with Item-wise Discount Display */}
          <Table
            mb="xl"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <Table.Thead>
              <Table.Tr style={{ background: '#7C3AED' }}>
                <Table.Th
                  style={{
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '9px 12px',
                    width: '42%',
                  }}
                >
                  Item #/Item description
                </Table.Th>
                <Table.Th
                  style={{
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '9px 8px',
                    textAlign: 'center',
                    width: '8%',
                  }}
                >
                  Qty.
                </Table.Th>
                <Table.Th
                  style={{
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '9px 12px',
                    textAlign: 'right',
                    width: '16%',
                  }}
                >
                  Rate
                </Table.Th>
                <Table.Th
                  style={{
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '9px 12px',
                    textAlign: 'right',
                    width: '18%',
                  }}
                >
                  Discount
                </Table.Th>
                <Table.Th
                  style={{
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '9px 12px',
                    textAlign: 'right',
                    width: '16%',
                  }}
                >
                  Amount
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {processedItems.map((item, idx) => {
                const isEven = idx % 2 === 1;

                return (
                  <Table.Tr
                    key={idx}
                    style={{
                      background: isEven ? '#F8FAFC' : '#FFFFFF',
                    }}
                  >
                    <Table.Td style={{ padding: '9px 12px', fontSize: 12, color: '#1E293B' }}>
                      <Text size="12px" fw={600} c="#0F172A">
                        {idx + 1}. {item.itemName}
                      </Text>
                    </Table.Td>
                    <Table.Td
                      style={{
                        padding: '9px 8px',
                        fontSize: 12,
                        textAlign: 'center',
                        color: '#1E293B',
                      }}
                    >
                      {item.qty}
                    </Table.Td>
                    <Table.Td
                      style={{
                        padding: '9px 12px',
                        fontSize: 12,
                        textAlign: 'right',
                        color: '#1E293B',
                      }}
                    >
                      ₹ {item.lineRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>
                    <Table.Td
                      style={{
                        padding: '9px 12px',
                        fontSize: 12,
                        textAlign: 'right',
                        color: item.lineDiscAmt > 0 ? '#0F172A' : '#94A3B8',
                        fontWeight: item.lineDiscAmt > 0 ? 600 : 400,
                      }}
                    >
                      {item.discountDisplay}
                    </Table.Td>
                    <Table.Td
                      style={{
                        padding: '9px 12px',
                        fontSize: 12,
                        textAlign: 'right',
                        color: '#0F172A',
                        fontWeight: 700,
                      }}
                    >
                      ₹{' '}
                      {item.lineAmt.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          {/* Bottom Section: Terms/Notes (Left) vs Totals & Signature (Right) */}
          <Grid gutter="xl" align="flex-start" mb="lg">
            {/* Left Column */}
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Box mb="md">
                <Text size="13px" fw={700} style={{ color: '#7C3AED' }} mb={6}>
                  Terms and Conditions
                </Text>
                {quotation.termsConditions ? (
                  <Text size="11px" c="#475569" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {quotation.termsConditions}
                  </Text>
                ) : (
                  <Stack gap={3}>
                    <Text size="11px" c="#475569">
                      1. Please pay within 15 days from the date of invoice, overdue interest @ 14%
                      will be charged on delayed payments.
                    </Text>
                    <Text size="11px" c="#475569">
                      2. Please quote invoice number when remitting funds.
                    </Text>
                  </Stack>
                )}
              </Box>


              <Text size="11px" c="#475569" mt="xl">
                For any enquiries, email us on{' '}
                <Text span fw={700} c="#0F172A">
                  billing@oneassist.tech
                </Text>{' '}
                or call us on{' '}
                <Text span fw={700} c="#0F172A">
                  +91 98765-43210
                </Text>
              </Text>
            </Grid.Col>

            {/* Right Column: Detailed Quotation Totals Section */}
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Stack gap={7}>
                {/* 1. Subtotal before discounts */}
                <Group justify="space-between">
                  <Text size="xs" fw={600} c="#0F172A">
                    Subtotal before discounts
                  </Text>
                  <Text size="xs" fw={700} c="#0F172A">
                    ₹{grossSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Group>

                {/* 2. Total Item-wise Discount */}
                <Group justify="space-between">
                  <Text size="xs" fw={500} c="#0F172A">
                    Total Item-wise Discount
                  </Text>
                  <Text size="xs" fw={600} c="#0F172A">
                    {totalItemDiscount > 0
                      ? `- ₹${totalItemDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '₹0.00'}
                  </Text>
                </Group>

                {/* 3. Overall Discount */}
                <Group justify="space-between">
                  <Text size="xs" fw={500} c="#0F172A">
                    Overall Discount
                  </Text>
                  <Text size="xs" fw={600} c="#0F172A">
                    {overallDiscAmt > 0
                      ? `- ₹${overallDiscAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '₹0.00'}
                  </Text>
                </Group>

                <Divider my={2} color="#E2E8F0" />

                {/* 4. Taxable Amount after all discounts */}
                <Group justify="space-between">
                  <Text size="xs" fw={600} c="#0F172A">
                    Taxable Amount
                  </Text>
                  <Text size="xs" fw={700} c="#0F172A">
                    ₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Group>

                {/* 5. GST Amount */}
                <Group justify="space-between">
                  <Text size="xs" fw={600} c="#0F172A">
                    GST Amount
                  </Text>
                  <Text size="xs" fw={700} c="#0F172A">
                    ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Group>

                <Divider my={4} color="#CBD5E1" />

                {/* 6. Grand Total */}
                <Group justify="space-between" align="baseline">
                  <Text size="sm" fw={700} c="#0F172A">
                    Grand Total
                  </Text>
                  <Text size="22px" fw={800} style={{ color: '#7C3AED' }}>
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Group>

                <Box mt={6}>
                  <Text size="11px" c="#64748B">
                    Quotation Total (in words)
                  </Text>
                  <Text size="11px" fw={700} c="#0F172A" mt={2} style={{ lineHeight: 1.4 }}>
                    {numberToWords(grandTotal)}
                  </Text>
                </Box>

                <Divider my="sm" color="#E2E8F0" />

                {/* Authorized Signature Block */}
                <Box
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  mt="xs"
                >
                  <svg
                    width="130"
                    height="46"
                    viewBox="0 0 130 46"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 34C22 20 32 14 38 24C44 32 34 44 44 37C54 30 60 16 68 22C74 27 70 40 78 38C86 36 100 20 110 17C120 14 105 34 122 30"
                      stroke="#1E3A8A"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M25 40C46 38 78 36 118 34"
                      stroke="#1E3A8A"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <Text size="10.5px" fw={600} c="#0F172A" mt={4}>
                    For OneAssist Technologies Pvt Ltd
                  </Text>
                  <Text size="11px" c="#64748B" fw={500}>
                    Authorized Signatory
                  </Text>
                </Box>
              </Stack>
            </Grid.Col>
          </Grid>
      </Box>

      {/* Embedded print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-document, .printable-document * {
            visibility: visible !important;
          }
          .printable-document {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }
        }
      `}</style>
    </Modal>
  );
};
