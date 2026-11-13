import React, { useState, useMemo } from 'react';
import {
  Group,
  TextInput,
  Button,
  Box,
  Text,
  ActionIcon,
  Modal,
  Paper,
  useComputedColorScheme,
  UnstyledButton,
  Select,
  Badge,
  Tooltip,
} from '@mantine/core';
import {
  IconSearch,
  IconX,
  IconAlertTriangle,
  IconChevronLeft,
  IconChevronRight,
  IconUser,
  IconPlus,
} from '@tabler/icons-react';
import { Lead } from '../../types/lead';
import { useLead } from '../../context/LeadContext';
import { useCRM } from '../../context/CRMContext';
import { useEmployee } from '../../context/EmployeeContext';
import { usePermissions } from '../../context/AccessControlContext';
import { LeadTableView } from './components/LeadTableView';
import { LeadModal } from './components/LeadModal';
import { ContactModal } from '../contacts/components/ContactModal';
import { useContact } from '../../context/ContactContext';
import { contactService } from '../../services/contactService';
import { Contact } from '../../types/contact';
import {
  DateFilterControl,
  DateFilterValue,
  DEFAULT_DATE_FILTER,
  isDateMatchingFilter,
} from '../../components/common/DateFilterControl';

type ActiveTabType = 'ALL' | 'NEW' | 'IN_PROGRESS' | 'COMPLETE';

export const LeadsPage: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { currentUser } = useCRM();
  const { employees } = useEmployee();
  const { isSuperAdmin } = usePermissions();
  const { contacts, fetchContacts } = useContact();

  const [updateLogsModalOpened, setUpdateLogsModalOpened] = useState(false);
  const [selectedContactForLogs, setSelectedContactForLogs] = useState<Contact | null>(null);

  const canFilterAssignee = Boolean(
    isSuperAdmin ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role?.toUpperCase() === 'SUPER_ADMIN' ||
    currentUser?.role?.toUpperCase() === 'SUPER ADMIN'
  );

  const {
    leads,
    stats,
    metadata,
    loading,
    filters,
    pagination,
    setFilters,
    setPage,
    deleteLead,
    fetchLeads,
    fetchStats,
  } = useLead();

  const [activeTab, setActiveTab] = useState<ActiveTabType>(() => {
    try {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const tabParam = searchParams.get('tab') as ActiveTabType;
        if (tabParam && ['ALL', 'NEW', 'IN_PROGRESS', 'COMPLETE'].includes(tabParam)) {
          return tabParam;
        }
        const savedTab = sessionStorage.getItem('crm_leads_tab');
        if (savedTab && ['ALL', 'NEW', 'IN_PROGRESS', 'COMPLETE'].includes(savedTab)) {
          return savedTab as ActiveTabType;
        }
      }
    } catch (e) {}
    return 'ALL';
  });

  React.useEffect(() => {
    if (activeTab === 'NEW') {
      setFilters({ status: 'New' });
    } else if (activeTab === 'IN_PROGRESS') {
      setFilters({ status: 'In Progress' });
    } else if (activeTab === 'COMPLETE') {
      setFilters({ status: 'Complete' });
    }
    fetchLeads();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live update listener so saved/qualified leads appear immediately without page refresh
  React.useEffect(() => {
    const handleUpdated = () => {
      fetchLeads();
      fetchStats();
    };
    window.addEventListener('crm_leads_updated', handleUpdated);
    window.addEventListener('crm_meetings_updated', handleUpdated);
    window.addEventListener('crm:meeting-updated', handleUpdated);
    window.addEventListener('crm_activities_updated', handleUpdated);
    window.addEventListener('crm_call_logs_updated', handleUpdated);
    return () => {
      window.removeEventListener('crm_leads_updated', handleUpdated);
      window.removeEventListener('crm_meetings_updated', handleUpdated);
      window.removeEventListener('crm:meeting-updated', handleUpdated);
      window.removeEventListener('crm_activities_updated', handleUpdated);
      window.removeEventListener('crm_call_logs_updated', handleUpdated);
    };
  }, [fetchLeads, fetchStats]);
  const [modalOpened, setModalOpened] = useState<boolean>(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>(filters.search || '');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);

  // Filter leads by date (day-wise and month-wise)
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => isDateMatchingFilter(l.createdAt || l.updatedAt, dateFilter));
  }, [leads, dateFilter]);

  // Real-time debounced search so typing immediately filters leads
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if ((filters.search || '') !== searchInput) {
        setFilters({ search: searchInput });
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const handleTabChange = (tab: ActiveTabType) => {
    setActiveTab(tab);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('crm_leads_tab', tab);
        const url = new URL(window.location.href);
        if (tab === 'ALL') {
          url.searchParams.delete('tab');
        } else {
          url.searchParams.set('tab', tab);
        }
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    } catch {}
    if (tab === 'NEW') {
      setFilters({ status: 'New' });
    } else if (tab === 'IN_PROGRESS') {
      setFilters({ status: 'In Progress' });
    } else if (tab === 'COMPLETE') {
      setFilters({ status: 'Complete' });
    } else {
      setFilters({ status: 'All' });
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFilters({ search: searchInput });
  };

  const handleOpenAddModal = () => {
    setSelectedLeadForEdit(null);
    setModalOpened(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setSelectedLeadForEdit(lead);
    setModalOpened(true);
  };

  const handleOpenUpdateLead = async (lead: Lead) => {
    const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, '') : '';
    const cleanEmail = lead.email ? lead.email.toLowerCase().trim() : '';

    let matchedContact = (contacts || []).find((c) => {
      if (cleanEmail && c.email && c.email.toLowerCase().trim() === cleanEmail) return true;
      if (cleanPhone && c.phone && c.phone.replace(/\D/g, '') === cleanPhone) return true;
      if (c.id === lead.id || c.contactId === lead.leadId) return true;
      return false;
    });

    if (!matchedContact && (cleanPhone || cleanEmail || lead.id)) {
      try {
        const res = await contactService.getContactById(lead.id || lead.leadId || cleanPhone || cleanEmail);
        if (res?.success && res.data) {
          matchedContact = res.data;
        }
      } catch {}
    }

    const contactData: Contact = {
      id: matchedContact?.id || lead.id,
      contactId: matchedContact?.contactId || lead.leadId || lead.id,
      bulkId: matchedContact?.bulkId || null,
      batchId: matchedContact?.batchId || null,
      importedContactId: matchedContact?.importedContactId || null,
      isImportedToContact: matchedContact?.isImportedToContact || null,
      name: lead.name,
      email: lead.email || null,
      phone: lead.phone || '',
      companyName: lead.companyName || null,
      contactPerson: lead.name || null,
      address: lead.address || null,
      location: lead.address || null,
      source: lead.source || 'Lead',
      category: (lead.category as any) || 'Product',
      status: (lead.status as any) || 'Qualified',
      stage: (lead.stage as any) || 'Qualification',


      assignedTo: lead.assignedTo || null,
      assignedToName: lead.assignedToName || null,
      description: (matchedContact as any)?.description || lead.notes || '',
      remarks: (matchedContact as any)?.remarks || lead.notes || '',
      notes: lead.notes || '',
      contactMode: (matchedContact as any)?.contactMode || null,
      ...(matchedContact || {}),
      designation: lead.designation || matchedContact?.designation || (lead as any).profession || (matchedContact as any)?.profession || null,
      profession: lead.profession || matchedContact?.profession || lead.designation || matchedContact?.designation || null,
      priority: (lead.priority || (lead as any).tag || matchedContact?.priority || 'Medium') as any,
      tagPriority: (lead.priority || (lead as any).tag || matchedContact?.priority || 'Medium') as any,


      productList: matchedContact?.productList || lead.productList || [],
      serviceList: matchedContact?.serviceList || lead.serviceList || [],
      leadId: lead.id,
      leadCode: lead.leadId || lead.id,
    } as any;

    setSelectedContactForLogs(contactData);
    setUpdateLogsModalOpened(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteLead(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalCount = stats?.total ?? leads.length;
  const newCount = stats?.new ?? 0;
  const inProgressCount = stats?.inProgress ?? 0;
  const completedCount = stats?.complete ?? stats?.completed ?? stats?.won ?? 0;

  const startRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <Box p={{ base: 'xs', sm: 'sm', md: 'md' }} style={{ width: '100%', maxWidth: '100%' }}>
      {/* Top Controls Bar - Modern Toolbar Card */}
      <Paper
        p="sm"
        style={{
          borderRadius: 12,
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          {/* Left: Modern Segmented Tabs */}
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              padding: 3,
              borderRadius: 10,
              border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #E2E8F0',
              flexShrink: 0,
            }}
          >
            {/* 1. All */}
            <UnstyledButton
              onClick={() => handleTabChange('ALL')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'ALL'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'ALL'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'ALL'
                    ? isDark
                      ? '#818CF8'
                      : '#4F46E5'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'ALL' ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.15s ease',
              }}
            >
              <span>All</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'ALL'
                      ? '#4F46E5'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'ALL'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {totalCount}
              </Box>
            </UnstyledButton>

            {/* 2. New */}
            <UnstyledButton
              onClick={() => handleTabChange('NEW')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
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
                      ? '#60A5FA'
                      : '#2563EB'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'NEW' ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.15s ease',
              }}
            >
              <span>New</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'NEW'
                      ? '#2563EB'
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

            {/* 3. In Progress */}
            <UnstyledButton
              onClick={() => handleTabChange('IN_PROGRESS')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'IN_PROGRESS'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'IN_PROGRESS'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'IN_PROGRESS'
                    ? isDark
                      ? '#F59E0B'
                      : '#D97706'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'IN_PROGRESS' ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.15s ease',
              }}
            >
              <span>In Progress</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'IN_PROGRESS'
                      ? '#D97706'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'IN_PROGRESS'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {inProgressCount}
              </Box>
            </UnstyledButton>

            {/* 4. Complete */}
            <UnstyledButton
              onClick={() => handleTabChange('COMPLETE')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor:
                  activeTab === 'COMPLETE'
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : 'transparent',
                boxShadow:
                  activeTab === 'COMPLETE'
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.4)'
                      : '0 1px 3px rgba(0, 0, 0, 0.08)'
                    : 'none',
                color:
                  activeTab === 'COMPLETE'
                    ? isDark
                      ? '#34D399'
                      : '#059669'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                fontWeight: activeTab === 'COMPLETE' ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.15s ease',
              }}
            >
              <span>Complete</span>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor:
                    activeTab === 'COMPLETE'
                      ? '#059669'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : '#E2E8F0',
                  color:
                    activeTab === 'COMPLETE'
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#64748B',
                }}
              >
                {completedCount}
              </Box>
            </UnstyledButton>
          </Box>

          {/* Right: Search, Filter Selects, Date & Add Button */}
          <Group gap={8} align="center" wrap="wrap" style={{ flexShrink: 0 }}>
            {/* Search leads... */}
            <form onSubmit={handleSearchSubmit} style={{ width: 190 }}>
              <TextInput
                placeholder="Search leads..."
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

            {/* Assignee Filter: Only for Super Admin */}
            {canFilterAssignee && (
              <Select
                placeholder="All Assignees"
                size="sm"
                radius="md"
                leftSection={<IconUser size={14} color="#6366F1" />}
                value={filters.assignedTo || 'All'}
                data={[
                  { value: 'All', label: 'All Assignees' },
                  { value: 'Unassigned', label: 'Unassigned Leads' },
                  ...employees.map((emp) => ({
                    value: emp.id,
                    label: `Assigned: ${emp.name}`,
                  })),
                ]}
                onChange={(val) => {
                  setFilters({ assignedTo: val || 'All' });
                }}
                style={{ width: 155 }}
                comboboxProps={{ width: 195, position: 'bottom-start', withinPortal: true, shadow: 'md' }}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                    fontSize: 12.5,
                    fontWeight: 500,
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
            <DateFilterControl value={dateFilter} onChange={setDateFilter} width={125} />

            {/* + Add Lead Button */}
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
                padding: '0 14px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Add Lead
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Table Content */}
      <LeadTableView
        leads={filteredLeads}
        onEdit={handleOpenEditModal}
        onUpdateLead={handleOpenUpdateLead}
        onDelete={(lead) => setDeleteTarget(lead)}
        onAddNew={handleOpenAddModal}
        loading={loading}
      />

      {/* Pagination Footer matching Contacts page */}
      <Paper
        mt={12}
        p="sm"
        style={{
          borderRadius: 12,
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap">
          <Text size="13px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            Showing {startRecord} to {Math.min(endRecord, filteredLeads.length)} of {dateFilter.type !== 'ALL' ? filteredLeads.length : pagination.total} leads
          </Text>

          <Group gap={6} align="center">
            {/* Previous */}
            <Button
              variant="default"
              size="xs"
              radius="md"
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
              leftSection={<IconChevronLeft size={13} />}
              style={{
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Previous
            </Button>

            {/* Page number pill */}
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
              of {pagination.totalPages || 1}
            </Text>

            {/* Next */}
            <Button
              variant="default"
              size="xs"
              radius="md"
              disabled={pagination.page >= (pagination.totalPages || 1)}
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

      {/* Add / Edit Modal */}
      <LeadModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        lead={selectedLeadForEdit}
      />

      {/* Update Logs (ContactModal) for Lead */}
      <ContactModal
        opened={updateLogsModalOpened}
        onClose={() => {
          setUpdateLogsModalOpened(false);
          setSelectedContactForLogs(null);
        }}
        contact={selectedContactForLogs}
        title="Update logs"
        showContactMode={true}
        onSuccess={async () => {
          setUpdateLogsModalOpened(false);
          setSelectedContactForLogs(null);
          await Promise.all([fetchLeads(), fetchStats(), fetchContacts?.()]);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={
          <Group gap="xs">
            <IconAlertTriangle color="#EF4444" size={20} />
            <Text fw={700}>Delete Lead Record</Text>
          </Group>
        }
        centered
        radius="lg"
      >
        <Text size="sm" c="dimmed" mb="lg">
          Are you sure you want to delete lead{' '}
          <Text span fw={700} c={isDark ? 'white' : 'dark'}>
            {deleteTarget?.name} ({deleteTarget?.leadId})
          </Text>
          ? This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleConfirmDelete} loading={deleteLoading}>
            Delete Permanently
          </Button>
        </Group>
      </Modal>
    </Box>
  );
};

export default LeadsPage;
