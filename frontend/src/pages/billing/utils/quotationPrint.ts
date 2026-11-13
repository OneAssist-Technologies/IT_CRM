import { Quotation, BillingSettings } from '../../../types/billing';

/**
 * Converts Indian Rupee number into words (Crores, Lakhs, Thousands, Hundreds)
 */
export function numberToWords(num: number): string {
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

export function formatInr(val: number): string {
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Generates standalone, print-perfect HTML for a Quotation document
 */
export function generateQuotationPrintHtml(quotation: Quotation, settings?: BillingSettings | null): string {
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

  const companyName = settings?.companyName || 'OneAssist Technologies';
  const companyAddress = settings?.companyAddress || '';
  const companyGst = settings?.companyGst || '';
  const companyPan = settings?.companyPan || (companyGst && companyGst.length >= 12 ? companyGst.substring(2, 12) : '');

  let computedGrossSubtotal = 0;
  let computedTotalItemDiscount = 0;
  let computedTaxAmount = 0;

  const processedItems = (quotation.items || []).map((item, idx) => {
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
      discountDisplay = `₹ ${formatInr(lineDiscAmt)}`;
    }

    return {
      index: idx + 1,
      name: item.itemName || 'Item',
      description: item.description || '',
      taxRate,
      qty,
      rate: formatInr(lineRate),
      discountDisplay,
      hasDiscount: lineDiscAmt > 0,
      amount: formatInr(lineAmt),
    };
  });

  computedGrossSubtotal = Number(computedGrossSubtotal.toFixed(2));
  computedTotalItemDiscount = Number(computedTotalItemDiscount.toFixed(2));

  const grossSubtotal = computedGrossSubtotal > 0
    ? computedGrossSubtotal
    : (Number(quotation.subtotal) || 0) + computedTotalItemDiscount;

  const totalItemDiscount = computedTotalItemDiscount;
  const netSubtotal = Math.max(0, grossSubtotal - totalItemDiscount);

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

  const taxableAmount = Math.max(0, netSubtotal - overallDiscAmt);
  const gstAmount = Number(quotation.taxAmount) > 0 ? Number(quotation.taxAmount) : Number(computedTaxAmount.toFixed(2));
  const grandTotal = Number(quotation.grandTotal) > 0 ? Number(quotation.grandTotal) : Number((taxableAmount + gstAmount).toFixed(2));

  const overallDiscLabel = overallDiscType === 'percentage' && overallDiscVal > 0
    ? ` (${overallDiscVal}%)`
    : overallDiscType === 'fixed' && overallDiscAmt > 0
    ? ' (Fixed)'
    : '';

  const termsText = quotation.termsConditions || 
`1. Please pay within 15 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.
2. Please quote invoice number when remitting funds.`;


  const clientName = quotation.companyName || quotation.contactName || 'Client';
  const clientAddr = quotation.clientAddress || '';
  const clientPanGst = quotation.clientGst || 'Unregistered';

  const rowsHtml = processedItems.map((item, idx) => `
    <tr style="background-color: ${idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF'};">
      <td style="padding: 8px 10px; font-size: 11px; color: #1E293B; vertical-align: top;">
        <div style="font-weight: 600; color: #0F172A;">${item.index}. ${escapeHtml(item.name)}</div>
      </td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: center; color: #1E293B; vertical-align: top;">${item.qty}</td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; color: #1E293B; vertical-align: top;">₹ ${item.rate}</td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; color: ${item.hasDiscount ? '#0F172A' : '#94A3B8'}; font-weight: ${item.hasDiscount ? '600' : '400'}; vertical-align: top;">${item.discountDisplay}</td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; color: #0F172A; font-weight: 700; vertical-align: top;">₹ ${item.amount}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation_${quotation.quotationNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .quotation-canvas {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 4px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .quotation-title {
      font-size: 26px;
      font-weight: 800;
      color: #7C3AED;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .meta-row {
      display: flex;
      gap: 12px;
      margin-top: 6px;
      font-size: 11px;
    }
    .meta-label {
      color: #64748B;
      font-weight: 500;
      width: 85px;
    }
    .meta-value {
      color: #0F172A;
      font-weight: 700;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(14, 165, 233, 0.12));
      border: 1px solid rgba(79, 70, 229, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      box-sizing: border-box;
      flex-shrink: 0;
    }
    .logo-title {
      font-weight: 900;
      font-size: 16px;
      color: #0F172A;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }
    .logo-sub {
      font-weight: 700;
      font-size: 9.5px;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      line-height: 1.1;
      margin-top: 1px;
    }
    .cards-row {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      margin-bottom: 12px;
    }
    .info-card {
      flex: 1;
      background: #F1F5F9;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 10.5px;
    }
    .info-card-row {
      display: flex;
      margin-bottom: 5px;
      line-height: 1.35;
    }
    .info-card-row:last-child {
      margin-bottom: 0;
    }
    .info-card-label {
      color: #64748B;
      width: 80px;
      flex-shrink: 0;
    }
    .info-card-value {
      color: #0F172A;
      font-weight: 600;
    }
    .supply-row {
      display: flex;
      justify-content: center;
      gap: 50px;
      margin: 10px 0 14px 0;
      font-size: 10.5px;
    }
    .table-container {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .table-container th {
      background: #7C3AED;
      color: #FFFFFF;
      font-size: 10.5px;
      font-weight: 700;
      padding: 8px 10px;
      border: none;
    }
    .table-container td {
      border: 1px solid #E2E8F0;
      border-top: none;
    }
    .bottom-grid {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }
    .left-col {
      flex: 1.25;
      padding-right: 10px;
    }
    .right-col {
      flex: 1;
      background: #FAF5FF;
      border: 1px solid #E9D5FF;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .section-heading {
      font-size: 12px;
      font-weight: 700;
      color: #7C3AED;
      margin-bottom: 5px;
    }
    .notes-text {
      font-size: 10px;
      color: #475569;
      line-height: 1.5;
      white-space: pre-line;
      margin-bottom: 12px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .divider {
      height: 1px;
      background: #E2E8F0;
      margin: 6px 0;
    }
    .divider-bold {
      height: 1.5px;
      background: #CBD5E1;
      margin: 7px 0;
    }
    .grand-total-val {
      font-size: 19px;
      font-weight: 800;
      color: #7C3AED;
    }
    .signature-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 10px;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .quotation-canvas {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="quotation-canvas">
    <!-- Header -->
    <div class="header-row">
      <div>
        <div class="quotation-title">Quotation ${quotation.revisionName ? `<span style="font-size: 18px; color: #7C3AED; font-weight: 700; margin-left: 6px;">[${escapeHtml(quotation.revisionName)}]</span>` : ''}</div>
        <div class="meta-row">
          <span class="meta-label">Quotation#</span>
          <span class="meta-value">${escapeHtml(quotation.quotationNumber || cleanQuotationNumber)}</span>
        </div>
        ${quotation.version && quotation.version > 1 ? `
        <div class="meta-row" style="margin-top: 3px;">
          <span class="meta-label">Revision</span>
          <span class="meta-value" style="color: #7C3AED;">${escapeHtml(quotation.revisionName || `V${quotation.version}`)} (Original: ${escapeHtml(quotation.originalQuotationNumber || cleanQuotationNumber)})</span>
        </div>
        ` : ''}
        ${quotation.projectName ? `
        <div class="meta-row" style="margin-top: 3px;">
          <span class="meta-label">Project</span>
          <span class="meta-value">${escapeHtml(quotation.projectName)}</span>
        </div>
        ` : ''}
        <div class="meta-row" style="margin-top: 3px;">
          <span class="meta-label">Quotation Date</span>
          <span class="meta-value">${escapeHtml(quotationDateFormatted)}</span>
        </div>
      </div>

      <div class="logo-container">
        <div class="logo-box">
          <img src="/oneassist-logo.png" alt="OneAssist" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <div>
          <div class="logo-title">OneAssist <span style="color: #0EA5E9;">CRM</span></div>
          <div class="logo-sub">Technologies Pvt Ltd</div>
        </div>
      </div>
    </div>

    <!-- Quotation By and To Cards -->
    <div class="cards-row">
      <div class="info-card">
        <div class="info-card-row">
          <span class="info-card-label">Quotation by</span>
          <span class="info-card-value">${escapeHtml(companyName)}</span>
        </div>
        ${companyAddress ? `
        <div class="info-card-row">
          <span class="info-card-label">Address</span>
          <span style="color: #334155;">${escapeHtml(companyAddress)}</span>
        </div>
        ` : ''}
        <div class="info-card-row">
          <span class="info-card-label">GSTIN</span>
          <span class="info-card-value">${escapeHtml(companyGst || 'Unregistered')}</span>
        </div>
        ${companyPan ? `
        <div class="info-card-row">
          <span class="info-card-label">PAN</span>
          <span class="info-card-value">${escapeHtml(companyPan)}</span>
        </div>
        ` : ''}
      </div>

      <div class="info-card">
        <div class="info-card-row">
          <span class="info-card-label">Quotation to</span>
          <span class="info-card-value">${escapeHtml(clientName)}</span>
        </div>
        <div class="info-card-row">
          <span class="info-card-label">Address</span>
          <span style="color: #334155;">${escapeHtml(clientAddr || '—')}</span>
        </div>
        <div class="info-card-row">
          <span class="info-card-label">GSTIN / PAN</span>
          <span class="info-card-value">${escapeHtml(clientPanGst)}</span>
        </div>
      </div>
    </div>

    <!-- Supply Information -->
    <div class="supply-row">
      <div><span style="color: #64748B;">Place of Supply</span> <strong style="color: #0F172A; margin-left: 4px;">Tamil Nadu</strong></div>
      <div><span style="color: #64748B;">Country of Supply</span> <strong style="color: #0F172A; margin-left: 4px;">India</strong></div>
    </div>

    <!-- Items Table -->
    <table class="table-container">
      <thead>
        <tr>
          <th style="text-align: left; width: 42%;">Item #/Item description</th>
          <th style="text-align: center; width: 8%;">Qty.</th>
          <th style="text-align: right; width: 16%;">Rate</th>
          <th style="text-align: right; width: 18%;">Discount</th>
          <th style="text-align: right; width: 16%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- Bottom Section: Notes on Left, Totals Breakdown on Right -->
    <div class="bottom-grid">
      <div class="left-col">
        <div class="section-heading">Terms and Conditions</div>
        <div class="notes-text">${escapeHtml(termsText)}</div>


        <div style="font-size: 10px; color: #475569; margin-top: 14px;">
          For any enquiries, email us on <strong>billing@oneassist.tech</strong> or call us on <strong>+91 98765-43210</strong>
        </div>
      </div>

      <div class="right-col">
        <!-- 1. Subtotal before discounts -->
        <div class="totals-row">
          <span style="font-weight: 600; color: #0F172A;">Subtotal before discounts</span>
          <span style="font-weight: 700; color: #0F172A;">₹ ${formatInr(grossSubtotal)}</span>
        </div>

        <!-- 2. Total Item-wise Discount -->
        <div class="totals-row" style="color: #0F172A;">
          <span>Total Item-wise Discount</span>
          <span style="font-weight: 600;">${totalItemDiscount > 0 ? `- ₹ ${formatInr(totalItemDiscount)}` : '₹ 0.00'}</span>
        </div>

        <!-- 3. Overall Discount -->
        <div class="totals-row" style="color: #0F172A;">
          <span>Overall Discount</span>
          <span style="font-weight: 600;">${overallDiscAmt > 0 ? `- ₹ ${formatInr(overallDiscAmt)}` : '₹ 0.00'}</span>
        </div>

        <div class="divider"></div>

        <!-- 4. Taxable Amount -->
        <div class="totals-row">
          <span style="font-weight: 600; color: #0F172A;">Taxable Amount</span>
          <span style="font-weight: 700; color: #0F172A;">₹ ${formatInr(taxableAmount)}</span>
        </div>

        <!-- 5. GST Amount -->
        <div class="totals-row">
          <span style="font-weight: 600; color: #0F172A;">GST Amount</span>
          <span style="font-weight: 700; color: #0F172A;">₹ ${formatInr(gstAmount)}</span>
        </div>

        <div class="divider-bold"></div>

        <!-- 6. Grand Total -->
        <div class="totals-row" style="align-items: baseline; margin-top: 2px;">
          <span style="font-weight: 700; font-size: 13px; color: #0F172A;">Grand Total</span>
          <span class="grand-total-val">₹ ${formatInr(grandTotal)}</span>
        </div>

        <!-- In Words -->
        <div style="margin-top: 6px; font-size: 10px; line-height: 1.35;">
          <div style="color: #64748B;">Quotation Total (in words)</div>
          <div style="font-weight: 700; color: #0F172A; margin-top: 1px;">${escapeHtml(numberToWords(grandTotal))}</div>
        </div>

        <div class="divider" style="margin-top: 8px;"></div>

        <!-- Signature -->
        <div class="signature-block">
          <svg width="120" height="38" viewBox="0 0 130 46" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 34C22 20 32 14 38 24C44 32 34 44 44 37C54 30 60 16 68 22C74 27 70 40 78 38C86 36 100 20 110 17C120 14 105 34 122 30" stroke="#1E3A8A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M25 40C46 38 78 36 118 34" stroke="#1E3A8A" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <div style="font-size: 10px; font-weight: 600; color: #0F172A; margin-top: 4px;">For OneAssist Technologies Pvt Ltd</div>
          <div style="font-size: 10px; color: #64748B; font-weight: 500; margin-top: 1px;">Authorized Signatory</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Triggers browser print directly for the given Quotation
 * Opens the native Save as PDF / Print preview dialog directly with the full quotation in it
 */
export function printQuotationDirect(quotation: Quotation, settings?: BillingSettings | null): void {
  // 1. Clean up previous print iframe if present
  const existingFrame = document.getElementById('crm-quotation-print-frame');
  if (existingFrame) {
    existingFrame.remove();
  }

  // 2. Create isolated print iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'crm-quotation-print-frame';
  iframe.setAttribute('style', 'position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;pointer-events:none;z-index:-999;');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const html = generateQuotationPrintHtml(quotation, settings);
  doc.open();
  doc.write(html);
  doc.close();

  // 3. Trigger print once rendered
  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print failed, falling back to window.print', e);
      window.print();
    }
  };

  // Give brief moment for fonts and layouts to calculate
  if (iframe.contentWindow) {
    setTimeout(triggerPrint, 250);
  }
}
