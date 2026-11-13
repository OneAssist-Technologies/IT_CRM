import {
  ActivityFilterParams,
  ActivityResponse,
  ActivityMetadata,
  ActivityItem,
} from '../types/activity';

import { API_BASE_URL } from '../config/env';

const API_BASE = `${API_BASE_URL}/activities`;

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

  return json;
}

export const activityService = {
  /**
   * Get activities list with filters, search, and pagination
   */
  async getActivities(params: ActivityFilterParams = {}): Promise<ActivityResponse> {
    const searchParams = new URLSearchParams();
    if (params.search && params.search.trim()) searchParams.append('search', params.search.trim());
    if (params.type && params.type !== 'all' && params.type !== 'All Activities') searchParams.append('type', params.type);
    if (params.leadId && params.leadId !== 'all' && params.leadId !== 'All Leads') searchParams.append('leadId', params.leadId);
    if (params.customerId && params.customerId !== 'all' && params.customerId !== 'All Customers') searchParams.append('customerId', params.customerId);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<ActivityResponse>(queryString);
  },

  /**
   * Get metadata for filter dropdowns
   */
  async getMetadata(): Promise<ActivityMetadata> {
    const res = await request<{ success: boolean; data: ActivityMetadata }>('/metadata');
    return res.data;
  },

  /**
   * Manually trigger backend synchronization
   */
  async syncActivities(): Promise<any> {
    return request('/sync', { method: 'POST' });
  },

  /**
   * Create an activity manually
   */
  async createActivity(activityData: Partial<ActivityItem>): Promise<ActivityItem> {
    const res = await request<{ success: boolean; data: ActivityItem }>('', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
    return res.data;
  },
};

export default activityService;
