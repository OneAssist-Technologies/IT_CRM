import { prisma } from '../config/prisma.js';
import { io } from '../utils/socket.js';
import { recordActivity } from './activity.service.js';

/**
 * -----------------------------------------------------------------------------
 * 1. BILLING SETTINGS SERVICE
 * -----------------------------------------------------------------------------
 */
export async function getBillingSettingsService() {
  let settings = await prisma.billingSettings.findUnique({
    where: { id: 'default_billing_settings' },
  });

  if (!settings) {
    settings = await prisma.billingSettings.create({
      data: {
        id: 'default_billing_settings',
        companyName: 'OneAssist Technologies',
        companyAddress: '',
        companyGst: '',
        companyPan: '',
        companyPhone: '',
        companyEmail: '',
        companyWebsite: '',
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        ifscCode: '',
        branchName: '',
        upiId: '',
        invoicePrefix: 'INV-2026-',
        invoiceNextNumber: 1,
        quotationPrefix: 'QUO-2026-',
        quotationNextNumber: 1001,
        orderPrefix: 'SO-2026-',
        orderNextNumber: 1001,
        paymentPrefix: 'PAY-2026-',
        paymentNextNumber: 1001,
        defaultTaxRate: 18.0,
        defaultPaymentTerms: 'Net 30',
        defaultTermsConditions:
          '1. Payment is due within the stipulated credit term from invoice date.\n2. In case of delayed payment, interest @ 18% per annum will be charged.\n3. Goods or services once delivered/rendered are not refundable.',
      },
    });
  }

  // Enrich with company_profile system settings (authorizedSignatory, signatureUrl, etc.)
  let profileVal = {};
  try {
    const profileSetting = await prisma.systemSetting.findUnique({
      where: { settingKey: 'company_profile' },
    });
    if (profileSetting?.value && typeof profileSetting.value === 'object') {
      profileVal = profileSetting.value;
    }
  } catch {}

  return {
    ...settings,
    companyName: settings.companyName || profileVal.companyName || profileVal.legalName || 'OneAssist Technologies',
    companyAddress: settings.companyAddress || profileVal.companyAddress || profileVal.address || '',
    companyGst: settings.companyGst || profileVal.companyGst || profileVal.gstNumber || '',
    companyPan: settings.companyPan || profileVal.companyPan || profileVal.panNumber || '',
    companyPhone: settings.companyPhone || profileVal.companyPhone || profileVal.phone || '',
    companyEmail: settings.companyEmail || profileVal.companyEmail || profileVal.email || '',
    companyWebsite: settings.companyWebsite || profileVal.companyWebsite || profileVal.website || '',
    companyLogoUrl: settings.companyLogoUrl || profileVal.companyLogoUrl || profileVal.logoUrl || '',
    bankName: settings.bankName || profileVal.bankName || '',
    accountNumber: settings.accountNumber || profileVal.accountNumber || '',
    accountHolderName: settings.accountHolderName || profileVal.accountHolderName || '',
    ifscCode: settings.ifscCode || profileVal.ifscCode || '',
    branchName: settings.branchName || profileVal.branchName || '',
    upiId: settings.upiId || profileVal.upiId || '',
    authorizedSignatory: profileVal.authorizedSignatory || 'Santhosh C',
    signatoryDesignation: profileVal.signatoryDesignation || 'Managing Director',
    signatureUrl: profileVal.signatureUrl || null,
  };
}

export async function updateBillingSettingsService(data, user) {
  const settings = await getBillingSettingsService();

  const updated = await prisma.billingSettings.update({
    where: { id: settings.id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  await logBillingAudit('Settings', settings.id, 'CONFIG', 'UPDATED', user?.name || user?.email || 'Admin', 'Updated billing settings');

  return updated;
}

export async function generateUniquePaymentNumber(settings) {
  let nextNum = settings.paymentNextNumber || 1001;
  const prefix = settings.paymentPrefix || 'PAY-2026-';

  while (true) {
    const candidatePadded = `${prefix}${String(nextNum).padStart(6, '0')}`;
    const candidateRaw = `${prefix}${nextNum}`;
    const existing = await prisma.payment.findFirst({
      where: {
        OR: [
          { paymentNumber: candidatePadded },
          { paymentNumber: candidateRaw },
        ],
      },
    });

    if (!existing) {
      await prisma.billingSettings.update({
        where: { id: settings.id },
        data: { paymentNextNumber: nextNum + 1 },
      });
      return candidatePadded;
    }
    nextNum += 1;
  }
}

/**
 * -----------------------------------------------------------------------------
 * 2. PRODUCTS & SERVICES CATALOGUE
 * -----------------------------------------------------------------------------
 */
const DEFAULT_CATALOGUE = [
  { itemCode: 'PRD-HRMS', name: 'HRMS', type: 'Product', description: 'Complete Human Resource Management & Payroll Suite', unitPrice: 120000, taxRate: 18, unit: 'License' },
  { itemCode: 'PRD-CRM', name: 'CRM', type: 'Product', description: 'Enterprise Sales & Lead Lifecycle CRM Platform', unitPrice: 150000, taxRate: 18, unit: 'License' },
  { itemCode: 'PRD-LEDGER', name: 'ledgerone', type: 'Product', description: 'Cloud Financial Accounting, Invoicing & GST Filing ERP', unitPrice: 85000, taxRate: 18, unit: 'Subscription/Yr' },
  { itemCode: 'PRD-ERP', name: 'Cloud ERP', type: 'Product', description: 'Multi-branch Enterprise Resource Planning System', unitPrice: 250000, taxRate: 18, unit: 'License' },
  { itemCode: 'SRV-WEBDEV', name: 'Website Development', type: 'Service', description: 'Custom responsive enterprise corporate portal & CMS', unitPrice: 75000, taxRate: 18, unit: 'Project' },
  { itemCode: 'SRV-SOFTDEV', name: 'Software Development', type: 'Service', description: 'Bespoke full-stack web and mobile application engineering', unitPrice: 150000, taxRate: 18, unit: 'Project' },
  { itemCode: 'SRV-CRMIMP', name: 'CRM Implementation', type: 'Service', description: 'End-to-end data migration, workflows, pipelines and team training', unitPrice: 60000, taxRate: 18, unit: 'Project' },
  { itemCode: 'SRV-MAINT', name: 'Software Maintenance', type: 'Service', description: 'Annual maintenance SLA, bug fixes, performance monitoring and updates', unitPrice: 35000, taxRate: 18, unit: 'Quarterly' },
  { itemCode: 'SRV-TECHSUPP', name: 'Technical Support', type: 'Service', description: '24/7 dedicated tier-3 technical and cloud infrastructure support', unitPrice: 25000, taxRate: 18, unit: 'Monthly' },
  { itemCode: 'SRV-ITCONS', name: 'IT Consulting', type: 'Service', description: 'System architecture, cybersecurity audit, and cloud optimization consulting', unitPrice: 50000, taxRate: 18, unit: 'Engagement' },
];

export async function getProductsServicesService(query = {}) {
  const { search, type, status } = query;
  const count = await prisma.billingProduct.count();

  // Auto-seed default catalogue if empty
  if (count === 0) {
    for (const item of DEFAULT_CATALOGUE) {
      await prisma.billingProduct.create({ data: item }).catch(() => {});
    }
  }

  const where = {};
  if (type && type !== 'All') {
    where.type = { equals: type, mode: 'insensitive' };
  }
  if (status && status !== 'All') {
    where.status = { equals: status, mode: 'insensitive' };
  }
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { itemCode: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.billingProduct.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // Enrich products with modules from Master Project if empty
  try {
    const masters = await prisma.masterProject.findMany();
    for (const item of items) {
      const hasModules = Array.isArray(item.modules) && item.modules.length > 0;
      if (!hasModules) {
        const matched = masters.find(
          (m) => m.name && m.name.toLowerCase() === item.name.toLowerCase()
        );
        if (matched && Array.isArray(matched.modules) && matched.modules.length > 0) {
          item.modules = matched.modules;
        }
      }
    }
  } catch (err) {
    // Non-blocking fallback
  }

  return items;
}

export async function createProductService(data, user) {
  if (!data.name || !data.name.trim()) {
    const err = new Error('Product or Service name is required.');
    err.status = 400;
    throw err;
  }

  let itemCode = (data.itemCode || '').trim();
  if (!itemCode) {
    const prefix = data.type === 'Service' ? 'SRV' : 'PRD';
    const rand = Math.floor(1000 + Math.random() * 9000);
    itemCode = `${prefix}-${rand}`;
  }

  const existing = await prisma.billingProduct.findUnique({ where: { itemCode } });
  if (existing) {
    itemCode = `${itemCode}-${Date.now().toString().slice(-4)}`;
  }

  const product = await prisma.billingProduct.create({
    data: {
      itemCode,
      name: data.name.trim(),
      type: data.type || 'Product',
      description: data.description ? data.description.trim() : null,
      unitPrice: Number(data.unitPrice) || 0,
      taxRate: Number(data.taxRate) >= 0 ? Number(data.taxRate) : 18.0,
      unit: data.unit ? data.unit.trim() : 'Unit',
      status: data.status || 'Active',
      modules: Array.isArray(data.modules) ? data.modules : [],
    },
  });

  await logBillingAudit('Product', product.id, product.itemCode, 'CREATED', user?.name || user?.email || 'User', `Created ${product.type}: ${product.name}`);

  return product;
}

export async function updateProductService(id, data, user) {
  const existing = await prisma.billingProduct.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Product or Service record not found.');
    err.status = 404;
    throw err;
  }

  const updated = await prisma.billingProduct.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      type: data.type !== undefined ? data.type : existing.type,
      description: data.description !== undefined ? (data.description ? data.description.trim() : null) : existing.description,
      unitPrice: data.unitPrice !== undefined ? Number(data.unitPrice) : existing.unitPrice,
      taxRate: data.taxRate !== undefined ? Number(data.taxRate) : existing.taxRate,
      unit: data.unit !== undefined ? data.unit.trim() : existing.unit,
      status: data.status !== undefined ? data.status : existing.status,
      modules: data.modules !== undefined ? (Array.isArray(data.modules) ? data.modules : []) : existing.modules,
    },
  });

  await logBillingAudit('Product', updated.id, updated.itemCode, 'UPDATED', user?.name || user?.email || 'User', `Updated ${updated.name}`);

  return updated;
}

export async function deleteProductService(id, user) {
  const existing = await prisma.billingProduct.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Product not found.');
    err.status = 404;
    throw err;
  }

  await prisma.billingProduct.delete({ where: { id } });
  await logBillingAudit('Product', id, existing.itemCode, 'DELETED', user?.name || user?.email || 'User', `Deleted ${existing.name}`);
  return true;
}

/**
 * -----------------------------------------------------------------------------
 * 3. QUOTATIONS SERVICE
 * -----------------------------------------------------------------------------
 */
export async function getQuotationsService(query = {}) {
  const { status, search, contactId, leadId, flat } = query;
  const where = {};

  if (contactId && contactId !== 'All') {
    where.contactId = contactId;
  }
  if (leadId && leadId !== 'All') {
    where.leadId = leadId;
  }
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { quotationNumber: { contains: q, mode: 'insensitive' } },
      { originalQuotationNumber: { contains: q, mode: 'insensitive' } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { companyName: { contains: q, mode: 'insensitive' } },
      { projectName: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }

  // If flat requested, return individual records
  if (flat === 'true') {
    if (status && status !== 'All') {
      where.status = { equals: status, mode: 'insensitive' };
    }
    return await prisma.quotation.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Hierarchical view: Find root quotations (parentQuotationId is null)
  // and include all revisions ordered by version ascending
  const rootWhere = {
    ...where,
    parentQuotationId: null,
  };

  const quotes = await prisma.quotation.findMany({
    where: rootWhere,
    include: {
      items: true,
      revisions: {
        include: { items: true },
        orderBy: { version: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Normalize each quotation family
  const formatted = quotes.map((q) => {
    const childRevisions = q.revisions || [];
    // The family includes parent (as V1) and all child revisions (V2, V3...)
    const allRevisions = [q, ...childRevisions].sort((a, b) => (a.version || 1) - (b.version || 1));
    const latestRevision = allRevisions[allRevisions.length - 1] || q;

    return {
      ...q,
      allRevisions,
      latestVersion: latestRevision.version || 1,
      latestRevisionName: latestRevision.revisionName || `V${latestRevision.version || 1}`,
      latestGrandTotal: latestRevision.grandTotal,
      latestStatus: latestRevision.status,
      latestQuotationDate: latestRevision.quotationDate,
      latestQuotationId: latestRevision.id,
      latestQuotationNumber: latestRevision.quotationNumber,
      projectName: latestRevision.projectName || q.projectName || null,
      revisionCount: allRevisions.length,
      hasRevisions: allRevisions.length > 1,
    };
  });

  // Filter by status if provided (match against latest or root status)
  if (status && status !== 'All') {
    const sLow = status.toLowerCase();
    return formatted.filter((f) => 
      f.latestStatus?.toLowerCase() === sLow || f.status?.toLowerCase() === sLow
    );
  }

  return formatted;
}

export async function getQuotationByIdService(id) {
  const quote = await prisma.quotation.findFirst({
    where: { OR: [{ id }, { quotationNumber: id }] },
    include: {
      items: true,
      revisions: {
        include: { items: true },
        orderBy: { version: 'asc' },
      },
      parentQuotation: {
        include: {
          items: true,
          revisions: {
            include: { items: true },
            orderBy: { version: 'asc' },
          },
        },
      },
    },
  });

  if (!quote) {
    const err = new Error('Quotation not found.');
    err.status = 404;
    throw err;
  }

  // Extract all revisions in the family
  let allRevisions = [];
  if (quote.parentQuotation) {
    const root = quote.parentQuotation;
    allRevisions = [root, ...(root.revisions || [])].sort((a, b) => (a.version || 1) - (b.version || 1));
  } else {
    allRevisions = [quote, ...(quote.revisions || [])].sort((a, b) => (a.version || 1) - (b.version || 1));
  }

  const latest = allRevisions[allRevisions.length - 1] || quote;

  return {
    ...quote,
    allRevisions,
    latestVersion: latest.version || 1,
    latestRevisionName: latest.revisionName || `V${latest.version || 1}`,
    latestGrandTotal: latest.grandTotal,
    latestStatus: latest.status,
    revisionCount: allRevisions.length,
    hasRevisions: allRevisions.length > 1,
  };
}

export async function createQuotationService(data, user) {
  if (!data.contactName?.trim()) {
    const err = new Error('Client / Contact Name is required.');
    err.status = 400;
    throw err;
  }

  // Sequence Generation
  const settings = await getBillingSettingsService();
  const nextNum = settings.quotationNextNumber || 1001;
  const quotationNumber = `${settings.quotationPrefix || 'QUO-2026-'}${nextNum}`;

  // Update Settings sequence
  await prisma.billingSettings.update({
    where: { id: settings.id },
    data: { quotationNextNumber: nextNum + 1 },
  });

  // Calculate Line Items
  const rawItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];
  let subtotal = 0;
  let totalTax = 0;

  const itemsToCreate = rawItems.map((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const itemDisc = Number(item.discount) || 0;
    const lineSubtotal = Math.max(0, qty * price - itemDisc);
    const taxRate = item.taxRate !== undefined ? Number(item.taxRate) : 18.0;
    const taxAmt = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
    const totalAmount = lineSubtotal + taxAmt;

    subtotal += lineSubtotal;
    totalTax += taxAmt;

    return {
      productId: item.productId || null,
      itemCode: item.itemCode || null,
      itemName: item.itemName?.trim() || 'Item',
      itemType: item.itemType || 'Product',
      description: item.description ? item.description.trim() : null,
      quantity: qty,
      unitPrice: price,
      discount: itemDisc,
      taxRate: taxRate,
      taxAmount: taxAmt,
      totalAmount: totalAmount,
    };
  });

  // Quotation-level Discount
  let discountAmount = 0;
  if (data.discountType === 'percentage') {
    discountAmount = (subtotal * (Number(data.discountValue) || 0)) / 100;
  } else {
    discountAmount = Number(data.discountValue) || 0;
  }
  discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

  const grandTotal = Math.max(0, subtotal - discountAmount + totalTax);

  const quote = await prisma.quotation.create({
    data: {
      quotationNumber,
      originalQuotationNumber: quotationNumber,
      version: 1,
      revisionNumber: 1,
      revisionName: 'V1',
      isLatest: true,
      projectName: data.projectName?.trim() || null,
      parentQuotationId: null,
      contactId: data.contactId || null,
      contactName: data.contactName.trim(),
      contactEmail: data.contactEmail ? data.contactEmail.trim() : null,
      contactPhone: data.contactPhone ? data.contactPhone.trim() : null,
      companyName: data.companyName ? data.companyName.trim() : null,
      clientGst: data.clientGst ? data.clientGst.trim() : null,
      clientAddress: data.clientAddress ? data.clientAddress.trim() : null,
      leadId: data.leadId || null,
      quotationDate: data.quotationDate || new Date().toISOString().split('T')[0],
      validUntil: data.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: data.status || 'Draft',
      currency: data.currency || 'INR',
      subtotal: Number(subtotal.toFixed(2)),
      discountType: data.discountType || 'percentage',
      discountValue: Number(data.discountValue) || 0,
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(totalTax.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      paymentTerms: data.paymentTerms || settings.defaultPaymentTerms || 'Net 30',
      notes: data.notes ? data.notes.trim() : null,
      termsConditions: data.termsConditions ? data.termsConditions.trim() : settings.defaultTermsConditions,
      salesOwnerId: user?.id || null,
      salesOwnerName: user?.name || null,
      items: {
        create: itemsToCreate,
      },
    },
    include: { items: true },
  });

  await logBillingAudit('Quotation', quote.id, quote.quotationNumber, 'CREATED', user?.name || user?.email || 'User', `Created quote for ₹${quote.grandTotal}`);

  // Automatically record activity in timeline
  try {
    const amountStr = quote.grandTotal ? ` · ₹ ${Math.round(quote.grandTotal).toLocaleString('en-IN')}` : '';
    await recordActivity({
      type: 'proposal',
      title: quote.status === 'Accepted' ? 'Quotation Accepted' : 'Quotation Sent',
      description: `Quotation #${quote.quotationNumber}${amountStr} · ${quote.status || 'Awaiting Client'}`,
      leadId: quote.leadId,
      customerName: quote.companyName || quote.contactName,
      entityId: quote.id,
      entityType: 'Quotation',
      entityNumber: quote.quotationNumber,
      amount: quote.grandTotal || 0,
      status: quote.status || 'Sent',
      performedBy: user?.name || quote.salesOwnerName || 'Staff',
      activityDate: quote.quotationDate,
    });
  } catch (_) {}

  return quote;
}

export async function updateQuotationService(id, data, user) {
  let existing = await prisma.quotation.findFirst({
    where: { OR: [{ id }, { quotationNumber: id }] },
    include: { items: true },
  });

  if (!existing) {
    // If not found in DB but lead/contact context is provided, auto-create it gracefully
    if (data.leadId || data.contactId || data.companyName || data.contactName) {
      return createQuotationService(
        {
          ...data,
          quotationNumber: id && !id.startsWith('quo-') ? id : undefined,
        },
        user
      );
    }
    const err = new Error('Quotation not found.');
    err.status = 404;
    throw err;
  }

  // Recalculate if items or discount passed
  let updateData = {};
  if (data.status) updateData.status = data.status;
  if (data.quotationDate) updateData.quotationDate = data.quotationDate;
  if (data.validUntil) updateData.validUntil = data.validUntil;
  if (data.paymentTerms) updateData.paymentTerms = data.paymentTerms;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.termsConditions !== undefined) updateData.termsConditions = data.termsConditions;
  if (data.companyName !== undefined) updateData.companyName = data.companyName;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;

  if (Array.isArray(data.items)) {
    await prisma.quotationItem.deleteMany({ where: { quotationId: existing.id } });

    let subtotal = 0;
    let totalTax = 0;
    const itemsToCreate = data.items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const itemDisc = Number(item.discount) || 0;
      const lineSubtotal = Math.max(0, qty * price - itemDisc);
      const taxRate = item.taxRate !== undefined ? Number(item.taxRate) : 18.0;
      const taxAmt = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
      const totalAmount = lineSubtotal + taxAmt;

      subtotal += lineSubtotal;
      totalTax += taxAmt;

      return {
        productId: item.productId || null,
        itemCode: item.itemCode || null,
        itemName: item.itemName?.trim() || 'Item',
        itemType: item.itemType || 'Product',
        description: item.description ? item.description.trim() : null,
        quantity: qty,
        unitPrice: price,
        discount: itemDisc,
        taxRate: taxRate,
        taxAmount: taxAmt,
        totalAmount: totalAmount,
      };
    });

    const discType = data.discountType || existing.discountType;
    const discVal = data.discountValue !== undefined ? Number(data.discountValue) : existing.discountValue;
    let discountAmount = discType === 'percentage' ? (subtotal * discVal) / 100 : discVal;
    discountAmount = Math.min(subtotal, Math.max(0, discountAmount));
    const grandTotal = Math.max(0, subtotal - discountAmount + totalTax);

    updateData = {
      ...updateData,
      subtotal: Number(subtotal.toFixed(2)),
      discountType: discType,
      discountValue: discVal,
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(totalTax.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      items: { create: itemsToCreate },
    };
  }

  const updated = await prisma.quotation.update({
    where: { id: existing.id },
    data: updateData,
    include: { items: true },
  });

  await logBillingAudit('Quotation', updated.id, updated.quotationNumber, 'UPDATED', user?.name || user?.email || 'User', `Updated quotation details.`);

  return updated;
}

export async function deleteQuotationService(id, user) {
  const quote = await prisma.quotation.findFirst({
    where: { OR: [{ id }, { quotationNumber: id }] },
  });

  if (!quote) {
    const err = new Error('Quotation not found.');
    err.status = 404;
    throw err;
  }

  // Delete line items first
  await prisma.quotationItem.deleteMany({
    where: { quotationId: quote.id },
  }).catch(() => {});

  // Delete quotation
  await prisma.quotation.delete({
    where: { id: quote.id },
  });

  await logBillingAudit(
    'Quotation',
    quote.id,
    quote.quotationNumber,
    'DELETED',
    user?.name || user?.email || 'User',
    `Deleted quotation ${quote.quotationNumber}`
  ).catch(() => {});

  return { message: 'Quotation deleted successfully.' };
}

/**
 * Create a new linked Revision for a Quotation (V2, V3, etc.)
 */
export async function createQuotationRevisionService(id, data = {}, user) {
  // Find source quotation
  const source = await prisma.quotation.findFirst({
    where: { OR: [{ id }, { quotationNumber: id }] },
    include: { items: true },
  });

  if (!source) {
    const err = new Error('Original quotation record not found.');
    err.status = 404;
    throw err;
  }

  // Determine root quotation: if source has parentQuotationId, root is parent; else source is root
  const rootId = source.parentQuotationId || source.id;
  const root = await prisma.quotation.findUnique({
    where: { id: rootId },
    include: { revisions: true },
  });

  if (!root) {
    const err = new Error('Root quotation record not found.');
    err.status = 404;
    throw err;
  }

  // All existing versions in family
  const family = [root, ...(root.revisions || [])];
  const maxVersion = Math.max(...family.map((q) => q.version || 1), 1);
  const nextVersion = maxVersion + 1;
  const revisionName = `V${nextVersion}`;
  const baseQuotationNumber = root.originalQuotationNumber || root.quotationNumber;
  const revisionQuotationNumber = `${baseQuotationNumber}-V${nextVersion}`;

  // Line Items: use data.items if provided (and non-empty), otherwise clone from source.items
  const rawItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : source.items;
  let subtotal = 0;
  let totalTax = 0;

  const itemsToCreate = rawItems.map((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const itemDisc = Number(item.discount) || 0;
    const lineSubtotal = Math.max(0, qty * price - itemDisc);
    const taxRate = item.taxRate !== undefined ? Number(item.taxRate) : 18.0;
    const taxAmt = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
    const totalAmount = lineSubtotal + taxAmt;

    subtotal += lineSubtotal;
    totalTax += taxAmt;

    return {
      productId: item.productId || null,
      itemCode: item.itemCode || null,
      itemName: item.itemName?.trim() || 'Item',
      itemType: item.itemType || 'Product',
      description: item.description ? item.description.trim() : null,
      quantity: qty,
      unitPrice: price,
      discount: itemDisc,
      taxRate: taxRate,
      taxAmount: taxAmt,
      totalAmount: totalAmount,
    };
  });

  // Quotation-level Discount
  const discType = data.discountType || source.discountType || 'percentage';
  const discVal = data.discountValue !== undefined ? Number(data.discountValue) : Number(source.discountValue) || 0;
  let discountAmount = discType === 'percentage' ? (subtotal * discVal) / 100 : discVal;
  discountAmount = Math.min(subtotal, Math.max(0, discountAmount));
  const grandTotal = Math.max(0, subtotal - discountAmount + totalTax);

  const initialStatus = data.status || 'Draft';

  // Mark all older revisions as isLatest = false
  await prisma.quotation.updateMany({
    where: {
      OR: [{ id: root.id }, { parentQuotationId: root.id }],
    },
    data: { isLatest: false },
  });

  // If new revision is 'Sent', mark prior active versions (Sent / Changes Required) as Superseded
  if (initialStatus === 'Sent') {
    await prisma.quotation.updateMany({
      where: {
        OR: [{ id: root.id }, { parentQuotationId: root.id }],
        status: { in: ['Sent', 'Changes Required'] },
      },
      data: {
        status: 'Superseded',
        supersededAt: new Date(),
      },
    });
  }

  // Create new revision record
  const revision = await prisma.quotation.create({
    data: {
      quotationNumber: revisionQuotationNumber,
      originalQuotationNumber: baseQuotationNumber,
      version: nextVersion,
      revisionNumber: nextVersion,
      revisionName,
      isLatest: true,
      parentQuotationId: root.id,
      projectName: data.projectName !== undefined ? data.projectName?.trim() : (source.projectName || root.projectName),
      revisionNotes: data.revisionNotes?.trim() || `Revision ${revisionName} created from ${source.quotationNumber}`,
      contactId: data.contactId || source.contactId,
      contactName: data.contactName?.trim() || source.contactName,
      contactEmail: data.contactEmail !== undefined ? data.contactEmail?.trim() : source.contactEmail,
      contactPhone: data.contactPhone !== undefined ? data.contactPhone?.trim() : source.contactPhone,
      companyName: data.companyName !== undefined ? data.companyName?.trim() : source.companyName,
      clientGst: data.clientGst !== undefined ? data.clientGst?.trim() : source.clientGst,
      clientAddress: data.clientAddress !== undefined ? data.clientAddress?.trim() : source.clientAddress,
      leadId: data.leadId || source.leadId,
      quotationDate: data.quotationDate || new Date().toISOString().split('T')[0],
      validUntil: data.validUntil || source.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: initialStatus,
      sentAt: initialStatus === 'Sent' ? new Date() : null,
      currency: data.currency || source.currency || 'INR',
      subtotal: Number(subtotal.toFixed(2)),
      discountType: discType,
      discountValue: discVal,
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(totalTax.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      paymentTerms: data.paymentTerms || source.paymentTerms || 'Net 30',
      notes: data.notes !== undefined ? data.notes?.trim() : source.notes,
      termsConditions: data.termsConditions !== undefined ? data.termsConditions?.trim() : source.termsConditions,
      salesOwnerId: user?.id || source.salesOwnerId,
      salesOwnerName: user?.name || source.salesOwnerName,
      items: {
        create: itemsToCreate,
      },
    },
    include: { items: true },
  });

  await logBillingAudit(
    'Quotation',
    revision.id,
    revision.quotationNumber,
    'REVISED',
    user?.name || user?.email || 'User',
    `Created revision ${revisionName} (${revision.quotationNumber}) for original quotation ${baseQuotationNumber}. Total: ₹${revision.grandTotal}`
  );

  return revision;
}

/**
 * Update Quotation Status (with revision conflict and superseded management)
 */
export async function updateQuotationStatusService(id, status, user, notes = '') {
  const quote = await prisma.quotation.findFirst({
    where: { OR: [{ id }, { quotationNumber: id }] },
    include: { items: true },
  });

  if (!quote) {
    const err = new Error('Quotation not found.');
    err.status = 404;
    throw err;
  }

  // Prevent accepting or sending a superseded revision
  if (quote.status === 'Superseded' && (status === 'Accepted' || status === 'Sent')) {
    const err = new Error('Cannot accept or send a superseded quotation revision. Please work with the latest active revision.');
    err.status = 400;
    throw err;
  }

  // Root quotation id
  const rootId = quote.parentQuotationId || quote.id;

  // If status is being set to 'Accepted', prevent accepting an outdated revision if newer revision exists
  if (status === 'Accepted') {
    const newerRevisions = await prisma.quotation.findMany({
      where: {
        OR: [{ id: rootId }, { parentQuotationId: rootId }],
        version: { gt: quote.version || 1 },
      },
    });
    if (newerRevisions.length > 0) {
      const err = new Error(
        `Cannot accept an outdated revision (${quote.revisionName || 'V' + quote.version}). A newer revision (${newerRevisions[newerRevisions.length - 1].revisionName}) already exists.`
      );
      err.status = 400;
      throw err;
    }
  }

  const updatePayload = {
    status,
  };

  if (status === 'Sent') {
    updatePayload.sentAt = new Date();
    // When marking this revision as Sent, mark all older revisions in the family as Superseded
    await prisma.quotation.updateMany({
      where: {
        OR: [{ id: rootId }, { parentQuotationId: rootId }],
        id: { not: quote.id },
        status: { in: ['Sent', 'Changes Required', 'Draft'] },
        version: { lt: quote.version || 1 },
      },
      data: {
        status: 'Superseded',
        supersededAt: new Date(),
      },
    });
  } else if (status === 'Accepted') {
    updatePayload.acceptedAt = new Date();
  }

  if (notes) {
    updatePayload.revisionNotes = notes;
  }

  const updated = await prisma.quotation.update({
    where: { id: quote.id },
    data: updatePayload,
    include: { items: true },
  });

  await logBillingAudit(
    'Quotation',
    updated.id,
    updated.quotationNumber,
    'STATUS_CHANGE',
    user?.name || user?.email || 'User',
    `Quotation ${updated.quotationNumber} (${updated.revisionName || 'V' + updated.version}) status changed to ${status}. ${notes ? `Notes: ${notes}` : ''}`
  );

  return updated;
}

/**
 * Fetch all linked revisions in a quotation family
 */
export async function getQuotationRevisionsService(id) {
  const quote = await prisma.quotation.findFirst({
    where: { OR: [{ id }, { quotationNumber: id }] },
  });

  if (!quote) {
    const err = new Error('Quotation not found.');
    err.status = 404;
    throw err;
  }

  const rootId = quote.parentQuotationId || quote.id;
  const revisions = await prisma.quotation.findMany({
    where: {
      OR: [{ id: rootId }, { parentQuotationId: rootId }],
    },
    include: { items: true },
    orderBy: { version: 'asc' },
  });

  return revisions;
}

/**
 * Convert Accepted Quotation to Sales Order / Contract
 */
export async function convertQuotationToOrderService(id, data = {}, user) {
  const quote = await prisma.quotation.findFirst({
    where: { OR: [{ id }, { quotationNumber: id }] },
    include: { items: true },
  });

  if (!quote) {
    const err = new Error('Quotation record not found.');
    err.status = 404;
    throw err;
  }

  if (quote.status === 'Superseded') {
    const err = new Error('Cannot convert a superseded quotation revision to a Sales Order / Contract. Please use the accepted revision.');
    err.status = 400;
    throw err;
  }

  if (quote.convertedToOrderId) {
    const existingOrder = await prisma.salesOrder.findUnique({
      where: { id: quote.convertedToOrderId },
      include: { items: true },
    });
    if (existingOrder) {
      return existingOrder;
    }
  }

  // Sequence Generation
  const settings = await getBillingSettingsService();
  const nextNum = settings.orderNextNumber || 1001;
  const orderNumber = `${settings.orderPrefix || 'SO-2026-'}${nextNum}`;

  await prisma.billingSettings.update({
    where: { id: settings.id },
    data: { orderNextNumber: nextNum + 1 },
  });

  const billingMethod = data.billingMethod || (quote.items.some((i) => i.itemType === 'Service') ? 'Milestone' : 'Product');

  const order = await prisma.salesOrder.create({
    data: {
      orderNumber,
      quotationId: quote.id,
      contactId: quote.contactId,
      contactName: quote.contactName,
      contactEmail: quote.contactEmail,
      contactPhone: quote.contactPhone,
      companyName: quote.companyName,
      clientGst: quote.clientGst,
      clientAddress: quote.clientAddress,
      leadId: quote.leadId,
      billingMethod,
      contractValue: quote.grandTotal,
      currency: quote.currency || 'INR',
      orderDate: new Date().toISOString().split('T')[0],
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || null,
      paymentTerms: quote.paymentTerms || 'Net 30',
      status: 'Confirmed',
      notes: quote.notes,
      termsConditions: quote.termsConditions,
      items: {
        create: quote.items.map((i) => ({
          productId: i.productId,
          itemCode: i.itemCode,
          itemName: i.itemName,
          itemType: i.itemType,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate,
          taxAmount: i.taxAmount,
          totalAmount: i.totalAmount,
        })),
      },
    },
    include: { items: true },
  });

  // Mark Quotation as Accepted & Converted
  await prisma.quotation.update({
    where: { id: quote.id },
    data: {
      status: 'Accepted',
      convertedToOrderId: order.id,
      convertedAt: new Date(),
    },
  });

  // If milestone billing method, create initial milestone template
  if (billingMethod === 'Milestone') {
    const defaultMilestones = [
      { name: 'Milestone 1: Project Kickoff & UI/UX Sign-off', percentage: 25, amount: quote.grandTotal * 0.25 },
      { name: 'Milestone 2: Core Development & Alpha Release', percentage: 35, amount: quote.grandTotal * 0.35 },
      { name: 'Milestone 3: Beta Testing & UAT Sign-off', percentage: 25, amount: quote.grandTotal * 0.25 },
      { name: 'Milestone 4: Deployment & Final Handover', percentage: 15, amount: quote.grandTotal * 0.15 },
    ];

    for (let idx = 0; idx < defaultMilestones.length; idx++) {
      const m = defaultMilestones[idx];
      await prisma.billingMilestone.create({
        data: {
          salesOrderId: order.id,
          milestoneNumber: idx + 1,
          name: m.name,
          percentage: m.percentage,
          amount: Number(m.amount.toFixed(2)),
          status: 'Pending',
          isApproved: false,
          isInvoiceEligible: false,
        },
      });
    }
  }

  await logBillingAudit('SalesOrder', order.id, order.orderNumber, 'CONVERTED', user?.name || user?.email || 'User', `Converted quotation ${quote.quotationNumber} to Sales Order`);

  return order;
}

/**
 * -----------------------------------------------------------------------------
 * 4. SALES ORDERS & CONTRACTS SERVICE
 * -----------------------------------------------------------------------------
 */
export async function getSalesOrdersService(query = {}) {
  const { status, billingMethod, search, contactId } = query;
  const where = {};

  if (status && status !== 'All') {
    where.status = { equals: status, mode: 'insensitive' };
  }
  if (billingMethod && billingMethod !== 'All') {
    where.billingMethod = { equals: billingMethod, mode: 'insensitive' };
  }
  if (contactId && contactId !== 'All') {
    where.contactId = contactId;
  }
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { companyName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const orders = await prisma.salesOrder.findMany({
    where,
    include: {
      items: true,
      milestones: true,
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          grandTotal: true,
          amountPaid: true,
          outstandingBalance: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return orders;
}

export async function getSalesOrderByIdService(id) {
  const order = await prisma.salesOrder.findFirst({
    where: { OR: [{ id }, { orderNumber: id }] },
    include: {
      items: true,
      milestones: { orderBy: { milestoneNumber: 'asc' } },
      invoices: true,
    },
  });

  if (!order) {
    const err = new Error('Sales Order not found.');
    err.status = 404;
    throw err;
  }

  return order;
}

export async function createSalesOrderService(data, user) {
  if (!data.contactName?.trim()) {
    const err = new Error('Client Name is required.');
    err.status = 400;
    throw err;
  }

  const settings = await getBillingSettingsService();
  const nextNum = settings.orderNextNumber || 1001;
  const orderNumber = `${settings.orderPrefix || 'SO-2026-'}${nextNum}`;

  await prisma.billingSettings.update({
    where: { id: settings.id },
    data: { orderNextNumber: nextNum + 1 },
  });

  const rawItems = Array.isArray(data.items) ? data.items : [];
  let computedVal = 0;
  const itemsToCreate = rawItems.map((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const taxRate = Number(item.taxRate) || 18.0;
    const lineSub = qty * price;
    const taxAmt = Number(((lineSub * taxRate) / 100).toFixed(2));
    const total = lineSub + taxAmt;
    computedVal += total;

    return {
      productId: item.productId || null,
      itemCode: item.itemCode || null,
      itemName: item.itemName?.trim() || 'Item',
      itemType: item.itemType || 'Product',
      description: item.description ? item.description.trim() : null,
      quantity: qty,
      unitPrice: price,
      taxRate,
      taxAmount: taxAmt,
      totalAmount: total,
    };
  });

  const contractValue = data.contractValue !== undefined ? Number(data.contractValue) : computedVal;

  const order = await prisma.salesOrder.create({
    data: {
      orderNumber,
      quotationId: data.quotationId || null,
      contactId: data.contactId || null,
      contactName: data.contactName.trim(),
      contactEmail: data.contactEmail ? data.contactEmail.trim() : null,
      contactPhone: data.contactPhone ? data.contactPhone.trim() : null,
      companyName: data.companyName ? data.companyName.trim() : null,
      clientGst: data.clientGst ? data.clientGst.trim() : null,
      clientAddress: data.clientAddress ? data.clientAddress.trim() : null,
      leadId: data.leadId || null,
      dealId: data.dealId || null,
      billingMethod: data.billingMethod || 'Milestone',
      contractValue: Number(contractValue.toFixed(2)),
      currency: data.currency || 'INR',
      orderDate: data.orderDate || new Date().toISOString().split('T')[0],
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || null,
      paymentTerms: data.paymentTerms || settings.defaultPaymentTerms || 'Net 30',
      status: data.status || 'Confirmed',
      notes: data.notes ? data.notes.trim() : null,
      termsConditions: data.termsConditions ? data.termsConditions.trim() : settings.defaultTermsConditions,
      projectId: data.projectId || null,
      items: {
        create: itemsToCreate,
      },
    },
    include: { items: true },
  });

  await logBillingAudit('SalesOrder', order.id, order.orderNumber, 'CREATED', user?.name || user?.email || 'User', `Created Sales Order for ₹${order.contractValue}`);

  return order;
}

export async function updateSalesOrderService(id, data, user) {
  const existing = await prisma.salesOrder.findFirst({
    where: { OR: [{ id }, { orderNumber: id }] },
  });

  if (!existing) {
    const err = new Error('Sales Order not found.');
    err.status = 404;
    throw err;
  }

  const updated = await prisma.salesOrder.update({
    where: { id: existing.id },
    data: {
      status: data.status || existing.status,
      billingMethod: data.billingMethod || existing.billingMethod,
      contractValue: data.contractValue !== undefined ? Number(data.contractValue) : existing.contractValue,
      startDate: data.startDate !== undefined ? data.startDate : existing.startDate,
      endDate: data.endDate !== undefined ? data.endDate : existing.endDate,
      paymentTerms: data.paymentTerms || existing.paymentTerms,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      projectId: data.projectId !== undefined ? data.projectId : existing.projectId,
    },
  });

  await logBillingAudit('SalesOrder', updated.id, updated.orderNumber, 'UPDATED', user?.name || user?.email || 'User', `Updated sales order status to ${updated.status}`);

  return updated;
}

/**
 * -----------------------------------------------------------------------------
 * 5. PROJECTS & MILESTONES SERVICE
 * -----------------------------------------------------------------------------
 */
export async function getBillingProjectsService() {
  const [projects, orders] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.salesOrder.findMany({
      include: {
        milestones: { orderBy: { milestoneNumber: 'asc' } },
        invoices: true,
      },
    }),
  ]);

  // Combine project details with milestone & billing metrics
  const combined = projects.map((prj) => {
    const linkedOrder = orders.find((o) => o.projectId === prj.id || o.id === prj.salesOrderId);
    const milestones = linkedOrder ? linkedOrder.milestones : [];
    const invoices = linkedOrder ? linkedOrder.invoices : [];

    const contractValue = linkedOrder ? linkedOrder.contractValue : prj.estimatedBudget || 0;
    const totalInvoiced = invoices.reduce((acc, inv) => (inv.status !== 'Cancelled' ? acc + inv.grandTotal : acc), 0);
    const totalCollected = invoices.reduce((acc, inv) => (inv.status !== 'Cancelled' ? acc + inv.amountPaid : acc), 0);

    return {
      ...prj,
      linkedOrder: linkedOrder ? { id: linkedOrder.id, orderNumber: linkedOrder.orderNumber, billingMethod: linkedOrder.billingMethod } : null,
      contractValue,
      totalInvoiced,
      totalCollected,
      milestones,
    };
  });

  return combined;
}

export async function getMilestonesService(query = {}) {
  const { salesOrderId, projectId, status } = query;
  const where = {};
  if (salesOrderId) where.salesOrderId = salesOrderId;
  if (projectId) where.projectId = projectId;
  if (status && status !== 'All') where.status = { equals: status, mode: 'insensitive' };

  const milestones = await prisma.billingMilestone.findMany({
    where,
    orderBy: { milestoneNumber: 'asc' },
  });

  return milestones;
}

export async function createMilestoneService(data, user) {
  if (!data.name?.trim()) {
    const err = new Error('Milestone name is required.');
    err.status = 400;
    throw err;
  }

  const amount = Number(data.amount) || 0;
  if (amount <= 0) {
    const err = new Error('Milestone amount must be greater than zero.');
    err.status = 400;
    throw err;
  }

  // Contract value validation if salesOrderId is supplied
  if (data.salesOrderId) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: data.salesOrderId },
      include: { milestones: true },
    });

    if (order) {
      const existingSum = order.milestones.reduce((acc, m) => acc + m.amount, 0);
      if (data.validateContractTotal && existingSum + amount > order.contractValue + 1) {
        const err = new Error(`Total milestone amount (₹${existingSum + amount}) exceeds contract value (₹${order.contractValue}).`);
        err.status = 400;
        throw err;
      }
    }
  }

  const milestone = await prisma.billingMilestone.create({
    data: {
      salesOrderId: data.salesOrderId || null,
      projectId: data.projectId || null,
      projectName: data.projectName ? data.projectName.trim() : null,
      milestoneNumber: Number(data.milestoneNumber) || 1,
      name: data.name.trim(),
      description: data.description ? data.description.trim() : null,
      percentage: Number(data.percentage) || null,
      amount,
      dueDate: data.dueDate || null,
      status: data.status || 'Pending',
      isApproved: false,
      isInvoiceEligible: false,
    },
  });

  await logBillingAudit('Milestone', milestone.id, `M-${milestone.milestoneNumber}`, 'CREATED', user?.name || user?.email || 'User', `Created milestone: ${milestone.name} for ₹${milestone.amount}`);

  return milestone;
}

export async function updateMilestoneService(id, data, user) {
  const existing = await prisma.billingMilestone.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Milestone not found.');
    err.status = 404;
    throw err;
  }

  const newStatus = data.status || existing.status;
  const isApproved = data.isApproved !== undefined ? Boolean(data.isApproved) : existing.isApproved;

  // Invoice eligibility condition: Completed AND Approved
  const isInvoiceEligible = (newStatus === 'Completed' && isApproved) || Boolean(data.isInvoiceEligible);

  const updated = await prisma.billingMilestone.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      amount: data.amount !== undefined ? Number(data.amount) : existing.amount,
      percentage: data.percentage !== undefined ? Number(data.percentage) : existing.percentage,
      dueDate: data.dueDate !== undefined ? data.dueDate : existing.dueDate,
      status: newStatus,
      isApproved,
      approvedBy: isApproved ? (existing.approvedBy || user?.name || user?.email || 'Manager') : null,
      approvedAt: isApproved ? (existing.approvedAt || new Date()) : null,
      isInvoiceEligible,
    },
  });

  await logBillingAudit('Milestone', updated.id, `M-${updated.milestoneNumber}`, 'UPDATED', user?.name || user?.email || 'User', `Updated milestone ${updated.name} (Status: ${updated.status}, Approved: ${updated.isApproved})`);

  return updated;
}

export async function approveMilestoneService(id, user) {
  const milestone = await prisma.billingMilestone.findUnique({ where: { id } });
  if (!milestone) {
    const err = new Error('Milestone record not found.');
    err.status = 404;
    throw err;
  }

  const updated = await prisma.billingMilestone.update({
    where: { id },
    data: {
      isApproved: true,
      approvedBy: user?.name || user?.email || 'Manager',
      approvedAt: new Date(),
      isInvoiceEligible: milestone.status === 'Completed',
    },
  });

  await logBillingAudit('Milestone', updated.id, `M-${updated.milestoneNumber}`, 'APPROVED', user?.name || user?.email || 'User', `Approved milestone: ${updated.name}`);

  return updated;
}

/**
 * -----------------------------------------------------------------------------
 * 6. INVOICE MANAGEMENT SERVICE
 * -----------------------------------------------------------------------------
 */
export async function getInvoicesService(query = {}) {
  const { status, paymentStatus, search, contactId, customerId, salesOrderId, projectId, invoiceDate, dueDate, page, limit } = query;
  const where = {};

  if (status && status !== 'All') {
    where.status = { equals: status, mode: 'insensitive' };
  }
  const effectiveCustId = customerId || contactId;
  if (effectiveCustId && effectiveCustId !== 'All') {
    where.contactId = effectiveCustId;
  }
  if (salesOrderId && salesOrderId !== 'All') {
    where.salesOrderId = salesOrderId;
  }
  if (projectId && projectId !== 'All') {
    where.projectId = projectId;
  }
  if (invoiceDate && invoiceDate !== 'All') {
    where.invoiceDate = invoiceDate;
  }
  if (dueDate && dueDate !== 'All') {
    where.dueDate = dueDate;
  }
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { invoiceNumber: { contains: q, mode: 'insensitive' } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { companyName: { contains: q, mode: 'insensitive' } },
      { milestoneName: { contains: q, mode: 'insensitive' } },
      { clientGst: { contains: q, mode: 'insensitive' } },
    ];
  }

  const today = new Date().toISOString().split('T')[0];

  const totalCount = await prisma.invoice.count({ where });

  const findArgs = {
    where,
    include: {
      items: true,
      allocations: {
        include: {
          payment: {
            select: {
              id: true,
              paymentNumber: true,
              paymentDate: true,
              paymentMethod: true,
              transactionReference: true,
              amountReceived: true,
              notes: true,
              bankName: true,
              recordedBy: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  };

  if (page && limit) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 10);
    findArgs.skip = (p - 1) * l;
    findArgs.take = l;
  }

  const invoices = await prisma.invoice.findMany(findArgs);

  // Process invoices with computed paymentStatus and unpacked metadata
  const processed = invoices.map((inv) => {
    let effectiveStatus = inv.status;
    let computedPaymentStatus = 'Unpaid';

    if (effectiveStatus === 'Cancelled') {
      computedPaymentStatus = 'Cancelled';
    } else if (effectiveStatus === 'Paid' || inv.outstandingBalance <= 0.05) {
      computedPaymentStatus = 'Paid';
      effectiveStatus = 'Paid';
    } else if (inv.dueDate < today && inv.outstandingBalance > 0) {
      computedPaymentStatus = 'Overdue';
      if (effectiveStatus === 'Issued' || effectiveStatus === 'Draft') {
        effectiveStatus = 'Overdue';
      }
    } else if (inv.amountPaid > 0 && inv.outstandingBalance > 0) {
      computedPaymentStatus = 'Partially Paid';
      effectiveStatus = 'Partially Paid';
    } else {
      computedPaymentStatus = 'Unpaid';
    }

    const meta = inv.bankDetails && typeof inv.bankDetails === 'object' ? inv.bankDetails : {};

    return {
      ...inv,
      status: effectiveStatus,
      paymentStatus: effectiveStatus === 'Paid' ? 'Paid' : computedPaymentStatus,
      invoiceType: meta.invoiceType || 'One-Time',
      currency: meta.currency || 'INR',
      taxType: meta.taxType || (inv.clientGst?.startsWith('33') ? 'INTRA_STATE' : 'INTER_STATE'),
      cgstAmount: meta.cgstAmount ?? Number((inv.taxAmount / 2).toFixed(2)),
      sgstAmount: meta.sgstAmount ?? Number((inv.taxAmount / 2).toFixed(2)),
      igstAmount: meta.igstAmount ?? 0,
      additionalCharges: meta.additionalCharges ?? 0,
      taxableAmount: meta.taxableAmount ?? Number((inv.subtotal - inv.discountAmount).toFixed(2)),
      internalRemarks: meta.internalRemarks || null,
      approvedBy: meta.approvedBy || null,
      attachments: Array.isArray(meta.attachments) ? meta.attachments : [],
      customerTier: meta.customerTier || null,
      contactPerson: meta.contactPerson || inv.contactName,
      customerDetails: meta.customerDetails || null,
    };
  });

  // In-memory payment status filtering if explicitly requested
  let filtered = processed;
  if (paymentStatus && paymentStatus !== 'All') {
    filtered = processed.filter(
      (inv) => inv.paymentStatus.toLowerCase() === paymentStatus.toLowerCase()
    );
  }

  if (page && limit) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 10);
    return {
      data: filtered,
      pagination: {
        total: totalCount,
        page: p,
        limit: l,
        totalPages: Math.ceil(totalCount / l) || 1,
      },
    };
  }

  return filtered;
}

export async function getInvoiceByIdService(id) {
  const invoice = await prisma.invoice.findFirst({
    where: { OR: [{ id }, { invoiceNumber: id }] },
    include: {
      items: true,
      allocations: {
        include: {
          payment: true,
        },
      },
    },
  });

  if (!invoice) {
    const err = new Error('Invoice not found.');
    err.status = 404;
    throw err;
  }

  const today = new Date().toISOString().split('T')[0];
  let effectiveStatus = invoice.status;
  let computedPaymentStatus = 'Unpaid';

  if (effectiveStatus === 'Cancelled') {
    computedPaymentStatus = 'Cancelled';
  } else if (effectiveStatus === 'Paid' || invoice.outstandingBalance <= 0.05) {
    computedPaymentStatus = 'Paid';
    effectiveStatus = 'Paid';
  } else if (invoice.dueDate < today && invoice.outstandingBalance > 0) {
    computedPaymentStatus = 'Overdue';
    if (effectiveStatus === 'Issued' || effectiveStatus === 'Draft') {
      effectiveStatus = 'Overdue';
    }
  } else if (invoice.amountPaid > 0 && invoice.outstandingBalance > 0) {
    computedPaymentStatus = 'Partially Paid';
    effectiveStatus = 'Partially Paid';
  } else {
    computedPaymentStatus = 'Unpaid';
  }

  const meta = invoice.bankDetails && typeof invoice.bankDetails === 'object' ? invoice.bankDetails : {};

  // Fetch audit history for this invoice
  const activityLogs = await prisma.billingAuditLog.findMany({
    where: {
      OR: [
        { entityId: invoice.id },
        { entityNumber: invoice.invoiceNumber },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    ...invoice,
    status: effectiveStatus,
    paymentStatus: effectiveStatus === 'Paid' ? 'Paid' : computedPaymentStatus,
    invoiceType: meta.invoiceType || 'One-Time',
    currency: meta.currency || 'INR',
    taxType: meta.taxType || (invoice.clientGst?.startsWith('33') ? 'INTRA_STATE' : 'INTER_STATE'),
    cgstAmount: meta.cgstAmount ?? Number((invoice.taxAmount / 2).toFixed(2)),
    sgstAmount: meta.sgstAmount ?? Number((invoice.taxAmount / 2).toFixed(2)),
    igstAmount: meta.igstAmount ?? 0,
    additionalCharges: meta.additionalCharges ?? 0,
    taxableAmount: meta.taxableAmount ?? Number((invoice.subtotal - invoice.discountAmount).toFixed(2)),
    internalRemarks: meta.internalRemarks || null,
    approvedBy: meta.approvedBy || null,
    attachments: Array.isArray(meta.attachments) ? meta.attachments : [],
    customerTier: meta.customerTier || null,
    contactPerson: meta.contactPerson || invoice.contactName,
    activityLogs,
  };
}

export async function createInvoiceService(data, user) {
  if (!data.contactName?.trim() && !data.companyName?.trim()) {
    const err = new Error('Customer or Contact Name is required.');
    err.status = 400;
    throw err;
  }

  if (!data.projectName?.trim() && !data.projectTitle?.trim()) {
    const err = new Error('Project Title is required.');
    err.status = 400;
    throw err;
  }

  if (!data.invoiceDate) {
    const err = new Error('Date of Invoice is required.');
    err.status = 400;
    throw err;
  }

  if (!data.dueDate) {
    const err = new Error('Payment Due Date is required.');
    err.status = 400;
    throw err;
  }

  const rawItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];
  if (rawItems.length === 0) {
    const err = new Error('At least one line item is required.');
    err.status = 400;
    throw err;
  }

  for (let i = 0; i < rawItems.length; i++) {
    const it = rawItems[i];
    if (!it.itemName?.trim()) {
      const err = new Error(`Line Item #${i + 1}: Item Name / Service is required.`);
      err.status = 400;
      throw err;
    }
    if (Number(it.unitPrice || 0) <= 0) {
      const err = new Error(`Line Item #${i + 1} (${it.itemName}): Amount is required and must be greater than 0.`);
      err.status = 400;
      throw err;
    }
  }

  const settings = await getBillingSettingsService();
  let invoiceNumber = data.invoiceNumber?.trim();

  if (!invoiceNumber) {
    const nextNum = settings.invoiceNextNumber || 1001;
    const padded = String(nextNum).padStart(6, '0');
    invoiceNumber = `${settings.invoicePrefix || 'INV-2026-'}${padded}`;

    await prisma.billingSettings.update({
      where: { id: settings.id },
      data: { invoiceNextNumber: nextNum + 1 },
    });
  }

  // Ensure unique invoice number
  const existingNum = await prisma.invoice.findUnique({ where: { invoiceNumber } });
  if (existingNum) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    invoiceNumber = `${invoiceNumber}-${randomSuffix}`;
  }

  // Determine GST Tax Type: INTRA_STATE vs INTER_STATE vs EXPORT_NON_GST
  const taxType = data.taxType || (
    data.clientGst?.startsWith('33') || data.clientState?.toLowerCase().includes('tamil nadu')
      ? 'INTRA_STATE'
      : 'INTER_STATE'
  );

  // Line Items Calculation
  let subtotal = 0;
  let totalLineDiscounts = 0;
  let totalTax = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const itemsToCreate = rawItems.map((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const discPct = Number(item.discountPercent || item.discountPercentage || 0);
    let lineDisc = Number(item.discount) || 0;
    if (discPct > 0) {
      lineDisc = Number(((qty * price * discPct) / 100).toFixed(2));
    }
    const taxableLine = Math.max(0, qty * price - lineDisc);
    const taxRate = item.taxRate !== undefined ? Number(item.taxRate) : 18.0;
    const taxAmt = taxType === 'EXPORT_NON_GST' ? 0 : Number(((taxableLine * taxRate) / 100).toFixed(2));
    const totalAmount = taxableLine + taxAmt;

    subtotal += (qty * price);
    totalLineDiscounts += lineDisc;
    totalTax += taxAmt;

    if (taxType === 'INTRA_STATE') {
      totalCgst += Number((taxAmt / 2).toFixed(2));
      totalSgst += Number((taxAmt / 2).toFixed(2));
    } else if (taxType === 'INTER_STATE') {
      totalIgst += taxAmt;
    }

    return {
      productId: item.productId || null,
      itemCode: item.itemCode || null,
      itemName: item.itemName?.trim() || 'Software Service Deliverable',
      itemType: item.itemType || 'Service',
      description: item.description?.trim() || null,
      quantity: qty,
      unitPrice: price,
      discount: lineDisc,
      taxRate,
      taxAmount: taxAmt,
      totalAmount,
    };
  });

  const overallDiscount = Number(data.discountAmount || 0);
  const totalDiscount = totalLineDiscounts + overallDiscount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const additionalCharges = Number(data.additionalCharges || 0);
  const grandTotal = Math.max(0, taxableAmount + totalTax + additionalCharges);

  const initialPaymentAmount = Math.max(0, Math.min(grandTotal, Number(data.amountPaid || data.advanceAmount || 0)));
  const outstandingBalance = Math.max(0, Number((grandTotal - initialPaymentAmount).toFixed(2)));

  let status = data.status || 'Draft';
  if (initialPaymentAmount >= grandTotal && grandTotal > 0) {
    status = 'Paid';
  } else if (initialPaymentAmount > 0) {
    status = 'Partially Paid';
  }

  const paymentStatus = outstandingBalance === 0 && grandTotal > 0
    ? 'Paid'
    : (initialPaymentAmount > 0 ? 'Partially Paid' : 'Unpaid');

  const bankDetails = {
    bankName: data.bankDetails?.bankName || settings.bankName || '',
    accountNumber: data.bankDetails?.accountNumber || settings.accountNumber || '',
    accountHolderName: data.bankDetails?.accountHolderName || settings.accountHolderName || '',
    ifscCode: data.bankDetails?.ifscCode || settings.ifscCode || '',
    branchName: data.bankDetails?.branchName || settings.branchName || '',
    upiId: data.bankDetails?.upiId || settings.upiId || '',
    invoiceType: data.invoiceType || 'One-Time',
    currency: data.currency || 'INR',
    paymentStatus,
    taxType,
    cgstAmount: Number(totalCgst.toFixed(2)),
    sgstAmount: Number(totalSgst.toFixed(2)),
    igstAmount: Number(totalIgst.toFixed(2)),
    additionalCharges,
    taxableAmount: Number(taxableAmount.toFixed(2)),
    internalRemarks: data.internalRemarks?.trim() || null,
    approvedBy: data.approvedBy?.trim() || null,
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    customerTier: data.customerTier || 'Enterprise',
    contactPerson: data.contactPerson?.trim() || data.contactName?.trim(),
  };

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      contactId: data.customerId || data.contactId || null,
      contactName: (data.contactName || data.contactPerson || data.companyName).trim(),
      contactEmail: data.contactEmail ? data.contactEmail.trim() : null,
      contactPhone: data.contactPhone ? data.contactPhone.trim() : null,
      companyName: data.companyName ? data.companyName.trim() : data.contactName?.trim(),
      clientGst: data.clientGst ? data.clientGst.trim() : null,
      clientAddress: data.clientAddress ? data.clientAddress.trim() : null,
      leadId: data.leadId || null,
      salesOrderId: data.salesOrderId || null,
      projectId: data.projectId || null,
      projectName: data.projectName?.trim() || null,
      milestoneId: data.milestoneId || null,
      milestoneName: data.milestoneName?.trim() || null,
      invoiceDate: data.invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: data.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(totalDiscount.toFixed(2)),
      taxAmount: Number(totalTax.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      amountPaid: Number(initialPaymentAmount.toFixed(2)),
      outstandingBalance: Number(outstandingBalance.toFixed(2)),
      status,
      paymentTerms: data.paymentTerms || settings.defaultPaymentTerms || 'Net 30',
      notes: data.notes ? data.notes.trim() : null,
      termsConditions: data.termsConditions ? data.termsConditions.trim() : settings.defaultTermsConditions,
      bankDetails,
      issuedAt: status !== 'Draft' ? new Date() : null,
      createdBy: user?.name || user?.email || data.createdBy || 'Admin',
      items: {
        create: itemsToCreate,
      },
    },
    include: { items: true },
  });

  // If initial advance/payment was recorded, create payment entity & allocation
  if (initialPaymentAmount > 0) {
    const payNum = await generateUniquePaymentNumber(settings);

    await prisma.payment.create({
      data: {
        paymentNumber: payNum,
        contactId: invoice.contactId,
        clientName: invoice.companyName || invoice.contactName,
        paymentDate: data.paymentDate || invoice.invoiceDate,
        amountReceived: initialPaymentAmount,
        paymentMethod: data.paymentMethod || 'Bank Transfer',
        transactionReference: data.transactionReference ? data.transactionReference.trim() : null,
        bankName: data.bankName || 'HDFC Bank',
        notes: data.paymentNotes || 'Initial payment recorded during invoice creation',
        recordedBy: user?.name || user?.email || 'Admin',
        status: 'Completed',
        allocations: {
          create: [
            {
              invoiceId: invoice.id,
              amountAllocated: initialPaymentAmount,
            },
          ],
        },
      },
    });

    await logBillingAudit(
      'Payment',
      invoice.id,
      payNum,
      'PAYMENT_RECORDED',
      user?.name || 'Admin',
      `Initial payment of ₹${initialPaymentAmount} recorded for invoice ${invoice.invoiceNumber}`
    );
  }

  await logBillingAudit(
    'Invoice',
    invoice.id,
    invoice.invoiceNumber,
    'CREATED',
    user?.name || user?.email || 'User',
    `Created ${status} invoice for ${invoice.companyName || invoice.contactName} - Grand Total: ₹${invoice.grandTotal}`
  );

  // Automatically record activity in timeline
  try {
    const amountStr = invoice.grandTotal ? ` · ₹ ${Math.round(invoice.grandTotal).toLocaleString('en-IN')}` : '';
    await recordActivity({
      type: 'invoice',
      title: invoice.status === 'Paid' ? 'Invoice Paid' : 'Invoice Created',
      description: `Invoice #${invoice.invoiceNumber}${amountStr} · ${invoice.status || 'Issued'}`,
      leadId: invoice.leadId,
      customerName: invoice.companyName || invoice.contactName,
      entityId: invoice.id,
      entityType: 'Invoice',
      entityNumber: invoice.invoiceNumber,
      amount: invoice.grandTotal || 0,
      status: invoice.status || 'Created',
      performedBy: user?.name || invoice.createdBy || 'Staff',
      activityDate: invoice.invoiceDate,
    });
  } catch (_) {}

  return invoice;
}

export async function updateInvoiceService(id, data, user) {
  const existing = await prisma.invoice.findFirst({
    where: { OR: [{ id }, { invoiceNumber: id }] },
    include: { items: true },
  });

  if (!existing) {
    const err = new Error('Invoice not found.');
    err.status = 404;
    throw err;
  }

  const isDraft = existing.status === 'Draft';
  const meta = existing.bankDetails && typeof existing.bankDetails === 'object' ? { ...existing.bankDetails } : {};

  // Update metadata fields
  if (data.invoiceType) meta.invoiceType = data.invoiceType;
  if (data.currency) meta.currency = data.currency;
  if (data.taxType) meta.taxType = data.taxType;
  if (data.internalRemarks !== undefined) meta.internalRemarks = data.internalRemarks;
  if (data.approvedBy !== undefined) meta.approvedBy = data.approvedBy;
  if (data.attachments !== undefined) meta.attachments = data.attachments;
  if (data.contactPerson !== undefined) meta.contactPerson = data.contactPerson;

  // Allow full re-calculation and saving of line items whenever items are provided
  if (Array.isArray(data.items)) {
    if (data.items.length === 0) {
      const err = new Error('At least one line item is required.');
      err.status = 400;
      throw err;
    }
    for (let i = 0; i < data.items.length; i++) {
      const it = data.items[i];
      if (!it.itemName?.trim()) {
        const err = new Error(`Line Item #${i + 1}: Item Name / Service is required.`);
        err.status = 400;
        throw err;
      }
      if (Number(it.unitPrice || 0) <= 0) {
        const err = new Error(`Line Item #${i + 1} (${it.itemName}): Amount is required and must be greater than 0.`);
        err.status = 400;
        throw err;
      }
    }

    const taxType = data.taxType || meta.taxType || 'INTRA_STATE';
    let subtotal = 0;
    let totalLineDiscounts = 0;
    let totalTax = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const itemsToCreate = data.items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const discPct = Number(item.discountPercent || item.discountPercentage || 0);
      let lineDisc = Number(item.discount) || 0;
      if (discPct > 0) {
        lineDisc = Number(((qty * price * discPct) / 100).toFixed(2));
      }
      const taxableLine = Math.max(0, qty * price - lineDisc);
      const taxRate = item.taxRate !== undefined ? Number(item.taxRate) : 18.0;
      const taxAmt = taxType === 'EXPORT_NON_GST' ? 0 : Number(((taxableLine * taxRate) / 100).toFixed(2));
      const totalAmount = taxableLine + taxAmt;

      subtotal += (qty * price);
      totalLineDiscounts += lineDisc;
      totalTax += taxAmt;

      if (taxType === 'INTRA_STATE') {
        totalCgst += Number((taxAmt / 2).toFixed(2));
        totalSgst += Number((taxAmt / 2).toFixed(2));
      } else if (taxType === 'INTER_STATE') {
        totalIgst += taxAmt;
      }

      return {
        productId: item.productId || null,
        itemCode: item.itemCode || null,
        itemName: item.itemName?.trim() || 'Software Service Deliverable',
        itemType: item.itemType || 'Service',
        description: item.description?.trim() || null,
        quantity: qty,
        unitPrice: price,
        discount: lineDisc,
        taxRate,
        taxAmount: taxAmt,
        totalAmount,
      };
    });

    const overallDiscount = Number(data.discountAmount ?? existing.discountAmount ?? 0);
    const totalDiscount = totalLineDiscounts + overallDiscount;
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const additionalCharges = Number(data.additionalCharges || meta.additionalCharges || 0);
    const grandTotal = Math.max(0, taxableAmount + totalTax + additionalCharges);

    let initialPaymentAmount = data.amountPaid !== undefined || data.advanceAmount !== undefined
      ? Math.max(0, Math.min(grandTotal, Number(data.amountPaid ?? data.advanceAmount ?? 0)))
      : existing.amountPaid;
    let outstandingBalance = Math.max(0, Number((grandTotal - initialPaymentAmount).toFixed(2)));

    let status = data.status || existing.status;
    if (data.status === 'Paid' || status === 'Paid') {
      status = 'Paid';
      initialPaymentAmount = grandTotal;
      outstandingBalance = 0;
    } else if (data.status === 'Issued' || data.status === 'Unpaid') {
      status = 'Issued';
      initialPaymentAmount = 0;
      outstandingBalance = grandTotal;
    } else if (data.status) {
      status = data.status;
    } else if (initialPaymentAmount >= grandTotal && grandTotal > 0) {
      status = 'Paid';
      initialPaymentAmount = grandTotal;
      outstandingBalance = 0;
    } else if (initialPaymentAmount > 0) {
      status = 'Partially Paid';
    }

    meta.cgstAmount = Number(totalCgst.toFixed(2));
    meta.sgstAmount = Number(totalSgst.toFixed(2));
    meta.igstAmount = Number(totalIgst.toFixed(2));
    meta.taxableAmount = Number(taxableAmount.toFixed(2));
    meta.additionalCharges = additionalCharges;

    // Delete old items and insert updated ones
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });

    const updated = await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        contactId: data.customerId || data.contactId || existing.contactId,
        contactName: data.contactName?.trim() || existing.contactName,
        contactEmail: data.contactEmail !== undefined ? data.contactEmail : existing.contactEmail,
        contactPhone: data.contactPhone !== undefined ? data.contactPhone : existing.contactPhone,
        companyName: data.companyName?.trim() || existing.companyName,
        clientGst: data.clientGst !== undefined ? data.clientGst : existing.clientGst,
        clientAddress: data.clientAddress !== undefined ? data.clientAddress : existing.clientAddress,
        projectId: data.projectId !== undefined ? data.projectId : existing.projectId,
        projectName: data.projectName !== undefined ? data.projectName : existing.projectName,
        invoiceDate: data.invoiceDate || existing.invoiceDate,
        dueDate: data.dueDate || existing.dueDate,
        paymentTerms: data.paymentTerms || existing.paymentTerms,
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount: Number(totalDiscount.toFixed(2)),
        taxAmount: Number(totalTax.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
        amountPaid: initialPaymentAmount,
        outstandingBalance,
        status,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        termsConditions: data.termsConditions !== undefined ? data.termsConditions : existing.termsConditions,
        bankDetails: meta,
        items: {
          create: itemsToCreate,
        },
      },
      include: { items: true },
    });

    if (status === 'Paid') {
      const existingAllocs = await prisma.paymentAllocation.findMany({
        where: { invoiceId: updated.id },
      });
      const alreadyAllocated = existingAllocs.reduce((sum, a) => sum + (Number(a.amountAllocated) || 0), 0);
      const remainingToPay = Math.max(0, Number((updated.grandTotal - alreadyAllocated).toFixed(2)));

      if (remainingToPay > 0) {
        const settings = await getBillingSettingsService();
        const payNum = await generateUniquePaymentNumber(settings);

        await prisma.payment.create({
          data: {
            paymentNumber: payNum,
            contactId: updated.contactId,
            clientName: updated.companyName || updated.contactName || 'Client',
            paymentDate: new Date().toISOString().split('T')[0],
            amountReceived: remainingToPay,
            paymentMethod: data.paymentMethod || 'Bank Transfer',
            transactionReference: data.transactionReference ? data.transactionReference.trim() : `SETTLE-${updated.invoiceNumber}`,
            bankName: data.bankName || 'HDFC Bank',
            notes: data.paymentNotes || `Auto-recorded payment for invoice ${updated.invoiceNumber}`,
            recordedBy: user?.name || user?.email || 'Admin',
            status: 'Completed',
            allocations: {
              create: [
                {
                  invoiceId: updated.id,
                  amountAllocated: remainingToPay,
                },
              ],
            },
          },
        });
      }
    } else if (status === 'Issued' || status === 'Unpaid') {
      await prisma.paymentAllocation.deleteMany({
        where: { invoiceId: updated.id },
      });
    }

    await logBillingAudit('Invoice', updated.id, updated.invoiceNumber, 'UPDATED', user?.name || user?.email || 'User', 'Updated Draft invoice items, calculations & terms');
    return updated;
  }

  // Non-draft or header-only update
  let headerAmountPaid = existing.amountPaid;
  let headerOutstanding = existing.outstandingBalance;
  let newStatus = data.status || existing.status;

  if (data.status === 'Paid') {
    headerAmountPaid = existing.grandTotal;
    headerOutstanding = 0;
    newStatus = 'Paid';
  } else if (data.status === 'Unpaid' || data.status === 'Issued') {
    headerAmountPaid = 0;
    headerOutstanding = existing.grandTotal;
    newStatus = 'Issued';
    // Clear previous allocations so invoice cleanly resets to unpaid
    await prisma.paymentAllocation.deleteMany({
      where: { invoiceId: existing.id },
    });
  } else if (data.status === 'Partially Paid') {
    newStatus = 'Partially Paid';
    if (headerAmountPaid <= 0 || headerAmountPaid >= existing.grandTotal) {
      headerAmountPaid = Number((existing.grandTotal / 2).toFixed(2));
      headerOutstanding = Number((existing.grandTotal - headerAmountPaid).toFixed(2));
    }
  } else if (data.amountPaid !== undefined || data.advanceAmount !== undefined) {
    headerAmountPaid = Math.max(0, Math.min(existing.grandTotal, Number(data.amountPaid ?? data.advanceAmount ?? 0)));
    headerOutstanding = Math.max(0, Number((existing.grandTotal - headerAmountPaid).toFixed(2)));
    if (headerAmountPaid >= existing.grandTotal && existing.grandTotal > 0) {
      newStatus = 'Paid';
    } else if (headerAmountPaid > 0) {
      newStatus = 'Partially Paid';
    }
  }

  const updated = await prisma.invoice.update({
    where: { id: existing.id },
    data: {
      status: newStatus,
      amountPaid: headerAmountPaid,
      outstandingBalance: headerOutstanding,
      paidAt: newStatus === 'Paid' ? (existing.paidAt || new Date()) : null,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      termsConditions: data.termsConditions !== undefined ? data.termsConditions : existing.termsConditions,
      dueDate: data.dueDate || existing.dueDate,
      paymentTerms: data.paymentTerms || existing.paymentTerms,
      bankDetails: meta,
    },
    include: { items: true },
  });

  // Automatically record payment if invoice is marked Paid
  if (newStatus === 'Paid') {
    const existingAllocs = await prisma.paymentAllocation.findMany({
      where: { invoiceId: updated.id },
    });
    const alreadyAllocated = existingAllocs.reduce((sum, a) => sum + (Number(a.amountAllocated) || 0), 0);
    const remainingToPay = Math.max(0, Number((updated.grandTotal - alreadyAllocated).toFixed(2)));

    if (remainingToPay > 0) {
      const settings = await getBillingSettingsService();
      const payNum = await generateUniquePaymentNumber(settings);

      await prisma.payment.create({
        data: {
          paymentNumber: payNum,
          contactId: updated.contactId,
          clientName: updated.companyName || updated.contactName || 'Client',
          paymentDate: new Date().toISOString().split('T')[0],
          amountReceived: remainingToPay,
          paymentMethod: data.paymentMethod || 'Bank Transfer',
          transactionReference: data.transactionReference ? data.transactionReference.trim() : `SETTLE-${updated.invoiceNumber}`,
          bankName: data.bankName || 'HDFC Bank',
          notes: data.paymentNotes || `Auto-recorded payment for invoice ${updated.invoiceNumber}`,
          recordedBy: user?.name || user?.email || 'Admin',
          status: 'Completed',
          allocations: {
            create: [
              {
                invoiceId: updated.id,
                amountAllocated: remainingToPay,
              },
            ],
          },
        },
      });

      await logBillingAudit(
        'Payment',
        updated.id,
        payNum,
        'PAYMENT_RECORDED',
        user?.name || 'Admin',
        `Payment of ₹${updated.grandTotal} auto-recorded for paid invoice ${updated.invoiceNumber}`
      );
    }
  }

  await logBillingAudit('Invoice', updated.id, updated.invoiceNumber, 'UPDATED', user?.name || user?.email || 'User', `Updated invoice status to ${newStatus}`);
  return updated;
}

export async function sendInvoiceService(id, user) {
  const existing = await prisma.invoice.findFirst({
    where: { OR: [{ id }, { invoiceNumber: id }] },
  });

  if (!existing) {
    const err = new Error('Invoice not found.');
    err.status = 404;
    throw err;
  }

  if (existing.status === 'Cancelled') {
    const err = new Error('Cannot send a cancelled invoice.');
    err.status = 400;
    throw err;
  }

  const updatedStatus = existing.status === 'Draft' ? 'Sent' : existing.status;

  const updated = await prisma.invoice.update({
    where: { id: existing.id },
    data: {
      status: updatedStatus,
      issuedAt: existing.issuedAt || new Date(),
    },
    include: { items: true },
  });

  await logBillingAudit(
    'Invoice',
    updated.id,
    updated.invoiceNumber,
    'SENT',
    user?.name || user?.email || 'User',
    `Sent invoice to customer (${updated.contactEmail || updated.contactName}) via email notification`
  );

  return updated;
}

export async function cancelInvoiceService(id, reason, user) {
  if (!reason || !reason.trim()) {
    const err = new Error('A cancellation reason is required.');
    err.status = 400;
    throw err;
  }

  const existing = await prisma.invoice.findFirst({
    where: { OR: [{ id }, { invoiceNumber: id }] },
  });

  if (!existing) {
    const err = new Error('Invoice not found.');
    err.status = 404;
    throw err;
  }

  if (existing.status === 'Paid') {
    const err = new Error('Cannot cancel a fully paid invoice. Process a refund first.');
    err.status = 400;
    throw err;
  }

  const updated = await prisma.invoice.update({
    where: { id: existing.id },
    data: {
      status: 'Cancelled',
      cancellationReason: reason.trim(),
      outstandingBalance: 0,
    },
  });

  // If linked to milestone, free up the milestone
  if (existing.milestoneId) {
    await prisma.billingMilestone.update({
      where: { id: existing.milestoneId },
      data: { invoiceId: null, invoicedAmount: 0 },
    }).catch(() => {});
  }

  await logBillingAudit('Invoice', updated.id, updated.invoiceNumber, 'CANCELLED', user?.name || user?.email || 'User', `Cancelled invoice. Reason: ${reason}`);

  return updated;
}

/**
 * -----------------------------------------------------------------------------
 * 7. PAYMENT MANAGEMENT SERVICE
 * -----------------------------------------------------------------------------
 */
export async function getPaymentsService(query = {}) {
  const { search, paymentMethod, contactId } = query;
  const where = {};

  if (paymentMethod && paymentMethod !== 'All') {
    where.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
  }
  if (contactId && contactId !== 'All') {
    where.contactId = contactId;
  }
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { paymentNumber: { contains: q, mode: 'insensitive' } },
      { clientName: { contains: q, mode: 'insensitive' } },
      { transactionReference: { contains: q, mode: 'insensitive' } },
      { bankName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      allocations: {
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              grandTotal: true,
              amountPaid: true,
              outstandingBalance: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return payments;
}

export async function getPaymentByIdService(id) {
  const payment = await prisma.payment.findFirst({
    where: { OR: [{ id }, { paymentNumber: id }] },
    include: {
      allocations: {
        include: {
          invoice: true,
        },
      },
    },
  });

  if (!payment) {
    const err = new Error('Payment record not found.');
    err.status = 404;
    throw err;
  }

  return payment;
}

export async function recordPaymentService(data, user) {
  const amount = Number(data.amountReceived) || 0;
  if (amount <= 0) {
    const err = new Error('Payment amount must be greater than zero.');
    err.status = 400;
    throw err;
  }

  if (!data.clientName?.trim()) {
    const err = new Error('Client Name is required.');
    err.status = 400;
    throw err;
  }

  // Sequence Generation
  const settings = await getBillingSettingsService();
  const paymentNumber = await generateUniquePaymentNumber(settings);

  // Verify allocations against active invoices
  const rawAllocations = Array.isArray(data.allocations) ? data.allocations : [];
  if (rawAllocations.length === 0 && data.invoiceId) {
    rawAllocations.push({ invoiceId: data.invoiceId, amountAllocated: amount });
  }

  // Verify invoice balances
  for (const alloc of rawAllocations) {
    const inv = await prisma.invoice.findUnique({ where: { id: alloc.invoiceId } });
    if (!inv) {
      const err = new Error(`Invoice with ID ${alloc.invoiceId} not found.`);
      err.status = 404;
      throw err;
    }
    if (inv.status === 'Cancelled') {
      const err = new Error(`Invoice ${inv.invoiceNumber} is cancelled and cannot accept payments.`);
      err.status = 400;
      throw err;
    }
    const allocAmt = Number(alloc.amountAllocated) || 0;
    if (allocAmt > inv.outstandingBalance + 0.01) {
      const err = new Error(`Allocated payment ₹${allocAmt} exceeds invoice ${inv.invoiceNumber} outstanding balance ₹${inv.outstandingBalance}.`);
      err.status = 400;
      throw err;
    }
  }

  const payment = await prisma.payment.create({
    data: {
      paymentNumber,
      contactId: data.contactId || null,
      clientName: data.clientName.trim(),
      paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
      amountReceived: amount,
      paymentMethod: data.paymentMethod || 'Bank Transfer',
      transactionReference: data.transactionReference ? data.transactionReference.trim() : null,
      bankName: data.bankName ? data.bankName.trim() : null,
      notes: data.notes ? data.notes.trim() : null,
      recordedBy: user?.name || user?.email || 'User',
      status: 'Completed',
      allocations: {
        create: rawAllocations.map((a) => ({
          invoiceId: a.invoiceId,
          amountAllocated: Number(a.amountAllocated) || amount,
        })),
      },
    },
    include: { allocations: true },
  });

  // Update Invoices with new balances
  for (const alloc of rawAllocations) {
    const inv = await prisma.invoice.findUnique({ where: { id: alloc.invoiceId } });
    const allocAmt = Number(alloc.amountAllocated) || amount;
    const newPaid = Number((inv.amountPaid + allocAmt).toFixed(2));
    const newBalance = Math.max(0, Number((inv.grandTotal - newPaid).toFixed(2)));
    const newStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';

    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        amountPaid: newPaid,
        outstandingBalance: newBalance,
        status: newStatus,
        paidAt: newStatus === 'Paid' ? new Date() : inv.paidAt,
      },
    });
  }

  await logBillingAudit('Payment', payment.id, payment.paymentNumber, 'PAYMENT_RECORDED', user?.name || user?.email || 'User', `Recorded payment ₹${payment.amountReceived} via ${payment.paymentMethod}`);

  // Automatically record activity in timeline
  try {
    const amountStr = payment.amountReceived ? ` · ₹ ${Math.round(payment.amountReceived).toLocaleString('en-IN')}` : '';
    await recordActivity({
      type: 'payment',
      title: 'Payment Received',
      description: `Payment #${payment.paymentNumber}${amountStr} · ${payment.paymentMethod || 'UPI'}`,
      customerName: payment.clientName,
      entityId: payment.id,
      entityType: 'Payment',
      entityNumber: payment.paymentNumber,
      amount: payment.amountReceived || 0,
      status: payment.status || 'Completed',
      performedBy: user?.name || payment.recordedBy || 'Staff',
      activityDate: payment.paymentDate,
    });
  } catch (_) {}

  return payment;
}

/**
 * -----------------------------------------------------------------------------
 * 8. BILLING DASHBOARD SERVICE
 * -----------------------------------------------------------------------------
 */
export async function getBillingDashboardService() {
  const [invoices, payments, projects, orders] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { not: 'Cancelled' } },
      orderBy: { invoiceDate: 'desc' },
    }),
    prisma.payment.findMany({
      where: { status: 'Completed' },
      include: {
        allocations: {
          include: {
            invoice: {
              select: { invoiceNumber: true },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 8,
    }),
    prisma.project.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.salesOrder.findMany({
      include: { invoices: true },
    }),
  ]);

  const today = new Date().toISOString().split('T')[0];

  let totalInvoiced = 0;
  let totalCollected = 0;
  let outstandingAmount = 0;
  let overdueAmount = 0;
  let unpaidInvoicesCount = 0;

  for (const inv of invoices) {
    totalInvoiced += inv.grandTotal;
    totalCollected += inv.amountPaid;
    outstandingAmount += inv.outstandingBalance;

    if (inv.outstandingBalance > 0) {
      unpaidInvoicesCount += 1;
      if (inv.dueDate < today) {
        overdueAmount += inv.outstandingBalance;
      }
    }
  }

  // Monthly trends (Last 6 Months)
  const monthlyMap = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthlyMap[key] = { month: key, invoiced: 0, collected: 0 };
  }

  invoices.forEach((inv) => {
    try {
      const d = new Date(inv.invoiceDate);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthlyMap[key]) {
        monthlyMap[key].invoiced += inv.grandTotal;
        monthlyMap[key].collected += inv.amountPaid;
      }
    } catch (_) {}
  });

  const monthlyTrends = Object.values(monthlyMap);

  // Upcoming Due Dates
  const upcomingDueInvoices = invoices
    .filter((inv) => inv.outstandingBalance > 0)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
    .slice(0, 6)
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.contactName,
      companyName: inv.companyName,
      dueDate: inv.dueDate,
      grandTotal: inv.grandTotal,
      outstandingBalance: inv.outstandingBalance,
      isOverdue: inv.dueDate < today,
    }));

  // Project-wise billing progress
  const projectBillingProgress = projects.map((prj) => {
    const linkedOrder = orders.find((o) => o.projectId === prj.id || o.id === prj.salesOrderId);
    const orderInvoices = linkedOrder ? linkedOrder.invoices.filter((i) => i.status !== 'Cancelled') : [];
    const contractVal = linkedOrder ? linkedOrder.contractValue : prj.estimatedBudget || 0;
    const invoiced = orderInvoices.reduce((a, b) => a + b.grandTotal, 0);
    const collected = orderInvoices.reduce((a, b) => a + b.amountPaid, 0);
    const progress = contractVal > 0 ? Math.min(100, Math.round((collected / contractVal) * 100)) : 0;

    return {
      id: prj.id,
      projectId: prj.projectId,
      name: prj.name,
      clientName: prj.clientName,
      contractValue: contractVal,
      totalInvoiced: invoiced,
      totalCollected: collected,
      progressPercentage: progress,
      status: prj.status,
    };
  });

  return {
    kpis: {
      totalInvoiced: Number(totalInvoiced.toFixed(2)),
      totalCollected: Number(totalCollected.toFixed(2)),
      outstandingAmount: Number(outstandingAmount.toFixed(2)),
      overdueAmount: Number(overdueAmount.toFixed(2)),
      totalInvoicesCount: invoices.length,
      unpaidInvoicesCount,
    },
    recentPayments: payments,
    upcomingDueInvoices,
    monthlyTrends,
    projectBillingProgress,
  };
}

/**
 * -----------------------------------------------------------------------------
 * 9. BILLING REPORTS SERVICE
 * -----------------------------------------------------------------------------
 */
export async function getBillingReportsService(query = {}) {
  const { startDate, endDate } = query;
  const where = { status: { not: 'Cancelled' } };

  if (startDate && endDate) {
    where.invoiceDate = { gte: startDate, lte: endDate };
  }

  const [invoices, payments, projects] = await Promise.all([
    prisma.invoice.findMany({ where, include: { items: true }, orderBy: { invoiceDate: 'desc' } }),
    prisma.payment.findMany({ where: { status: 'Completed' }, orderBy: { paymentDate: 'desc' } }),
    prisma.project.findMany(),
  ]);

  const today = new Date().toISOString().split('T')[0];

  // Aging Buckets
  const aging = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOverdue: 0,
  };

  invoices.forEach((inv) => {
    if (inv.outstandingBalance > 0) {
      if (inv.dueDate >= today) {
        aging.current += inv.outstandingBalance;
      } else {
        const diffDays = Math.floor((new Date(today) - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
        aging.totalOverdue += inv.outstandingBalance;
        if (diffDays <= 30) aging.days1_30 += inv.outstandingBalance;
        else if (diffDays <= 60) aging.days31_60 += inv.outstandingBalance;
        else if (diffDays <= 90) aging.days61_90 += inv.outstandingBalance;
        else aging.days90Plus += inv.outstandingBalance;
      }
    }
  });

  // Client Summaries
  const clientMap = {};
  invoices.forEach((inv) => {
    const key = inv.companyName || inv.contactName;
    if (!clientMap[key]) {
      clientMap[key] = {
        clientName: inv.contactName,
        companyName: inv.companyName || '—',
        invoiceCount: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        outstandingBalance: 0,
      };
    }
    clientMap[key].invoiceCount += 1;
    clientMap[key].totalInvoiced += inv.grandTotal;
    clientMap[key].totalPaid += inv.amountPaid;
    clientMap[key].outstandingBalance += inv.outstandingBalance;
  });

  const clientSummaries = Object.values(clientMap).sort((a, b) => b.totalInvoiced - a.totalInvoiced);

  // GST / Tax Report
  let totalTaxable = 0;
  let totalGst = 0;
  invoices.forEach((inv) => {
    totalTaxable += inv.subtotal - inv.discountAmount;
    totalGst += inv.taxAmount;
  });

  const taxSummary = {
    totalTaxableAmount: Number(totalTaxable.toFixed(2)),
    totalTaxAmount: Number(totalGst.toFixed(2)),
    cgst: Number((totalGst / 2).toFixed(2)),
    sgst: Number((totalGst / 2).toFixed(2)),
    igst: 0,
  };

  return {
    agingSummary: aging,
    clientSummaries,
    taxSummary,
    totalInvoicesRecorded: invoices.length,
    totalPaymentsRecorded: payments.length,
  };
}

/**
 * -----------------------------------------------------------------------------
 * 10. BILLING AUDIT LOG SERVICE
 * -----------------------------------------------------------------------------
 */
export async function logBillingAudit(entityType, entityId, entityNumber, action, performedBy, details) {
  try {
    return await prisma.billingAuditLog.create({
      data: {
        entityType,
        entityId,
        entityNumber,
        action,
        performedBy,
        details: typeof details === 'string' ? details : JSON.stringify(details),
      },
    });
  } catch (_) {
    return null;
  }
}

export async function getBillingAuditLogsService(query = {}) {
  const { entityType, entityId } = query;
  const where = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  const logs = await prisma.billingAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return logs;
}
