import { Customer, CustomerFormData, CustomerStats } from '../types/customer';
import { crmApi } from './api';

export const customerService = {
  getCustomers: async (
    params: Record<string, any> = {}
  ): Promise<{ success: boolean; data: Customer[]; customers?: Customer[]; count?: number }> => {
    const stringParams: Record<string, string> = {};
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        stringParams[key] = String(params[key]);
      }
    });
    return crmApi.getCustomers(stringParams);
  },

  getCustomerById: async (id: string): Promise<{ success: boolean; data: Customer }> => {
    return crmApi.getCustomerById(id);
  },

  getCustomerStats: async (): Promise<{ success: boolean; stats: CustomerStats }> => {
    return crmApi.getCustomerStats();
  },

  createCustomer: async (
    data: CustomerFormData
  ): Promise<{ success: boolean; data: Customer; message?: string }> => {
    return crmApi.createCustomer(data);
  },

  updateCustomer: async (
    id: string,
    data: Partial<CustomerFormData>
  ): Promise<{ success: boolean; data: Customer; message?: string }> => {
    return crmApi.updateCustomer(id, data);
  },

  deleteCustomer: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return crmApi.deleteCustomer(id);
  },
};

