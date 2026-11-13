import {
  MasterProject,
  MasterProjectFormData,
  CompanyProfile,
  CrmPipelinePresets,
  SecuritySettings,
} from '../types/settings';

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

export const settingsService = {
  // 1. Master Projects & Modules Catalog
  getMasterProjects: async (params: { search?: string; category?: string; status?: string } = {}): Promise<{
    success: boolean;
    data: MasterProject[];
    message?: string;
  }> => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.status && params.status !== 'All') query.append('status', params.status);

    const qs = query.toString();
    return fetchWithCookies<{ success: boolean; data: MasterProject[] }>(`/settings/projects${qs ? `?${qs}` : ''}`);
  },

  getMasterProjectById: async (id: string): Promise<{ success: boolean; data: MasterProject }> => {
    return fetchWithCookies<{ success: boolean; data: MasterProject }>(`/settings/projects/${id}`);
  },

  createMasterProject: async (data: MasterProjectFormData): Promise<{ success: boolean; data: MasterProject; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: MasterProject; message?: string }>('/settings/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateMasterProject: async (
    id: string,
    data: Partial<MasterProjectFormData>
  ): Promise<{ success: boolean; data: MasterProject; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: MasterProject; message?: string }>(`/settings/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteMasterProject: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return fetchWithCookies<{ success: boolean; message?: string }>(`/settings/projects/${id}`, {
      method: 'DELETE',
    });
  },

  // 2. Real-time User Profile ("My Profile")
  getUserProfile: async (): Promise<{ success: boolean; data: import('../types/settings').UserProfileData }> => {
    return fetchWithCookies<{ success: boolean; data: import('../types/settings').UserProfileData }>('/settings/profile');
  },

  updateUserProfile: async (data: Partial<import('../types/settings').UserProfileData>): Promise<{ success: boolean; data: import('../types/settings').UserProfileData; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: import('../types/settings').UserProfileData; message?: string }>('/settings/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message?: string }> => {
    return fetchWithCookies<{ success: boolean; message?: string }>('/settings/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 3. Company Profile
  getCompanyProfile: async (): Promise<{ success: boolean; data: CompanyProfile }> => {
    return fetchWithCookies<{ success: boolean; data: CompanyProfile }>('/settings/company');
  },

  updateCompanyProfile: async (data: Partial<CompanyProfile>): Promise<{ success: boolean; data: CompanyProfile; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: CompanyProfile; message?: string }>('/settings/company', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 3. CRM Presets
  getCrmPipelineSettings: async (): Promise<{ success: boolean; data: CrmPipelinePresets }> => {
    return fetchWithCookies<{ success: boolean; data: CrmPipelinePresets }>('/settings/crm-pipeline');
  },

  updateCrmPipelineSettings: async (data: Partial<CrmPipelinePresets>): Promise<{ success: boolean; data: CrmPipelinePresets; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: CrmPipelinePresets; message?: string }>('/settings/crm-pipeline', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 4. Security Settings
  getSecuritySettings: async (): Promise<{ success: boolean; data: SecuritySettings }> => {
    return fetchWithCookies<{ success: boolean; data: SecuritySettings }>('/settings/security');
  },

  updateSecuritySettings: async (data: Partial<SecuritySettings>): Promise<{ success: boolean; data: SecuritySettings; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: SecuritySettings; message?: string }>('/settings/security', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getSecurityAuditLogs: async (): Promise<{ success: boolean; data: import('../types/settings').SecurityAuditLog[]; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: import('../types/settings').SecurityAuditLog[]; message?: string }>('/settings/audit-logs');
  },

  // 5. Notification Preferences
  getNotificationSettings: async (): Promise<{ success: boolean; data: import('../types/settings').NotificationSettings }> => {
    return fetchWithCookies<{ success: boolean; data: import('../types/settings').NotificationSettings }>('/settings/notifications');
  },

  updateNotificationSettings: async (
    data: Partial<import('../types/settings').NotificationSettings>
  ): Promise<{ success: boolean; data: import('../types/settings').NotificationSettings; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: import('../types/settings').NotificationSettings; message?: string }>('/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 6. Reset Settings
  resetSetting: async (key: string): Promise<{ success: boolean; data: any; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: any; message?: string }>(`/settings/reset/${key}`, {
      method: 'POST',
    });
  },

  // 7. Calendar & Confidential Reminders (Super Admin & User)
  getReminders: async (): Promise<{ success: boolean; data: import('../types/settings').ReminderItem[] }> => {
    return fetchWithCookies<{ success: boolean; data: import('../types/settings').ReminderItem[] }>('/settings/reminders');
  },

  createReminder: async (
    data: import('../types/settings').ReminderFormData
  ): Promise<{ success: boolean; data: import('../types/settings').ReminderItem; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: import('../types/settings').ReminderItem; message?: string }>('/settings/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateReminder: async (
    id: string,
    data: Partial<import('../types/settings').ReminderItem>
  ): Promise<{ success: boolean; data: import('../types/settings').ReminderItem; message?: string }> => {
    return fetchWithCookies<{ success: boolean; data: import('../types/settings').ReminderItem; message?: string }>(`/settings/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteReminder: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return fetchWithCookies<{ success: boolean; message?: string }>(`/settings/reminders/${id}`, {
      method: 'DELETE',
    });
  },

  getDueReminders: async (): Promise<{ success: boolean; data: import('../types/settings').ReminderItem[] }> => {
    return fetchWithCookies<{ success: boolean; data: import('../types/settings').ReminderItem[] }>('/settings/reminders/due');
  },
};

export default settingsService;
 