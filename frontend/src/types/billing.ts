export type ProductType = 'Product' | 'Service';

export interface BillingProductModule {
  id?: string;
  name: string;
  description?: string;
}

export interface BillingProduct {
  id: string;
  itemCode: string;
  name: string;
  type: ProductType;
  description?: string | null;
  unitPrice?: number;
  taxRate?: number;
  unit?: string;
  status: 'Active' | 'Inactive';
  modules?: (string | BillingProductModule)[];
  createdAt?: string;
  updatedAt?: string;
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Under Review' | 'Changes Required' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted' | 'Superseded' | string;

export interface QuotationItem {
  id?: string;
  productId?: string | null;
  itemCode?: string | null;
  itemName: string;
  itemType: ProductType;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  originalQuotationNumber?: string;
  version?: number;
  revisionNumber?: number;
  revisionName?: string;
  isLatest?: boolean;
  projectName?: string | null;
  revisionNotes?: string | null;
  parentQuotationId?: string | null;
  contactId?: string | null;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  companyName?: string | null;
  clientGst?: string | null;
  clientAddress?: string | null;
  leadId?: string | null;
  quotationDate: string;
  validUntil: string;
  status: QuotationStatus;
  sentAt?: string | null;
  acceptedAt?: string | null;
  supersededAt?: string | null;
  currency: string;
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentTerms?: string | null;
  notes?: string | null;
  termsConditions?: string | null;
  salesOwnerId?: string | null;
  salesOwnerName?: string | null;
  convertedToOrderId?: string | null;
  convertedAt?: string | null;
  title?: string | null;
  documentName?: string | null;
  documentUrl?: string | null;
  documentSize?: string | null;
  items: QuotationItem[];
  allRevisions?: Quotation[];
  revisions?: Quotation[];
  parentQuotation?: Quotation | null;
  latestVersion?: number;
  latestRevisionName?: string;
  latestGrandTotal?: number;
  latestStatus?: QuotationStatus;
  latestQuotationNumber?: string;
  latestQuotationId?: string;
  revisionCount?: number;
  hasRevisions?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type BillingMethod = 'Milestone' | 'Fixed Price' | 'Product';
export type SalesOrderStatus = 'Draft' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';

export interface SalesOrderItem {
  id?: string;
  productId?: string | null;
  itemCode?: string | null;
  itemName: string;
  itemType: ProductType;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  quotationId?: string | null;
  contactId?: string | null;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  companyName?: string | null;
  clientGst?: string | null;
  clientAddress?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  billingMethod: BillingMethod;
  contractValue: number;
  currency: string;
  orderDate: string;
  startDate?: string | null;
  endDate?: string | null;
  paymentTerms?: string | null;
  status: SalesOrderStatus;
  notes?: string | null;
  termsConditions?: string | null;
  projectId?: string | null;
  items: SalesOrderItem[];
  milestones?: BillingMilestone[];
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    amountPaid: number;
    outstandingBalance: number;
    status: InvoiceStatus;
  }>;
  createdAt: string;
  updatedAt: string;
}

export type MilestoneStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface BillingMilestone {
  id: string;
  salesOrderId?: string | null;
  salesOrder?: {
    id: string;
    orderNumber: string;
    contactName: string;
    companyName?: string | null;
  } | null;
  projectId?: string | null;
  projectName?: string | null;
  milestoneNumber: number;
  name: string;
  description?: string | null;
  percentage?: number | null;
  amount: number;
  dueDate?: string | null;
  status: MilestoneStatus;
  isApproved: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  isInvoiceEligible: boolean;
  invoiceId?: string | null;
  invoicedAmount: number;
  createdAt?: string;
  updatedAt?: string;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Viewed' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled' | 'Void' | string;
export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
export type TaxType = 'INTRA_STATE' | 'INTER_STATE' | 'EXPORT_NON_GST';
export type InvoiceType = 'One-Time' | 'Recurring';

export interface InvoiceItem {
  id?: string;
  productId?: string | null;
  itemCode?: string | null;
  itemName: string;
  itemType?: ProductType | string;
  description?: string | null;
  hsnCode?: string | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  discount: number;
  discountPercent?: number;
  taxRate: number;
  taxableAmount?: number;
  taxAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  contactId?: string | null;
  customerId?: string | null;
  contactName: string;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  companyName?: string | null;
  customerTier?: string | null;
  clientGst?: string | null;
  clientAddress?: string | null;
  clientPincode?: string | null;
  clientCity?: string | null;
  clientState?: string | null;
  clientPan?: string | null;
  consigneeName?: string | null;
  consigneeAddress?: string | null;
  consigneeGst?: string | null;
  consigneeSameAsBilled?: boolean;
  leadId?: string | null;
  salesOrderId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  projectTitle?: string | null;
  placeOfSupply?: string | null;
  milestoneId?: string | null;
  milestoneName?: string | null;
  invoiceDate: string;
  dueDate: string;
  invoiceType?: InvoiceType;
  currency?: string;
  taxType?: TaxType;
  subtotal: number;
  discountAmount: number;
  taxableAmount?: number;
  taxAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  additionalCharges?: number;
  advanceAmount?: number;
  grandTotal: number;
  amountPaid: number;
  outstandingBalance: number;
  status: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  paymentTerms?: string | null;
  notes?: string | null;
  termsConditions?: string | null;
  internalRemarks?: string | null;
  approvedBy?: string | null;
  attachments?: Array<{ name: string; url: string; size?: string; type?: string }>;
  companyDetails?: {
    companyName?: string;
    gstin?: string;
    pincode?: string;
    city?: string;
    state?: string;
    address?: string;
    phone?: string;
    email?: string;
  } | null;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    ifscCode?: string;
    branchName?: string;
    upiId?: string;
    [key: string]: any;
  } | null;
  cancellationReason?: string | null;
  issuedAt?: string | null;
  paidAt?: string | null;
  createdBy?: string | null;
  items: InvoiceItem[];
  allocations?: PaymentAllocation[];
  activityLogs?: any[];
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'Bank Transfer' | 'UPI' | 'Cheque' | 'Cash' | 'Payment Gateway' | 'Credit Card';

export interface PaymentAllocation {
  id?: string;
  paymentId?: string;
  invoiceId: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    amountPaid: number;
    outstandingBalance: number;
    status: InvoiceStatus;
  } | null;
  amountAllocated: number;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  contactId?: string | null;
  clientName: string;
  paymentDate: string;
  amountReceived: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string | null;
  bankName?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  status: 'Completed' | 'Refunded' | 'Void';
  allocations: PaymentAllocation[];
  createdAt: string;
  updatedAt: string;
}

export interface BillingDashboardData {
  kpis: {
    totalInvoiced: number;
    totalCollected: number;
    outstandingAmount: number;
    overdueAmount: number;
    totalInvoicesCount: number;
    unpaidInvoicesCount: number;
  };
  recentPayments: Payment[];
  upcomingDueInvoices: Array<{
    id: string;
    invoiceNumber: string;
    clientName: string;
    companyName?: string | null;
    dueDate: string;
    grandTotal: number;
    outstandingBalance: number;
    isOverdue: boolean;
  }>;
  monthlyTrends: Array<{
    month: string;
    invoiced: number;
    collected: number;
  }>;
  projectBillingProgress: Array<{
    id: string;
    projectId: string;
    name: string;
    clientName: string;
    contractValue: number;
    totalInvoiced: number;
    totalCollected: number;
    progressPercentage: number;
    status: string;
  }>;
}

export interface BillingReportsData {
  agingSummary: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    totalOverdue: number;
  };
  clientSummaries: Array<{
    clientName: string;
    companyName: string;
    invoiceCount: number;
    totalInvoiced: number;
    totalPaid: number;
    outstandingBalance: number;
  }>;
  taxSummary: {
    totalTaxableAmount: number;
    totalTaxAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
  };
  totalInvoicesRecorded: number;
  totalPaymentsRecorded: number;
}

export interface BillingSettings {
  id: string;
  companyName: string;
  companyAddress?: string | null;
  companyGst?: string | null;
  companyPan?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  companyLogoUrl?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  upiId?: string | null;
  invoicePrefix: string;
  invoiceNextNumber: number;
  quotationPrefix: string;
  quotationNextNumber: number;
  orderPrefix: string;
  orderNextNumber: number;
  paymentPrefix: string;
  paymentNextNumber: number;
  defaultTaxRate: number;
  defaultPaymentTerms: string;
  defaultTermsConditions?: string | null;
  authorizedSignatory?: string | null;
  signatoryDesignation?: string | null;
  signatureUrl?: string | null;
  updatedAt?: string;
}

export interface BillingAuditLog {
  id: string;
  entityType: string;
  entityId: string;
  entityNumber?: string | null;
  action: string;
  performedBy?: string | null;
  details?: string | null;
  createdAt: string;
}
