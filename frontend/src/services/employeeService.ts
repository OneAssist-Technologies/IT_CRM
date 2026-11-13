import { Employee, EmployeeStats } from '../types/employee';
import { API_BASE_URL } from '../config/env';

const API_BASE = `${API_BASE_URL}/employees`;

/**
 * Safe Response Parser (prevents JSON parse errors on HTML 404/500 pages)
 */
async function safeParseResponse(res: Response): Promise<{ success: boolean; data?: any; message?: string }> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const json = await res.json();
      return {
        success: res.ok && json.success !== false,
        data: json.data,
        message: json.message || (res.ok ? undefined : `Request failed with status ${res.status}`),
      };
    } catch {
      return { success: false, message: 'Invalid JSON response from server.' };
    }
  } else {
    const text = await res.text();
    const cleanMsg = text.replace(/<[^>]*>?/gm, '').trim();
    return {
      success: res.ok,
      message: res.ok ? undefined : (cleanMsg ? `Error (${res.status}): ${cleanMsg.slice(0, 100)}` : `Server returned error status ${res.status}`),
    };
  }
}

/**
 * Fetch all employees with optional filter query
 */
export async function fetchEmployeesApi(filters?: {
  department?: string;
  status?: string;
  role?: string;
  employmentType?: string;
  search?: string;
}): Promise<{ data: Employee[]; count: number; source?: string }> {
  try {
    const params = new URLSearchParams();
    if (filters?.department && filters.department !== 'ALL') params.append('department', filters.department);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters?.role && filters.role !== 'ALL') params.append('role', filters.role);
    if (filters?.employmentType && filters.employmentType !== 'ALL') params.append('employmentType', filters.employmentType);
    if (filters?.search && filters.search.trim()) params.append('search', filters.search.trim());

    const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      credentials: 'include',
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        return { data: [], count: 0 };
      }
      throw new Error(`Failed to fetch employees: ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { data: [], count: 0 };
    }

    const data = await res.json();
    return {
      data: data.data || [],
      count: data.count || (data.data ? data.data.length : 0),
      source: data.source,
    };
  } catch (error) {
    console.error('Error fetching employees:', error);
    return { data: [], count: 0 };
  }
}

/**
 * Fetch Employee Statistics & KPI Metrics
 */
export async function fetchEmployeeStatsApi(): Promise<EmployeeStats | null> {
  try {
    const res = await fetch(`${API_BASE}/stats`, {
      credentials: 'include',
    });

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;

    const data = await res.json();
    return data.stats || null;
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    return null;
  }
}

/**
 * Create / Onboard New Employee
 */
export async function createEmployeeApi(employeeData: Partial<Employee>): Promise<{ success: boolean; data?: Employee; message?: string }> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(employeeData),
    });

    return await safeParseResponse(res);
  } catch (error: any) {
    return { success: false, message: error.message || 'Network connection failed.' };
  }
}

/**
 * Update Employee
 */
export async function updateEmployeeApi(id: string, employeeData: Partial<Employee>): Promise<{ success: boolean; data?: Employee; message?: string }> {
  try {
    if (!id || id === 'undefined' || id === 'null') {
      return { success: false, message: 'Employee ID is required for update.' };
    }
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(employeeData),
    });

    return await safeParseResponse(res);
  } catch (error: any) {
    return { success: false, message: error.message || 'Network connection failed.' };
  }
}

/**
 * Update Employee Status
 */
export async function updateEmployeeStatusApi(id: string, status: string): Promise<boolean> {
  try {
    if (!id || id === 'undefined' || id === 'null') return false;
    const res = await fetch(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Delete Employee Record
 */
export async function deleteEmployeeApi(id: string): Promise<boolean> {
  try {
    if (!id || id === 'undefined' || id === 'null') return false;
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.ok;
  } catch (error) {
    return false;
  }
}
