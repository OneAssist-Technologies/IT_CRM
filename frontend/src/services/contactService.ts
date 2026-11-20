import {
  Contact,
  ContactFormData,
  ContactFilter,
  ContactPagination,
  ContactStats,
  ContactMetadata,
  ImportBatch,
} from '../types/contact';

import { API_BASE_URL } from '../config/env';

async function fetchWithCookies<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token && token.trim() && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
      signal: options.signal || controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  } catch (err: any) {
    if (!options.method || options.method === 'GET') {
      console.warn(`[contactService] ${endpoint} request failed:`, err?.message || err);
      return { success: false, data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 } } as unknown as T;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper to sanitize query parameters and strip out null/undefined values
function buildCleanQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (
      val !== undefined &&
      val !== null &&
      val !== 'undefined' &&
      val !== 'null' &&
      String(val).trim() !== ''
    ) {
      searchParams.append(key, String(val).trim());
    }
  });
  return searchParams.toString();
}

export const contactService = {
  // Get contacts list with search, filters, pagination, and sorting
  getContacts: async (
    params: ContactFilter = {}
  ): Promise<{ success: boolean; data: Contact[]; pagination: ContactPagination }> => {
    const query = new URLSearchParams();
    const isValid = (v: any) =>
      v !== undefined &&
      v !== null &&
      v !== 'undefined' &&
      v !== 'null' &&
      v !== 'All' &&
      v !== 'ALL' &&
      String(v).trim() !== '';

    if (params.tab && params.tab !== 'undefined' && params.tab !== 'null') {
      query.append('tab', params.tab);
    }
    if (isValid(params.search)) query.append('search', String(params.search).trim());
    if (isValid(params.companyName)) query.append('companyName', String(params.companyName).trim());
    if (isValid(params.contactType)) query.append('contactType', String(params.contactType).trim());
    if (isValid(params.category)) query.append('category', String(params.category).trim());
    if (isValid(params.source)) query.append('source', String(params.source).trim());
    if (isValid(params.status)) query.append('status', String(params.status).trim());
    if (isValid(params.stage)) query.append('stage', String(params.stage).trim());
    if (isValid(params.qualificationStatus)) query.append('qualificationStatus', String(params.qualificationStatus).trim());
    if (isValid(params.priority)) query.append('priority', String(params.priority).trim());
    if (isValid(params.assignedTo)) query.append('assignedTo', String(params.assignedTo).trim());
    if (isValid(params.assignmentStatus)) query.append('assignmentStatus', String(params.assignmentStatus).trim());
    if (params.sortBy && String(params.sortBy) !== 'undefined' && String(params.sortBy) !== 'null') {
      query.append('sortBy', params.sortBy);
    }
    if (params.sortOrder && (params.sortOrder === 'asc' || params.sortOrder === 'desc')) {
      query.append('sortOrder', params.sortOrder);
    }
    if (params.page !== undefined && params.page !== null && !isNaN(Number(params.page))) {
      query.append('page', params.page.toString());
    }
    if (params.limit !== undefined && params.limit !== null && !isNaN(Number(params.limit))) {
      query.append('limit', params.limit.toString());
    }

    const qs = query.toString();
    const endpoint = `/contacts${qs ? `?${qs}` : ''}`;
    return fetchWithCookies<{ success: boolean; data: Contact[]; pagination: ContactPagination }>(endpoint);
  },

  // Get single contact by ID or contactId (e.g. CNT-1001)
  getContactById: async (id: string): Promise<{ success: boolean; data: Contact }> => {
    return fetchWithCookies<{ success: boolean; data: Contact }>(`/contacts/${encodeURIComponent(id)}`);
  },

  // Get contact statistics & KPI counters
  getContactStats: async (): Promise<{ success: boolean; stats: ContactStats }> => {
    return fetchWithCookies<{ success: boolean; stats: ContactStats }>('/contacts/stats');
  },

  // Get 100% dynamic dropdown metadata
  getContactMetadata: async (): Promise<{ success: boolean; metadata: ContactMetadata }> => {
    return fetchWithCookies<{ success: boolean; metadata: ContactMetadata }>('/contacts/metadata');
  },

  // Create new contact
  createContact: async (data: ContactFormData): Promise<{ success: boolean; message: string; data: Contact }> => {
    return fetchWithCookies<{ success: boolean; message: string; data: Contact }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update existing contact
  updateContact: async (id: string, data: Partial<ContactFormData>): Promise<{ success: boolean; message: string; data: Contact }> => {
    return fetchWithCookies<{ success: boolean; message: string; data: Contact }>(`/contacts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete contact
  deleteContact: async (id: string): Promise<{ success: boolean; message: string; data: { id: string; contactId: string } }> => {
    return fetchWithCookies<{ success: boolean; message: string; data: { id: string; contactId: string } }>(`/contacts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Quick Assign Contact to Employee
  assignContact: async (
    id: string,
    employeeId: string | null
  ): Promise<{ success: boolean; message: string; data: Contact }> => {
    return fetchWithCookies<{ success: boolean; message: string; data: Contact }>(`/contacts/${encodeURIComponent(id)}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ employeeId }),
    });
  },

  // Bulk Import Contacts (Saves to dedicated BulkUploadContact table)
  bulkImportContacts: async (data: {
    contacts: any[];
    defaultAssignedTo?: string;
    defaultCategory?: string;
    defaultSource?: string;
    fileName?: string;
  }): Promise<{
    success: boolean;
    importedCount: number;
    errorCount: number;
    data: any[];
    errors: any[];
    message: string;
  }> => {
    return fetchWithCookies<{
      success: boolean;
      importedCount: number;
      errorCount: number;
      data: any[];
      errors: any[];
      message: string;
    }>('/contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get records from dedicated BulkUploadContact table
  getBulkUploadContacts: async (params?: Record<string, any>): Promise<{
    success: boolean;
    data: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    const q = buildCleanQueryString(params);
    return fetchWithCookies<{
      success: boolean;
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/contacts/bulk-data${q ? `?${q}` : ''}`);
  },

  // Promote a bulk upload record to the official Contact table
  promoteBulkUploadToContact: async (id: string): Promise<{
    success: boolean;
    message: string;
    data: Contact;
  }> => {
    return fetchWithCookies<{
      success: boolean;
      message: string;
      data: Contact;
    }>(`/contacts/bulk-data/${encodeURIComponent(id)}/promote`, {
      method: 'POST',
    });
  },

  // Delete a bulk upload record (or 'all')
  deleteBulkUploadContact: async (id: string): Promise<{
    success: boolean;
    message: string;
  }> => {
    return fetchWithCookies<{
      success: boolean;
      message: string;
    }>(`/contacts/bulk-data/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Get list of import batches
  getImportBatches: async (params?: Record<string, any>): Promise<{
    success: boolean;
    data: ImportBatch[];
    pagination: ContactPagination;
  }> => {
    const q = buildCleanQueryString(params);
    return fetchWithCookies<{
      success: boolean;
      data: ImportBatch[];
      pagination: ContactPagination;
    }>(`/contacts/import-batches${q ? `?${q}` : ''}`);
  },

  // Get single batch details
  getImportBatchDetails: async (batchId: string): Promise<{
    success: boolean;
    batch: ImportBatch;
  }> => {
    return fetchWithCookies<{
      success: boolean;
      batch: ImportBatch;
    }>(`/contacts/import-batches/${encodeURIComponent(batchId)}`);
  },

  // Get contacts for a specific batch
  getBatchContacts: async (
    batchId: string,
    params?: Record<string, any>
  ): Promise<{
    success: boolean;
    batch: ImportBatch;
    data: Contact[];
    pagination: ContactPagination;
  }> => {
    const q = buildCleanQueryString(params);
    return fetchWithCookies<{
      success: boolean;
      batch: ImportBatch;
      data: Contact[];
      pagination: ContactPagination;
    }>(`/contacts/import-batches/${encodeURIComponent(batchId)}/contacts${q ? `?${q}` : ''}`);
  },

  // Delete an entire import batch and its records
  deleteImportBatch: async (batchId: string): Promise<{
    success: boolean;
    message: string;
  }> => {
    return fetchWithCookies<{
      success: boolean;
      message: string;
    }>(`/contacts/import-batches/${encodeURIComponent(batchId)}`, {
      method: 'DELETE',
    });
  },

  // Assign/reassign an import batch and all contacts in this batch
  assignImportBatch: async (
    batchId: string,
    employeeId: string | null
  ): Promise<{
    success: boolean;
    message: string;
    batch?: ImportBatch;
    assignedCount?: number;
  }> => {
    return fetchWithCookies<{
      success: boolean;
      message: string;
      batch?: ImportBatch;
      assignedCount?: number;
    }>(`/contacts/import-batches/${encodeURIComponent(batchId)}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ employeeId }),
    });
  },

  // Download URL for failed rows CSV
  getFailedReportUrl: (batchId: string): string => {
    return `${API_BASE_URL}/contacts/import-batches/${encodeURIComponent(batchId)}/failed-report`;
  },
};

export default contactService;

