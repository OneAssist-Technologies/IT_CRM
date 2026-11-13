import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import {
  Contact,
  ContactFormData,
  ContactFilter,
  ContactPagination,
  ContactStats,
  ContactMetadata,
} from '../types/contact';
import { contactService } from '../services/contactService';

interface ContactContextType {
  contacts: Contact[];
  stats: ContactStats | null;
  metadata: ContactMetadata | null;
  selectedContact: Contact | null;
  loading: boolean;
  filters: ContactFilter;
  pagination: ContactPagination;

  fetchContacts: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchMetadata: () => Promise<void>;
  setSelectedContact: (contact: Contact | null) => void;
  setFilters: (newFilters: Partial<ContactFilter>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  createContact: (data: ContactFormData) => Promise<{ success: boolean; data?: Contact; message?: string }>;
  updateContact: (id: string, data: Partial<ContactFormData>, options?: { silent?: boolean }) => Promise<{ success: boolean; data?: Contact; message?: string }>;
  deleteContact: (id: string) => Promise<{ success: boolean; message?: string }>;
  assignContact: (id: string, employeeId: string | null) => Promise<{ success: boolean; data?: Contact; message?: string }>;
  bulkImportContacts: (data: {
    contacts: any[];
    defaultAssignedTo?: string;
    defaultCategory?: string;
    defaultSource?: string;
    fileName?: string;
  }) => Promise<{
    success: boolean;
    importedCount: number;
    errorCount: number;
    data?: Contact[];
    errors?: any[];
    message?: string;
  }>;
}

const defaultPagination: ContactPagination = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasPrev: false,
  hasNext: false,
};

const getInitialSavedTab = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('crm_contacts_tab');
    if (saved === 'ASSIGNED' || saved === 'BULK_IMPORT' || saved === 'NEW') {
      return saved;
    }
  }
  return 'NEW';
};

const defaultFilters: ContactFilter = {
  tab: getInitialSavedTab(),
  search: '',
  companyName: 'All',
  contactType: 'All',
  category: 'All',
  source: 'All',
  status: 'All',
  stage: 'All',
  qualificationStatus: 'All',
  priority: 'All',
  assignedTo: 'All',
  assignmentStatus: 'All',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

const ContactContext = createContext<ContactContextType | undefined>(undefined);

export const ContactProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [metadata, setMetadata] = useState<ContactMetadata | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [filters, setFiltersState] = useState<ContactFilter>(defaultFilters);
  const [pagination, setPagination] = useState<ContactPagination>(defaultPagination);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await contactService.getContacts({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res.success) {
        setContacts(res.data || []);
        if (res.pagination) {
          const page = res.pagination.page ?? pagination.page ?? 1;
          const limit = res.pagination.limit ?? pagination.limit ?? 10;
          const total = res.pagination.total ?? 0;
          const totalPages = res.pagination.totalPages ?? (Math.ceil(total / limit) || 1);
          setPagination({
            total,
            page,
            limit,
            totalPages,
            hasPrev: typeof res.pagination.hasPrev === 'boolean' ? res.pagination.hasPrev : page > 1,
            hasNext: typeof res.pagination.hasNext === 'boolean' ? res.pagination.hasNext : page < totalPages,
          });
        }
      }
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      notifications.show({
        title: 'Error Fetching Contacts',
        message: err.message || 'Unable to retrieve contacts list.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await contactService.getContactStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      console.error('Error fetching contact stats:', err);
    }
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      const res = await contactService.getContactMetadata();
      const meta = res.metadata || (res as any).data;
      if (res.success && meta) {
        setMetadata(meta);
      }
    } catch (err: any) {
      console.error('Error fetching contact metadata:', err);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchStats();
    fetchMetadata();
  }, [fetchStats, fetchMetadata]);

  const setFilters = (newFilters: Partial<ContactFilter>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFiltersState(defaultFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const setPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const setLimit = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  const setSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFiltersState((prev) => ({ ...prev, sortBy, sortOrder }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const createContact = async (data: ContactFormData) => {
    try {
      setLoading(true);
      const res = await contactService.createContact(data);
      if (res.success) {
        if (res.data) {
          setContacts((prev) => [
            res.data!,
            ...prev.filter((c) => c.id !== res.data!.id && c.contactId !== res.data!.contactId),
          ]);
        }
        notifications.show({
          title: 'Contact Created Successfully',
          message: res.message || `${res.data.name} (${res.data.contactId}) has been added to contacts.`,
          color: 'teal',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
        }
        await Promise.all([fetchContacts(), fetchStats(), fetchMetadata()]);
        return { success: true, data: res.data };
      }
      return { success: false, message: res.message || 'Creation failed.' };
    } catch (err: any) {
      notifications.show({
        title: 'Creation Failed',
        message: err.message || 'Could not create contact. Please check your inputs.',
        color: 'red',
      });
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateContact = async (
    id: string,
    data: Partial<ContactFormData>,
    options?: { silent?: boolean }
  ) => {
    const isSilent = options?.silent ?? false;
    try {
      setLoading(true);
      const res = await contactService.updateContact(id, data);
      if (res.success) {
        if (!isSilent) {
          notifications.show({
            title: 'Contact Updated',
            message: res.message || `${res.data?.name || 'Contact'} updated successfully!`,
            color: 'teal',
          });
        }
        if (res.data) {
          setContacts((prev) =>
            prev.map((c) => (c.id === id || c.contactId === id ? { ...c, ...res.data } : c))
          );
          setSelectedContact(res.data);
          try {
            sessionStorage.setItem('crm_qualifying_contact', JSON.stringify(res.data));
          } catch (e) {}
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
        }
        await Promise.all([fetchContacts(), fetchStats(), fetchMetadata()]);
        return { success: true, data: res.data };
      }
      return { success: false, message: res.message || 'Update failed.' };
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update contact.',
        color: 'red',
      });
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      setLoading(true);
      const res = await contactService.deleteContact(id);
      if (res.success) {
        notifications.show({
          title: 'Contact Deleted',
          message: res.message || 'Contact removed successfully.',
          color: 'gray',
        });
        if (selectedContact && (selectedContact.id === id || selectedContact.contactId === id)) {
          setSelectedContact(null);
        }
        setContacts((prev) => prev.filter((c) => c.id !== id && c.contactId !== id));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
        }
        await Promise.all([fetchContacts(), fetchStats(), fetchMetadata()]);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      notifications.show({
        title: 'Delete Failed',
        message: err.message || 'Could not delete contact.',
        color: 'red',
      });
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const assignContact = async (id: string, employeeId: string | null) => {
    try {
      setLoading(true);
      const res = await contactService.assignContact(id, employeeId);
      if (res.success) {
        notifications.show({
          title: 'Contact Assignment Updated',
          message: res.message || 'Assignment updated successfully.',
          color: 'teal',
        });
        if (res.data) {
          setContacts((prev) =>
            prev.map((c) => (c.id === id || c.contactId === id ? { ...c, ...res.data } : c))
          );
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
        }
        await Promise.all([fetchContacts(), fetchStats(), fetchMetadata()]);
        return { success: true, data: res.data };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      notifications.show({
        title: 'Assignment Failed',
        message: err.message || 'Could not assign contact.',
        color: 'red',
      });
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const bulkImportContacts = async (data: {
    contacts: any[];
    defaultAssignedTo?: string;
    defaultCategory?: string;
    defaultSource?: string;
    fileName?: string;
  }) => {
    try {
      setLoading(true);
      const res = await contactService.bulkImportContacts(data);
      if (res.success) {
        notifications.show({
          title: 'Bulk Import Completed',
          message: res.message || `Successfully uploaded ${res.importedCount} contacts to Bulk Upload table!`,
          color: 'teal',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
        }
        await Promise.all([fetchContacts(), fetchStats(), fetchMetadata()]);
        return {
          success: true,
          importedCount: res.importedCount,
          errorCount: res.errorCount,
          data: res.data,
          errors: res.errors,
          message: res.message,
        };
      }
      return {
        success: false,
        importedCount: 0,
        errorCount: data.contacts.length,
        message: res.message || 'Import failed.',
      };
    } catch (err: any) {
      notifications.show({
        title: 'Bulk Import Failed',
        message: err.message || 'Failed to import contacts.',
        color: 'red',
      });
      return {
        success: false,
        importedCount: 0,
        errorCount: data.contacts.length,
        message: err.message,
      };
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContactContext.Provider
      value={{
        contacts,
        stats,
        metadata,
        selectedContact,
        loading,
        filters,
        pagination,
        fetchContacts,
        fetchStats,
        fetchMetadata,
        setSelectedContact,
        setFilters,
        resetFilters,
        setPage,
        setLimit,
        setSort,
        createContact,
        updateContact,
        deleteContact,
        assignContact,
        bulkImportContacts,
      }}
    >
      {children}
    </ContactContext.Provider>
  );
};

export const useContact = () => {
  const context = useContext(ContactContext);
  if (!context) {
    throw new Error('useContact must be used within a ContactProvider');
  }
  return context;
};

export default ContactContext;
