import React, { useState, useEffect } from 'react';
import { Paper, Box, Text } from '@mantine/core';
import { Invoice, BillingSettings } from '../../../types/billing';
import { numberToWordsINR } from '../../../utils/invoicePdfGenerator';

export interface InvoiceDocumentProps {
  invoice: Invoice;
  settings?: BillingSettings | null;
  innerRef?: React.Ref<HTMLDivElement>;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  settings,
  innerRef,
}) => {
  // Format currency
  const formatCurrency = (amount: number | string | undefined) => {
    const val = Number(amount) || 0;
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format date helper (e.g., JUN 19, 2026)
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr)
        .toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        })
        .toUpperCase();
    } catch {
      return dateStr.toUpperCase();
    }
  };

  // Company Details from Settings / Project
  const companyName = settings?.companyName || (invoice as any)?.companyDetails?.companyName || 'OneAssist Technologies';
  const companyAddress = settings?.companyAddress || (invoice as any)?.companyDetails?.address || '';
  const companyGst = settings?.companyGst || (invoice as any)?.companyDetails?.gstin || '';
  const companyPhone = settings?.companyPhone || (invoice as any)?.companyDetails?.phone || '';
  const companyEmail = settings?.companyEmail || (invoice as any)?.companyDetails?.email || '';
  const companyLogo = settings?.companyLogoUrl || (settings as any)?.logoUrl || '/oneassist-logo.png';

  const cleanedBrandWords = companyName
    .trim()
    .split(/\s+/)
    .filter((w: string) => !['pvt', 'pvt.', 'ltd', 'ltd.', 'private', 'limited', 'inc', 'corp'].includes(w.toLowerCase()));
  const brandWord1 = cleanedBrandWords[0] || companyName.trim().split(/\s+/)[0] || 'ONEASSIST';
  const brandWordRest = cleanedBrandWords.length > 1
    ? cleanedBrandWords.slice(1).join(' ')
    : companyName.trim().split(/\s+/).slice(1).join(' ');

  // Client Details
  const clientDisplayName = invoice.companyName || invoice.contactName || 'Client';
  const clientContactPerson = invoice.contactName && invoice.contactName !== invoice.companyName ? invoice.contactName : null;

  let fullClientAddress = invoice.clientAddress || '';
  if (!fullClientAddress) {
    const parts = [invoice.clientCity, invoice.clientState, invoice.clientPincode].filter(Boolean);
    fullClientAddress = parts.join(', ');
  }

  const clientGst = invoice.clientGst?.trim() || '';
  const clientPan = (invoice as any).clientPan?.trim() || (clientGst && clientGst.length >= 12 ? clientGst.substring(2, 12) : '');
  const companyPan = (settings as any)?.companyPan?.trim() || (companyGst && companyGst.length >= 12 ? companyGst.substring(2, 12) : '');

  // Calculations
  const subtotal = Number(invoice.subtotal) || 0;
  const discount = Number(invoice.discountAmount) || 0;
  const taxableValue = Math.max(0, subtotal - discount);
  const taxAmount = Number(invoice.taxAmount) || 0;
  const grandTotal = Number(invoice.grandTotal) || 0;
  const isInterState = invoice.taxType === 'INTER_STATE';

  // Tax breakdown (CGST/SGST vs IGST)
  const cgstAmount = isInterState ? 0 : taxAmount / 2;
  const sgstAmount = isInterState ? 0 : taxAmount / 2;

  // Bank Info
  const bank = invoice.bankDetails || {};
  const beneficiary = settings?.accountHolderName || bank.accountHolderName || (settings?.bankName || bank.bankName ? companyName : '');
  const bankName = settings?.bankName || bank.bankName || '';
  const accountNo = settings?.accountNumber || bank.accountNumber || '';
  const ifsc = settings?.ifscCode || bank.ifscCode || '';
  const accountType = (settings as any)?.accountType || (bank as any).accountType || '';
  const upi = settings?.upiId || bank.upiId || '';

  // Authorized Signatory Details
  const signatoryName =
    (invoice as any)?.approvedBy ||
    (settings as any)?.authorizedSignatory ||
    (invoice as any)?.companyDetails?.authorizedSignatory ||
    '';
  const signatoryDesignation =
    (settings as any)?.signatoryDesignation ||
    (invoice as any)?.companyDetails?.signatoryDesignation ||
    '';
  const signatureUrl =
    (settings as any)?.signatureUrl ||
    (invoice as any)?.companyDetails?.signatureUrl ||
    null;

  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    {
      id: 'default-item',
      itemName: 'Project Scope Deliverables',
      description: 'Scope execution and milestones delivery',
      hsnSac: '998314',
      quantity: 1,
      unitPrice: subtotal,
      discount: 0,
      taxRate: 18,
      taxAmount: taxAmount,
      totalAmount: grandTotal,
    },
  ];

  return (
    <Paper
      ref={innerRef}
      className="printable-invoice"
      style={{
        background: '#FFFFFF',
        color: '#1E293B',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        maxWidth: 900,
        width: '100%',
        margin: '0 auto',
        padding: '38px 40px',
        boxShadow: '0 4px 25px rgba(0,0,0,0.06)',
        borderRadius: 8,
        lineHeight: 1.5,
        boxSizing: 'border-box',
      }}
    >
      {/* 1. TOP HEADER: INVOICE META (LEFT) & BRAND LOGO (RIGHT) */}
      <Box
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 28,
        }}
      >
        {/* Left: Invoice Title & Meta */}
        <Box>
          <Text
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#6D28D9',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            Invoice
          </Text>

          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              <tr>
                <td style={{ color: '#64748B', paddingRight: 16, paddingBottom: 4 }}>Invoice #</td>
                <td style={{ fontWeight: 700, color: '#0F172A', paddingBottom: 4 }}>
                  {invoice.invoiceNumber || '004'}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#64748B', paddingRight: 16, paddingBottom: 4 }}>Invoice Date</td>
                <td style={{ fontWeight: 700, color: '#0F172A', paddingBottom: 4 }}>
                  {formatDate(invoice.invoiceDate)}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#64748B', paddingRight: 16 }}>Due Date</td>
                <td style={{ fontWeight: 700, color: '#0F172A' }}>
                  {formatDate(invoice.dueDate)}
                </td>
              </tr>
            </tbody>
          </table>
        </Box>

        {/* Right: Dual-Tone Brand Lockup matching OneAssist CRM & TECHNOLOGIES PVT LTD */}
        <Box style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
              }}
            >
              OneAssist <Text span inherit c="#0EA5E9" fw={900}>CRM</Text>
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: 750,
                color: '#64748B',
                letterSpacing: '0.06em',
                lineHeight: 1.1,
                marginTop: 3,
                textTransform: 'uppercase',
                fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
              }}
            >
              Technologies Pvt Ltd
            </Text>
          </Box>
        </Box>
      </Box>

      {/* 2. BILLED BY & BILLED TO CARDS */}
      <Box
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 20,
          alignItems: 'stretch',
        }}
      >
        {/* Card 1: Billed by */}
        <Box
          style={{
            flex: 1,
            background: '#F8FAFC',
            border: '1px solid #F1F5F9',
            borderRadius: 8,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 145,
            boxSizing: 'border-box',
          }}
        >
          <Box>
            <Text size="12px" fw={700} c="#6D28D9" mb={5}>
              Billed by
            </Text>
            <Text size="13.5px" fw={700} c="#0F172A" mb={4}>
              {companyName}
            </Text>
            {companyAddress ? (
              <Text size="11px" c="#475569" style={{ lineHeight: 1.5, marginBottom: 8 }}>
                {companyAddress}
              </Text>
            ) : null}
          </Box>
          <Box style={{ marginTop: 'auto', paddingTop: 6 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700, color: '#0F172A', width: 55, paddingBottom: 3 }}>GSTIN</td>
                  <td style={{ color: '#475569', fontWeight: 500, paddingBottom: 3 }}>
                    {companyGst || 'Unregistered'}
                  </td>
                </tr>
                {companyPan ? (
                  <tr>
                    <td style={{ fontWeight: 700, color: '#0F172A', width: 55 }}>PAN</td>
                    <td style={{ color: '#475569', fontWeight: 500 }}>{companyPan}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Box>
        </Box>

        {/* Card 2: Billed to */}
        <Box
          style={{
            flex: 1,
            background: '#F8FAFC',
            border: '1px solid #F1F5F9',
            borderRadius: 8,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 145,
            boxSizing: 'border-box',
          }}
        >
          <Box>
            <Text size="12px" fw={700} c="#6D28D9" mb={5}>
              Billed to
            </Text>
            <Text size="13.5px" fw={700} c="#0F172A" mb={clientContactPerson ? 2 : 4}>
              {clientDisplayName}
            </Text>
            {clientContactPerson && (
              <Text size="11px" fw={600} c="#64748B" mb={3}>
                Attn: {clientContactPerson}
              </Text>
            )}
            {fullClientAddress ? (
              <Text size="11px" c="#475569" style={{ lineHeight: 1.5, marginBottom: 8 }}>
                {fullClientAddress}
              </Text>
            ) : null}
          </Box>
          <Box style={{ marginTop: 'auto', paddingTop: 6 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700, color: '#0F172A', width: 55, paddingBottom: 3 }}>GSTIN</td>
                  <td style={{ color: '#475569', fontWeight: 500, paddingBottom: 3 }}>
                    {clientGst || 'Unregistered'}
                  </td>
                </tr>
                {clientPan ? (
                  <tr>
                    <td style={{ fontWeight: 700, color: '#0F172A', width: 55 }}>PAN</td>
                    <td style={{ color: '#475569', fontWeight: 500 }}>{clientPan}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>

      {/* 3. ITEMS TABLE WITH SOLID PURPLE HEADER */}
      <Box style={{ marginBottom: 28, overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            minWidth: 760,
            borderCollapse: 'collapse',
            fontSize: 12,
          }}
        >
          <thead>
            <tr
              style={{
                background: '#6D28D9',
                color: '#FFFFFF',
                borderRadius: 4,
                textAlign: 'left',
              }}
            >
              <th style={{ padding: '10px 14px', fontWeight: 600, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}>
                Item # / Item description
              </th>
              <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'center' }}>HSN</th>
              <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'center' }}>GST</th>
              <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Taxable Amount</th>
              <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>
                {isInterState ? 'IGST' : 'CGST'}
              </th>
              {!isInterState && (
                <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>SGST</th>
              )}
              <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right', borderTopRightRadius: 4, borderBottomRightRadius: 4 }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const qty = Number(it.quantity) || 1;
              const unitPrice = Number(it.unitPrice) || 0;
              const itTaxable = Math.max(0, qty * unitPrice - (Number(it.discount) || 0));
              const itTaxRate = Number(it.taxRate) || 18;
              const itTaxAmount = Number(it.taxAmount) || (itTaxable * itTaxRate) / 100;
              const itTotal = Number(it.totalAmount) || itTaxable + itTaxAmount;

              const halfTax = itTaxAmount / 2;

              return (
                <tr
                  key={it.id || idx}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                  }}
                >
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <Text size="12.5px" fw={700} c="#0F172A">
                      {idx + 1}. {it.itemName}
                    </Text>
                    {it.description && (
                      <Text size="11px" c="#64748B" mt={2} style={{ lineHeight: 1.4 }}>
                        {it.description}
                      </Text>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#475569', verticalAlign: 'top' }}>
                    {(it as any).hsnSac || '02'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: '#0F172A', verticalAlign: 'top' }}>
                    {qty}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#475569', verticalAlign: 'top' }}>
                    {isInterState ? `${itTaxRate}%` : `${itTaxRate / 2}%`}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#0F172A', verticalAlign: 'top' }}>
                    ₹ {itTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'top' }}>
                    ₹ {isInterState ? itTaxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : halfTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  {!isInterState && (
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'top' }}>
                      ₹ {halfTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A', verticalAlign: 'top' }}>
                    ₹ {itTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>

      {/* 4. MIDDLE SECTION: BANK & QR (LEFT) + TOTALS SUMMARY (RIGHT) */}
      <Box
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 32,
          marginBottom: 28,
        }}
      >
        {/* Left Part: Bank & Payment Details + QR */}
        <Box style={{ flex: 1.1 }}>
          <Text size="13px" fw={700} c="#6D28D9" mb={12}>
            Bank & Payment Details
          </Text>

          <Box style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Bank text info */}
            <table style={{ borderCollapse: 'collapse', fontSize: 11.5, flex: 1 }}>
              <tbody>
                {beneficiary ? (
                  <tr>
                    <td style={{ color: '#64748B', paddingBottom: 5, width: 130 }}>Account Holder Name :</td>
                    <td style={{ fontWeight: 600, color: '#0F172A', paddingBottom: 5 }}>{beneficiary}</td>
                  </tr>
                ) : null}
                {accountNo ? (
                  <tr>
                    <td style={{ color: '#64748B', paddingBottom: 5 }}>Account Number :</td>
                    <td style={{ fontWeight: 700, color: '#0F172A', paddingBottom: 5 }}>{accountNo}</td>
                  </tr>
                ) : null}
                {ifsc ? (
                  <tr>
                    <td style={{ color: '#64748B', paddingBottom: 5 }}>IFSC :</td>
                    <td style={{ fontWeight: 600, color: '#0F172A', paddingBottom: 5 }}>{ifsc}</td>
                  </tr>
                ) : null}
                {accountType ? (
                  <tr>
                    <td style={{ color: '#64748B', paddingBottom: 5 }}>Account Type :</td>
                    <td style={{ color: '#0F172A', paddingBottom: 5 }}>{accountType}</td>
                  </tr>
                ) : null}
                {bankName ? (
                  <tr>
                    <td style={{ color: '#64748B', paddingBottom: 5 }}>Bank :</td>
                    <td style={{ color: '#0F172A', paddingBottom: 5 }}>{bankName}</td>
                  </tr>
                ) : null}
                {upi ? (
                  <tr>
                    <td style={{ color: '#64748B' }}>UPI :</td>
                    <td style={{ fontWeight: 600, color: '#6D28D9' }}>{upi}</td>
                  </tr>
                ) : null}
                {!accountNo && !bankName && !ifsc && !upi ? (
                  <tr>
                    <td colSpan={2} style={{ color: '#94A3B8', fontStyle: 'italic', paddingBottom: 5 }}>
                      Bank details not provided
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Box>
        </Box>

        {/* Right Part: Totals Breakdown */}
        <Box style={{ flex: 0.9, maxWidth: 320, width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ color: '#64748B', paddingBottom: 6 }}>Sub Total</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F172A', paddingBottom: 6 }}>
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {discount > 0 && (
                <tr>
                  <td style={{ color: '#10B981', paddingBottom: 6 }}>Discount</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#10B981', paddingBottom: 6 }}>
                    - ₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              <tr>
                <td style={{ color: '#64748B', paddingBottom: 6 }}>Taxable Amount</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F172A', paddingBottom: 6 }}>
                  ₹{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {isInterState ? (
                <tr>
                  <td style={{ color: '#64748B', paddingBottom: 6 }}>IGST (18%)</td>
                  <td style={{ textAlign: 'right', color: '#0F172A', paddingBottom: 6 }}>
                    ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td style={{ color: '#64748B', paddingBottom: 6 }}>CGST (9%)</td>
                    <td style={{ textAlign: 'right', color: '#0F172A', paddingBottom: 6 }}>
                      ₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748B', paddingBottom: 6 }}>SGST (9%)</td>
                    <td style={{ textAlign: 'right', color: '#0F172A', paddingBottom: 6 }}>
                      ₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </>
              )}

              <tr>
                <td colSpan={2} style={{ padding: '6px 0', borderTop: '1px solid #E2E8F0' }} />
              </tr>

              <tr>
                <td style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Total</td>
                <td style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', textAlign: 'right' }}>
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </Box>
      </Box>

      {/* 5. INVOICE TOTAL (IN WORDS) - FULL-WIDTH CLEAN BAR */}
      <Box
        style={{
          background: '#F8FAFC',
          border: '1px solid #F1F5F9',
          borderRadius: 6,
          padding: '10px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Text size="11px" fw={700} c="#64748B" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          Amount in Words:
        </Text>
        <Text size="12px" fw={700} c="#6D28D9" style={{ lineHeight: 1.4 }}>
          {numberToWordsINR(grandTotal)}
        </Text>
      </Box>

      {/* 5. TERMS, NOTES & OFFICIAL AUTHORIZED SIGNATORY SECTION */}
      <Box
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 28,
          marginBottom: 16,
        }}
      >
        {/* Left: Terms and Conditions & Notes */}
        <Box style={{ flex: 1 }}>
          <Text size="12px" fw={700} c="#0F172A" tt="uppercase" style={{ letterSpacing: '0.04em' }} mb={6}>
            Terms and Conditions
          </Text>
          <Text size="11px" c="#475569" style={{ lineHeight: 1.6 }}>
            1. Please pay within the due date; overdue interest @ 18% per annum will be charged on delayed payments.<br />
            2. Please quote invoice number when remitting funds via NEFT/RTGS/UPI.<br />
            3. Goods or services rendered under this tax invoice are subject to local jurisdiction.
          </Text>

          {invoice.notes && !invoice.notes.startsWith('Generated for') && (
            <Box mt={10}>
              <Text size="11px" fw={700} c="#0F172A" tt="uppercase" style={{ letterSpacing: '0.04em' }} mb={4}>
                Additional Notes
              </Text>
              <Text size="11px" c="#64748B" style={{ lineHeight: 1.5 }}>
                {invoice.notes}
              </Text>
            </Box>
          )}

          <Text size="10px" c="#94A3B8" mt={12} style={{ fontStyle: 'italic' }}>
            * This is a legally valid computer-generated tax invoice issued by {companyName}.
          </Text>
        </Box>

        {/* Right: Official Authorized Signatory (Professional Letterhead Style) */}
        <Box
          style={{
            minWidth: 220,
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            paddingTop: 4,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#1E293B',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 4,
            }}
          >
            For {companyName}
          </Text>

          {/* Signature / Stamp Area */}
          <Box
            style={{
              height: 60,
              minWidth: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              margin: '8px 0 6px',
            }}
          >
            {signatureUrl ? (
              <img
                src={signatureUrl}
                alt="Authorized Signature"
                style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain' }}
              />
            ) : (
              <Box
                style={{
                  height: 40,
                  width: 180,
                  borderBottom: '1px solid #CBD5E1',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: 4,
                }}
              >
                <Text size="11px" c="#94A3B8" style={{ fontStyle: 'italic', letterSpacing: '0.02em' }}>
                  Authorized Signature
                </Text>
              </Box>
            )}
          </Box>

          {signatoryName && (
            <Text style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
              {signatoryName}
            </Text>
          )}
          {signatoryDesignation && (
            <Text style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>
              {signatoryDesignation}
            </Text>
          )}
          <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
            (Authorized Signatory)
          </Text>
        </Box>
      </Box>

      {/* 6. FOOTER */}
      {(companyEmail || companyPhone) && (
        <Box
          style={{
            borderTop: '1px solid #E2E8F0',
            paddingTop: 12,
            marginTop: 14,
            fontSize: 11,
            color: '#64748B',
            textAlign: 'center',
          }}
        >
          For any billing enquiries
          {companyEmail ? <>, email us on <b>{companyEmail}</b></> : null}
          {companyPhone ? <>{companyEmail ? ' or ' : ', '}call us on <b>{companyPhone}</b></> : null}
        </Box>
      )}
    </Paper>
  );
};
