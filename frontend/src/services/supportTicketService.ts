import {
  SupportTicket,
  TicketFilters,
  TicketDropdownMetadata,
  TicketComment,
  TicketAttachment,
} from '../types/supportTicket';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/support-tickets';

/**
 * Fetch paginated tickets with filters
 */
export async function fetchTicketsApi(
  filters: TicketFilters = {},
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  sortOrder = 'DESC'
): Promise<{
  tickets: SupportTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  params.append('sortBy', sortBy);
  params.append('sortOrder', sortOrder);

  if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
  if (filters.status && filters.status !== 'All') params.append('status', filters.status);
  if (filters.priority && filters.priority !== 'All') params.append('priority', filters.priority);
  if (filters.issueType && filters.issueType !== 'All') params.append('issueType', filters.issueType);
  if (filters.assignedTeam && filters.assignedTeam !== 'All') params.append('assignedTeam', filters.assignedTeam);
  if (filters.assignedTo && filters.assignedTo !== 'All') params.append('assignedTo', filters.assignedTo);
  if (filters.customerId) params.append('customerId', filters.customerId);
  if (filters.projectId) params.append('projectId', filters.projectId);
  if (filters.viewTab) params.append('viewTab', filters.viewTab);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);

  const res = await fetch(`${API_BASE}?${params.toString()}`, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch tickets (${res.status})`);
  }
  const json = await res.json();
  return {
    tickets: json.data || [],
    total: json.pagination?.total || 0,
    page: json.pagination?.page || 1,
    limit: json.pagination?.limit || limit,
    totalPages: json.pagination?.totalPages || 1,
  };
}

/**
 * Fetch single ticket details
 */
export async function fetchTicketByIdApi(id: string): Promise<SupportTicket> {
  const res = await fetch(`${API_BASE}/${id}`, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch ticket (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

/**
 * Fetch dropdown metadata
 */
export async function fetchTicketMetadataApi(): Promise<TicketDropdownMetadata> {
  const res = await fetch(`${API_BASE}/metadata`, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch dropdown metadata (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

/**
 * Fetch ticket stats summary (all, my, unassigned)
 */
export async function fetchTicketStatsApi(): Promise<{ all: number; my: number; unassigned: number }> {
  const res = await fetch(`${API_BASE}/stats`, { credentials: 'include' });
  if (!res.ok) {
    return { all: 0, my: 0, unassigned: 0 };
  }
  const json = await res.json();
  return json.data || { all: 0, my: 0, unassigned: 0 };
}

/**
 * Create a new support ticket
 */
export async function createTicketApi(data: Partial<SupportTicket>): Promise<SupportTicket> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to create ticket (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

/**
 * Update general ticket details
 */
export async function updateTicketApi(id: string, data: Partial<SupportTicket>): Promise<SupportTicket> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to update ticket (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

/**
 * Delete a support ticket
 */
export async function deleteTicketApi(id: string): Promise<SupportTicket> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to delete ticket (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

/**
 * Transition ticket status
 */
export async function changeTicketStatusApi(
  id: string,
  status: string,
  payload: Record<string, any> = {}
): Promise<SupportTicket> {
  const res = await fetch(`${API_BASE}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...payload }),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to change status (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

/**
 * Reassign ticket to employee or team
 */
export async function reassignTicketApi(id: string, assignmentData: any): Promise<SupportTicket> {
  const res = await fetch(`${API_BASE}/${id}/assignment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignmentData),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to reassign ticket (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

/**
 * Add comment or internal note
 */
export async function addTicketCommentApi(
  id: string,
  payload: { type: 'public_reply' | 'internal_note'; message: string; attachments?: any[] }
): Promise<TicketComment> {
  const res = await fetch(`${API_BASE}/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to add comment (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

/**
 * Upload attachments to ticket
 */
export async function uploadTicketAttachmentsApi(id: string, formData: FormData): Promise<TicketAttachment[]> {
  const res = await fetch(`${API_BASE}/${id}/attachments`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to upload attachments (${res.status})`);
  }
  const json = await res.json();
  return json.data || [];
}

/**
 * Resolve ticket
 */
export async function resolveTicketApi(
  id: string,
  payload: { resolution_description: string; root_cause?: string; workaround?: string }
): Promise<SupportTicket> {
  const res = await fetch(`${API_BASE}/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to resolve ticket (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

/**
 * Reopen ticket
 */
export async function reopenTicketApi(id: string, payload: { reason: string }): Promise<SupportTicket> {
  const res = await fetch(`${API_BASE}/${id}/reopen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to reopen ticket (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}
