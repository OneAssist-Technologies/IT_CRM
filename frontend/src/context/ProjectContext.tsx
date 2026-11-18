import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import { useCRM } from './CRMContext';
import { usePermissions } from './AccessControlContext';
import {
  Project,
  ProjectFormData,
  ProjectFilter,
  ProjectStats,
  ProjectMetadata,
  ProjectModuleItem,
} from '../types/project';
import { projectService } from '../services/projectService';

interface ProjectPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

interface ProjectContextType {
  projects: Project[];
  stats: ProjectStats | null;
  metadata: ProjectMetadata | null;
  selectedProject: Project | null;
  loading: boolean;
  filters: ProjectFilter;
  pagination: ProjectPagination;

  fetchProjects: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchMetadata: () => Promise<void>;
  setSelectedProject: (project: Project | null) => void;
  setFilters: (newFilters: Partial<ProjectFilter>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  createProject: (data: ProjectFormData) => Promise<{ success: boolean; data?: Project; message?: string }>;
  updateProject: (id: string, data: Partial<ProjectFormData>) => Promise<{ success: boolean; data?: Project; message?: string }>;
  deleteProject: (id: string) => Promise<{ success: boolean; message?: string }>;
  updateProjectModules: (id: string, modules: ProjectModuleItem[]) => Promise<{ success: boolean; data?: Project; message?: string }>;
}

const defaultPagination: ProjectPagination = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasPrev: false,
  hasNext: false,
};

const defaultFilters: ProjectFilter = {
  search: '',
  status: 'All',
  priority: 'All',
  projectType: 'All',
  category: 'All',
  projectManagerId: 'All',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};

const getCachedProjects = (): Project[] => {
  if (typeof window === 'undefined') return [];
  try {
    const s = sessionStorage.getItem('crm_cache_projects');
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
};

const getCachedStats = (): ProjectStats | null => {
  if (typeof window === 'undefined') return null;
  try {
    const s = sessionStorage.getItem('crm_cache_project_stats');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

const getCachedMetadata = (): ProjectMetadata | null => {
  if (typeof window === 'undefined') return null;
  try {
    const s = sessionStorage.getItem('crm_cache_project_metadata');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

export const DEFAULT_PROJECT_CONTEXT_VALUE: ProjectContextType = {
  projects: [],
  stats: null,
  metadata: null,
  selectedProject: null,
  loading: false,
  filters: defaultFilters,
  pagination: defaultPagination,
  fetchProjects: async () => {},
  fetchStats: async () => {},
  fetchMetadata: async () => {},
  setSelectedProject: () => {},
  setFilters: () => {},
  resetFilters: () => {},
  setPage: () => {},
  setLimit: () => {},
  setSort: () => {},
  createProject: async () => ({ success: false }),
  updateProject: async () => ({ success: false }),
  deleteProject: async () => ({ success: false }),
  updateProjectModules: async () => ({ success: false }),
};

const ProjectContext = createContext<ProjectContextType>(DEFAULT_PROJECT_CONTEXT_VALUE);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAuthChecking, activeNav } = useCRM();
  const { can, permissionsLoaded, isSuperAdmin } = usePermissions();
  const [projects, setProjects] = useState<Project[]>(() => getCachedProjects());
  const [stats, setStats] = useState<ProjectStats | null>(() => getCachedStats());
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(() => getCachedMetadata());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(() => getCachedProjects().length === 0);
  const [filters, setFiltersState] = useState<ProjectFilter>(defaultFilters);
  const [pagination, setPagination] = useState<ProjectPagination>(() => {
    const cached = getCachedProjects();
    return {
      ...defaultPagination,
      total: cached.length,
      totalPages: Math.max(1, Math.ceil(cached.length / 10)),
    };
  });

  const isPublicPage = activeNav === 'signup' || activeNav === 'login' || activeNav === 'reset-password';
  const hasProjectPermission = Boolean(isSuperAdmin || (permissionsLoaded && can('projects', 'view')));

  // 1. Fetch Projects List
  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated || isAuthChecking || isPublicPage || !hasProjectPermission) return;
    setLoading(true);
    try {
      const res = await projectService.getProjects(filters);
      if (res.success) {
        setProjects(res.data);
        if (typeof window !== 'undefined' && filters.status === 'All' && !filters.search) {
          try {
            sessionStorage.setItem('crm_cache_projects', JSON.stringify(res.data));
          } catch (_) {}
        }
        setPagination({
          total: res.pagination.total,
          page: res.pagination.page,
          limit: res.pagination.limit,
          totalPages: res.pagination.totalPages,
          hasPrev: res.pagination.page > 1,
          hasNext: res.pagination.page < res.pagination.totalPages,
        });
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('permission') && !err.message.includes('Access denied')) {
        notifications.show({
          title: 'Error loading projects',
          message: err.message || 'Could not fetch projects list.',
          color: 'red',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [filters, isAuthenticated, isAuthChecking, isPublicPage, hasProjectPermission]);

  // 2. Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    if (!isAuthenticated || isAuthChecking || isPublicPage || !hasProjectPermission) return;
    try {
      const res = await projectService.getProjectStats();
      if (res.success) {
        setStats(res.stats);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('crm_cache_project_stats', JSON.stringify(res.stats));
          } catch (_) {}
        }
      }
    } catch (err: any) {
      if (!err?.message?.includes('permission') && !err?.message?.includes('Access denied')) {
        console.error('[fetchStats Error]:', err);
      }
    }
  }, [isAuthenticated, isAuthChecking, isPublicPage, hasProjectPermission]);

  // 3. Fetch Dropdown Metadata
  const fetchMetadata = useCallback(async () => {
    if (!isAuthenticated || isAuthChecking || isPublicPage || !hasProjectPermission) return;
    try {
      const res = await projectService.getProjectMetadata();
      if (res.success) {
        setMetadata(res.data);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('crm_cache_project_metadata', JSON.stringify(res.data));
          } catch (_) {}
        }
      }
    } catch (err: any) {
      if (!err?.message?.includes('permission') && !err?.message?.includes('Access denied')) {
        console.error('[fetchMetadata Error]:', err);
      }
    }
  }, [isAuthenticated, isAuthChecking, isPublicPage, hasProjectPermission]);

  // Initial Data Load
  useEffect(() => {
    if (!isAuthenticated || isAuthChecking || isPublicPage || !hasProjectPermission) return;
    fetchProjects();
  }, [fetchProjects, isAuthenticated, isAuthChecking, isPublicPage, hasProjectPermission]);

  useEffect(() => {
    if (!isAuthenticated || isAuthChecking || isPublicPage || !hasProjectPermission) return;
    fetchStats();
    fetchMetadata();
  }, [fetchStats, fetchMetadata, isAuthenticated, isAuthChecking, isPublicPage, hasProjectPermission]);

  // Filters & Pagination Helpers
  const setFilters = useCallback((newFilters: Partial<ProjectFilter>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const setPage = useCallback((page: number) => {
    setFiltersState((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setFiltersState((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFiltersState((prev) => ({ ...prev, sortBy, sortOrder }));
  }, []);

  // Create Project
  const createProject = async (data: ProjectFormData) => {
    try {
      const res = await projectService.createProject(data);
      if (res.success) {
        if (res.data) {
          setProjects((prev) => [
            res.data!,
            ...prev.filter((p) => p.id !== res.data!.id && p.projectId !== res.data!.projectId),
          ]);
        }
        notifications.show({
          title: 'Project Created',
          message: res.message || 'New project created successfully!',
          color: 'green',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_projects_updated'));
        }
        await Promise.all([fetchProjects(), fetchStats()]);
        return { success: true, data: res.data };
      }
      return { success: false, message: 'Failed to create project' };
    } catch (err: any) {
      notifications.show({
        title: 'Creation Failed',
        message: err.message || 'Could not create project.',
        color: 'red',
      });
      return { success: false, message: err.message };
    }
  };

  // Update Project
  const updateProject = async (id: string, data: Partial<ProjectFormData>) => {
    try {
      const res = await projectService.updateProject(id, data);
      if (res.success) {
        if (res.data) {
          setProjects((prev) =>
            prev.map((p) => (p.id === id || p.projectId === id ? { ...p, ...res.data! } : p))
          );
          if (selectedProject && (selectedProject.id === id || selectedProject.projectId === id)) {
            setSelectedProject(res.data);
          }
        }
        notifications.show({
          title: 'Project Updated',
          message: res.message || 'Project updated successfully!',
          color: 'blue',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_projects_updated'));
        }
        await Promise.all([fetchProjects(), fetchStats()]);
        return { success: true, data: res.data };
      }
      return { success: false, message: 'Failed to update project' };
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update project.',
        color: 'red',
      });
      return { success: false, message: err.message };
    }
  };

  // Delete Project
  const deleteProject = async (id: string) => {
    try {
      const res = await projectService.deleteProject(id);
      if (res.success) {
        setProjects((prev) => prev.filter((p) => p.id !== id && p.projectId !== id));
        if (selectedProject && (selectedProject.id === id || selectedProject.projectId === id)) {
          setSelectedProject(null);
        }
        notifications.show({
          title: 'Project Deleted',
          message: res.message || 'Project deleted successfully.',
          color: 'teal',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_projects_updated'));
        }
        await Promise.all([fetchProjects(), fetchStats()]);
        return { success: true };
      }
      return { success: false, message: 'Failed to delete project' };
    } catch (err: any) {
      notifications.show({
        title: 'Delete Failed',
        message: err.message || 'Could not delete project.',
        color: 'red',
      });
      return { success: false, message: err.message };
    }
  };

  // Update Project Modules
  const updateProjectModules = async (id: string, modules: ProjectModuleItem[]) => {
    try {
      const res = await projectService.updateProjectModules(id, modules);
      if (res.success && res.data) {
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...res.data } : p))
        );
        if (selectedProject && selectedProject.id === id) {
          setSelectedProject({ ...selectedProject, ...res.data });
        }
        await Promise.all([fetchProjects(), fetchStats()]);
        return { success: true, data: res.data, message: res.message };
      }
      return { success: false, message: 'Failed to update modules' };
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update project modules.',
        color: 'red',
      });
      return { success: false, message: err.message };
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        stats,
        metadata,
        selectedProject,
        loading,
        filters,
        pagination,
        fetchProjects,
        fetchStats,
        fetchMetadata,
        setSelectedProject,
        setFilters,
        resetFilters,
        setPage,
        setLimit,
        setSort,
        createProject,
        updateProject,
        deleteProject,
        updateProjectModules,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  return context || DEFAULT_PROJECT_CONTEXT_VALUE;
};

export default ProjectContext;
