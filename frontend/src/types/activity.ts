export type ActivityType =
  | 'all'
  | 'contact'
  | 'call'
  | 'qualification'
  | 'meeting'
  | 'proposal'
  | 'quotation'
  | 'contract'
  | 'invoice'
  | 'payment'
  | 'progress'
  | 'closure'
  | 'negotiation';

export interface ActivityItem {
  id: string;
  activityNumber?: string;
  type: ActivityType;
  title: string;
  description?: string;
  leadId?: string | null;
  leadName?: string | null;
  leadCode?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  entityNumber?: string | null;
  status?: string | null;
  amount?: number;
  performedBy?: string | null;
  performedById?: string | null;
  activityDate: string; // YYYY-MM-DD
  activityTime?: string; // e.g. "10:30 AM"
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivitySummary {
  qualifications?: number;
  contacts?: number;
  calls?: number;
  meetings: number;
  proposals: number;
  contracts: number;
  invoices: number;
  payments: number;
  progress: number;
  closure: number;
  negotiations: number;
  total: number;
}

export interface ActivityFilterParams {
  search?: string;
  type?: string;
  leadId?: string;
  leadName?: string;
  leadCode?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ActivityPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  from: number;
  to: number;
}

export interface ActivityResponse {
  success: boolean;
  data: ActivityItem[];
  pagination: ActivityPagination;
  summary: ActivitySummary;
}

export interface ActivityMetadata {
  leads: Array<{
    id: string;
    leadCode: string;
    name: string;
    companyName?: string;
    label: string;
  }>;
  customers: Array<{
    id: string;
    name: string;
  }>;
  performers: string[];
}
