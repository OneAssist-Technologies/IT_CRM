import {
  Lead,
  LeadFormData,
  LeadFilter,
  LeadPagination,
  LeadStats,
  LeadMetadata,
  LeadProposal,
  Negotiation,
  NegotiationFormData,
  NegotiationStats,
  NegotiationFilters,
  Contract,
  ContractFormData,
  ContractStats,
  ContractFilters,
} from '../types/lead';

import { API_BASE_URL } from '../config/env';

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

export const leadService = {
  // Get leads list with search, filters, pagination, and sorting
  getLeads: async (
    params: LeadFilter = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{ success: boolean; data: Lead[]; pagination: LeadPagination }> => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.companyName && params.companyName !== 'All') query.append('companyName', params.companyName);
    if (params.contactType && params.contactType !== 'All') query.append('contactType', params.contactType);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.source && params.source !== 'All') query.append('source', params.source);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.stage && params.stage !== 'All') query.append('stage', params.stage);
    if (params.assignedTo && params.assignedTo !== 'All') query.append('assignedTo', params.assignedTo);
    if (params.createdBy && params.createdBy !== 'All') query.append('createdBy', params.createdBy);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (pagination.page) query.append('page', String(pagination.page));
    if (pagination.limit) query.append('limit', String(pagination.limit));

    const qs = query.toString();
    const endpoint = `/leads${qs ? `?${qs}` : ''}`;
    return fetchWithCookies<{ success: boolean; data: Lead[]; pagination: LeadPagination }>(endpoint);
  },

  // Get lead by ID
  getLeadById: async (id: string): Promise<{ success: boolean; data: Lead }> => {
    return fetchWithCookies<{ success: boolean; data: Lead }>(`/leads/${encodeURIComponent(id)}`);
  },

  // Get lead statistics
  getLeadStats: async (): Promise<{ success: boolean; stats: LeadStats }> => {
    return fetchWithCookies<{ success: boolean; stats: LeadStats }>('/leads/stats');
  },

  // Get lead metadata
  getLeadMetadata: async (): Promise<{ success: boolean; metadata: LeadMetadata }> => {
    return fetchWithCookies<{ success: boolean; metadata: LeadMetadata }>('/leads/metadata');
  },

  // Create lead
  createLead: async (data: LeadFormData): Promise<{ success: boolean; message: string; data: Lead }> => {
    return fetchWithCookies<{ success: boolean; message: string; data: Lead }>('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update lead
  updateLead: async (id: string, data: Partial<LeadFormData>): Promise<{ success: boolean; message: string; data: Lead }> => {
    return fetchWithCookies<{ success: boolean; message: string; data: Lead }>(`/leads/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete lead
  deleteLead: async (id: string): Promise<{ success: boolean; message: string; data: { id: string; leadId: string } }> => {
    return fetchWithCookies<{ success: boolean; message: string; data: { id: string; leadId: string } }>(`/leads/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // ----------------------------------------------------
  // PROPOSALS (Inside Lead Service)
  // ----------------------------------------------------
  getProposals: async (params?: { leadId?: string; search?: string; status?: string }): Promise<LeadProposal[]> => {
    const query = new URLSearchParams();
    if (params?.leadId && params.leadId !== 'All') query.append('leadId', params.leadId);
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    const qs = query.toString();
    const endpoint = `/leads/proposals${qs ? `?${qs}` : ''}`;
    const res = await fetchWithCookies<{ success: boolean; data: any[] }>(endpoint);
    return (res.data || []).map((p) => ({
      id: p.id,
      leadId: p.leadId || '',
      proposalNumber: p.proposalNumber,
      title: p.title || '',
      issueDate: p.proposalDate,
      validUntil: p.validUntil,
      status: p.status,
      rejectionReason: p.rejectionReason || null,
      currency: p.currency || 'INR (₹)',
      items: (p.items || []).map((it: any) => ({
        id: it.id,
        description: it.itemName || it.description || '',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        total: it.totalAmount || 0,
      })),
      discountPercent: p.discountPercent || 0,
      taxPercent: p.taxPercent || 0,
      subtotal: p.subtotal || 0,
      totalAmount: p.totalAmount || p.grandTotal || 0,
      notes: p.notes || '',
      terms: p.terms || '',
      documentName: p.documentName,
      documentUrl: p.documentUrl,
      documentSize: p.documentSize,
      createdAt: p.createdAt,
    }));
  },

  getProposalById: async (id: string): Promise<LeadProposal> => {
    const res = await fetchWithCookies<{ success: boolean; data: any }>(`/leads/proposals/${encodeURIComponent(id)}`);
    const p = res.data;
    return {
      id: p.id,
      leadId: p.leadId || '',
      proposalNumber: p.proposalNumber,
      title: p.title || '',
      issueDate: p.proposalDate,
      validUntil: p.validUntil,
      status: p.status,
      rejectionReason: p.rejectionReason || null,
      currency: p.currency || 'INR (₹)',
      items: (p.items || []).map((it: any) => ({
        id: it.id,
        description: it.itemName || it.description || '',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        total: it.totalAmount || 0,
      })),
      discountPercent: p.discountPercent || 0,
      taxPercent: p.taxPercent || 0,
      subtotal: p.subtotal || 0,
      totalAmount: p.totalAmount || p.grandTotal || 0,
      notes: p.notes || '',
      terms: p.terms || '',
      documentName: p.documentName,
      documentUrl: p.documentUrl,
      documentSize: p.documentSize,
      createdAt: p.createdAt,
    };
  },

  createProposal: async (data: Partial<LeadProposal> & { [key: string]: any }): Promise<any> => {
    const payload = {
      ...data,
      proposalDate: data.issueDate || data.proposalDate,
    };
    return fetchWithCookies<{ success: boolean; message: string; data: any }>('/leads/proposals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateProposal: async (id: string, data: Partial<LeadProposal> & { [key: string]: any }): Promise<any> => {
    const payload = {
      ...data,
      proposalDate: data.issueDate || data.proposalDate,
    };
    return fetchWithCookies<{ success: boolean; message: string; data: any }>(`/leads/proposals/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteProposal: async (id: string): Promise<any> => {
    return fetchWithCookies<{ success: boolean; message: string; data: any }>(`/leads/proposals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // ----------------------------------------------------
  // NEGOTIATIONS (Inside Lead Service)
  // ----------------------------------------------------
  getNegotiations: async (
    filters: NegotiationFilters = {}
  ): Promise<{
    data: Negotiation[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    const params = new URLSearchParams();
    if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
    if (filters.status && filters.status !== 'ALL' && filters.status !== 'All') params.append('status', filters.status);
    if (filters.leadId && filters.leadId !== 'ALL') params.append('leadId', filters.leadId);
    if (filters.contactId && filters.contactId !== 'ALL') params.append('contactId', filters.contactId);
    if (filters.assignedTo && filters.assignedTo !== 'ALL') params.append('assignedTo', filters.assignedTo);
    if (filters.date) params.append('date', filters.date);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const qs = params.toString();
    const endpoint = `/leads/negotiations${qs ? `?${qs}` : ''}`;
    const res = await fetchWithCookies<{
      success: boolean;
      data: Negotiation[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(endpoint);

    return {
      data: res.data || [],
      pagination: res.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 },
    };
  },

  getNegotiationStats: async (): Promise<NegotiationStats> => {
    const res = await fetchWithCookies<{ success: boolean; data: NegotiationStats; stats: NegotiationStats }>('/leads/negotiations/stats');
    return res.data || res.stats;
  },

  getNegotiationById: async (id: string): Promise<Negotiation> => {
    const res = await fetchWithCookies<{ success: boolean; data: Negotiation }>(`/leads/negotiations/${encodeURIComponent(id)}`);
    return res.data;
  },

  createNegotiation: async (data: Partial<NegotiationFormData>): Promise<Negotiation> => {
    const res = await fetchWithCookies<{ success: boolean; data: Negotiation }>('/leads/negotiations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  updateNegotiation: async (id: string, data: Partial<NegotiationFormData>): Promise<Negotiation> => {
    const res = await fetchWithCookies<{ success: boolean; data: Negotiation }>(`/leads/negotiations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  deleteNegotiation: async (id: string): Promise<boolean> => {
    await fetchWithCookies<{ success: boolean; message: string }>(`/leads/negotiations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  },

  // ----------------------------------------------------
  // CONTRACTS (Inside Lead Service)
  // ----------------------------------------------------
  getContracts: async (
    filters: ContractFilters = {}
  ): Promise<{
    data: Contract[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    const params = new URLSearchParams();
    if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
    if (filters.status && filters.status !== 'ALL' && filters.status !== 'All') params.append('status', filters.status);
    if (filters.contractType && filters.contractType !== 'ALL' && filters.contractType !== 'All') params.append('contractType', filters.contractType);
    if (filters.approvalStatus && filters.approvalStatus !== 'ALL' && filters.approvalStatus !== 'All') params.append('approvalStatus', filters.approvalStatus);
    if (filters.signatureStatus && filters.signatureStatus !== 'ALL' && filters.signatureStatus !== 'All') params.append('signatureStatus', filters.signatureStatus);
    if (filters.leadId && filters.leadId !== 'ALL') params.append('leadId', filters.leadId);
    if (filters.assignedTo && filters.assignedTo !== 'ALL') params.append('assignedTo', filters.assignedTo);
    if (filters.date) params.append('date', filters.date);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const qs = params.toString();
    const endpoint = `/leads/contracts${qs ? `?${qs}` : ''}`;
    const res = await fetchWithCookies<{
      success: boolean;
      data: Contract[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(endpoint);

    return {
      data: res.data || [],
      pagination: res.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 },
    };
  },

  getContractStats: async (leadId?: string): Promise<ContractStats> => {
    const qs = leadId ? `?leadId=${encodeURIComponent(leadId)}` : '';
    const res = await fetchWithCookies<{ success: boolean; data: ContractStats; stats: ContractStats }>(`/leads/contracts/stats${qs}`);
    return res.data || res.stats;
  },

  getContractById: async (id: string): Promise<Contract> => {
    const res = await fetchWithCookies<{ success: boolean; data: Contract }>(`/leads/contracts/${encodeURIComponent(id)}`);
    return res.data;
  },

  createContract: async (data: Partial<ContractFormData>): Promise<Contract> => {
    const res = await fetchWithCookies<{ success: boolean; data: Contract }>('/leads/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  updateContract: async (id: string, data: Partial<ContractFormData>): Promise<Contract> => {
    const res = await fetchWithCookies<{ success: boolean; data: Contract }>(`/leads/contracts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  submitContractForApproval: async (id: string): Promise<Contract> => {
    const res = await fetchWithCookies<{ success: boolean; data: Contract }>(`/leads/contracts/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
    });
    return res.data;
  },

  approveContract: async (id: string): Promise<Contract> => {
    const res = await fetchWithCookies<{ success: boolean; data: Contract }>(`/leads/contracts/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
    });
    return res.data;
  },

  rejectContract: async (id: string, rejectionReason: string): Promise<Contract> => {
    const res = await fetchWithCookies<{ success: boolean; data: Contract }>(`/leads/contracts/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
    return res.data;
  },

  deleteContract: async (id: string): Promise<boolean> => {
    await fetchWithCookies<{ success: boolean; message: string }>(`/leads/contracts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  },
};

export default leadService;

