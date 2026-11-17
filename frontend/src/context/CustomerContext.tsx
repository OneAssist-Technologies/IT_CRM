import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import { Customer, CustomerFormData, CustomerStats } from '../types/customer';
import { crmApi } from '../services/api';
import { useCRM } from './CRMContext';
import { usePermissions } from './AccessControlContext';

interface CustomerContextType {
  customers: Customer[];
  stats: CustomerStats | null;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  loading: boolean;
  search: string;
  setSearch: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  tierFilter: string;
  setTierFilter: (val: string) => void;
  industryFilter: string;
  setIndustryFilter: (val: string) => void;

  fetchCustomers: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createCustomer: (data: CustomerFormData) => Promise<{ success: boolean; data?: Customer; message?: string }>;
  updateCustomer: (id: string, data: Partial<CustomerFormData>) => Promise<{ success: boolean; data?: Customer; message?: string }>;
  deleteCustomer: (id: string) => Promise<{ success: boolean; message?: string }>;
}

export const DEFAULT_CUSTOMER_CONTEXT_VALUE: CustomerContextType = {
  customers: [],
  stats: null,
  selectedCustomer: null,
  loading: false,
  search: '',
  setSearch: () => {},
  statusFilter: 'all',
  setStatusFilter: () => {},
  tierFilter: 'all',
  setTierFilter: () => {},
  industryFilter: 'all',
  setIndustryFilter: () => {},
  setSelectedCustomer: () => {},
  fetchCustomers: async () => {},
  fetchStats: async () => {},
  createCustomer: async () => ({ success: false }),
  updateCustomer: async () => ({ success: false }),
  deleteCustomer: async () => ({ success: false }),
};

const CustomerContext = createContext<CustomerContextType>(DEFAULT_CUSTOMER_CONTEXT_VALUE);

export const CustomerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated, isAuthChecking, activeNav } = useCRM();
  const { getDataScope, can, permissionsLoaded, isSuperAdmin } = usePermissions();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const isPublicPage = activeNav === 'signup' || activeNav === 'login' || activeNav === 'reset-password';
  const hasCustomerPermission = Boolean(isSuperAdmin || (permissionsLoaded && can('customers', 'view')));

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated || isAuthChecking || isPublicPage || !hasCustomerPermission) return;
    try {
      const res = await crmApi.getCustomerStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (e) {
      console.error('Failed to fetch customer stats', e);
    }
  }, [isAuthenticated, isAuthChecking, isPublicPage, hasCustomerPermission]);

  const fetchCustomers = useCallback(async () => {
    if (!isAuthenticated || isAuthChecking || isPublicPage || !hasCustomerPermission) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (tierFilter && tierFilter !== 'all') params.customerTier = tierFilter;
      if (industryFilter && industryFilter !== 'all') params.industry = industryFilter;

      const res = await crmApi.getCustomers(params);
      if (res.success && res.data) {
        const roleUpper = String(currentUser?.role || '').toUpperCase();
        const isAdmin =
          roleUpper === 'SUPER_ADMIN' ||
          roleUpper === 'SUPER ADMIN' ||
          roleUpper === 'ADMIN' ||
          roleUpper === 'MANAGEMENT' ||
          String(currentUser?.email || '').toLowerCase().trim() === 'sandy@gmail.com';

        const customerScope = getDataScope('customers');
        const isAllScope = isAdmin || customerScope === 'All';

        const filtered = isAllScope
          ? res.data
          : res.data.filter((c: any) =>
              (currentUser?.id && c.accountManagerId === currentUser.id) ||
              (currentUser?.name && c.accountManager && c.accountManager.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
            );
        setCustomers(filtered);
      }
    } catch (e: any) {
      notifications.show({
        title: 'Error',
        message: e.message || 'Failed to fetch customers',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, tierFilter, industryFilter, isAuthenticated, isAuthChecking, isPublicPage, currentUser, getDataScope, hasCustomerPermission]);

  useEffect(() => {
    if (!isAuthenticated || isAuthChecking || isPublicPage || !hasCustomerPermission) return;
    fetchCustomers();
    fetchStats();
  }, [fetchCustomers, fetchStats, isAuthenticated, isAuthChecking, isPublicPage, hasCustomerPermission]);

  const createCustomer = async (data: CustomerFormData) => {
    try {
      const res = await crmApi.createCustomer(data);
      if (res.success) {
        if (res.data) {
          setCustomers((prev) => [
            res.data,
            ...prev.filter((c) => c.id !== res.data.id && c.customerId !== res.data.customerId),
          ]);
        }
        notifications.show({
          title: 'Customer Created',
          message: `${res.data?.companyName || 'Customer'} added successfully.`,
          color: 'teal',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_customers_updated'));
        }
        await Promise.all([fetchCustomers(), fetchStats()]);
        return { success: true, data: res.data };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      notifications.show({
        title: 'Creation Failed',
        message: err.message || 'Failed to create customer',
        color: 'red',
      });
      return { success: false, message: err.message };
    }
  };

  const updateCustomer = async (id: string, data: Partial<CustomerFormData>) => {
    try {
      const res = await crmApi.updateCustomer(id, data);
      if (res.success) {
        if (res.data) {
          setCustomers((prev) =>
            prev.map((c) => (c.id === id || c.customerId === id ? { ...c, ...res.data } : c))
          );
          if (selectedCustomer && (selectedCustomer.id === id || selectedCustomer.customerId === id)) {
            setSelectedCustomer(res.data);
          }
        }
        notifications.show({
          title: 'Customer Updated',
          message: `${res.data?.companyName || 'Customer'} updated successfully.`,
          color: 'teal',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_customers_updated'));
        }
        await Promise.all([fetchCustomers(), fetchStats()]);
        return { success: true, data: res.data };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Failed to update customer',
        color: 'red',
      });
      return { success: false, message: err.message };
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const res = await crmApi.deleteCustomer(id);
      if (res.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id && c.customerId !== id));
        if (selectedCustomer && (selectedCustomer.id === id || selectedCustomer.customerId === id)) {
          setSelectedCustomer(null);
        }
        notifications.show({
          title: 'Customer Deleted',
          message: res.message || 'Customer deleted successfully.',
          color: 'teal',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_customers_updated'));
        }
        await Promise.all([fetchCustomers(), fetchStats()]);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      notifications.show({
        title: 'Delete Failed',
        message: err.message || 'Failed to delete customer',
        color: 'red',
      });
      return { success: false, message: err.message };
    }
  };

  return (
    <CustomerContext.Provider
      value={{
        customers,
        stats,
        selectedCustomer,
        setSelectedCustomer,
        loading,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        tierFilter,
        setTierFilter,
        industryFilter,
        setIndustryFilter,
        fetchCustomers,
        fetchStats,
        createCustomer,
        updateCustomer,
        deleteCustomer,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = (): CustomerContextType => {
  const context = useContext(CustomerContext);
  return context || DEFAULT_CUSTOMER_CONTEXT_VALUE;
};
