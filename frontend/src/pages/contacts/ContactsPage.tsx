import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Text,
  Button,
  Group,
  TextInput,
  Select,
  Stack,
  Modal,
  useComputedColorScheme,
  ActionIcon,
  UnstyledButton,
  ThemeIcon,
  Badge,
} from '@mantine/core';
import {
  IconSearch,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconBuilding,
  IconUser,
  IconFileSpreadsheet,
  IconDownload,
  IconUpload,
} from '@tabler/icons-react';
import { useContact } from '../../context/ContactContext';
import { useCRM } from '../../context/CRMContext';
import { usePermissions } from '../../context/AccessControlContext';
import { Contact, ImportBatch } from '../../types/contact';
import { ContactTableView } from './components/ContactTableView';
import { ContactModal } from './components/ContactModal';
import { ContactDrawer } from './components/ContactDrawer';
import { BulkImportSection, downloadSampleCSV } from './components/BulkImportSection';
import { BulkImportHistoryTable } from './components/BulkImportHistoryTable';
import { BatchDetailsView } from './components/BatchDetailsView';
import contactService from '../../services/contactService';
import { notifications } from '@mantine/notifications';
import { CRM_COLORS } from '../../theme/colors';
import {
  DateFilterControl,
  DateFilterValue,
  DEFAULT_DATE_FILTER,
  isDateMatchingFilter,
} from '../../components/common/DateFilterControl';

type ActiveTabType = 'BULK_IMPORT' | 'NEW' | 'ASSIGNED';

export const ContactsPage: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { setActiveNav, currentUser } = useCRM();
  const { isSuperAdmin: permIsSuperAdmin, can } = usePermissions();

  const roleUpper = (currentUser?.role || '').toUpperCase().trim();
  const emailLower = (currentUser?.email || '').toLowerCase().trim();
  const isSuperAdmin =
    permIsSuperAdmin ||
    roleUpper === 'SUPER_ADMIN' ||
    roleUpper === 'SUPER ADMIN' ||
    emailLower === 'sandy@gmail.com';
  const isAdmin =
    isSuperAdmin ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'MANAGEMENT';

  const {
    contacts,
    stats,
    metadata,
    loading,
    filters,
    pagination,
    setFilters,
    setPage,
    deleteContact,
    fetchContacts,
    fetchStats,
    setSelectedContact,
  } = useContact();

  const [activeTab, setActiveTab] = useState<ActiveTabType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_contacts_tab') as ActiveTabType;
      if (saved === 'BULK_IMPORT' || saved === 'NEW' || saved === 'ASSIGNED') {
        return saved;
      }
    }
    return 'NEW';
  });

  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Modal State for Delete Batch Confirmation
  const [deleteBatchTarget, setDeleteBatchTarget] = useState<ImportBatch | null>(null);
  const [deleteBatchLoading, setDeleteBatchLoading] = useState<boolean>(false);

  // Modal State for Add / Edit Contact Popup
  const [contactModalOpened, setContactModalOpened] = useState<boolean>(false);
  const [modalContact, setModalContact] = useState<Contact | null>(null);
  const [bulkModalOpened, setBulkModalOpened] = useState<boolean>(false);

  // Batch Selection & History State for Bulk Import
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState<boolean>(false);
  const [batchPage, setBatchPage] = useState<number>(1);
  const [batchPagination, setBatchPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const fetchImportBatches = useCallback(async (pageToLoad = batchPage) => {
    try {
      setBatchesLoading(true);
      const params: Record<string, any> = {
        page: pageToLoad,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim();
      }
      if (filters.assignedTo && filters.assignedTo !== 'All') {
        params.assignedTo = filters.assignedTo;
      }
      const res = await contactService.getImportBatches(params);
      if (res.success) {
        setBatches(res.data || []);
        if (res.pagination) {
          setBatchPagination({
            total: res.pagination.total ?? 0,
            page: res.pagination.page ?? pageToLoad,
            limit: res.pagination.limit ?? 10,
            totalPages: res.pagination.totalPages ?? 1,
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch import batches:', err);
    } finally {
      setBatchesLoading(false);
    }
  }, [batchPage, filters.search, filters.assignedTo]);

  useEffect(() => {
    if (activeTab === 'BULK_IMPORT') {
      fetchImportBatches(batchPage);
    }
  }, [activeTab, batchPage, fetchImportBatches]);

  const handleDeleteBatch = (batchToDelete: ImportBatch) => {
    setDeleteBatchTarget(batchToDelete);
  };

  const handleConfirmDeleteBatch = async () => {
    if (!deleteBatchTarget) return;
    try {
      setDeleteBatchLoading(true);
      const res = await contactService.deleteImportBatch(deleteBatchTarget.batchId);
      if (res.success) {
        notifications.show({
          title: 'Batch Deleted',
          message: res.message || 'Import batch deleted.',
          color: 'teal',
        });
        if (selectedBatch?.batchId === deleteBatchTarget.batchId) {
          setSelectedBatch(null);
        }
        setDeleteBatchTarget(null);
        fetchImportBatches(1);
        fetchStats();
        fetchContacts();
      }
    } catch (err: any) {
      notifications.show({
        title: 'Error Deleting Batch',
        message: err.message || 'Could not delete batch.',
        color: 'red',
      });
    } finally {
      setDeleteBatchLoading(false);
    }
  };

  const [searchInput, setSearchInput] = useState<string>(filters.search || '');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);

  // Filter contacts by date (day-wise and month-wise) and scope contacts for non-admins (own data only)
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (!isAdmin) {
        const myName = currentUser?.name?.toLowerCase().trim();
        const myEmail = currentUser?.email?.toLowerCase().trim();
        const myId = currentUser?.id?.toLowerCase().trim();

        if (activeTab === 'BULK_IMPORT') {
          const creator = (c.createdBy || '').toLowerCase().trim();
          const assignedName = (c.assignedToName || '').toLowerCase().trim();
          const assignedId = (c.assignedTo || '').toLowerCase().trim();
          const isMine =
            (myName && (creator === myName || assignedName === myName || assignedName.includes(myName))) ||
            (myEmail && (creator === myEmail || assignedId === myEmail)) ||
            (myId && (creator === myId || assignedId === myId));
          if (!isMine) return false;
        } else if (activeTab === 'NEW') {
          // Employee sees direct contacts assigned to them OR created by themselves
          const creator = (c.createdBy || '').toLowerCase().trim();
          const assignedName = (c.assignedToName || '').toLowerCase().trim();
          const assignedId = (c.assignedTo || '').toLowerCase().trim();
          const isMine =
            (myName && (creator === myName || assignedName === myName || assignedName.includes(myName) || myName.includes(assignedName))) ||
            (myEmail && (creator === myEmail || assignedId === myEmail)) ||
            (myId && (creator === myId || assignedId === myId));
          if (!isMine) return false;
        } else if (activeTab === 'ASSIGNED') {
          // Employee sees qualified contacts assigned to them OR created/qualified by them
          const assignedName = (c.assignedToName || '').toLowerCase().trim();
          const assignedId = (c.assignedTo || '').toLowerCase().trim();
          const creator = (c.createdBy || '').toLowerCase().trim();
          const qualifiedBy = ((c as any).qualifiedBy || '').toLowerCase().trim();
          const isMine =
            (myName && (assignedName === myName || assignedName.includes(myName) || myName.includes(assignedName) || creator === myName || qualifiedBy === myName)) ||
            (myId && (assignedId === myId || creator === myId)) ||
            (myEmail && (assignedId === myEmail || creator === myEmail));
          if (!isMine) return false;
        }
      }

      const contactStatus = (c.status || '').toLowerCase().trim();
      const qualStatus = (c.qualificationStatus || '').toLowerCase().trim();
      const isNotInterested =
        contactStatus === 'not interested' ||
        contactStatus === 'not-interested' ||
        (c as any).callStatus === 'Not Interested' ||
        (c as any).whatsappStatus === 'Not Interested' ||
        (c as any).emailStatus === 'Not Interested';

      const isQualified =
        !isNotInterested &&
        (contactStatus === 'qualified' || qualStatus === 'qualified');

      const src = (c.source || '').toLowerCase().trim();
      const isBulk =
        Boolean((c as any).isBulkRecord) ||
        Boolean((c as any).isBulkImport) ||
        src === 'bulk import' ||
        src === 'import' ||
        Boolean(c.bulkId) ||
        Boolean((c as any).batchId) ||
        Boolean(c.id && String(c.id).startsWith('BLK-')) ||
        Boolean(c.contactId && String(c.contactId).startsWith('BLK-'));

      if (activeTab === 'BULK_IMPORT') {
        // Bulk import contacts list: show all bulk contacts including Qualified!
        if (!isBulk) return false;
      } else if (activeTab === 'NEW') {
        // New contacts list: direct/manual contacts that are NOT bulk and NOT qualified!
        if (isBulk) return false;
        if (isQualified) return false;
      } else if (activeTab === 'ASSIGNED') {
        // Qualification section contact list: ONLY show contacts that have been Qualified!
        if (!isQualified) return false;
      }

      // Status filter matching (checks both status and qualificationStatus)
      if (filters.status && filters.status !== 'All') {
        const s = filters.status.toLowerCase().trim();
        const contactStatus = (c.status || '').toLowerCase().trim();
        const qualStatus = (c.qualificationStatus || '').toLowerCase().trim();
        const isNotConnected =
          contactStatus === 'not connected' ||
          contactStatus === 'new' ||
          qualStatus === 'new' ||
          (!contactStatus && !qualStatus) ||
          (contactStatus !== 'qualified' && contactStatus !== 'unqualified' && contactStatus !== 'disqualified' && contactStatus !== 'interested' && contactStatus !== 'not interested' && qualStatus !== 'qualified' && qualStatus !== 'unqualified' && qualStatus !== 'disqualified');
        const matchesStatus =
          (s === 'not connected' && isNotConnected) ||
          contactStatus === s ||
          qualStatus === s ||
          (s === 'not interested' && isNotInterested) ||
          (s === 'disqualified' && (qualStatus === 'unqualified' || contactStatus === 'unqualified')) ||
          (s === 'unqualified' && (qualStatus === 'disqualified' || contactStatus === 'disqualified'));
        if (!matchesStatus) return false;
      }

      // Source filter matching
      if (filters.source && filters.source !== 'All') {
        const s = filters.source.toLowerCase().trim();
        const contactSource = (c.source || '').toLowerCase().trim();
        if (contactSource !== s) return false;
      }

      // Assigned filter matching
      if (filters.assignedTo && filters.assignedTo !== 'All') {
        const target = filters.assignedTo.toLowerCase().trim();
        const assignedName = (c.assignedToName || '').toLowerCase().trim();
        const assignedId = (c.assignedTo || '').toLowerCase().trim();
        const creator = (c.createdBy || '').toLowerCase().trim();
        const matchesAssigned =
          assignedName === target ||
          assignedName.includes(target) ||
          target.includes(assignedName) ||
          assignedId === target ||
          creator === target;
        if (!matchesAssigned) return false;
      }

      // Assignment status filter matching
      if (filters.assignmentStatus && filters.assignmentStatus !== 'All') {
        const s = filters.assignmentStatus.toLowerCase().trim();
        const currentAssignment = (c.assignmentStatus || (c.assignedTo ? 'Assigned' : 'Unassigned')).toLowerCase().trim();
        if (s === 'assigned' && currentAssignment !== 'assigned') return false;
        if (s === 'unassigned' && currentAssignment !== 'unassigned') return false;
      }

      // Search matching fallback
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const name = (c.name || '').toLowerCase();
        const company = (c.companyName || '').toLowerCase();
        const person = (c.contactPerson || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const contactId = (c.contactId || c.id || '').toLowerCase();
        const matchesSearch =
          name.includes(q) ||
          company.includes(q) ||
          person.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          contactId.includes(q);
        if (!matchesSearch) return false;
      }

      return isDateMatchingFilter(c.updatedAt || c.createdAt, dateFilter);
    });
  }, [contacts, dateFilter, isAdmin, currentUser, activeTab, filters.status, filters.source, filters.assignedTo, filters.assignmentStatus, filters.search]);

  // Keep filters in sync on initial mount and tab switch ONLY when tab actually changes
  const prevTabRef = useRef<ActiveTabType>(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      if (activeTab === 'ASSIGNED') {
        const assignedTarget = !isAdmin && currentUser?.name ? currentUser.name : 'All';
        setFilters({ tab: 'ASSIGNED', assignmentStatus: 'All', status: 'Qualified', source: 'All', assignedTo: assignedTarget, sortBy: 'updatedAt', sortOrder: 'desc' });
      } else if (activeTab === 'BULK_IMPORT') {
        setFilters({ tab: 'BULK_IMPORT', source: 'Bulk Import', assignmentStatus: 'All', status: 'All', assignedTo: 'All', sortBy: 'updatedAt', sortOrder: 'desc' });
      } else {
        setFilters({ tab: 'NEW', assignmentStatus: 'All', status: 'All', source: 'All', assignedTo: 'All', sortBy: 'updatedAt', sortOrder: 'desc' });
      }
    }
  }, [activeTab, isAdmin, currentUser?.name]);

  // Fresh load on mount to immediately view contacts without page refresh
  useEffect(() => {
    fetchContacts();
    fetchStats();
  }, [fetchContacts, fetchStats]);

  // Listen to contacts update event across CRM components
  useEffect(() => {
    const handleUpdated = () => {
      if (typeof window !== 'undefined') {
        const savedTab = localStorage.getItem('crm_contacts_tab') as ActiveTabType;
        if (savedTab && (savedTab === 'ASSIGNED' || savedTab === 'NEW' || savedTab === 'BULK_IMPORT')) {
          setActiveTab(savedTab);
        }
      }
      fetchContacts();
      fetchStats();
    };
    window.addEventListener('crm_contacts_updated', handleUpdated);
    return () => {
      window.removeEventListener('crm_contacts_updated', handleUpdated);
    };
  }, [fetchContacts, fetchStats]);

  // Real-time debounced search so typing immediately filters contacts
  useEffect(() => {
    const handler = setTimeout(() => {
      if ((filters.search || '') !== searchInput) {
        setFilters({ search: searchInput });
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFilters({ search: searchInput });
  };

  const handleTabChange = (tab: ActiveTabType) => {
    setActiveTab(tab);
    setSelectedBatch(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_contacts_tab', tab);
    }
    if (tab === 'ASSIGNED') {
      const assignedTarget = !isAdmin && currentUser?.name ? currentUser.name : 'All';
      setFilters({ tab: 'ASSIGNED', assignmentStatus: 'All', status: 'Qualified', source: 'All', assignedTo: assignedTarget, sortBy: 'updatedAt', sortOrder: 'desc' });
    } else if (tab === 'BULK_IMPORT') {
      setFilters({ tab: 'BULK_IMPORT', source: 'Bulk Import', assignmentStatus: 'All', status: 'All', assignedTo: 'All', sortBy: 'updatedAt', sortOrder: 'desc' });
      fetchImportBatches(1);
    } else {
      setFilters({ tab: 'NEW', assignmentStatus: 'All', status: 'All', source: 'All', assignedTo: 'All', sortBy: 'updatedAt', sortOrder: 'desc' });
    }
  };

  const handleOpenAddModal = () => {
    setModalContact(null);
    setContactModalOpened(true);
  };

  const handleOpenEditModal = (contact: Contact) => {
    setModalContact(contact);
    setContactModalOpened(true);
  };

  const handleOpenViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('crm_selected_contact', JSON.stringify(contact));
    }
    setActiveNav('contact-details');
  };

  const handleOpenQualification = (contact: Contact) => {
    setSelectedContact(contact);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('crm_qualifying_contact', JSON.stringify(contact));
    }
    setActiveNav('contact-qualification');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await deleteContact(deleteTarget.id);
    setDeleteLoading(false);
    if (res.success) {
      setDeleteTarget(null);
    }
  };

  const statusOptions = useMemo(() => {
    const isQualSection = activeTab === 'ASSIGNED';
    if (isQualSection) {
      return [
        { value: 'Qualified', label: 'All Qualified' },
        { value: 'All', label: 'All Qualified' },
      ];
    }
    const rawOptions = [
      { value: 'All', label: 'All Statuses' },
      { value: 'Not Connected', label: 'Not Connected' },
      { value: 'Interested', label: 'Interested' },
      { value: 'Not Interested', label: 'Not Interested' },
      { value: 'Follow-up Required', label: 'Follow-up Required' },
      { value: 'In Progress', label: 'In Progress' },
      { value: 'Disqualified', label: 'Disqualified' },
      ...(metadata?.statuses && metadata.statuses.length > 0
        ? metadata.statuses
            .filter((s) => !['All', 'Not Connected', 'Qualified', 'In Progress', 'Follow-up Required', 'Disqualified'].includes(s))
            .map((s) => ({ value: s, label: s }))
        : [
            { value: 'New', label: 'New' },
            { value: 'Active', label: 'Active' },
            { value: 'Won', label: 'Won' },
            { value: 'Lost', label: 'Lost' },
          ]),
    ];
    const seen = new Set<string>();
    return rawOptions.filter((opt) => {
      if (!opt.value || seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [metadata?.statuses, activeTab]);

  const sourceOptions = useMemo(() => {
    const rawOptions = [
      { value: 'All', label: 'All Sources' },
      { value: 'Bulk Import', label: 'Bulk Import' },
      { value: 'Social Media', label: 'Social Media' },
      { value: 'Website', label: 'Website' },
      { value: 'Referral', label: 'Referral' },
      { value: 'Cold Call', label: 'Cold Call' },
      { value: 'LinkedIn', label: 'LinkedIn' },
      { value: 'Other', label: 'Other' },
      ...(metadata?.sources
        ?.filter(
          (s) =>
            !['All', 'Bulk Import', 'Social Media', 'Website', 'Referral', 'Cold Call', 'LinkedIn', 'Other'].includes(s)
        )
        .map((s) => ({ value: s, label: s })) || []),
    ];
    const seen = new Set<string>();
    return rawOptions.filter((opt) => {
      if (!opt.value || seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [metadata?.sources]);

  const assignedOptions = useMemo(() => {
    let opts: { value: string; label: string }[] = [];
    if (!isAdmin) {
      opts = [
        { value: currentUser?.name || 'Assigned', label: 'My Assigned Contacts' },
        { value: 'Unassigned', label: 'Unassigned Only' },
      ];
    } else {
      opts = [
        { value: 'All', label: 'All Assigned' },
        ...(currentUser?.name ? [{ value: currentUser.name, label: `Assigned to Me (${currentUser.name})` }] : []),
        { value: 'Assigned', label: 'Assigned Only' },
        { value: 'Unassigned', label: 'Unassigned Only' },
        ...(metadata?.employees?.map((emp) => ({ value: emp.id, label: emp.name })) || []),
      ];
    }
    const seen = new Set<string>();
    return opts.filter((opt) => {
      if (!opt.value || seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [isAdmin, currentUser, metadata?.employees]);

  const totalCount = stats?.total ?? pagination.total ?? contacts.length;
  const bulkImportCount = stats?.bulkImport ?? 0;
  const newCount = stats?.new !== undefined ? stats.new : filteredContacts.length;
  const assignedCount = stats?.qualified ?? stats?.qualification ?? stats?.assigned ?? 0;

  const hasLocalSearchOrFilter = Boolean(
    (filters.search && filters.search.trim()) ||
    (filters.status && filters.status !== 'All' && filters.status !== 'Qualified') ||
    (filters.source && filters.source !== 'All' && filters.source !== 'Bulk Import') ||
    (filters.assignedTo && filters.assignedTo !== 'All') ||
    (dateFilter.type && dateFilter.type !== 'ALL') ||
    activeTab === 'NEW' ||
    activeTab === 'ASSIGNED'
  );

  const totalRecords = hasLocalSearchOrFilter
    ? filteredContacts.length
    : (pagination.total ?? filteredContacts.length ?? 0);
  const totalPages = hasLocalSearchOrFilter
    ? Math.max(1, Math.ceil(totalRecords / (pagination.limit || 10)))
    : (pagination.totalPages || Math.max(1, Math.ceil(totalRecords / (pagination.limit || 10))));
  const startRecord = totalRecords === 0 ? 0 : hasLocalSearchOrFilter ? 1 : (pagination.page - 1) * pagination.limit + 1;
  const endRecord = hasLocalSearchOrFilter ? filteredContacts.length : Math.min(pagination.page * pagination.limit, totalRecords);

  return (
    <Box p={{ base: 'xs', sm: 'sm' }} style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* 1. Header Toolbar */}
      <Paper
        p="sm"
        radius="16px"
        mb="sm"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 2px 10px rgba(0, 112, 243, 0.04)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap={8}>
          {/* Left: Modern Capsule Segmented Tabs */}
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              padding: 2.5,
              borderRadius: 10,
              border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #E2E8F0',
              flexShrink: 0,
            }}
          >
            {/* Tab: Bulk Import */}
            <UnstyledButton
              onClick={() => handleTabChange('BULK_IMPORT')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 9px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'BULK_IMPORT'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'BULK_IMPORT'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'BULK_IMPORT'
                    ? isDark
                      ? '#38BDF8'
                      : '#0284C7'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'BULK_IMPORT' ? 700 : 500,
                fontSize: 12.5,
                transition: 'all 0.15s ease',
              }}
            >
              <span>Bulk Import</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'BULK_IMPORT'
                      ? '#0284C7'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'BULK_IMPORT'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {bulkImportCount}
              </Box>
            </UnstyledButton>

            {/* Tab: New */}
            <UnstyledButton
              onClick={() => handleTabChange('NEW')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 9px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'NEW'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'NEW'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'NEW'
                    ? isDark
                      ? '#818CF8'
                      : '#4F46E5'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'NEW' ? 700 : 500,
                fontSize: 12.5,
                transition: 'all 0.15s ease',
              }}
            >
              <span>New</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'NEW'
                      ? '#4F46E5'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'NEW'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {newCount}
              </Box>
            </UnstyledButton>

            {/* Tab: Qualification */}
            <UnstyledButton
              onClick={() => handleTabChange('ASSIGNED')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 9px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'ASSIGNED'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'ASSIGNED'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'ASSIGNED'
                    ? isDark
                      ? '#60A5FA'
                      : '#2563EB'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'ASSIGNED' ? 700 : 500,
                fontSize: 12.5,
                transition: 'all 0.15s ease',
              }}
            >
              <span>Qualification</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'ASSIGNED'
                      ? '#2563EB'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'ASSIGNED'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {assignedCount}
              </Box>
            </UnstyledButton>
          </Box>

          {/* Right: Search, Filter Selects & Add Button (All in Single Row) */}
          <Group gap={6} align="center" wrap="wrap" style={{ flexShrink: 1, minWidth: 0, justifyContent: 'flex-end' }}>
            {/* Search contacts / files... */}
            <form onSubmit={handleSearchSubmit} style={{ width: 140 }}>
              <TextInput
                placeholder={activeTab === 'BULK_IMPORT' && !selectedBatch ? "Search files..." : "Search contacts..."}
                leftSection={<IconSearch size={14} color="#94A3B8" />}
                rightSection={
                  searchInput ? (
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      onClick={() => {
                        setSearchInput('');
                        setFilters({ search: '' });
                      }}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  ) : null
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setFilters({ search: searchInput });
                  }
                }}
                onBlur={() => setFilters({ search: searchInput })}
                size="sm"
                radius="md"
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                    fontSize: 12.5,
                    height: 36,
                  },
                }}
              />
            </form>

            {/* All Statuses (Show for Contact views: NEW, ASSIGNED, or inside Batch Details) */}
            {(activeTab !== 'BULK_IMPORT' || selectedBatch) && (
              <Select
                data={statusOptions}
                value={filters.status || 'All'}
                onChange={(val) => setFilters({ status: val || 'All' })}
                size="sm"
                radius="md"
                style={{ width: 112 }}
                comboboxProps={{ width: 195, position: 'bottom-start', withinPortal: true, shadow: 'md' }}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                    fontSize: 12.5,
                    height: 36,
                  },
                  option: {
                    fontSize: 12.5,
                    padding: '7px 12px',
                    whiteSpace: 'nowrap',
                  },
                }}
              />
            )}

            {/* All Sources (Hidden in Bulk Import page) */}
            {activeTab !== 'BULK_IMPORT' && (
              <Select
                data={sourceOptions}
                value={filters.source || 'All'}
                onChange={(val) => setFilters({ source: val || 'All' })}
                size="sm"
                radius="md"
                style={{ width: 108 }}
                comboboxProps={{ width: 175, position: 'bottom-start', withinPortal: true, shadow: 'md' }}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                    fontSize: 12.5,
                    height: 36,
                  },
                  option: {
                    fontSize: 12.5,
                    padding: '7px 12px',
                    whiteSpace: 'nowrap',
                  },
                }}
              />
            )}

            {/* All Assigned (Admin Only) */}
            {isAdmin && (
              <Select
                data={assignedOptions}
                value={
                  filters.assignedTo && filters.assignedTo !== 'All'
                    ? filters.assignedTo
                    : filters.assignmentStatus && filters.assignmentStatus !== 'All'
                    ? filters.assignmentStatus
                    : 'All'
                }
                onChange={(val) => {
                  if (!val || val === 'All') {
                    setFilters({ assignedTo: 'All', assignmentStatus: 'All' });
                  } else if (val === 'Assigned' || val === 'Unassigned') {
                    setFilters({ assignmentStatus: val, assignedTo: 'All' });
                  } else {
                    setFilters({ assignedTo: val, assignmentStatus: 'All' });
                  }
                }}
                size="sm"
                radius="md"
                style={{ width: 125 }}
                comboboxProps={{ width: 220, position: 'bottom-start', withinPortal: true, shadow: 'md' }}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                    fontSize: 12.5,
                    height: 36,
                  },
                  option: {
                    fontSize: 12.5,
                    padding: '7px 12px',
                    whiteSpace: 'nowrap',
                  },
                }}
              />
            )}

            {/* Date Filter: Day-wise & Month-wise */}
            <DateFilterControl value={dateFilter} onChange={setDateFilter} width={104} />

            {/* + Add Contact Button (Hidden in Bulk Import section) */}
            {activeTab !== 'BULK_IMPORT' && (
              <Button
                size="sm"
                radius="md"
                leftSection={<IconPlus size={15} stroke={2.5} />}
                onClick={handleOpenAddModal}
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 12.5,
                  height: 36,
                  padding: '0 12px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Add Contact
              </Button>
            )}
          </Group>
        </Group>
      </Paper>

      {/* 2. Main Content Area */}
      {activeTab === 'BULK_IMPORT' ? (
        selectedBatch ? (
          /* BATCH-SPECIFIC DETAILS VIEW (Requirements #2, #3, #4) */
          <BatchDetailsView
            batchId={selectedBatch.batchId}
            onBack={() => setSelectedBatch(null)}
            onViewContact={handleOpenViewDetails}
            onEditContact={(contact) => handleOpenEditModal(contact)}
            onDeleteContact={(contact) => setDeleteTarget(contact)}
            onQualifyContact={handleOpenQualification}
          />
        ) : (
          /* BULK IMPORT HISTORY VIEW (Requirement #1) */
          <Box>
            {/* Header Banner with Download Template and Import CSV buttons */}
            <Paper
              p="md"
              radius="16px"
              mb="sm"
              style={{
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 2px 10px rgba(0, 112, 243, 0.04)',
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <Group gap="sm">
                  <ThemeIcon
                    size={40}
                    radius="md"
                    style={{
                      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#E0F2FE',
                      color: '#0284C7',
                    }}
                  >
                    <IconFileSpreadsheet size={22} stroke={1.8} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={700} size="sm" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      Bulk Import History
                    </Text>
                    <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      Track uploaded spreadsheet files and view batch-specific imported contacts.
                    </Text>
                  </Box>
                </Group>

                <Group gap="xs">
                  <Button
                    variant="default"
                    size="sm"
                    radius="md"
                    leftSection={<IconDownload size={15} color="#0284C7" stroke={2} />}
                    onClick={downloadSampleCSV}
                    styles={{
                      root: {
                        height: 36,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                        fontSize: 12.5,
                        fontWeight: 600,
                      },
                    }}
                  >
                    Download Sample CSV
                  </Button>
                  <Button
                    size="sm"
                    radius="md"
                    leftSection={<IconUpload size={15} stroke={2.5} />}
                    onClick={() => setBulkModalOpened(true)}
                    style={{
                      height: 36,
                      background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontSize: 12.5,
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                    }}
                  >
                    Import CSV
                  </Button>
                </Group>
              </Group>
            </Paper>

            {/* Import History Table */}
            <BulkImportHistoryTable
              batches={batches}
              loading={batchesLoading}
              pagination={batchPagination}
              onPageChange={(newPage) => {
                setBatchPage(newPage);
                fetchImportBatches(newPage);
              }}
              onSelectBatch={(batch) => setSelectedBatch(batch)}
              onDeleteBatch={handleDeleteBatch}
              onBatchUpdated={() => fetchImportBatches(batchPage)}
            />
          </Box>
        )
      ) : (
        /* STANDARD UNIFIED CONTACTS LIST FOR NEW & ASSIGNED TABS */
        <Box>
          <ContactTableView
            contacts={filteredContacts}
            activeTab={activeTab}
            loading={loading}
            onView={(contact) => {
              if (activeTab === 'NEW' || activeTab === 'ASSIGNED') {
                handleOpenEditModal(contact);
              } else {
                handleOpenViewDetails(contact);
              }
            }}
            onRowClick={(contact) => {
              if (activeTab === 'NEW' || activeTab === 'ASSIGNED') {
                handleOpenEditModal(contact);
              } else {
                handleOpenViewDetails(contact);
              }
            }}
            onEdit={(contact) => handleOpenEditModal(contact)}
            onDelete={(contact) => setDeleteTarget(contact)}
            onAddNew={handleOpenAddModal}
            onQualify={handleOpenQualification}
            onTabChange={handleTabChange}
            onContactUpdated={() => {
              fetchContacts();
            }}
          />

          {/* Unified Pagination Footer */}
          <Paper
            mt="sm"
            p="sm"
            radius="16px"
            style={{
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 2px 10px rgba(0, 112, 243, 0.04)',
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap">
              <Text size="13px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Showing {startRecord} to {endRecord} of {totalRecords} contacts
              </Text>

              <Group gap={6} align="center">
                <Button
                  variant="default"
                  size="xs"
                  radius="md"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(Math.max(1, pagination.page - 1))}
                  leftSection={<IconChevronLeft size={13} />}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Previous
                </Button>

                <Box
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 28,
                    height: 28,
                    padding: '0 6px',
                    borderRadius: 6,
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #CBD5E1',
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {pagination.page}
                </Box>

                <Text size="12px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  of {totalPages}
                </Text>

                <Button
                  variant="default"
                  size="xs"
                  radius="md"
                  disabled={pagination.page >= totalPages}
                  onClick={() => setPage(pagination.page + 1)}
                  rightSection={<IconChevronRight size={13} />}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Next
                </Button>
              </Group>
            </Group>
          </Paper>
        </Box>
      )}

      {/* 4. Modal Popup for Add / Edit Contact */}
      <ContactModal
        opened={contactModalOpened}
        onClose={() => {
          setContactModalOpened(false);
          setModalContact(null);
        }}
        contact={modalContact}
        title={modalContact ? "Update contact" : "Create contact"}
        showContactMode={true}
        onSuccess={() => {
          if (activeTab !== 'BULK_IMPORT') {
            handleTabChange('NEW');
          }
          fetchContacts();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
          }
        }}
      />

      {/* 4b. Modal Popup for Bulk Import CSV */}
      <BulkImportSection
        opened={bulkModalOpened}
        onClose={() => setBulkModalOpened(false)}
        onImportComplete={(newBatchId) => {
          fetchContacts();
          fetchStats();
          fetchImportBatches(1);
          if (newBatchId) {
            setSelectedBatch({
              id: newBatchId,
              batchId: newBatchId,
              fileName: 'Uploaded CSV',
              totalRows: 0,
              importedCount: 0,
              failedCount: 0,
              status: 'Completed',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }}
      />

      {/* 5. Modern Delete Confirmation Dialog */}
      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        centered
        radius="lg"
        padding="lg"
        withCloseButton={false}
        styles={{
          content: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            boxShadow: isDark
              ? '0 20px 45px -10px rgba(0, 0, 0, 0.6)'
              : '0 20px 45px -10px rgba(0, 0, 0, 0.12)',
            borderRadius: 16,
          },
          body: {
            padding: 24,
          },
        }}
      >
        <Stack gap="md">
          <Group align="flex-start" wrap="nowrap" gap="md">
            <ThemeIcon
              size={44}
              radius="xl"
              style={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                color: '#EF4444',
                flexShrink: 0,
              }}
            >
              <IconAlertTriangle size={22} stroke={2} />
            </ThemeIcon>

            <Box style={{ flex: 1 }}>
              <Text fw={700} size="md" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.3 }}>
                Delete Contact
              </Text>
              <Text size="sm" mt={4} style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Are you sure you want to delete this contact? This action cannot be undone.
              </Text>
            </Box>
          </Group>

          {/* Contact Details Highlight Card */}
          {deleteTarget && (
            <Paper
              p="sm"
              radius="md"
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group justify="space-between" align="center" wrap="nowrap">
                <Box style={{ minWidth: 0 }}>
                  <Text fw={600} size="sm" truncate style={{ color: isDark ? '#F8FAFC' : '#1E293B' }}>
                    {deleteTarget.name}
                  </Text>
                  {deleteTarget.email && (
                    <Text size="xs" truncate style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      {deleteTarget.email}
                    </Text>
                  )}
                </Box>
                <Badge
                  variant="light"
                  color="red"
                  radius="sm"
                  size="sm"
                  style={{ fontWeight: 600, flexShrink: 0 }}
                >
                  {deleteTarget.contactId}
                </Badge>
              </Group>
            </Paper>
          )}

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button
              variant="default"
              radius="md"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1',
                color: isDark ? '#CBD5E1' : '#475569',
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              radius="md"
              size="sm"
              loading={deleteLoading}
              onClick={handleConfirmDelete}
              leftSection={<IconTrash size={15} stroke={2} />}
              style={{
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                fontWeight: 600,
              }}
            >
              Confirm Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 6. Modern Delete Batch Confirmation Dialog */}
      <Modal
        opened={Boolean(deleteBatchTarget)}
        onClose={() => !deleteBatchLoading && setDeleteBatchTarget(null)}
        centered
        radius="lg"
        padding="lg"
        withCloseButton={false}
        styles={{
          content: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            boxShadow: isDark
              ? '0 20px 45px -10px rgba(0, 0, 0, 0.6)'
              : '0 20px 45px -10px rgba(0, 0, 0, 0.12)',
            borderRadius: 16,
          },
          body: {
            padding: 24,
          },
        }}
      >
        <Stack gap="md">
          <Group align="flex-start" wrap="nowrap" gap="md">
            <ThemeIcon
              size={44}
              radius="xl"
              style={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                color: '#EF4444',
                flexShrink: 0,
              }}
            >
              <IconAlertTriangle size={22} stroke={2} />
            </ThemeIcon>

            <Box style={{ flex: 1 }}>
              <Text fw={700} size="md" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.3 }}>
                Delete Import Batch
              </Text>
              <Text size="sm" mt={4} style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Are you sure you want to delete this batch and its associated contacts? This action cannot be undone.
              </Text>
            </Box>
          </Group>

          {/* Batch Details Highlight Card */}
          {deleteBatchTarget && (
            <Paper
              p="sm"
              radius="md"
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group justify="space-between" align="center" wrap="nowrap">
                <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                  <IconFileSpreadsheet size={22} color="#0284C7" />
                  <Box style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" truncate style={{ color: isDark ? '#F8FAFC' : '#1E293B' }}>
                      {deleteBatchTarget.fileName || 'Spreadsheet Batch'}
                    </Text>
                    <Text size="xs" truncate style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      {deleteBatchTarget.importedCount ?? 0} contacts • {deleteBatchTarget.batchId}
                    </Text>
                  </Box>
                </Group>
                <Badge
                  variant="light"
                  color="red"
                  radius="sm"
                  size="sm"
                  style={{ fontWeight: 600, flexShrink: 0 }}
                >
                  {deleteBatchTarget.batchId}
                </Badge>
              </Group>
            </Paper>
          )}

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button
              variant="default"
              radius="md"
              size="sm"
              onClick={() => setDeleteBatchTarget(null)}
              disabled={deleteBatchLoading}
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1',
                color: isDark ? '#CBD5E1' : '#475569',
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              radius="md"
              size="sm"
              loading={deleteBatchLoading}
              onClick={handleConfirmDeleteBatch}
              leftSection={<IconTrash size={15} stroke={2} />}
              style={{
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                fontWeight: 600,
              }}
            >
              Delete Batch
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default ContactsPage;
