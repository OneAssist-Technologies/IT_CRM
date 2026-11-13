import { API_BASE_URL } from '../config/env';

/**
 * Standard Fetch Wrapper with automatic HttpOnly Cookie Credentials
 */
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

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
}

export const crmApi = {
  // Health & Redis Monitoring
  getHealth: () => fetchWithCookies<any>('/health'),
  getRedisStatus: () => fetchWithCookies<any>('/redis/status'),

  // Auth (HttpOnly Cookie-based & Redis Cached)
  register: (userData: { organisationName: string; name: string; email: string; phone?: string; password: string; confirmPassword?: string }) =>
    fetchWithCookies<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  login: async (credentials: { email: string; password: string }) => {
    const res = await fetchWithCookies<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res && res.token && typeof window !== 'undefined') {
      localStorage.setItem('crm_token', res.token);
    }
    return res;
  },
  logout: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('crm_token');
    }
    return fetchWithCookies<any>('/auth/logout', {
      method: 'POST',
    });
  },
  getMe: () => fetchWithCookies<any>('/auth/me'),
  forgotPassword: (email: string) =>
    fetchWithCookies<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  validateResetToken: (token: string) =>
    fetchWithCookies<any>(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`),
  resetPassword: (payload: { token?: string; email?: string; code?: string; newPassword: string; confirmPassword?: string }) =>
    fetchWithCookies<any>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Dashboard Stats (Cached via Redis)
  getDashboardStats: () => fetchWithCookies<any>('/dashboard/stats'),

  // Database Wipe / Reset
  clearDatabase: () =>
    fetchWithCookies<any>('/database/clear', {
      method: 'POST',
    }),

  // Customers API
  getCustomerStats: () => fetchWithCookies<any>('/customers/stats'),
  getCustomers: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchWithCookies<any>(`/customers${qs ? `?${qs}` : ''}`);
  },
  getCustomerById: (id: string) => fetchWithCookies<any>(`/customers/${id}`),
  createCustomer: (data: any) =>
    fetchWithCookies<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCustomer: (id: string, data: any) =>
    fetchWithCookies<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCustomer: (id: string) =>
    fetchWithCookies<any>(`/customers/${id}`, {
      method: 'DELETE',
    }),
};

export default crmApi;
