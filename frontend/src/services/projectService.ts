import {
  Project,
  ProjectFormData,
  ProjectFilter,
  ProjectStats,
  ProjectMetadata,
  ProjectModuleItem,
} from '../types/project';

import { API_BASE_URL } from '../config/env';

async function fetchWithCookies<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
}

export const projectService = {
  // Get projects list with filters & pagination
  getProjects: async (
    params: ProjectFilter = {}
  ): Promise<{
    success: boolean;
    data: Project[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params.projectType && params.projectType !== 'All') query.append('projectType', params.projectType);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.projectManagerId && params.projectManagerId !== 'All') query.append('projectManagerId', params.projectManagerId);
    if (params.contactId) query.append('contactId', params.contactId);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = `/projects${qs ? `?${qs}` : ''}`;
    return fetchWithCookies<{
      success: boolean;
      data: Project[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(endpoint);
  },

  // Get single project
  getProjectById: async (id: string): Promise<{ success: boolean; data: Project }> => {
    return fetchWithCookies<{ success: boolean; data: Project }>(`/projects/${encodeURIComponent(id)}`);
  },

  // Get project stats
  getProjectStats: async (): Promise<{ success: boolean; stats: ProjectStats }> => {
    return fetchWithCookies<{ success: boolean; stats: ProjectStats }>('/projects/stats');
  },

  // Get project metadata
  getProjectMetadata: async (): Promise<{ success: boolean; data: ProjectMetadata }> => {
    return fetchWithCookies<{ success: boolean; data: ProjectMetadata }>('/projects/metadata');
  },

  // Create project
  createProject: async (
    data: ProjectFormData
  ): Promise<{ success: boolean; message: string; data: Project }> => {
    return fetchWithCookies<{ success: boolean; message: string; data: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update project
  updateProject: async (
    id: string,
    data: Partial<ProjectFormData>
  ): Promise<{ success: boolean; message: string; data: Project }> => {
    return fetchWithCookies<{ success: boolean; message: string; data: Project }>(
      `/projects/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  // Delete project
  deleteProject: async (id: string): Promise<{ success: boolean; message: string }> => {
    return fetchWithCookies<{ success: boolean; message: string }>(`/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Update project modules & end-to-end tracking
  updateProjectModules: async (
    id: string,
    modules: ProjectModuleItem[]
  ): Promise<{ success: boolean; message: string; data: Project }> => {
    return fetchWithCookies<{ success: boolean; message: string; data: Project }>(
      `/projects/${encodeURIComponent(id)}/modules`,
      {
        method: 'PUT',
        body: JSON.stringify({ modules }),
      }
    );
  },
};

export default projectService;
