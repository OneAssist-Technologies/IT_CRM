import {
  Contact,
  ContactFormData,
  ContactFilter,
  ContactPagination,
  ContactStats,
  ContactMetadata,
  ImportBatch,
} from '../types/contact';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchWithCookies<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
  } finally {
    clearTimeout(timeoutId);
  }
}

export const contactService = {
  // Get contacts list with search, filters, pagination, and sorting
  getContacts: async (
    params: ContactFilter = {}
  ): Promise<{ success: boolean; data: Contact[]; pagination: ContactPagination }> => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.companyName && params.companyName !== 'All') query.append('companyName', params.companyName);
    if (params.contactType && params.contactType !== 'All') query.append('contactType', params.contactType);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.source && params.source !== 'All') query.append('source', params.source);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.stage && params.stage !== 'All') query.append('stage', params.stage);
    if (params.qualificationStatus && params.qualificationStatus !== 'All') query.append('qualificationStatus', params.qualificationStatus);
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params.assignedTo && params.assignedTo !== 'All') query.append('assignedTo', params.assignedTo);
    if (params.assignmentStatus && params.assignmentStatus !== 'All') query.append('assignmentStatus', params.assignmentStatus);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

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
    const q = new URLSearchParams(params || {}).toString();
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
    const q = new URLSearchParams(params || {}).toString();
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
    const q = new URLSearchParams(params || {}).toString();
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

