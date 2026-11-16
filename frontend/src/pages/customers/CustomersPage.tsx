import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Text,
  Button,
  Group,
  TextInput,
  Stack,
  Table,
  Badge,
  ActionIcon,
  useComputedColorScheme,
  ThemeIcon,
  Modal,
  Select,
  Textarea,
  Avatar,
  Anchor,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconAlertTriangle,
  IconMail,
  IconPhone,
  IconBuilding,
  IconCheck,
  IconRocket,
  IconEye,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { useCustomer } from '../../context/CustomerContext';
import { useCRM } from '../../context/CRMContext';
import { useLead } from '../../context/LeadContext';
import { leadService } from '../../services/leadService';
import { Customer, CustomerFormData } from '../../types/customer';
import { CustomerModal } from './components/CustomerModal';
import { CustomerDetailsModal, CustomerProjectItem } from './components/CustomerDetailsModal';

export const CustomersPage: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { setActiveNav, currentUser } = useCRM();
  const { leads, setSelectedLead, fetchLeads } = useLead();

  const {
    customers,
    stats,
    loading,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    setSelectedCustomer: setGlobalSelectedCustomer,
    fetchCustomers,
    fetchStats,
  } = useCustomer();

  // Fresh load on mount so customers are immediately viewed without page refresh
  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [fetchCustomers, fetchStats]);

  // Live update listener
  useEffect(() => {
    const handleUpdated = () => {
      fetchCustomers();
      fetchStats();
    };
    window.addEventListener('crm_customers_updated', handleUpdated);
    return () => {
      window.removeEventListener('crm_customers_updated', handleUpdated);
    };
  }, [fetchCustomers, fetchStats]);

  // Search state
  const [searchInput, setSearchInput] = useState<string>('');

  // Modal state
  const [modalOpened, setModalOpened] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Customer Details Modal state
  const [detailsOpened, setDetailsOpened] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [highlightedProject, setHighlightedProject] = useState<number | null>(null);
  const [projectUpdateTrigger, setProjectUpdateTrigger] = useState<number>(0);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Navigate to Customer Details full page
  const handleViewCustomerDetails = (cust: Customer, projectNum: number | null = null) => {
    setSelectedCustomer(cust);
    if (setGlobalSelectedCustomer) {
      setGlobalSelectedCustomer(cust);
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('crm_selected_customer', JSON.stringify(cust));
      if (projectNum) {
        sessionStorage.setItem('crm_selected_customer_project', String(projectNum));
      } else {
        sessionStorage.removeItem('crm_selected_customer_project');
      }
    }
    setActiveNav('customer-details');
  };

  // 2nd Project Modal state
  const [secondProjectOpened, setSecondProjectOpened] = useState<boolean>(false);
  const [secondProjectCustomer, setSecondProjectCustomer] = useState<Customer | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [projectService, setProjectService] = useState<string>('Full-Stack Web Development');
  const [projectNotes, setProjectNotes] = useState<string>('');
  const [movingLoading, setMovingLoading] = useState<boolean>(false);
  const [nextProjectNumber, setNextProjectNumber] = useState<number>(2);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Role check: Super Admin / Admin vs Employee
  const isSuperAdminOrAdmin = useMemo(() => {
    const roleUpper = String(currentUser?.role || '').toUpperCase().trim();
    return (
      roleUpper === 'SUPER_ADMIN' ||
      roleUpper === 'SUPER ADMIN' ||
      roleUpper === 'ADMIN' ||
      roleUpper === 'ADMINISTRATOR' ||
      roleUpper === 'MANAGEMENT' ||
      currentUser?.email === 'sandy@gmail.com'
    );
  }, [currentUser?.role, currentUser?.email]);

  // Filtered customers list based on search query and employee ownership
  const filteredCustomers = useMemo(() => {
    const currentName = (currentUser?.name || '').toLowerCase().trim();
    const currentId = (currentUser?.id || '').toLowerCase().trim();

    return customers.filter((c) => {
      // 1. Employee scoping guard: employees only see their own assigned customers
      if (!isSuperAdminOrAdmin) {
        const mgr = (c.accountManager || '').toLowerCase().trim();
        const mgrId = (c.accountManagerId || '').toLowerCase().trim();
        const isAssigned =
          (currentName && (mgr === currentName || mgr.includes(currentName) || currentName.includes(mgr))) ||
          (currentId && (mgrId === currentId || mgr === currentId || mgrId === currentName));

        if (!isAssigned) return false;
      }

      // 2. Search query filter
      if (searchInput.trim()) {
        const query = searchInput.toLowerCase().trim();
        const matches =
          (c.companyName || '').toLowerCase().includes(query) ||
          (c.contactPerson || '').toLowerCase().includes(query) ||
          (c.customerId || '').toLowerCase().includes(query) ||
          (c.email || '').toLowerCase().includes(query) ||
          (c.phone || '').toLowerCase().includes(query) ||
          (c.city || '').toLowerCase().includes(query) ||
          (c.status || '').toLowerCase().includes(query) ||
          (c.accountManager || '').toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [customers, searchInput, isSuperAdminOrAdmin, currentUser?.name, currentUser?.id]);

  // Pagination slice
  const totalCount = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setModalOpened(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setModalOpened(true);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEdit = sessionStorage.getItem('crm_editing_customer');
      if (savedEdit) {
        try {
          const cust = JSON.parse(savedEdit);
          sessionStorage.removeItem('crm_editing_customer');
          handleOpenEdit(cust);
        } catch (e) {}
      }
    }
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await deleteCustomer(deleteTarget.id);
    setDeleteLoading(false);
    setDeleteTarget(null);
  };

  const handleOpenSecondProject = (c: Customer) => {
    setSecondProjectCustomer(c);
    const existing = getCustomerProjects(c);
    const nextNum = (existing.length || 0) + 1;
    setNextProjectNumber(nextNum);
    setProjectTitle('');
    setProjectService('Full-Stack Web Development');
    setProjectNotes('');
    setSecondProjectOpened(true);
  };

  const handleConfirmMoveToLeads = async () => {
    if (!secondProjectCustomer) return;
    setMovingLoading(true);
    try {
      const targetPhone = (secondProjectCustomer.phone || '').trim();
      const targetEmail = (secondProjectCustomer.email || '').toLowerCase().trim();
      const targetCompany = (secondProjectCustomer.companyName || '').toLowerCase().trim();

      const existingLead = leads.find((l) => {
        if (targetEmail && l.email && l.email.toLowerCase().trim() === targetEmail) return true;
        if (targetPhone && l.phone && l.phone.trim() === targetPhone) return true;
        if (targetCompany && l.companyName && l.companyName.toLowerCase().trim() === targetCompany) return true;
        return false;
      });

      const currentResolvedProjects = getCustomerProjects(secondProjectCustomer);
      let existingProjects: any[] = [];
      try {
        if (existingLead) {
          const raw = localStorage.getItem(`crm_lead_projects_${existingLead.id}`);
          if (raw) existingProjects = JSON.parse(raw);
        }
      } catch (_) {}

      // Calculate the true next project number
      const baseCount = Math.max(existingProjects.length, currentResolvedProjects.length);
      const projNum = baseCount > 0 ? baseCount + 1 : 2;
      const projectTitleClean = (projectTitle || projectService || `Phase ${projNum} Project`).trim();
      const projectLabel = `Project ${projNum}: ${projectTitleClean}`;

      // Build complete structured projects list keeping previous deliverables intact
      let updatedProjectsList: any[] = [];
      if (existingProjects.length > 0) {
        updatedProjectsList = [
          ...existingProjects,
          {
            id: `proj-${projNum}`,
            projectNumber: projNum,
            title: projectTitleClean,
            status: 'New',
            stage: 'Initialization',
            createdAt: new Date().toISOString(),
          },
        ];
      } else if (currentResolvedProjects.length > 0) {
        updatedProjectsList = [
          ...currentResolvedProjects.map((p, idx) => ({
            id: p.id || `proj-${idx + 1}`,
            projectNumber: p.projectNumber || idx + 1,
            title: p.title,
            status: p.status || 'Complete',
            stage: p.stage || 'Won',
            createdAt: new Date().toISOString(),
          })),
          {
            id: `proj-${projNum}`,
            projectNumber: projNum,
            title: projectTitleClean,
            status: 'New',
            stage: 'Initialization',
            createdAt: new Date().toISOString(),
          },
        ];
      } else {
        updatedProjectsList = [
          {
            id: 'proj-1',
            projectNumber: 1,
            title: secondProjectCustomer.industry || 'Initial Project',
            status: 'Complete',
            stage: 'Won',
            createdAt: new Date().toISOString(),
          },
          {
            id: `proj-${projNum}`,
            projectNumber: projNum,
            title: projectTitleClean,
            status: 'New',
            stage: 'Initialization',
            createdAt: new Date().toISOString(),
          },
        ];
      }

      let leadToOpen: any = null;

      if (existingLead) {
        // 1. Append new project to existing lead without duplicate row!
        const updatedServices = Array.from(new Set([...(existingLead.serviceList || []), projectLabel]));
        const res = await leadService.updateLead(existingLead.id, {
          serviceList: updatedServices,
          status: 'New',
          stage: 'Initialization',
        });

        leadToOpen = res?.data || { ...existingLead, serviceList: updatedServices, status: 'New', stage: 'Initialization' };

        // Save structured projects in localStorage for LeadSchedulePage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`crm_lead_projects_${existingLead.id}`, JSON.stringify(updatedProjectsList));
          localStorage.setItem(`crm_lead_active_project_${existingLead.id}`, `proj-${projNum}`);
        }
      } else {
        // Create new lead only if no prior lead exists
        const res = await leadService.createLead({
          name: secondProjectCustomer.contactPerson || secondProjectCustomer.companyName,
          companyName: secondProjectCustomer.companyName,
          email: secondProjectCustomer.email || undefined,
          phone: secondProjectCustomer.phone,
          designation: secondProjectCustomer.designation || undefined,
          contactType: 'Company Representative',
          source: `Existing Customer (Project ${projNum})`,
          category: 'Service',
          serviceList: [projectLabel],
          status: 'New',
          stage: 'Initialization',
          address: [secondProjectCustomer.city, secondProjectCustomer.state].filter(Boolean).join(', ') || undefined,
        });
        leadToOpen = res?.data || null;
        if (leadToOpen && typeof window !== 'undefined') {
          localStorage.setItem(`crm_lead_projects_${leadToOpen.id}`, JSON.stringify(updatedProjectsList));
          localStorage.setItem(`crm_lead_active_project_${leadToOpen.id}`, `proj-${projNum}`);
        }
      }

      // 2. Mark Customer with Project flag in notes
      const currentNotes = secondProjectCustomer.notes || '';
      const updatedNotes = `${currentNotes} [Project ${projNum}: ${projectTitleClean}]`.trim();

      await updateCustomer(secondProjectCustomer.id, {
        notes: updatedNotes,
      });

      notifications.show({
        title: `Project ${projNum} Added to Pipeline!`,
        message: `${secondProjectCustomer.companyName} has Project ${projNum} attached to their pipeline.`,
        color: 'teal',
      });

      setSecondProjectOpened(false);
      setSecondProjectCustomer(null);

      await fetchLeads();
      setProjectUpdateTrigger((prev) => prev + 1);

      // 3. Open the lead details directly
      if (leadToOpen) {
        setSelectedLead(leadToOpen);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('crm_selected_lead', JSON.stringify(leadToOpen));
          sessionStorage.setItem('crm_schedule_tab', 'schedule');
        }
        setActiveNav('lead-schedule');
      } else {
        setActiveNav('leads');
      }
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err?.message || 'Could not attach project',
        color: 'red',
      });
    } finally {
      setMovingLoading(false);
    }
  };

  const handleFormSubmit = async (formData: CustomerFormData) => {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, formData);
    } else {
      await createCustomer(formData);
    }
  };

  // Helper to get client avatar initials
  const getInitials = (name?: string) => {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Quick status toggle for individual customer deliverables
  const handleToggleProjectStatus = (customer: Customer, proj: CustomerProjectItem) => {
    if (!customer) return;
    const targetEmail = (customer.email || '').toLowerCase().trim();
    const targetPhone = (customer.phone || '').trim();
    const targetCompany = (customer.companyName || '').toLowerCase().trim();

    const matchedLead = leads.find((l) => {
      if (targetEmail && l.email && l.email.toLowerCase().trim() === targetEmail) return true;
      if (targetPhone && l.phone && l.phone.trim() === targetPhone) return true;
      if (targetCompany && l.companyName && l.companyName.toLowerCase().trim() === targetCompany) return true;
      return false;
    });

    const isCurrentlyComplete = proj.status === 'Complete' || proj.status === 'Completed' || proj.stage === 'Won' || proj.stage === 'Delivered';
    const newStatus = isCurrentlyComplete ? 'In Progress' : 'Complete';
    const newStage = isCurrentlyComplete ? 'Initialization' : 'Won & Delivered';

    if (typeof window !== 'undefined') {
      try {
        // 1. Update customer status overrides
        const rawOverrides = localStorage.getItem(`crm_customer_project_status_${customer.id}`);
        const overrides: Record<string, string> = rawOverrides ? JSON.parse(rawOverrides) : {};
        overrides[proj.id] = newStatus;
        overrides[String(proj.projectNumber)] = newStatus;
        localStorage.setItem(`crm_customer_project_status_${customer.id}`, JSON.stringify(overrides));

        // 2. If matchedLead exists, also update lead projects in localStorage
        if (matchedLead) {
          const raw = localStorage.getItem(`crm_lead_projects_${matchedLead.id}`);
          if (raw) {
            const parsed: any[] = JSON.parse(raw);
            const updated = parsed.map((p) => {
              if (p.id === proj.id || p.projectNumber === proj.projectNumber) {
                return { ...p, status: newStatus, stage: newStage };
              }
              return p;
            });
            localStorage.setItem(`crm_lead_projects_${matchedLead.id}`, JSON.stringify(updated));
          }
        }
      } catch (err) {}
    }

    setProjectUpdateTrigger((prev) => prev + 1);

    notifications.show({
      title: `Project ${proj.projectNumber} Status Updated`,
      message: `${proj.title} is now marked as "${newStatus === 'Complete' ? 'Completed' : 'Active'}"!`,
      color: newStatus === 'Complete' ? 'teal' : 'blue',
      icon: <IconCheck size={16} />,
    });
  };

  // Helper to resolve all purchased & completed projects for a customer
  const getCustomerProjects = (customer: Customer): CustomerProjectItem[] => {
    if (!customer) return [];
    if (projectUpdateTrigger < 0) return []; // dependency tracking for status toggle re-render
    const targetEmail = (customer.email || '').toLowerCase().trim();
    const targetPhone = (customer.phone || '').trim();
    const targetCompany = (customer.companyName || '').toLowerCase().trim();

    const matchedLead = leads.find((l) => {
      if (targetEmail && l.email && l.email.toLowerCase().trim() === targetEmail) return true;
      if (targetPhone && l.phone && l.phone.trim() === targetPhone) return true;
      if (targetCompany && l.companyName && l.companyName.toLowerCase().trim() === targetCompany) return true;
      return false;
    });

    let customerOverrides: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      try {
        const rawOverrides = localStorage.getItem(`crm_customer_project_status_${customer.id}`);
        if (rawOverrides) customerOverrides = JSON.parse(rawOverrides);
      } catch (_) {}
    }

    const projectsList: CustomerProjectItem[] = [];

    // 1. Check localStorage first
    if (matchedLead && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`crm_lead_projects_${matchedLead.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((p, idx) => {
              const override = customerOverrides[p.id] || customerOverrides[String(p.projectNumber || idx + 1)];
              const isExplicitComplete = override === 'Complete' || p.status === 'Complete' || p.status === 'Completed' || p.stage === 'Won' || p.stage === 'Delivered';
              // If lead in backend is Complete and override is not In Progress, treat as Complete
              const isLeadWon = (matchedLead.status === 'Complete' || matchedLead.status === 'Completed') && override !== 'In Progress' && p.status !== 'In Progress' && p.status !== 'Lost';
              const isCompleted = isExplicitComplete || isLeadWon;

              projectsList.push({
                id: p.id || `proj-${idx + 1}`,
                projectNumber: p.projectNumber || idx + 1,
                title: (p.title || `Project ${idx + 1}`).replace(/^Project \d+:\s*/i, '').trim(),
                category: 'IT Service Delivery',
                status: isCompleted ? 'Complete' : (override || p.status || 'In Progress'),
                stage: isCompleted ? 'Won' : (p.stage || 'Initialization'),
                source: `Lead ${matchedLead.leadId}`,
              });
            });
          }
        }
      } catch (_) {}
    }

    // 2. Supplement from matchedLead serviceList / productList (add any projects not already in projectsList)
    if (matchedLead) {
      const services = matchedLead.serviceList || [];
      const products = matchedLead.productList || [];

      if (services.length > 0) {
        services.forEach((s, idx) => {
          const projNumMatch = s.match(/Project\s*(\d+)[:\s-]*(.*)/i);
          const projNum = projNumMatch ? parseInt(projNumMatch[1], 10) : idx + 1;
          const cleanTitle = projNumMatch && projNumMatch[2] ? projNumMatch[2].trim() : s.replace(/^Project \d+:\s*/i, '').trim();

          const existingIndex = projectsList.findIndex(
            (p) => p.projectNumber === projNum || p.title.toLowerCase() === cleanTitle.toLowerCase()
          );

          if (existingIndex === -1) {
            const override = customerOverrides[`proj-${projNum}`] || customerOverrides[String(projNum)];
            const isCompleted = override === 'Complete' || matchedLead.status === 'Complete' || matchedLead.status === 'Completed' || idx === 0;

            projectsList.push({
              id: `proj-${projNum}`,
              projectNumber: projNum,
              title: cleanTitle || `Project ${projNum}`,
              category: 'IT Service Delivery',
              status: isCompleted ? 'Complete' : (override || 'In Progress'),
              stage: isCompleted ? 'Won' : (matchedLead.stage || 'Initialization'),
              source: `Lead ${matchedLead.leadId}`,
            });
          }
        });
      }

      if (products.length > 0) {
        products.forEach((pr, idx) => {
          const existingIndex = projectsList.findIndex((p) => p.title.toLowerCase() === pr.toLowerCase());
          if (existingIndex === -1) {
            projectsList.push({
              id: `proj-${idx + 1}`,
              projectNumber: idx + 1,
              title: pr,
              category: 'Software Product License',
              status: 'Complete',
              stage: 'Delivered',
              source: `Lead ${matchedLead.leadId}`,
            });
          }
        });
      }
    }

    // 3. Fallback/Supplement: Parse from customer.notes
    const notes = customer.notes || '';
    const leadMatch = notes.match(/\((LED-\d+)\)/i);
    const leadRef = leadMatch ? leadMatch[1] : undefined;

    const servicesMatch = notes.match(/Services:\s*([^)]+)/i);
    const productsMatch = notes.match(/Products:\s*([^)]+)/i);

    if (servicesMatch && servicesMatch[1]) {
      const rawItems = servicesMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      rawItems.forEach((item, idx) => {
        const projNumMatch = item.match(/Project\s*(\d+)[:\s-]*(.*)/i);
        const projNum = projNumMatch ? parseInt(projNumMatch[1], 10) : idx + 1;
        const cleanTitle = projNumMatch && projNumMatch[2] ? projNumMatch[2].trim() : item.replace(/^Project \d+:\s*/i, '').trim();

        const existingIndex = projectsList.findIndex(
          (p) => p.projectNumber === projNum || p.title.toLowerCase() === cleanTitle.toLowerCase()
        );

        if (existingIndex === -1) {
          const override = customerOverrides[`proj-${projNum}`] || customerOverrides[String(projNum)];
          const isSecondInLeads = projNum === 2 && notes.includes('2nd Project in Leads');
          const isCompleted = override === 'Complete' || (customer.status === 'Complete' && !isSecondInLeads) || override !== 'In Progress';

          projectsList.push({
            id: `proj-${projNum}`,
            projectNumber: projNum,
            title: cleanTitle || `Project ${projNum}`,
            category: 'IT Service Delivery',
            status: isCompleted ? 'Complete' : 'In Progress',
            stage: isCompleted ? 'Won & Delivered' : 'Initialization',
            source: leadRef ? `Lead ${leadRef}` : 'Customer Agreement',
          });
        }
      });
    }

    if (productsMatch && productsMatch[1]) {
      const rawItems = productsMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      rawItems.forEach((item, idx) => {
        const existingIndex = projectsList.findIndex((p) => p.title.toLowerCase() === item.toLowerCase());
        if (existingIndex === -1) {
          projectsList.push({
            id: `proj-${idx + 1}`,
            projectNumber: idx + 1,
            title: item,
            category: 'Software Product License',
            status: 'Complete',
            stage: 'Delivered',
            source: leadRef ? `Lead ${leadRef}` : 'Customer Agreement',
          });
        }
      });
    }

    if (projectsList.length > 0) {
      projectsList.sort((a, b) => (a.projectNumber || 0) - (b.projectNumber || 0));
      return projectsList;
    }

    // 4. Default fallback
    projectsList.push({
      id: 'proj-1',
      projectNumber: 1,
      title: customer.industry || 'Enterprise IT Solutions & Services',
      category: 'Primary Contract',
      status: customer.status === 'Active' || customer.status === 'Complete' ? 'Complete' : 'In Progress',
      stage: 'Delivered',
      source: leadRef ? `Lead ${leadRef}` : 'Customer Agreement',
    });

    return projectsList;
  };

  // Render Sleek Status Pill Badge
  const renderStatusBadge = (status?: string) => {
    const s = status || 'Complete';
    let bg = isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5';
    let color = isDark ? '#34D399' : '#059669';
    let border = isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0';
    let dotColor = '#10B981';

    if (s.toLowerCase().includes('complete') || s.toLowerCase().includes('won') || s.toLowerCase() === 'active') {
      bg = isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5';
      color = isDark ? '#34D399' : '#059669';
      border = isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0';
      dotColor = '#10B981';
    } else if (s === 'Onboarding') {
      bg = isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB';
      color = isDark ? '#FBBF24' : '#D97706';
      border = isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A';
      dotColor = '#F59E0B';
    } else if (s === 'Inactive') {
      bg = isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9';
      color = isDark ? '#94A3B8' : '#64748B';
      border = isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0';
      dotColor = '#94A3B8';
    } else if (s === 'Churned') {
      bg = isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2';
      color = isDark ? '#F87171' : '#DC2626';
      border = isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA';
      dotColor = '#EF4444';
    }

    return (
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 20,
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <Box style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
        {s}
      </Box>
    );
  };

  return (
    <Box style={{ width: '100%', maxWidth: '100%' }}>
      {/* 1. Page Header with Breadcrumbs & Title */}
      <Box mb="md">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <Box>
            <Group gap={6} align="center" mb={4}>
              <Text size="12px" fw={600} c="dimmed">
                Sales & CRM
              </Text>
              <IconChevronRight size={13} color="#94A3B8" />
              <Text size="12px" fw={700} style={{ color: isDark ? '#93C5FD' : '#2563EB' }}>
                Customers
              </Text>
            </Group>
            <Text
              fw={800}
              style={{
                color: isDark ? '#F8FAFC' : '#0F172A',
                letterSpacing: '-0.02em',
                fontSize: '22px',
              }}
            >
              Customers Directory
            </Text>
          </Box>
        </Group>
      </Box>

      {/* 2. Unified Master Table Card */}
      <Paper
        radius="lg"
        style={{
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Card Header Toolbar with Search & Count */}
        <Box
          p="md"
          style={{
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <TextInput
              placeholder="Search customers by name, company, ID, phone..."
              leftSection={<IconSearch size={15} color="#94A3B8" />}
              rightSection={
                searchInput ? (
                  <ActionIcon size="xs" variant="subtle" onClick={() => setSearchInput('')}>
                    <IconX size={12} />
                  </ActionIcon>
                ) : null
              }
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              size="sm"
              radius="md"
              style={{ width: 340, maxWidth: '100%' }}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  fontSize: 13,
                  height: 38,
                },
              }}
            />

            <Badge
              size="md"
              variant="light"
              color="indigo"
              radius="md"
              style={{ fontWeight: 700, height: 26 }}
            >
              {totalCount} {totalCount === 1 ? 'Customer' : 'Customers'}
            </Badge>
          </Group>
        </Box>

        {/* The Table View */}
        <Box style={{ overflowX: 'auto' }}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover style={{ minWidth: 1180, userSelect: 'none' }}>
            <Table.Thead
              style={{
                background: isDark ? '#0F172A' : '#F8FAFC',
                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Table.Tr>
                <Table.Th style={{ width: 110, minWidth: 105, textAlign: 'center', whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  CUSTOMER ID
                </Table.Th>
                <Table.Th style={{ minWidth: 210, color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  CLIENT NAME
                </Table.Th>
                <Table.Th style={{ minWidth: 165, color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  COMPANY / ORGANIZATION
                </Table.Th>
                <Table.Th style={{ minWidth: 300, color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  PURCHASED PROJECTS
                </Table.Th>
                <Table.Th style={{ width: 110, minWidth: 105, textAlign: 'center', whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  STATUS
                </Table.Th>
                <Table.Th style={{ width: 120, minWidth: 110, whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  CONTRACT VALUE
                </Table.Th>
                <Table.Th style={{ minWidth: 140, color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  ACCOUNT MANAGER
                </Table.Th>
                <Table.Th style={{ width: 140, minWidth: 140, textAlign: 'center', whiteSpace: 'nowrap', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                  ACTIONS
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedCustomers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Stack align="center" gap="xs">
                      <ThemeIcon size={48} radius="xl" variant="light" color="indigo">
                        <IconBuilding size={24} />
                      </ThemeIcon>
                      <Text fw={700} size="sm" style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                        No Customers Found
                      </Text>
                      <Text size="xs" c="dimmed" style={{ maxWidth: 440 }}>
                        {searchInput ? 'No customers match your search criteria.' : 'Customers are automatically fetched when a lead\'s status is marked as "Complete" in the Leads pipeline.'}
                      </Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                paginatedCustomers.map((c) => (
                  <Table.Tr
                    key={c.id}
                    onClick={() => handleViewCustomerDetails(c)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(248, 250, 252, 0.9)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* 1. Customer ID (Prominent Monospace Badge Centered) */}
                    <Table.Td style={{ width: 110, minWidth: 105, textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewCustomerDetails(c);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px 10px',
                          borderRadius: 6,
                          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.14)' : '#EEF2FF',
                          border: isDark ? '1px solid rgba(129, 140, 248, 0.3)' : '1px solid #C7D2FE',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: isDark ? '#E0E7FF' : '#3730A3',
                          letterSpacing: '0.03em',
                          cursor: 'pointer',
                          boxShadow: isDark ? 'none' : '0 1px 2px rgba(99, 102, 241, 0.06)',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(99, 102, 241, 0.25)' : '#E0E7FF';
                          e.currentTarget.style.borderColor = isDark ? '#A5B4FC' : '#818CF8';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(99, 102, 241, 0.14)' : '#EEF2FF';
                          e.currentTarget.style.borderColor = isDark ? 'rgba(129, 140, 248, 0.3)' : '#C7D2FE';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <span>{c.customerId ? c.customerId.replace(/^CUST-/i, '') : c.id}</span>
                      </Box>
                    </Table.Td>

                    {/* 2. Client Name (Vibrant Gradient Avatar + Bold Name + Phone & Clickable Email) */}
                    <Table.Td style={{ minWidth: 210, verticalAlign: 'middle' }}>
                      <Group gap="sm" wrap="nowrap" align="center">
                        <Box
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 13,
                            letterSpacing: '0.02em',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                          }}
                        >
                          {getInitials(c.contactPerson)}
                        </Box>
                        <Box style={{ minWidth: 0 }}>
                          <Text
                            fw={700}
                            size="13.5px"
                            style={{
                              color: isDark ? '#F8FAFC' : '#0F172A',
                              lineHeight: 1.25,
                              cursor: 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCustomerDetails(c);
                            }}
                          >
                            {c.contactPerson || 'Unnamed Client'}
                          </Text>
                          <Group gap={6} mt={3} align="center" wrap="nowrap">
                            {c.phone && (
                              <Group gap={3} align="center" wrap="nowrap">
                                <IconPhone size={11} color={isDark ? '#94A3B8' : '#64748B'} style={{ flexShrink: 0 }} />
                                <Text size="11.5px" style={{ color: isDark ? '#CBD5E1' : '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                  {c.phone}
                                </Text>
                              </Group>
                            )}
                            {c.email && (
                              <>
                                <Text size="10px" c="dimmed">•</Text>
                                <Anchor
                                  href={`mailto:${c.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  underline="never"
                                  style={{ textDecoration: 'none', cursor: 'pointer', display: 'inline-flex' }}
                                >
                                  <Group gap={3} align="center" wrap="nowrap">
                                    <IconMail size={11} color={isDark ? '#60A5FA' : '#2563EB'} style={{ flexShrink: 0 }} />
                                    <Text
                                      size="11.5px"
                                      style={{
                                        color: isDark ? '#93C5FD' : '#2563EB',
                                        fontWeight: 500,
                                        maxWidth: 120,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {c.email}
                                    </Text>
                                  </Group>
                                </Anchor>
                              </>
                            )}
                            {!c.phone && !c.email && (
                              <Text size="11.5px" c="dimmed">
                                {c.designation || 'Client Stakeholder'}
                              </Text>
                            )}
                          </Group>
                        </Box>
                      </Group>
                    </Table.Td>

                    {/* 3. Company / Organization */}
                    <Table.Td style={{ minWidth: 165, verticalAlign: 'middle' }}>
                      <Box>
                        <Text
                          fw={700}
                          size="13.5px"
                          style={{
                            color: isDark ? '#F8FAFC' : '#0F172A',
                            lineHeight: 1.3,
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCustomerDetails(c);
                          }}
                        >
                          {c.companyName}
                        </Text>
                        <Group gap={4} mt={2} align="center" wrap="nowrap">
                          <IconBuilding size={12} color={isDark ? '#64748B' : '#94A3B8'} style={{ flexShrink: 0 }} />
                          <Text size="11px" style={{ color: isDark ? '#94A3B8' : '#64748B' }} truncate>
                            {[c.industry, c.city].filter(Boolean).join(' • ') || 'Corporate Enterprise'}
                          </Text>
                        </Group>
                      </Box>
                    </Table.Td>
                    {/* 4. Purchased Projects (Clean, modern & simple micro-cards) */}
                    <Table.Td style={{ minWidth: 310, verticalAlign: 'middle' }}>
                      {(() => {
                        const projects = getCustomerProjects(c);
                        if (!projects || projects.length === 0) {
                          return (
                            <Text size="12px" c="dimmed" fs="italic">
                              No projects
                            </Text>
                          );
                        }

                        const isExpanded = !!expandedProjects[c.id];
                        const visibleProjects = isExpanded || projects.length <= 1 ? projects : projects.slice(0, 1);
                        const extraCount = projects.length - 1;

                        return (
                          <Stack gap={6} style={{ maxWidth: 330 }}>
                            {visibleProjects.map((proj) => {
                              const isCompleted =
                                proj.status === 'Complete' ||
                                proj.status === 'Completed' ||
                                proj.stage === 'Won' ||
                                proj.stage === 'Delivered';

                              return (
                                <Group
                                  key={proj.id}
                                  gap={8}
                                  wrap="nowrap"
                                  align="center"
                                  justify="space-between"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewCustomerDetails(c, proj.projectNumber);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    backgroundColor: isDark
                                      ? (isCompleted ? 'rgba(16, 185, 129, 0.07)' : 'rgba(59, 130, 246, 0.07)')
                                      : (isCompleted ? '#F0FDF4' : '#F8FAFC'),
                                    border: `1px solid ${
                                      isDark
                                        ? (isCompleted ? 'rgba(16, 185, 129, 0.22)' : 'rgba(59, 130, 246, 0.22)')
                                        : (isCompleted ? '#BBF7D0' : '#E2E8F0')
                                    }`,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = isDark
                                      ? (isCompleted ? 'rgba(16, 185, 129, 0.14)' : 'rgba(59, 130, 246, 0.14)')
                                      : (isCompleted ? '#DCFCE7' : '#F1F5F9');
                                    e.currentTarget.style.borderColor = isCompleted
                                      ? (isDark ? '#34D399' : '#86EFAC')
                                      : (isDark ? '#60A5FA' : '#93C5FD');
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isDark
                                      ? (isCompleted ? 'rgba(16, 185, 129, 0.07)' : 'rgba(59, 130, 246, 0.07)')
                                      : (isCompleted ? '#F0FDF4' : '#F8FAFC');
                                    e.currentTarget.style.borderColor = isDark
                                      ? (isCompleted ? 'rgba(16, 185, 129, 0.22)' : 'rgba(59, 130, 246, 0.22)')
                                      : (isCompleted ? '#BBF7D0' : '#E2E8F0');
                                  }}
                                >
                                  {/* Left: Project Number badge + Title */}
                                  <Group gap={6} wrap="nowrap" align="center" style={{ minWidth: 0, flex: 1 }}>
                                    <Badge
                                      size="xs"
                                      variant="filled"
                                      color={isCompleted ? 'teal' : 'blue'}
                                      style={{
                                        height: 18,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        borderRadius: 4,
                                        padding: '0 5px',
                                        flexShrink: 0,
                                      }}
                                    >
                                      P{proj.projectNumber}
                                    </Badge>
                                    <Text
                                      size="12px"
                                      fw={600}
                                      style={{
                                        color: isDark ? '#F1F5F9' : '#1E293B',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        lineHeight: 1.45,
                                      }}
                                    >
                                      {proj.title}
                                    </Text>
                                  </Group>

                                  {/* Right: Clean, crisp status badge */}
                                  <Badge
                                    size="xs"
                                    variant="light"
                                    color={isCompleted ? 'teal' : 'blue'}
                                    leftSection={isCompleted ? <IconCheck size={9} stroke={3} /> : undefined}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleProjectStatus(c, proj);
                                    }}
                                    style={{
                                      height: 19,
                                      fontSize: 10,
                                      fontWeight: 700,
                                      textTransform: 'none',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                      padding: '0 6px',
                                      borderRadius: 4,
                                    }}
                                  >
                                    {isCompleted ? 'Completed' : 'Active'}
                                  </Badge>
                                </Group>
                              );
                            })}

                            {/* + more button / Show less toggle when customer has more than 1 project */}
                            {projects.length > 1 && (
                              !isExpanded ? (
                                <Tooltip
                                  label={`Click to view all projects (${projects.slice(1).map((p) => `P${p.projectNumber}: ${p.title}`).join(', ')})`}
                                  withArrow
                                  position="top"
                                  fz="xs"
                                >
                                  <Group
                                    gap={4}
                                    align="center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedProjects((prev) => ({ ...prev, [c.id]: true }));
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
                                      border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.28)' : '#BFDBFE'}`,
                                      color: isDark ? '#93C5FD' : '#2563EB',
                                      cursor: 'pointer',
                                      width: 'fit-content',
                                      userSelect: 'none',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(59, 130, 246, 0.22)' : '#DBEAFE';
                                      e.currentTarget.style.borderColor = isDark ? '#60A5FA' : '#93C5FD';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF';
                                      e.currentTarget.style.borderColor = isDark ? 'rgba(59, 130, 246, 0.28)' : '#BFDBFE';
                                    }}
                                  >
                                    <IconChevronDown size={12} stroke={2.5} />
                                    <Text size="11px" fw={700} style={{ lineHeight: 1 }}>
                                      +{extraCount} more
                                    </Text>
                                  </Group>
                                </Tooltip>
                              ) : (
                                <Group
                                  gap={4}
                                  align="center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedProjects((prev) => ({ ...prev, [c.id]: false }));
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    backgroundColor: isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9',
                                    border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.25)' : '#CBD5E1'}`,
                                    color: isDark ? '#94A3B8' : '#64748B',
                                    cursor: 'pointer',
                                    width: 'fit-content',
                                    userSelect: 'none',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9';
                                  }}
                                >
                                  <IconChevronUp size={12} stroke={2.5} />
                                  <Text size="11px" fw={600} style={{ lineHeight: 1 }}>
                                    Show less
                                  </Text>
                                </Group>
                              )
                            )}
                          </Stack>
                        );
                      })()}
                    </Table.Td>

                    {/* 5. Status */}
                    <Table.Td style={{ width: 110, minWidth: 105, textAlign: 'center', verticalAlign: 'middle' }}>
                      {renderStatusBadge(c.status)}
                    </Table.Td>

                    {/* 6. Contract Value */}
                    <Table.Td style={{ width: 120, minWidth: 110, verticalAlign: 'middle' }}>
                      <Text
                        fw={700}
                        size="13px"
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          color: c.contractValue ? (isDark ? '#34D399' : '#059669') : (isDark ? '#94A3B8' : '#64748B'),
                        }}
                      >
                        {c.contractValue ? `₹${Number(c.contractValue).toLocaleString('en-IN')}` : '₹0'}
                      </Text>
                    </Table.Td>

                    {/* 7. Account Manager */}
                    <Table.Td style={{ minWidth: 140, verticalAlign: 'middle' }}>
                      {!c.accountManager || c.accountManager === 'Unassigned' ? (
                        <Badge size="xs" variant="outline" color="gray" radius="sm">
                          Unassigned
                        </Badge>
                      ) : (
                        <Group gap={6} align="center" wrap="nowrap">
                          <Avatar size={24} radius="xl" color="indigo" variant="light" style={{ fontSize: 10, fontWeight: 700 }}>
                            {c.accountManager.slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Text size="12.5px" fw={600} style={{ color: isDark ? '#E2E8F0' : '#334155', whiteSpace: 'nowrap' }}>
                            {c.accountManager}
                          </Text>
                        </Group>
                      )}
                    </Table.Td>

                    {/* 8. Actions (View Details, 2nd Project, Edit & Delete) */}
                    <Table.Td style={{ width: 140, minWidth: 140, textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                      <Group gap={4} justify="center" wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          size={28}
                          radius="md"
                          color="blue"
                          title="View Details"
                          aria-label="View Details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCustomerDetails(c);
                          }}
                        >
                          <IconEye size={15} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          size={28}
                          radius="md"
                          color="teal"
                          title="Start Next Project Pipeline"
                          aria-label="Start Next Project Pipeline"
                          onClick={() => handleOpenSecondProject(c)}
                        >
                          <IconRocket size={15} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          size={28}
                          radius="md"
                          color="red"
                          title="Delete Customer"
                          aria-label="Delete Customer"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <IconTrash size={15} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Box>

        {/* Unified Bottom Pagination Footer */}
        <Box
          p="md"
          style={{
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Text size="13px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              Showing {startRecord} to {endRecord} of {totalCount} customers
            </Text>

            <Group gap={6} align="center">
              {/* Previous */}
              <Button
                variant="default"
                size="xs"
                radius="md"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                {currentPage}
              </Box>

              <Text size="12px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                of {totalPages}
              </Text>

              {/* Next */}
              <Button
                variant="default"
                size="xs"
                radius="md"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
        </Box>
      </Paper>

      {/* Customer Details Modal with Full Project Breakdown */}
      <CustomerDetailsModal
        opened={detailsOpened}
        onClose={() => {
          setDetailsOpened(false);
          setSelectedCustomer(null);
          setHighlightedProject(null);
        }}
        customer={selectedCustomer}
        projects={selectedCustomer ? getCustomerProjects(selectedCustomer) : []}
        highlightedProjectNumber={highlightedProject}
        onEdit={(cust) => {
          setDetailsOpened(false);
          handleOpenEdit(cust);
        }}
        onDelete={(id) => {
          setDetailsOpened(false);
          const found = customers.find((cu) => cu.id === id);
          if (found) setDeleteTarget(found);
        }}
        onMoveToNextProject={(cust) => {
          setDetailsOpened(false);
          handleOpenSecondProject(cust);
        }}
        onNavigateToProjects={() => {
          setDetailsOpened(false);
          setActiveNav('projects');
        }}
        onNavigateToLeads={() => {
          setDetailsOpened(false);
          setActiveNav('leads');
        }}
      />

      {/* Customer Create / Edit Modal */}
      <CustomerModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        onSubmit={handleFormSubmit}
        customer={editingCustomer}
      />

      {/* Delete Confirmation Modal */}
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
              color="red"
              variant="light"
              style={{ flexShrink: 0 }}
            >
              <IconAlertTriangle size={24} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text fw={700} size="lg" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                Delete Customer
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                Are you sure you want to delete{' '}
                <Text component="span" fw={600} style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                  {deleteTarget?.companyName || deleteTarget?.contactPerson || 'this customer'}
                </Text>
                ? This action cannot be undone.
              </Text>
            </Box>
          </Group>

          <Group justify="flex-end" gap="sm" mt="md">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              loading={deleteLoading}
              leftSection={<IconTrash size={16} />}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 2nd Project Move Modal */}
      <Modal
        opened={secondProjectOpened}
        onClose={() => {
          if (!movingLoading) {
            setSecondProjectOpened(false);
            setSecondProjectCustomer(null);
          }
        }}
        title={
          <Group gap="xs">
            <ThemeIcon size={32} radius="md" color="teal" variant="light">
              <IconRocket size={18} />
            </ThemeIcon>
            <Box>
              <Text fw={700} size="md">
                Start Next Project Pipeline
              </Text>
              <Text size="xs" c="dimmed">
                Initiate a new IT service requirement for this client and track it in the Leads & Project pipeline
              </Text>
            </Box>
          </Group>
        }
        centered
        size="md"
        radius="lg"
        padding="lg"
        styles={{
          content: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            boxShadow: isDark
              ? '0 20px 45px -10px rgba(0, 0, 0, 0.6)'
              : '0 20px 45px -10px rgba(0, 0, 0, 0.12)',
            borderRadius: 16,
          },
        }}
      >
        {secondProjectCustomer && (
          <Stack gap="md" mt="xs">
            {/* Customer Summary Card */}
            <Paper
              p="sm"
              radius="md"
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group justify="space-between" align="center">
                <Box>
                  <Text fw={700} size="sm">
                    {secondProjectCustomer.companyName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    👤 {secondProjectCustomer.contactPerson} • 📞 {secondProjectCustomer.phone}
                  </Text>
                </Box>
                <Badge color="blue" variant="light">
                  Existing Client
                </Badge>
              </Group>
            </Paper>

            {/* Project Title */}
            <TextInput
              label={`Project ${nextProjectNumber} Title / Requirement`}
              placeholder={`Enter Project ${nextProjectNumber} Title (e.g. Mobile App, Cloud Infrastructure...)`}
              required
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
                },
              }}
            />

            {/* Service Category */}
            <Select
              label="Service Domain"
              data={[
                'Full-Stack Web Development',
                'Mobile App Development',
                'Cloud Migration & DevOps',
                'Cybersecurity & Compliance',
                'Custom API & Backend Integration',
                'AI & ML Solutions',
                'UI/UX Design & Branding',
              ]}
              value={projectService}
              onChange={(val) => setProjectService(val || 'Full-Stack Web Development')}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
                },
              }}
            />

            {/* Notes / Special Instructions */}
            <Textarea
              label="Requirement Notes"
              placeholder={`Brief details about Project ${nextProjectNumber}...`}
              rows={3}
              value={projectNotes}
              onChange={(e) => setProjectNotes(e.target.value)}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
                },
              }}
            />

            <Group justify="flex-end" gap="sm" mt="sm">
              <Button
                variant="subtle"
                color="gray"
                onClick={() => {
                  setSecondProjectOpened(false);
                  setSecondProjectCustomer(null);
                }}
                disabled={movingLoading}
              >
                Cancel
              </Button>
              <Button
                color="teal"
                onClick={handleConfirmMoveToLeads}
                loading={movingLoading}
                leftSection={<IconRocket size={16} />}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                }}
              >
                Launch Project {nextProjectNumber} in Pipeline
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

    </Box>
  );
};
