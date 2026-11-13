import {
  BillingProduct,
  Quotation,
  SalesOrder,
  BillingMilestone,
  Invoice,
  Payment,
  BillingDashboardData,
  BillingReportsData,
  BillingSettings,
  BillingAuditLog,
} from '../types/billing';

import { API_BASE_URL } from '../config/env';

const API_BASE = `${API_BASE_URL}/billing`;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.message || `Request failed with status ${response.status}`);
  }

  return json.data as T;
}

export const billingService = {
  // 1. Dashboard
  getDashboard: () => request<BillingDashboardData>('/dashboard'),

  // 2. Products & Services
  getProductsServices: (params?: { search?: string; type?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.type && params.type !== 'All') q.append('type', params.type);
    if (params?.status && params.status !== 'All') q.append('status', params.status);
    return request<BillingProduct[]>(`/products-services?${q.toString()}`);
  },
  createProduct: (data: Partial<BillingProduct>) =>
    request<BillingProduct>('/products-services', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<BillingProduct>) =>
    request<BillingProduct>(`/products-services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    request<null>(`/products-services/${id}`, { method: 'DELETE' }),

  // 3. Quotations & Revisions
  getQuotations: (params?: { search?: string; status?: string; contactId?: string; leadId?: string; flat?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status && params.status !== 'All') q.append('status', params.status);
    if (params?.contactId && params.contactId !== 'All') q.append('contactId', params.contactId);
    if (params?.leadId && params.leadId !== 'All') q.append('leadId', params.leadId);
    if (params?.flat) q.append('flat', 'true');
    return request<Quotation[]>(`/quotations?${q.toString()}`);
  },
  getQuotationById: (id: string) => request<Quotation>(`/quotations/${id}`),
  getQuotationRevisions: (id: string) => request<Quotation[]>(`/quotations/${id}/revisions`),
  createQuotation: (data: Partial<Quotation>) =>
    request<Quotation>('/quotations', { method: 'POST', body: JSON.stringify(data) }),
  createQuotationRevision: (id: string, data?: Partial<Quotation>) =>
    request<Quotation>(`/quotations/${id}/revise`, { method: 'POST', body: JSON.stringify(data || {}) }),
  updateQuotation: (id: string, data: Partial<Quotation>) =>
    request<Quotation>(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateQuotationStatus: (id: string, status: string, notes?: string) =>
    request<Quotation>(`/quotations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  deleteQuotation: (id: string) =>
    request<null>(`/quotations/${id}`, { method: 'DELETE' }),
  convertQuotationToOrder: (id: string, data?: { billingMethod?: string; startDate?: string; endDate?: string }) =>
    request<SalesOrder>(`/quotations/${id}/convert`, { method: 'POST', body: JSON.stringify(data || {}) }),

  // 4. Sales Orders & Contracts
  getSalesOrders: (params?: { search?: string; status?: string; billingMethod?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status && params.status !== 'All') q.append('status', params.status);
    if (params?.billingMethod && params.billingMethod !== 'All') q.append('billingMethod', params.billingMethod);
    return request<SalesOrder[]>(`/orders?${q.toString()}`);
  },
  getSalesOrderById: (id: string) => request<SalesOrder>(`/orders/${id}`),
  createSalesOrder: (data: Partial<SalesOrder>) =>
    request<SalesOrder>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateSalesOrder: (id: string, data: Partial<SalesOrder>) =>
    request<SalesOrder>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // 5. Projects & Milestones
  getBillingProjects: () => request<any[]>('/projects'),
  getMilestones: (params?: { salesOrderId?: string; projectId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.salesOrderId) q.append('salesOrderId', params.salesOrderId);
    if (params?.projectId) q.append('projectId', params.projectId);
    if (params?.status && params.status !== 'All') q.append('status', params.status);
    return request<BillingMilestone[]>(`/milestones?${q.toString()}`);
  },
  createMilestone: (data: Partial<BillingMilestone> & { validateContractTotal?: boolean }) =>
    request<BillingMilestone>('/milestones', { method: 'POST', body: JSON.stringify(data) }),
  updateMilestone: (id: string, data: Partial<BillingMilestone>) =>
    request<BillingMilestone>(`/milestones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approveMilestone: (id: string) =>
    request<BillingMilestone>(`/milestones/${id}/approve`, { method: 'POST' }),

  // 6. Invoices
  getInvoices: (params?: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    invoiceDate?: string;
    dueDate?: string;
    contactId?: string;
    customerId?: string;
    salesOrderId?: string;
    projectId?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status && params.status !== 'All') q.append('status', params.status);
    if (params?.paymentStatus && params.paymentStatus !== 'All') q.append('paymentStatus', params.paymentStatus);
    if (params?.invoiceDate && params.invoiceDate !== 'All') q.append('invoiceDate', params.invoiceDate);
    if (params?.dueDate && params.dueDate !== 'All') q.append('dueDate', params.dueDate);
    if (params?.contactId && params.contactId !== 'All') q.append('contactId', params.contactId);
    if (params?.customerId && params.customerId !== 'All') q.append('customerId', params.customerId);
    if (params?.salesOrderId && params.salesOrderId !== 'All') q.append('salesOrderId', params.salesOrderId);
    if (params?.projectId && params.projectId !== 'All') q.append('projectId', params.projectId);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    return request<Invoice[] | { data: Invoice[]; pagination: any }>(`/invoices?${q.toString()}`);
  },
  getInvoiceById: (id: string) => request<Invoice>(`/invoices/${id}`),
  createInvoice: (data: Partial<Invoice>) =>
    request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id: string, data: Partial<Invoice>) =>
    request<Invoice>(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelInvoice: (id: string, reason: string) =>
    request<Invoice>(`/invoices/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  sendInvoice: (id: string) =>
    request<Invoice>(`/invoices/${id}/send`, { method: 'POST' }),

  // 7. Payments
  getPayments: (params?: { search?: string; paymentMethod?: string; contactId?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.paymentMethod && params.paymentMethod !== 'All') q.append('paymentMethod', params.paymentMethod);
    if (params?.contactId && params.contactId !== 'All') q.append('contactId', params.contactId);
    return request<Payment[]>(`/payments?${q.toString()}`);
  },
  getPaymentById: (id: string) => request<Payment>(`/payments/${id}`),
  recordPayment: (data: {
    clientName: string;
    contactId?: string | null;
    paymentDate: string;
    amountReceived: number;
    paymentMethod: string;
    transactionReference?: string | null;
    bankName?: string | null;
    notes?: string | null;
    invoiceId?: string;
    allocations?: Array<{ invoiceId: string; amountAllocated: number }>;
  }) => request<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),

  // 8. Reports
  getReports: (params?: { startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    return request<BillingReportsData>(`/reports?${q.toString()}`);
  },

  // 9. Settings & Audit Logs
  getSettings: () => request<BillingSettings>('/settings'),
  updateSettings: (data: Partial<BillingSettings>) =>
    request<BillingSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getAuditLogs: (params?: { entityType?: string; entityId?: string }) => {
    const q = new URLSearchParams();
    if (params?.entityType) q.append('entityType', params.entityType);
    if (params?.entityId) q.append('entityId', params.entityId);
    return request<BillingAuditLog[]>(`/audit-logs?${q.toString()}`);
  },
};
