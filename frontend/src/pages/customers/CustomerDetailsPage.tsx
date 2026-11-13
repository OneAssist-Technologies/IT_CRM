import React, { useMemo, useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import {
  Box,
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Grid,
  SimpleGrid,
  useComputedColorScheme,
  ActionIcon,
  Tooltip,
  CopyButton,
  ThemeIcon,
  Divider,
  Breadcrumbs,
  Anchor,
  Avatar,
} from '@mantine/core';
import {
  IconBuilding,
  IconUser,
  IconPhone,
  IconMail,
  IconWorld,
  IconMapPin,
  IconCurrencyRupee,
  IconEdit,
  IconTrash,
  IconTicket,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconShieldCheck,
  IconArrowLeft,
  IconCalendar,
  IconBriefcase,
  IconFileText,
  IconRocket,
  IconClock,
} from '@tabler/icons-react';
import { Customer } from '../../types/customer';
import { fetchTicketsApi } from '../../services/supportTicketService';
import { SupportTicket } from '../../types/supportTicket';
import { CRM_COLORS } from '../../theme/colors';

export interface CustomerProjectItem {
  id: string;
  projectNumber: number;
  title: string;
  category?: string;
  status: string;
  stage?: string;
  date?: string;
  source?: string;
  notes?: string;
}

interface CustomerDetailsPageProps {
  customer: Customer;
  projects?: CustomerProjectItem[];
  highlightedProjectNumber?: number | null;
  onBack: () => void;
  onEdit: (customer: Customer) => void;
  onDelete?: (id: string) => void;
  onNavigateToProjects?: () => void;
  onNavigateToLeads?: () => void;
  onMoveToNextProject?: (customer: Customer) => void;
}

export interface ParsedAccountNotes {
  leadId?: string;
  category?: string;
  projects: Array<{ projectNumber: number; title: string }>;
  customNotes?: string;
  isSystemNote: boolean;
}

export const parseAccountNotes = (notesText?: string): ParsedAccountNotes => {
  if (!notesText || !notesText.trim()) {
    return { projects: [], isSystemNote: false };
  }

  const text = notesText.trim();
  const isSystem = text.includes('Converted from') || text.includes('Category:') || text.includes('LED-') || text.includes('Project');

  if (!isSystem) {
    return { projects: [], customNotes: text, isSystemNote: false };
  }

  // 1. Extract Lead ID
  const leadMatch = text.match(/Lead\s*\(([^)]+)\)/i) || text.match(/\((LED-\d+)\)/i);
  const leadId = leadMatch ? leadMatch[1] : undefined;

  // 2. Extract Category
  const catMatch = text.match(/Category:\s*([A-Za-z0-9\s]+?)(?:\s*\(|$|\|)/i);
  const category = catMatch ? catMatch[1].trim() : undefined;

  // 3. Extract Projects
  const projectsList: Array<{ projectNumber: number; title: string }> = [];

  // 3a. Extract from (Services: ...) or (Products: ...)
  const reqMatch = text.match(/(?:Services|Products):\s*([^)]+)/i);
  if (reqMatch && reqMatch[1]) {
    const items = reqMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
    items.forEach((item, idx) => {
      const pMatch = item.match(/Project\s*(\d+)[:\s-]*(.*)/i);
      const num = pMatch ? parseInt(pMatch[1], 10) : idx + 1;
      const cleanTitle = pMatch && pMatch[2] ? pMatch[2].trim() : item.replace(/^Project \d+:\s*/i, '').trim();
      projectsList.push({
        projectNumber: num,
        title: cleanTitle || `Project ${num}`,
      });
    });
  }

  // 3b. Extract additional [Project X: ...] bracketed projects
  const bracketMatches = text.matchAll(/\[Project\s*(\d+)[:\s-]*(.*?)\]/gi);
  for (const m of bracketMatches) {
    const num = parseInt(m[1], 10);
    const title = m[2] ? m[2].trim() : `Project ${num}`;
    if (!projectsList.some((p) => p.projectNumber === num)) {
      projectsList.push({
        projectNumber: num,
        title,
      });
    }
  }

  // Sort projects by projectNumber
  projectsList.sort((a, b) => a.projectNumber - b.projectNumber);

  // 4. Extract any leftover custom notes if user added extra text
  let stripped = text
    .replace(/Converted from Completed Lead\s*\([^)]+\)/gi, '')
    .replace(/\|\s*Category:\s*[A-Za-z0-9\s]+(?:\s*\([^)]*\))?/gi, '')
    .replace(/\[Project\s*\d+:[^\]]+\]/gi, '')
    .trim();

  stripped = stripped.replace(/^\|\s*/, '').replace(/\s*\|\s*$/, '').trim();

  return {
    leadId,
    category,
    projects: projectsList,
    customNotes: stripped.length > 5 ? stripped : undefined,
    isSystemNote: true,
  };
};

export const CustomerDetailsPage: React.FC<CustomerDetailsPageProps> = ({
  customer,
  projects = [],
  highlightedProjectNumber = null,
  onBack,
  onEdit,
  onDelete,
  onNavigateToProjects,
  onNavigateToLeads,
  onMoveToNextProject,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const [customerTickets, setCustomerTickets] = useState<SupportTicket[]>([]);
  useEffect(() => {
    if (customer && customer.id) {
      fetchTicketsApi({ customerId: customer.id }, 1, 10)
        .then((res: any) => setCustomerTickets(res.tickets || []))
        .catch(() => {});
    }
  }, [customer]);

  const [selectedFilter, setSelectedFilter] = useState<number | 'all'>('all');
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const parsedNotes = useMemo(() => parseAccountNotes(customer.notes || undefined), [customer.notes]);

  useEffect(() => {
    if (highlightedProjectNumber) {
      setSelectedFilter(highlightedProjectNumber);
    } else {
      setSelectedFilter('all');
    }
  }, [highlightedProjectNumber, customer]);

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const innerCardBg = isDark ? '#1E293B' : '#F8FAFC';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
  const headingColor = isDark ? '#F8FAFC' : '#0F172A';
  const labelColor = isDark ? '#94A3B8' : '#64748B';

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Complete':
      case 'Completed':
      case 'Won':
      case 'Active':
        return 'teal';
      case 'Onboarding':
      case 'In Progress':
        return 'yellow';
      case 'Inactive':
        return 'gray';
      case 'Churned':
      case 'Lost':
        return 'red';
      default:
        return 'teal';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'C';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const displayId = customer.customerId ? customer.customerId.replace(/^CUST-/i, '') : customer.customerId;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleToggleProjectStatus = (p: CustomerProjectItem) => {
    if (typeof window === 'undefined' || !customer) return;
    const isCurrentlyComplete = p.status === 'Complete' || p.status === 'Completed' || p.stage === 'Won';
    const newStatus = isCurrentlyComplete ? 'In Progress' : 'Complete';
    const newStage = isCurrentlyComplete ? 'Active Development' : 'Won & Delivered';

    try {
      const storageKey = `crm_customer_project_status_${customer.id}`;
      const raw = localStorage.getItem(storageKey);
      const currentOverrides = raw ? JSON.parse(raw) : {};
      currentOverrides[p.id] = newStatus;
      currentOverrides[String(p.projectNumber)] = newStatus;
      localStorage.setItem(storageKey, JSON.stringify(currentOverrides));

      // Also try to sync lead localStorage if lead is known
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('crm_lead_projects_')) {
          try {
            const rawLeadProj = localStorage.getItem(k);
            if (rawLeadProj) {
              const parsed = JSON.parse(rawLeadProj);
              if (Array.isArray(parsed)) {
                let changed = false;
                const updated = parsed.map((item) => {
                  if (item.id === p.id || item.projectNumber === p.projectNumber) {
                    changed = true;
                    return { ...item, status: newStatus, stage: newStage };
                  }
                  return item;
                });
                if (changed) {
                  localStorage.setItem(k, JSON.stringify(updated));
                }
              }
            }
          } catch (_) {}
        }
      }

      setUpdateTrigger((c) => c + 1);

      notifications.show({
        title: 'Project Status Updated',
        message: `${p.title} status marked as "${newStatus === 'Complete' ? 'Completed & Delivered' : 'In Progress'}"!`,
        color: newStatus === 'Complete' ? 'teal' : 'blue',
        icon: <IconCheck size={16} />,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const resolvedProjects: CustomerProjectItem[] = useMemo(() => {
    if (!customer) return [];
    if (updateTrigger < 0) return [];

    let customerOverrides: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`crm_customer_project_status_${customer.id}`);
        if (raw) customerOverrides = JSON.parse(raw);
      } catch (_) {}
    }

    if (projects && projects.length > 0) {
      return projects.map((p) => {
        const override = customerOverrides[p.id] || customerOverrides[String(p.projectNumber)];
        if (override) {
          return {
            ...p,
            status: override,
            stage: override === 'Complete' ? 'Won & Delivered' : p.stage,
          };
        }
        return p;
      });
    }

    const list: CustomerProjectItem[] = [];
    const notes = customer.notes || '';

    const leadMatch = notes.match(/\((LED-\d+)\)/i);
    const leadRef = leadMatch ? leadMatch[1] : undefined;

    // Check localStorage crm_lead_projects_
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('crm_lead_projects_')) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const matched = parsed.some((p) =>
                  notes.includes(p.title) ||
                  (customer.companyName && (notes.includes(customer.companyName) || p.companyName === customer.companyName))
                );
                if (matched || (leadRef && k.includes(leadRef))) {
                  parsed.forEach((p, idx) => {
                    const override = customerOverrides[p.id] || customerOverrides[String(p.projectNumber || idx + 1)];
                    const isExplicitComplete = override === 'Complete' || p.status === 'Complete' || p.status === 'Completed' || p.stage === 'Won' || p.stage === 'Delivered';
                    const isParentComplete = (customer.status === 'Complete' || customer.status === 'Completed' || customer.status === 'Active') && override !== 'In Progress' && p.status !== 'In Progress' && p.status !== 'Lost';
                    const isCompleted = isExplicitComplete || isParentComplete;

                    list.push({
                      id: p.id || `proj-${idx + 1}`,
                      projectNumber: p.projectNumber || idx + 1,
                      title: (p.title || `Project ${idx + 1}`).replace(/^Project \d+:\s*/i, '').trim(),
                      category: 'IT Service Delivery',
                      status: isCompleted ? 'Complete' : (override || p.status || 'In Progress'),
                      stage: isCompleted ? 'Won & Delivered' : (p.stage || 'Initialization'),
                      source: leadRef ? `Lead ${leadRef}` : 'Customer Agreement',
                    });
                  });
                }
              }
            }
          } catch (_) {}
        }
      }
    }

    const servicesMatch = notes.match(/Services:\s*([^)]+)/i);
    const productsMatch = notes.match(/Products:\s*([^)]+)/i);

    if (servicesMatch && servicesMatch[1]) {
      const rawItems = servicesMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      rawItems.forEach((item, idx) => {
        const projNumMatch = item.match(/Project\s*(\d+)[:\s-]*(.*)/i);
        const projNum = projNumMatch ? parseInt(projNumMatch[1], 10) : idx + 1;
        const cleanTitle = projNumMatch && projNumMatch[2] ? projNumMatch[2].trim() : item.replace(/^Project \d+:\s*/i, '').trim();

        const existingIndex = list.findIndex(
          (p) => p.projectNumber === projNum || p.title.toLowerCase() === cleanTitle.toLowerCase()
        );

        if (existingIndex === -1) {
          const override = customerOverrides[`proj-${projNum}`] || customerOverrides[String(projNum)];
          const isSecondInLeads = projNum === 2 && notes.includes('2nd Project in Leads');
          const isParentComplete = customer.status === 'Complete' || customer.status === 'Completed' || customer.status === 'Active';
          let isComplete = false;
          if (override) {
            isComplete = override === 'Complete';
          } else if (isParentComplete) {
            isComplete = true;
          } else {
            isComplete = !isSecondInLeads;
          }

          list.push({
            id: `proj-${projNum}`,
            projectNumber: projNum,
            title: cleanTitle || `Project ${projNum}`,
            category: 'IT Service Delivery',
            status: isComplete ? 'Complete' : 'In Progress',
            stage: isComplete ? 'Won & Delivered' : 'Initialization',
            source: leadRef ? `Lead ${leadRef}` : 'Customer Agreement',
          });
        }
      });
    } else if (productsMatch && productsMatch[1]) {
      const rawItems = productsMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      rawItems.forEach((item, idx) => {
        const existingIndex = list.findIndex((p) => p.title.toLowerCase() === item.toLowerCase());
        if (existingIndex === -1) {
          const override = customerOverrides[`proj-${idx + 1}`] || customerOverrides[String(idx + 1)];
          const isComplete = override ? override === 'Complete' : true;
          list.push({
            id: `proj-${idx + 1}`,
            projectNumber: idx + 1,
            title: item,
            category: 'Software Product License',
            status: isComplete ? 'Complete' : 'In Progress',
            stage: isComplete ? 'Delivered' : 'In Progress',
            source: leadRef ? `Lead ${leadRef}` : 'Customer Agreement',
          });
        }
      });
    }

    if (list.length === 0) {
      const isComplete = customer.status === 'Active' || customer.status === 'Complete';
      list.push({
        id: 'proj-1',
        projectNumber: 1,
        title: customer.industry || 'Enterprise IT Solutions & Services',
        category: 'Primary Contract',
        status: isComplete ? 'Complete' : 'In Progress',
        stage: 'Delivered',
        source: leadRef ? `Lead ${leadRef}` : 'Customer Agreement',
      });
    }

    list.sort((a, b) => (a.projectNumber || 0) - (b.projectNumber || 0));
    return list;
  }, [projects, customer, updateTrigger]);

  const getProjectDeliverables = (proj: CustomerProjectItem) => {
    const title = (proj.title || '').toLowerCase();
    if (title.includes('cloud') || title.includes('devops')) {
      return [
        'Multi-Region Cloud Architecture & VPC Isolation',
        'Automated CI/CD Deployment Pipelines & Docker Orchestration',
        'Kubernetes Cluster Configuration & Auto-scaling',
        '24/7 Server Health Monitoring & Security Compliance Hardening',
      ];
    }
    if (title.includes('web') || title.includes('full-stack') || title.includes('frontend')) {
      return [
        'Modern High-Performance Web Architecture (React & TypeScript)',
        'Enterprise REST API Integration & Microservices Engine',
        'Role-Based Access Control, JWT Security & State Management',
        'Cross-Browser Optimization, SEO Best Practices & Production Launch',
      ];
    }
    if (title.includes('mobile') || title.includes('app')) {
      return [
        'Cross-Platform iOS & Android Native Core Implementation',
        'Real-Time Offline Data Synchronization & Push Notifications',
        'Biometric Authentication & Secure API Token Management',
        'App Store & Play Store Deployment Readiness Audit',
      ];
    }
    if (title.includes('ai') || title.includes('ml')) {
      return [
        'Custom Deep Learning Pipeline & Model Fine-Tuning',
        'Low-Latency Inference API & Microservices Containerization',
        'Data Preprocessing, Vector Embeddings & Vector DB Storage',
        'Model Accuracy Validation & Real-Time Performance Analytics',
      ];
    }
    return [
      'Business Scope & Technical Requirement Finalization',
      'Core Solution Engineering, Integration & Architecture Review',
      'Rigorous Quality Assurance Testing & Performance Optimization',
      'Final Production Release, Knowledge Transfer & Client Sign-off',
    ];
  };

  const displayedProjects = useMemo(() => {
    if (selectedFilter === 'all') return resolvedProjects;
    return resolvedProjects.filter((p) => p.projectNumber === selectedFilter);
  }, [resolvedProjects, selectedFilter]);

  return (
    <Box style={{ width: '100%', maxWidth: '100%', paddingBottom: 40 }}>
      {/* 1. Top Header Navigation Bar */}
      <Paper
        p="md"
        radius="lg"
        mb="md"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderCol}`,
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="sm" align="center">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              radius="md"
              leftSection={<IconArrowLeft size={16} />}
              onClick={onBack}
              style={{
                fontWeight: 600,
                color: isDark ? '#E2E8F0' : '#475569',
              }}
            >
              Back to Customers
            </Button>
            <Divider orientation="vertical" h={20} />
            <Breadcrumbs separator="›" style={{ fontSize: 13 }}>
              <Anchor
                component="button"
                type="button"
                onClick={onBack}
                style={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 500 }}
              >
                Customers
              </Anchor>
              <Text fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 13 }}>
                {customer.companyName}
              </Text>
            </Breadcrumbs>
          </Group>

          <Group gap="xs">
            {onDelete && (
              <Button
                variant="subtle"
                color="red"
                size="sm"
                radius="md"
                leftSection={<IconTrash size={15} />}
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${customer.companyName}?`)) {
                    onDelete(customer.id);
                  }
                }}
              >
                Delete
              </Button>
            )}
          </Group>
        </Group>
      </Paper>

      {/* 2. Main Hero Profile Banner */}
      <Paper
        p="xl"
        radius="lg"
        mb="lg"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)'
            : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          border: `1px solid ${borderCol}`,
          boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.35)' : '0 4px 20px rgba(0, 0, 0, 0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="xl">
          <Group gap="lg" align="center">
            {/* Company Monogram Avatar */}
            <Avatar
              size={68}
              radius="lg"
              variant="gradient"
              gradient={{ from: '#4F46E5', to: '#2563EB', deg: 135 }}
              style={{
                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)',
                fontWeight: 900,
                fontSize: 26,
                color: '#FFFFFF',
              }}
            >
              {getInitials(customer.companyName)}
            </Avatar>

            <Box>
              <Group gap="xs" align="center" mb={6} wrap="wrap">
                <Text
                  fw={900}
                  size="26px"
                  style={{
                    color: isDark ? '#FFFFFF' : CRM_COLORS.textPrimary,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {customer.companyName}
                </Text>

                {/* Sleek Customer ID Badge with Click-to-Copy */}
                <CopyButton value={displayId || ''} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip
                      label={copied ? 'Copied to clipboard!' : `Customer ID: ${customer.customerId} • Click to copy`}
                      withArrow
                    >
                      <Box
                        onClick={copy}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 10px',
                          borderRadius: 6,
                          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                          border: isDark ? '1px solid rgba(129, 140, 248, 0.35)' : '1px solid #C7D2FE',
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontSize: 13,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '0.02em',
                          color: isDark ? '#E0E7FF' : '#4338CA',
                          cursor: 'pointer',
                          boxShadow: isDark ? 'none' : '0 1px 2px rgba(99, 102, 241, 0.08)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{displayId}</span>
                        {copied ? <IconCheck size={13} color="#10B981" /> : null}
                      </Box>
                    </Tooltip>
                  )}
                </CopyButton>

                <Badge color={getStatusColor(customer.status)} variant="filled" size="md" radius="sm">
                  {customer.status || 'Active'}
                </Badge>
              </Group>

              {/* Subtitle metadata */}
              <Group gap="md" align="center" wrap="wrap">
                <Group gap={6} align="center">
                  <IconUser size={15} color="#4F46E5" />
                  <Text size="sm" fw={700} style={{ color: isDark ? '#E0E7FF' : '#4338CA' }}>
                    Client: {customer.contactPerson}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">•</Text>
                <Group gap={5} align="center">
                  <IconBriefcase size={14} color="#64748B" />
                  <Text size="sm" c="dimmed">
                    {customer.industry || 'Technology & IT Services'}
                  </Text>
                </Group>
                {(customer.city || customer.state) && (
                  <>
                    <Text size="xs" c="dimmed">•</Text>
                    <Group gap={5} align="center">
                      <IconMapPin size={14} color="#64748B" />
                      <Text size="sm" c="dimmed">
                        {[customer.city, customer.state].filter(Boolean).join(', ')}
                      </Text>
                    </Group>
                  </>
                )}
                <Text size="xs" c="dimmed">•</Text>
                <Group gap={5} align="center">
                  <IconCalendar size={14} color="#64748B" />
                  <Text size="sm" c="dimmed">
                    Customer Since {new Date(customer.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </Text>
                </Group>
              </Group>
            </Box>
          </Group>
        </Group>
      </Paper>

      {/* 3. Two-Column Detailed Data Grid */}
      <Grid gutter="lg" mt="lg">
        {/* Left Column (span 7): Corporate Profile & Regulatory + Conversion Notes */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="lg">
            {/* Card A: Company & Corporate Details */}
            <Paper
              p="xl"
              radius="lg"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderCol}`,
                boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
              }}
            >
              <Group justify="space-between" align="center" mb="lg">
                <Group gap="xs">
                  <ThemeIcon size={32} radius="md" color="indigo" variant="light">
                    <IconBuilding size={18} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={800} size="md" style={{ color: headingColor }}>
                      Corporate Profile & Regulatory Info
                    </Text>
                    <Text size="11px" c="dimmed">
                      Verified corporate registration, compliance & firmographics
                    </Text>
                  </Box>
                </Group>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                {/* 1. Legal Company Name */}
                <Box>
                  <Text size="xs" fw={600} style={{ color: labelColor }}>
                    Company / Organization Name
                  </Text>
                  <Text size="sm" fw={700} mt={4} style={{ color: headingColor }}>
                    {customer.companyName}
                  </Text>
                </Box>

                {/* 2. Industry Domain */}
                <Box>
                  <Text size="xs" fw={600} style={{ color: labelColor }}>
                    Industry Domain
                  </Text>
                  <Text size="sm" fw={700} mt={4} style={{ color: headingColor }}>
                    {customer.industry || 'Technology & IT Services'}
                  </Text>
                </Box>

                {/* 3. Official Website */}
                <Box>
                  <Text size="xs" fw={600} style={{ color: labelColor }}>
                    Official Website
                  </Text>
                  {customer.website ? (
                    <Group gap={6} mt={4}>
                      <IconWorld size={15} color="#2563EB" />
                      <Anchor
                        href={customer.website}
                        target="_blank"
                        rel="noreferrer"
                        size="sm"
                        fw={700}
                        style={{ color: '#2563EB' }}
                      >
                        {customer.website}
                      </Anchor>
                      <IconExternalLink size={13} color="#2563EB" />
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed" mt={4}>
                      —
                    </Text>
                  )}
                </Box>

                {/* 4. Registered Location */}
                <Box>
                  <Text size="xs" fw={600} style={{ color: labelColor }}>
                    Registered Location
                  </Text>
                  <Group gap={6} mt={4}>
                    <IconMapPin size={15} color={labelColor} />
                    <Text size="sm" fw={600} style={{ color: headingColor }}>
                      {[customer.address, customer.city, customer.state].filter(Boolean).join(', ') || '—'}
                    </Text>
                  </Group>
                </Box>

                {/* 5. GSTIN Number */}
                <Box>
                  <Text size="xs" fw={600} style={{ color: labelColor }}>
                    GSTIN Number
                  </Text>
                  {customer.gstNumber ? (
                    <Group gap={6} mt={4}>
                      <Text size="sm" fw={700} style={{ fontFamily: 'monospace', color: headingColor }}>
                        {customer.gstNumber}
                      </Text>
                      <CopyButton value={customer.gstNumber} timeout={2000}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copied' : 'Copy GSTIN'}>
                            <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                              {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed" mt={4}>
                      —
                    </Text>
                  )}
                </Box>

                {/* 6. PAN Number */}
                <Box>
                  <Text size="xs" fw={600} style={{ color: labelColor }}>
                    PAN Number
                  </Text>
                  {customer.panNumber ? (
                    <Group gap={6} mt={4}>
                      <Text size="sm" fw={700} style={{ fontFamily: 'monospace', color: headingColor }}>
                        {customer.panNumber}
                      </Text>
                      <CopyButton value={customer.panNumber} timeout={2000}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copied' : 'Copy PAN'}>
                            <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                              {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed" mt={4}>
                      —
                    </Text>
                  )}
                </Box>
              </SimpleGrid>
            </Paper>

            {/* Card B: Account Notes & Pipeline History */}
            {customer.notes && (
              <Paper
                p="xl"
                radius="lg"
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderCol}`,
                  boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                }}
              >
                <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="xs">
                  <Group gap="xs">
                    <ThemeIcon size={32} radius="md" color="violet" variant="light">
                      <IconFileText size={18} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={800} size="md" style={{ color: headingColor }}>
                        Pipeline Conversion & Account Notes
                      </Text>
                      <Text size="11px" c="dimmed">
                        Origin timeline and internal transition remarks
                      </Text>
                    </Box>
                  </Group>
                  {parsedNotes.isSystemNote && (
                    <Badge variant="light" color="teal" size="sm" radius="sm" leftSection={<IconCheck size={11} stroke={3} />}>
                      Lead Converted
                    </Badge>
                  )}
                </Group>

                <Box
                  p="md"
                  style={{
                    borderRadius: 10,
                    backgroundColor: innerCardBg,
                    border: `1px solid ${borderCol}`,
                  }}
                >
                  {parsedNotes.isSystemNote ? (
                    <Stack gap="md">
                      {/* Origin & Conversion Metadata Badges */}
                      <Group gap="xs" wrap="wrap" align="center">
                        {parsedNotes.leadId && (
                          <Group gap={6} align="center">
                            <Text size="xs" fw={700} c="dimmed">
                              Source Lead:
                            </Text>
                            <Badge
                              size="sm"
                              variant="filled"
                              color="indigo"
                              radius="sm"
                              style={{ fontWeight: 700, letterSpacing: '0.02em' }}
                            >
                              {parsedNotes.leadId}
                            </Badge>
                          </Group>
                        )}

                        {parsedNotes.category && (
                          <Group gap={6} align="center">
                            <Text size="xs" fw={700} c="dimmed">
                              Category:
                            </Text>
                            <Badge size="sm" variant="light" color="violet" radius="sm" style={{ fontWeight: 700 }}>
                              {parsedNotes.category === 'Service' ? 'IT Service Delivery' : parsedNotes.category}
                            </Badge>
                          </Group>
                        )}

                        <Badge size="sm" variant="outline" color="teal" radius="sm" leftSection={<IconCheck size={11} stroke={3} />}>
                          Pipeline Won & Transitioned
                        </Badge>
                      </Group>

                      {/* Purchased Services & Projects */}
                      {parsedNotes.projects.length > 0 && (
                        <Box>
                          <Text size="11px" fw={800} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.05em' }} mb={8}>
                            Purchased Services & Project Scopes ({parsedNotes.projects.length})
                          </Text>
                          <Stack gap={6}>
                            {parsedNotes.projects.map((proj, idx) => (
                              <Group
                                key={idx}
                                gap={8}
                                wrap="nowrap"
                                align="center"
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: 8,
                                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'}`,
                                  boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                                }}
                              >
                                <Badge
                                  size="xs"
                                  variant="filled"
                                  color={idx === 0 ? 'teal' : idx === 1 ? 'blue' : 'violet'}
                                  style={{
                                    height: 18,
                                    fontSize: 10,
                                    fontWeight: 800,
                                    borderRadius: 4,
                                    padding: '0 5px',
                                    flexShrink: 0,
                                  }}
                                >
                                  P{proj.projectNumber}
                                </Badge>
                                <Text size="xs" fw={600} style={{ color: headingColor, flex: 1 }} truncate>
                                  {proj.title}
                                </Text>
                                <Badge size="xs" variant="light" color="teal" radius="xs" style={{ fontSize: 10, fontWeight: 700 }}>
                                  Contracted
                                </Badge>
                              </Group>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {/* Custom Remarks if any */}
                      {parsedNotes.customNotes && (
                        <Box
                          p="sm"
                          style={{
                            borderRadius: 6,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                            border: `1px solid ${borderCol}`,
                          }}
                        >
                          <Text size="11px" fw={700} c="dimmed" tt="uppercase" mb={4}>
                            Additional Remarks
                          </Text>
                          <Text size="xs" style={{ color: isDark ? '#E2E8F0' : '#334155', lineHeight: 1.5 }}>
                            {parsedNotes.customNotes}
                          </Text>
                        </Box>
                      )}
                    </Stack>
                  ) : (
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: isDark ? '#E2E8F0' : '#334155' }}>
                      {customer.notes}
                    </Text>
                  )}

                  {/* Audit Timeline Footer */}
                  <Divider my="sm" color={isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'} />
                  <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                    <Group gap={6} align="center">
                      <IconCalendar size={13} color="#94A3B8" />
                      <Text size="11px" c="dimmed">
                        Created on: {formatDate(customer.createdAt)}
                      </Text>
                    </Group>
                    <Group gap={6} align="center">
                      <IconClock size={13} color="#94A3B8" />
                      <Text size="11px" c="dimmed">
                        Last Updated: {formatDate(customer.updatedAt)}
                      </Text>
                    </Group>
                  </Group>
                </Box>
              </Paper>
            )}
          </Stack>
        </Grid.Col>

        {/* Right Column (span 5): Primary Contact Person Card */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper
            p="xl"
            radius="lg"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderCol}`,
              height: '100%',
              boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <Group justify="space-between" align="center" mb="lg">
              <Group gap="xs">
                <ThemeIcon size={32} radius="md" color="blue" variant="light">
                  <IconUser size={18} />
                </ThemeIcon>
                <Box>
                  <Text fw={800} size="md" style={{ color: headingColor }}>
                    Client Profile & Primary Contact
                  </Text>
                  <Text size="11px" c="dimmed">
                    Official client decision maker and account stakeholder
                  </Text>
                </Box>
              </Group>
              <Badge variant="dot" color="teal" size="sm">
                Active Stakeholder
              </Badge>
            </Group>

            <Stack gap="md" style={{ flex: 1 }}>
              {/* Hero Stakeholder Profile Card */}
              <Box
                p="lg"
                style={{
                  borderRadius: 12,
                  background: isDark
                    ? 'linear-gradient(145deg, rgba(37, 99, 235, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%)'
                    : 'linear-gradient(145deg, #F8FAFC 0%, #EFF6FF 100%)',
                  border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.18)' : '#DBEAFE'}`,
                }}
              >
                <Group gap="md" align="center" wrap="nowrap">
                  <Box
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 18,
                      flexShrink: 0,
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    }}
                  >
                    {getInitials(customer.contactPerson)}
                  </Box>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="10.5px" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                      Primary Decision Maker
                    </Text>
                    <Text fw={800} size="17px" style={{ color: headingColor, lineHeight: 1.25 }} truncate>
                      {customer.contactPerson}
                    </Text>
                    <Group gap={6} mt={3} align="center" wrap="wrap">
                      <Badge size="xs" variant="light" color="indigo" radius="sm" style={{ fontWeight: 700 }}>
                        {customer.designation || 'Client Stakeholder'}
                      </Badge>
                      {customer.city && (
                        <Text size="11px" c="dimmed">
                          • {customer.city}
                        </Text>
                      )}
                    </Group>
                  </Box>
                </Group>

                {/* Quick Communication CTA Buttons */}
                <Group gap="xs" mt="md" grow>
                  {customer.phone && (
                    <Button
                      size="xs"
                      radius="md"
                      variant="light"
                      color="teal"
                      leftSection={<IconPhone size={14} />}
                      component="a"
                      href={`tel:${customer.phone}`}
                      style={{ fontWeight: 700, height: 32 }}
                    >
                      Call Direct
                    </Button>
                  )}
                  {customer.email && (
                    <Button
                      size="xs"
                      radius="md"
                      variant="light"
                      color="blue"
                      leftSection={<IconMail size={14} />}
                      component="a"
                      href={`mailto:${customer.email}`}
                      style={{ fontWeight: 700, height: 32 }}
                    >
                      Send Email
                    </Button>
                  )}
                </Group>
              </Box>

              {/* Seamless Contact Channels Container */}
              <Box
                p="md"
                style={{
                  borderRadius: 12,
                  backgroundColor: innerCardBg,
                  border: `1px solid ${borderCol}`,
                }}
              >
                <Text size="11px" fw={800} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.05em' }} mb="sm">
                  Verified Contact Channels
                </Text>

                <Stack gap="xs">
                  {/* Phone / WhatsApp Channel */}
                  <Group justify="space-between" align="center" wrap="nowrap" p={4}>
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <ThemeIcon size={32} radius="md" color="teal" variant="light" style={{ flexShrink: 0 }}>
                        <IconPhone size={16} />
                      </ThemeIcon>
                      <Box style={{ minWidth: 0 }}>
                        <Text size="10.5px" fw={600} style={{ color: labelColor }}>
                          Direct Mobile / WhatsApp
                        </Text>
                        <Text
                          size="sm"
                          fw={700}
                          component="a"
                          href={`tel:${customer.phone}`}
                          style={{ color: headingColor, textDecoration: 'none' }}
                          truncate
                        >
                          {customer.phone || '—'}
                        </Text>
                      </Box>
                    </Group>
                    {customer.phone && (
                      <CopyButton value={customer.phone} timeout={2000}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copied' : 'Copy phone'}>
                            <ActionIcon size="sm" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    )}
                  </Group>

                  <Divider color={isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0'} />

                  {/* Email Channel */}
                  <Group justify="space-between" align="center" wrap="nowrap" p={4}>
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <ThemeIcon size={32} radius="md" color="blue" variant="light" style={{ flexShrink: 0 }}>
                        <IconMail size={16} />
                      </ThemeIcon>
                      <Box style={{ minWidth: 0 }}>
                        <Text size="10.5px" fw={600} style={{ color: labelColor }}>
                          Official Business Email
                        </Text>
                        {customer.email ? (
                          <Text
                            size="sm"
                            fw={700}
                            component="a"
                            href={`mailto:${customer.email}`}
                            style={{ color: '#2563EB', textDecoration: 'none' }}
                            truncate
                          >
                            {customer.email}
                          </Text>
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </Box>
                    </Group>
                    {customer.email && (
                      <CopyButton value={customer.email} timeout={2000}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copied' : 'Copy email'}>
                            <ActionIcon size="sm" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    )}
                  </Group>

                  <Divider color={isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0'} />

                  {/* Assigned Relationship Manager */}
                  <Group justify="space-between" align="center" wrap="nowrap" p={4}>
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <ThemeIcon size={32} radius="md" color="indigo" variant="light" style={{ flexShrink: 0 }}>
                        <IconUser size={16} />
                      </ThemeIcon>
                      <Box style={{ minWidth: 0 }}>
                        <Text size="10.5px" fw={600} style={{ color: labelColor }}>
                          Assigned Relationship Manager
                        </Text>
                        <Group gap={6} align="center" wrap="nowrap" mt={1}>
                          <Text size="sm" fw={700} style={{ color: headingColor }} truncate>
                            {customer.accountManager || 'Unassigned'}
                          </Text>
                        </Group>
                      </Box>
                    </Group>
                    <Badge size="xs" variant="light" color="indigo" radius="sm">
                      Relationship Lead
                    </Badge>
                  </Group>
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Box>
  );
};

export default CustomerDetailsPage;
