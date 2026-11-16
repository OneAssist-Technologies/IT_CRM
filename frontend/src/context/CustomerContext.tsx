import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import { Customer, CustomerFormData, CustomerStats } from '../types/customer';
import { crmApi } from '../services/api';
import { useCRM } from './CRMContext';

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

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated, isAuthChecking } = useCRM();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');

  const fetchStats = useCallback(async () => {
    try {
      const res = await crmApi.getCustomerStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (e) {
      console.error('Failed to fetch customer stats', e);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (tierFilter && tierFilter !== 'all') params.customerTier = tierFilter;
      if (industryFilter && industryFilter !== 'all') params.industry = industryFilter;

      const res = await crmApi.getCustomers(params);
      if (res.success && res.data) {
        setCustomers(res.data);
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
  }, [search, statusFilter, tierFilter, industryFilter]);

  useEffect(() => {
    if (!isAuthenticated || isAuthChecking) return;
    fetchCustomers();
    fetchStats();
  }, [fetchCustomers, fetchStats, isAuthenticated, isAuthChecking, currentUser?.id, currentUser?.role]);

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

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};
