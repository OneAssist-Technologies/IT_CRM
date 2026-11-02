import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Text,
  Group,
  Stack,
  Button,
  Badge,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Divider,
  ActionIcon,
  Card,
  Table,
  Progress,
  Pagination,
  Tooltip,
  Center,
  Loader,
  UnstyledButton,
  Timeline,
  Grid,
  useComputedColorScheme,
  ComboboxItem,
  Alert,
} from '@mantine/core';
import {
  IconScale,
  IconPlus,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconCash,
  IconUserCheck,
  IconPercentage,
  IconNote,
  IconMessageDots,
  IconFileCheck,
  IconDownload,
  IconSend,
  IconBuilding,
  IconSignature,
  IconCalendar,
  IconCalendarEvent,
  IconTruckDelivery,
  IconClock,
  IconShieldCheck,
  IconReceipt,
  IconAlertCircle,
  IconAlertTriangle,
  IconCreditCard,
  IconBuildingBank,
  IconQrcode,
  IconRocket,
  IconExternalLink,
  IconUser,
  IconCode,
  IconChevronRight,
  IconSearch,
  IconEdit,
  IconTrash,
  IconEye,
  IconFileText,
  IconTrendingUp,
  IconX,
  IconCurrencyRupee,
  IconMessageCircle,
  IconUpload,
  IconFileDescription,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { cleanWorkText, cleanComments } from './sections/LeadHandoverSection';
import {
  Lead,
  LeadDealData,
  LeadProposal,
  LeadNegotiation,
  NegotiationEntry,
  LeadContract,
  LeadInvoiceItem,
  LeadPaymentRecord,
  LeadProgressData,
  ProjectMilestoneItem,
  Negotiation,
  NegotiationStatus,
  NegotiationFormData,
  NegotiationStats,
  Contract,
  ContractFormData,
  ContractStats,
  ContractFilters,
  ContractType,
  ContractApprovalStatus,
  ContractSignatureStatus,
  ContractStatus,
} from '../../../types/lead';
import { Quotation } from '../../../types/billing';
import { QuotationModal } from '../../billing/components/QuotationModal';
import { useEmployee } from '../../../context/EmployeeContext';
import { useContact } from '../../../context/ContactContext';
import { useLead } from '../../../context/LeadContext';
import { usePermissions } from '../../../context/AccessControlContext';
import { leadService } from '../../../services/leadService';
import { billingService } from '../../../services/billingService';
import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';
import {
  DateFilterControl,
  DateFilterValue,
  DEFAULT_DATE_FILTER,
  isDateMatchingFilter,
} from '../../../components/common/DateFilterControl';

// =========================================================================
// 1. LEAD DEAL STORE HELPERS
// =========================================================================

export const getInitialLeadDealData = (lead: Lead): LeadDealData => {
  const company = lead.companyName || lead.profession || lead.name || 'Company';
  const offering =
    lead.category === 'Product'
      ? lead.productList && lead.productList.length > 0
        ? lead.productList.join(', ')
        : 'Enterprise IT CRM Platform'
      : lead.serviceList && lead.serviceList.length > 0
      ? lead.serviceList.join(', ')
      : 'Custom Cloud & Software Engineering';

  // 1. Initial Proposal
  const initialProposal: LeadProposal = {
    id: `prop-${lead.id}-1`,
    leadId: lead.id,
    proposalNumber: `PROP-${new Date().getFullYear()}-0042`,
    title: `${offering} Solution Proposal for ${company}`,
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Accepted',
    currency: 'INR (₹)',
    items: [
      {
        id: 'item-1',
        description: `${offering} - Enterprise License (1 Year)`,
        quantity: 1,
        unitPrice: 95000,
        total: 95000,
      },
      {
        id: 'item-2',
        description: 'Cloud Infrastructure, Database Setup & Security Hardening',
        quantity: 1,
        unitPrice: 35000,
        total: 35000,
      },
      {
        id: 'item-3',
        description: 'Team Onboarding, Role Setup & Workflow Integration',
        quantity: 1,
        unitPrice: 20000,
        total: 20000,
      },
    ],
    discountPercent: 10,
    taxPercent: 18,
    subtotal: 150000,
    totalAmount: 159300,
    notes: 'Includes dedicated account manager, 99.9% uptime SLA, and 90 days complimentary post-go-live bug-fixing support.',
    terms: 'Payment terms: 40% advance upon contract signing, 30% upon beta release UAT, 30% upon final production handover.',
    createdAt: new Date().toISOString(),
  };

  // 1b. Initial Quotation
  const initialQuotation: Quotation = {
    id: `quo-${lead.id}-1`,
    quotationNumber: `QUO-${new Date().getFullYear()}-1042`,
    leadId: lead.id,
    contactId: lead.id,
    contactName: lead.name,
    companyName: company,
    contactEmail: lead.email || 'client@example.com',
    contactPhone: lead.phone || '',
    clientAddress: lead.address || 'Corporate Headquarters',
    quotationDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Sent',
    currency: 'INR',
    subtotal: 150000,
    discountType: 'percentage',
    discountValue: 10,
    discountAmount: 15000,
    taxAmount: 24300,
    grandTotal: 159300,
    paymentTerms: 'Net 30 Days (40% advance, 30% UAT, 30% handover)',
    notes: 'Itemized pricing quotation aligned with technical discovery and scope proposal.',
    termsConditions: '1. Quotation valid for 30 days from date of issue.\n2. 50% advance along with confirmed Purchase Order.\n3. Taxes extra as applicable by law.',
    items: [
      {
        id: 'qitem-1',
        itemName: `${offering} - Enterprise License (1 Year)`,
        itemType: 'Product',
        description: 'Complete core software suite license with 10 user seats.',
        quantity: 1,
        unitPrice: 95000,
        discount: 0,
        taxRate: 18,
        taxAmount: 17100,
        totalAmount: 112100,
      },
      {
        id: 'qitem-2',
        itemName: 'Cloud Deployment & Security Hardening',
        itemType: 'Service',
        description: 'Multi-region AWS cloud setup, automated daily snapshots, SSL certificates.',
        quantity: 1,
        unitPrice: 35000,
        discount: 0,
        taxRate: 18,
        taxAmount: 6300,
        totalAmount: 41300,
      },
      {
        id: 'qitem-3',
        itemName: 'Onboarding & Data Migration Support',
        itemType: 'Service',
        description: 'Staff training workshops and historical CRM data importing.',
        quantity: 1,
        unitPrice: 20000,
        discount: 0,
        taxRate: 18,
        taxAmount: 3600,
        totalAmount: 23600,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 2. Initial Negotiation
  const initialNegotiation: LeadNegotiation = {
    leadId: lead.id,
    originalQuotedAmount: 150000,
    currentAgreedAmount: 135000,
    discountPercentage: 10,
    status: 'Terms Agreed',
    decisionMaker: `${lead.name} (${lead.designation || 'Key Decision Maker'})`,
    keyConcessions: [
      '10% commercial discount on upfront commitment',
      'Extended free maintenance support from 30 days to 90 days',
      'Dedicated tech manager assigned for onboarding',
    ],
    nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    entries: [
      {
        id: 'neg-1',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        author: 'Sandy (Account Exec)',
        topic: 'Initial Commercial Discussion',
        notes: `Presented proposal of ₹1,50,000 for ${offering}. Client requested concession for annual billing.`,
        type: 'pricing',
      },
      {
        id: 'neg-2',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        author: 'Sandy (Account Exec)',
        topic: 'Discount & Scope Finalization',
        notes: 'Agreed on ₹1,35,000 with 3-phase milestone payment (40% advance, 30% UAT, 30% handover). Client approved terms.',
        priceImpact: -15000,
        type: 'terms',
      },
    ],
  };

  // 3. Initial Contract
  const initialContract: LeadContract = {
    id: `cnt-${lead.id}-1`,
    contractId: `CNT-${new Date().getFullYear()}-018`,
    contractType: 'Software Development',
    contractDate: new Date().toISOString().split('T')[0],
    leadId: lead.id,
    contractNumber: `CNT-${new Date().getFullYear()}-018`,
    title: `Master Services Agreement - ${company}`,
    contractValue: 135000,
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    durationMonths: 12,
    status: 'Signed',
    signatureStatus: 'Signed',
    approvalStatus: 'Approved',
    signedByClient: true,
    clientSignerName: `${lead.name} (${lead.designation || 'CEO'})`,
    clientSignedDate: new Date().toISOString().split('T')[0],
    signedByCompany: true,
    companySignerName: 'Sales Director (OneAssist CRM)',
    paymentTerms: '40% advance on execution (₹54,000), 30% UAT signoff (₹40,500), 30% final go-live (₹40,500).',
    slaTerms: '99.9% application uptime, Level 1 response within 4 hours, monthly system backups.',
    scopeSummary: `Implementation and deployment of ${offering} with customized data pipelines, security controls, and training.`,
  };

  // 4. Initial Invoices (Clean slate, created through invoice builder)
  const initialInvoices: LeadInvoiceItem[] = [];

  // 5. Initial Payment Records
  const initialPayments: LeadPaymentRecord[] = [];

  // 6. Initial Progress
  const initialProgress: LeadProgressData = {
    leadId: lead.id,
    projectName: `${company} - ${offering} Deployment`,
    projectCode: `PRJ-${(company.replace(/[^A-Za-z0-9]/g, '').slice(0, 3) || 'CRM').toUpperCase()}-01`,
    overallPercentage: 40,
    status: 'In Development',
    projectManager: 'Kavin (Project Lead)',
    techLead: 'Ranjith (Senior Dev)',
    targetDeliveryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    stagingUrl: `https://${(company.replace(/[^A-Za-z0-9]/g, '').toLowerCase() || 'client')}.oneassist.app`,
    milestones: [
      {
        id: 'ms-1',
        title: 'Discovery & System Architecture Signoff',
        description: 'Client requirements finalized, entity relations defined and approved.',
        percentage: 100,
        status: 'Completed',
        targetDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        id: 'ms-2',
        title: 'Database Schema & Core API Integrations',
        description: 'Authentication, database migrations, and lead pipeline services deployed on staging.',
        percentage: 100,
        status: 'Completed',
        targetDate: new Date().toISOString().split('T')[0],
      },
      {
        id: 'ms-3',
        title: 'Custom Modules & Dashboard Development',
        description: 'Building custom CRM views, user permission matrix, and real-time activity feeds.',
        percentage: 45,
        status: 'In Progress',
        targetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        id: 'ms-4',
        title: 'Client UAT & Staff Training',
        description: 'Handover staging instance to client team for user testing and feedback.',
        percentage: 0,
        status: 'Upcoming',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        id: 'ms-5',
        title: 'Production Go-Live & Handover',
        description: 'Custom domain mapping, SSL provisioning, and final production rollout.',
        percentage: 0,
        status: 'Upcoming',
        targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ],
  };

  return {
    proposals: [],
    quotations: [],
    negotiation: null as any,
    contract: null as any,
    invoices: [],
    payments: [],
    progress: {
      leadId: lead.id,
      projectName: `${company} - ${offering} Deployment`,
      projectCode: `PRJ-${(company.replace(/[^A-Za-z0-9]/g, '').slice(0, 3) || 'CRM').toUpperCase()}-01`,
      overallPercentage: 0,
      status: 'In Development',
      projectManager: '',
      techLead: '',
      targetDeliveryDate: '',
      stagingUrl: '',
      milestones: [],
    },
    handover: undefined,
  };
};

export const loadLeadDealData = (lead: Lead): LeadDealData => {
  try {
    const saved = localStorage.getItem(`crm_lead_deal_${lead.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Clean up legacy mockup demo items from previous prototypes
      if (parsed.proposals && parsed.proposals.some((p: any) => p.id === `prop-${lead.id}-1`)) {
        parsed.proposals = parsed.proposals.filter((p: any) => p.id !== `prop-${lead.id}-1`);
      }
      if (parsed.quotations && parsed.quotations.some((q: any) => q.id === `quo-${lead.id}-1`)) {
        parsed.quotations = parsed.quotations.filter((q: any) => q.id !== `quo-${lead.id}-1`);
      }
      if (parsed.contract && parsed.contract.id === `cnt-${lead.id}-1`) {
        parsed.contract = null;
      }
      if (parsed.invoices && parsed.invoices.some((i: any) => i.id === `inv-${lead.id}-1`)) {
        parsed.invoices = parsed.invoices.filter((i: any) => i.id !== `inv-${lead.id}-1`);
      }
      if (parsed.payments && parsed.payments.some((p: any) => p.id === `pay-${lead.id}-1`)) {
        parsed.payments = parsed.payments.filter((p: any) => p.id !== `pay-${lead.id}-1`);
      }
      if (parsed.negotiation && parsed.negotiation.leadId === lead.id && parsed.negotiation.originalQuotedAmount === 150000) {
        parsed.negotiation = null;
      }
      // Clean up legacy/boilerplate handover items
      if (parsed.handover) {
        parsed.handover.completedWork = cleanWorkText(parsed.handover.completedWork);
        parsed.handover.pendingTasks = cleanWorkText(parsed.handover.pendingTasks);
        parsed.handover.comments = cleanComments(parsed.handover.comments);
        // If handover was prematurely set to Completed before user finished it, normalize to In Progress
        if (lead.stage !== 'Completed' && lead.status !== 'Complete' && lead.status !== 'Won') {
          if (parsed.handover.handoverStatus === 'Completed' || parsed.handover.status === 'Handover Completed') {
            parsed.handover.handoverStatus = 'In Progress';
            parsed.handover.approvalStatus = 'Pending Approval';
            parsed.handover.status = 'In Progress';
          }
        }
      }
      saveLeadDealData(lead.id, parsed);
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse deal data from localStorage:', e);
  }
  const defaultData = getInitialLeadDealData(lead);
  saveLeadDealData(lead.id, defaultData);
  return defaultData;
};

export const saveLeadDealData = (leadId: string, data: LeadDealData): void => {
  try {
    localStorage.setItem(`crm_lead_deal_${leadId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save deal data to localStorage:', e);
  }
};


// =========================================================================
// 2. LEAD NEGOTIATION SECTION
// =========================================================================

interface LeadNegotiationSectionProps {
  lead?: Lead | null;
  isDark?: boolean;
  negotiation?: LeadNegotiation;
  onUpdateNegotiation?: (negotiation: LeadNegotiation) => void;
  onNavigateSection?: (section: any) => void;
}

type ActiveNegTabType =
  | 'ALL'
  | 'IN_PROGRESS'
  | 'AWAITING_CLIENT'
  | 'REVISED_QUOTATION'
  | 'WON'
  | 'LOST';

export const LeadNegotiationSection: React.FC<LeadNegotiationSectionProps> = ({
  lead,
  isDark: propIsDark,
  negotiation: legacyNegotiation,
  onUpdateNegotiation,
  onNavigateSection,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = propIsDark !== undefined ? propIsDark : computedColorScheme === 'dark';

  // Contexts
  const { employees, fetchEmployees } = useEmployee();
  const { contacts } = useContact();
  const { leads } = useLead();
  const { can, isSuperAdmin } = usePermissions();

  const canCreate = isSuperAdmin || can('leads', 'create');
  const canEdit = isSuperAdmin || can('leads', 'edit');
  const canDelete = isSuperAdmin || can('leads', 'delete');

  // Negotiations & Stats state
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [stats, setStats] = useState<NegotiationStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  // Filter States
  const [activeTab, setActiveTab] = useState<ActiveNegTabType>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Modals
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingNegotiation, setEditingNegotiation] = useState<Negotiation | null>(null);
  const [detailsNegotiation, setDetailsNegotiation] = useState<Negotiation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Negotiation | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [revisionQuoteModalOpen, setRevisionQuoteModalOpen] = useState<boolean>(false);
  const [revisionBaseQuote, setRevisionBaseQuote] = useState<Quotation | null>(null);
  const [activeNegotiationForRevision, setActiveNegotiationForRevision] = useState<Negotiation | null>(null);

  // Form State
  const [formNegotiationId, setFormNegotiationId] = useState<string>('');
  const [formNegotiationTitle, setFormNegotiationTitle] = useState<string>('');
  const [leadOrContactKey, setLeadOrContactKey] = useState<string>('');
  const [formLeadName, setFormLeadName] = useState<string>('');
  const [formClientName, setFormClientName] = useState<string>('');
  const [formContactEmail, setFormContactEmail] = useState<string>('');
  const [formContactPhone, setFormContactPhone] = useState<string>('');
  const [formLeadId, setFormLeadId] = useState<string>('');
  const [formContactId, setFormContactId] = useState<string>('');
  const [quotationOrProposal, setQuotationOrProposal] = useState<string>('');
  const [formQuotationId, setFormQuotationId] = useState<string>('');
  const [formQuotationNumber, setFormQuotationNumber] = useState<string>('');
  const [formProposalNumber, setFormProposalNumber] = useState<string>('');
  const [assignedEmployeeKey, setAssignedEmployeeKey] = useState<string>('');
  const [formAssignedTo, setFormAssignedTo] = useState<string>('');
  const [formAssignedToName, setFormAssignedToName] = useState<string>('');
  const [formNegotiationDate, setFormNegotiationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formValidUntil, setFormValidUntil] = useState<string>('');
  const [formStatus, setFormStatus] = useState<NegotiationStatus>('Draft');
  const [formQuotedAmount, setFormQuotedAmount] = useState<number>(0);
  const [formExpectedFinalAmount, setFormExpectedFinalAmount] = useState<number>(0);
  const [formDiscountPercentage, setFormDiscountPercentage] = useState<number>(0);
  const [formPaymentTerms, setFormPaymentTerms] = useState<string>('');
  const [formScopeChanges, setFormScopeChanges] = useState<string>('');
  const [formDeliveryTimeline, setFormDeliveryTimeline] = useState<string>('');
  const [formClientRequirements, setFormClientRequirements] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formNextFollowUpDate, setFormNextFollowUpDate] = useState<string>('');
  const [formLossReason, setFormLossReason] = useState<string>('');
  const [documentFileName, setDocumentFileName] = useState<string>('');
  const [documentFileUrl, setDocumentFileUrl] = useState<string>('');
  const [documentFileSize, setDocumentFileSize] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const generateNegotiationNumber = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `NEG-${year}-${randomNum}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      notifications.show({
        title: 'File Too Large',
        message: 'Please upload a negotiation document smaller than 25MB.',
        color: 'red',
      });
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setDocumentFileName(file.name);
      setDocumentFileUrl(dataUrl);
      setDocumentFileSize(sizeFormatted);
      notifications.show({
        title: 'Document Attached',
        message: `${file.name} (${sizeFormatted}) uploaded successfully.`,
        color: 'teal',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setDocumentFileName('');
    setDocumentFileUrl('');
    setDocumentFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenDocument = () => {
    if (!documentFileUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${documentFileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  // Fetch negotiations list from leadService
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        leadService.getNegotiations({
          leadId: lead?.id || undefined,
          limit: 100,
        }),
        leadService.getNegotiationStats().catch(() => null),
      ]);
      setNegotiations(res.data || []);
      if (statsRes) setStats(statsRes);
    } catch (err: any) {
      notifications.show({
        title: 'Error Loading Negotiations',
        message: err.message || 'Could not fetch negotiations',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [lead?.id]);

  useEffect(() => {
    loadData();
    billingService
      .getQuotations()
      .then((quotes) => {
        if (quotes && Array.isArray(quotes)) {
          const flattened: Quotation[] = [];
          quotes.forEach((q) => {
            if (q.allRevisions && q.allRevisions.length > 0) {
              flattened.push(...q.allRevisions);
            } else {
              flattened.push(q);
            }
          });
          setQuotations(flattened);
        }
      })
      .catch(() => {});
  }, [loadData]);

  const handleCreateRevisionFromNegotiation = (neg: Negotiation) => {
    let quote = quotations.find((q) => q.id === neg.quotationId || q.quotationNumber === neg.quotationNumber);
    if (!quote && quotations.length > 0) {
      quote = quotations.find((q) => q.leadId === lead?.id) || quotations[0];
    }
    if (quote) {
      setActiveNegotiationForRevision(neg);
      setRevisionBaseQuote(quote);
      setRevisionQuoteModalOpen(true);
    } else {
      notifications.show({
        color: 'blue',
        title: 'No Linked Quotation',
        message: 'No quotation found to revise. Navigating to Quotation section.',
      });
      if (onNavigateSection) onNavigateSection('quotations');
    }
  };

  const handleRevisionQuoteSaved = async (savedQuote?: Quotation) => {
    setRevisionQuoteModalOpen(false);
    if (savedQuote && activeNegotiationForRevision) {
      try {
        await leadService.updateNegotiation(activeNegotiationForRevision.id, {
          quotationId: savedQuote.id,
          quotationNumber: savedQuote.quotationNumber,
          expectedFinalAmount: savedQuote.grandTotal,
          status: 'Revised Quotation',
          notes: `Updated with revision ${savedQuote.revisionName || savedQuote.quotationNumber}. Total: ₹${Number(savedQuote.grandTotal).toLocaleString('en-IN')}`,
        });
        notifications.show({
          color: 'teal',
          title: 'Negotiation Updated',
          message: `Linked negotiation updated with revised quotation ${savedQuote.revisionName || savedQuote.quotationNumber}.`,
        });
        loadData();
      } catch (err: any) {
        console.warn('Update negotiation error:', err);
      }
    }
    setActiveNegotiationForRevision(null);
    setRevisionBaseQuote(null);
  };

  // Tab counts
  const totalCount = negotiations.length;
  const inProgressCount = useMemo(
    () => negotiations.filter((n) => n.status.toLowerCase() === 'in progress').length,
    [negotiations]
  );
  const awaitingClientCount = useMemo(
    () => negotiations.filter((n) => n.status.toLowerCase() === 'awaiting client').length,
    [negotiations]
  );
  const revisedQuoteCount = useMemo(
    () => negotiations.filter((n) => n.status.toLowerCase() === 'revised quotation').length,
    [negotiations]
  );
  const wonCount = useMemo(
    () => negotiations.filter((n) => n.status.toLowerCase() === 'won').length,
    [negotiations]
  );
  const lostCount = useMemo(
    () => negotiations.filter((n) => n.status.toLowerCase() === 'lost').length,
    [negotiations]
  );

  const totalQuotedSum = useMemo(
    () => negotiations.reduce((acc, curr) => acc + (Number(curr.quotedAmount) || 0), 0),
    [negotiations]
  );
  const totalExpectedSum = useMemo(
    () => negotiations.reduce((acc, curr) => acc + (Number(curr.expectedFinalAmount) || 0), 0),
    [negotiations]
  );

  // Filtered list
  const filteredNegotiations = useMemo(() => {
    return negotiations.filter((neg) => {
      if (activeTab === 'IN_PROGRESS' && neg.status.toLowerCase() !== 'in progress') return false;
      if (activeTab === 'AWAITING_CLIENT' && neg.status.toLowerCase() !== 'awaiting client') return false;
      if (activeTab === 'REVISED_QUOTATION' && neg.status.toLowerCase() !== 'revised quotation') return false;
      if (activeTab === 'WON' && neg.status.toLowerCase() !== 'won') return false;
      if (activeTab === 'LOST' && neg.status.toLowerCase() !== 'lost') return false;

      if (statusFilter !== 'All') {
        if (neg.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      if (!isDateMatchingFilter(neg.negotiationDate || neg.createdAt, dateFilter)) {
        return false;
      }

      if (searchInput.trim()) {
        const q = searchInput.toLowerCase();
        const matchId = (neg.negotiationId || '').toLowerCase().includes(q);
        const matchLead = (neg.leadName || '').toLowerCase().includes(q);
        const matchClient = (neg.clientName || '').toLowerCase().includes(q);
        const matchQuote = (neg.quotationNumber || '').toLowerCase().includes(q);
        const matchProp = (neg.proposalNumber || '').toLowerCase().includes(q);
        const matchEmp = (neg.assignedToName || '').toLowerCase().includes(q);
        const matchNotes = (neg.notes || '').toLowerCase().includes(q);
        const matchReq = (neg.clientRequirements || '').toLowerCase().includes(q);
        const matchStatus = (neg.status || '').toLowerCase().includes(q);

        if (
          !matchId &&
          !matchLead &&
          !matchClient &&
          !matchQuote &&
          !matchProp &&
          !matchEmp &&
          !matchNotes &&
          !matchReq &&
          !matchStatus
        ) {
          return false;
        }
      }

      return true;
    });
  }, [negotiations, activeTab, statusFilter, dateFilter, searchInput]);

  const totalPages = Math.ceil(filteredNegotiations.length / pageSize) || 1;
  const paginatedNegotiations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredNegotiations.slice(start, start + pageSize);
  }, [filteredNegotiations, page, pageSize]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingNegotiation(null);
    setFormNegotiationId(generateNegotiationNumber());
    setFormNegotiationTitle(
      lead?.category === 'Product'
        ? `${lead.productList?.[0] || 'IT CRM'} Solution Negotiation`
        : `${lead?.serviceList?.[0] || 'IT Solution'} Commercial Negotiation`
    );
    if (lead) {
      setLeadOrContactKey(`lead:${lead.id}`);
      setFormLeadId(lead.id);
      setFormLeadName(lead.name || '');
      setFormClientName(lead.companyName || lead.profession || '');
      setFormContactEmail(lead.email || '');
      setFormContactPhone(lead.phone || '');
    } else {
      setLeadOrContactKey('');
      setFormLeadId('');
      setFormLeadName('');
      setFormClientName('');
      setFormContactEmail('');
      setFormContactPhone('');
    }

    setFormContactId('');
    setQuotationOrProposal('');
    setFormQuotationId('');
    setFormQuotationNumber('');
    setFormProposalNumber('');

    // Assigned employee from lead if present
    const leadEmp = lead?.assignedTo ? employees.find((e) => e.id === lead.assignedTo || e.name === lead.assignedTo) : null;
    if (leadEmp) {
      setFormAssignedTo(leadEmp.id);
      setFormAssignedToName(leadEmp.name);
      setAssignedEmployeeKey(`emp:${leadEmp.id}`);
    } else {
      setFormAssignedTo('');
      setFormAssignedToName('');
      setAssignedEmployeeKey('');
    }

    setFormNegotiationDate(new Date().toISOString().split('T')[0]);
    setFormValidUntil('');
    setFormStatus('In Progress');

    // Auto-fetch from existing Quotation if available for this lead
    const matchedQuote = quotations.find((q) => q.leadId === lead?.id || !q.leadId) || quotations[0];
    if (matchedQuote) {
      setQuotationOrProposal(matchedQuote.quotationNumber || matchedQuote.id);
      setFormQuotationId(matchedQuote.id);
      setFormQuotationNumber(matchedQuote.quotationNumber);
      const qVal = Number(matchedQuote.grandTotal || matchedQuote.subtotal || 0);
      setFormQuotedAmount(qVal || 0);
      setFormExpectedFinalAmount(qVal || 0);
      setFormDiscountPercentage(Number(matchedQuote.discountValue || 0));
      setFormPaymentTerms(matchedQuote.paymentTerms || '');
    } else {
      setQuotationOrProposal('');
      setFormQuotationId('');
      setFormQuotationNumber('');
      setFormQuotedAmount(0);
      setFormExpectedFinalAmount(0);
      setFormDiscountPercentage(0);
      setFormPaymentTerms('');
    }
    setFormScopeChanges('');
    setFormDeliveryTimeline('');
    setFormClientRequirements('');
    setFormNotes('');
    setFormNextFollowUpDate('');
    setFormLossReason('');
    setDocumentFileName('');
    setDocumentFileUrl('');
    setDocumentFileSize('');
    setErrors({});
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (neg: Negotiation) => {
    setEditingNegotiation(neg);
    setFormNegotiationId(neg.negotiationId || generateNegotiationNumber());
    setFormNegotiationTitle(
      neg.scopeChanges ||
        (neg.quotationNumber ? `Commercial Negotiation (${neg.quotationNumber})` : 'IT CRM Solution Negotiation')
    );
    setFormLeadName(neg.leadName || lead?.name || '');
    setFormClientName(neg.clientName || lead?.companyName || '');
    setFormContactEmail(lead?.email || '');
    setFormContactPhone(lead?.phone || '');
    setFormLeadId(neg.leadId || '');
    setFormContactId(neg.contactId || '');

    if (neg.leadId) {
      setLeadOrContactKey(`lead:${neg.leadId}`);
    } else if (neg.contactId) {
      setLeadOrContactKey(`contact:${neg.contactId}`);
    } else {
      setLeadOrContactKey(`custom:${neg.leadName}`);
    }

    setFormQuotationId(neg.quotationId || '');
    setFormQuotationNumber(neg.quotationNumber || '');
    setFormProposalNumber(neg.proposalNumber || '');
    setQuotationOrProposal(neg.quotationNumber || neg.proposalNumber || '');

    setFormAssignedTo(neg.assignedTo || '');
    setFormAssignedToName(neg.assignedToName || '');
    setAssignedEmployeeKey(neg.assignedTo ? `emp:${neg.assignedTo}` : `custom:${neg.assignedToName}`);

    setFormNegotiationDate(neg.negotiationDate || new Date().toISOString().split('T')[0]);
    setFormValidUntil(neg.nextFollowUpDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setFormStatus(neg.status || 'In Progress');

    setFormQuotedAmount(Number(neg.quotedAmount) || 85000);
    setFormExpectedFinalAmount(Number(neg.expectedFinalAmount) || Number(neg.quotedAmount) || 85000);
    setFormDiscountPercentage(Number(neg.discountPercentage) || 0);
    setFormPaymentTerms(neg.paymentTerms || 'Milestone Based');
    setFormScopeChanges(neg.scopeChanges || '');
    setFormDeliveryTimeline(neg.deliveryTimeline || '45 Days');

    setFormClientRequirements(neg.clientRequirements || '');
    setFormNotes(neg.notes || '');
    setFormNextFollowUpDate(neg.nextFollowUpDate || '');
    setFormLossReason(neg.lossReason || '');
    setDocumentFileName('');
    setDocumentFileUrl('');
    setDocumentFileSize('');
    setErrors({});
    setModalOpen(true);
  };

  // Lead / Contact selector in modal
  const handleLeadSelect = (val: string | null) => {
    if (!val) {
      setLeadOrContactKey('');
      setFormLeadName('');
      setFormClientName('');
      setFormLeadId('');
      setFormContactId('');
      return;
    }
    setLeadOrContactKey(val);
    if (val.startsWith('lead:')) {
      const id = val.replace('lead:', '');
      const found = leads.find((l) => l.id === id);
      if (found) {
        setFormLeadId(found.id);
        setFormContactId('');
        setFormLeadName(found.name);
        setFormClientName(found.companyName || found.name);
      }
    } else if (val.startsWith('contact:')) {
      const id = val.replace('contact:', '');
      const found = contacts.find((c) => c.id === id);
      if (found) {
        setFormContactId(found.id);
        setFormLeadId('');
        setFormLeadName(found.name);
        setFormClientName(found.companyName || found.name);
      }
    } else {
      setFormLeadName(val);
      setFormClientName(val);
      setFormLeadId('');
      setFormContactId('');
    }
    if (errors.leadName) setErrors((prev) => ({ ...prev, leadName: '' }));
  };

  // Employee selector
  const handleEmployeeSelect = (val: string | null) => {
    if (!val) {
      setAssignedEmployeeKey('');
      setFormAssignedTo('');
      setFormAssignedToName('');
      return;
    }
    setAssignedEmployeeKey(val);
    if (val.startsWith('emp:')) {
      const id = val.replace('emp:', '');
      const found = employees.find((e) => e.id === id);
      if (found) {
        setFormAssignedTo(found.id);
        setFormAssignedToName(found.name);
      }
    } else {
      setFormAssignedTo('');
      setFormAssignedToName(val);
    }
    if (errors.assignedToName) setErrors((prev) => ({ ...prev, assignedToName: '' }));
  };

  // Quotation selector
  const handleQuotationSelect = (val: string | null) => {
    if (!val) {
      setQuotationOrProposal('');
      setFormQuotationId('');
      setFormQuotationNumber('');
      return;
    }
    setQuotationOrProposal(val);
    const matched = quotations.find((q) => q.quotationNumber === val || q.id === val);
    if (matched) {
      setFormQuotationId(matched.id);
      setFormQuotationNumber(matched.quotationNumber);
      const qVal = Number(matched.grandTotal || matched.subtotal || 0);
      setFormQuotedAmount(qVal || 0);
      setFormExpectedFinalAmount(qVal || 0);
      setFormDiscountPercentage(Number(matched.discountValue || 0));
      if (matched.paymentTerms) setFormPaymentTerms(matched.paymentTerms);
    } else {
      if (val.toUpperCase().startsWith('PROP')) {
        setFormProposalNumber(val);
        setFormQuotationNumber('');
      } else {
        setFormQuotationNumber(val);
      }
    }
  };

  // Discount % change -> auto updates Expected Final Amount
  const handleDiscountChange = (val: number | string) => {
    const pct = Math.max(0, Math.min(100, Number(val) || 0));
    setFormDiscountPercentage(pct);
    if (formQuotedAmount > 0) {
      const discountAmt = (formQuotedAmount * pct) / 100;
      setFormExpectedFinalAmount(Math.round(Math.max(0, formQuotedAmount - discountAmt)));
    }
  };

  // Expected Final Amount change -> auto updates Discount %
  const handleExpectedFinalAmountChange = (val: number | string) => {
    const finalAmt = Math.max(0, Number(val) || 0);
    setFormExpectedFinalAmount(finalAmt);
    if (formQuotedAmount > 0 && finalAmt <= formQuotedAmount) {
      const discountAmt = formQuotedAmount - finalAmt;
      const pct = Math.round((discountAmt / formQuotedAmount) * 100);
      setFormDiscountPercentage(Math.max(0, Math.min(100, pct)));
    } else if (finalAmt > formQuotedAmount) {
      setFormDiscountPercentage(0);
    }
  };

  // Quoted Amount change
  const handleQuotedAmountChange = (val: number | string) => {
    const quoted = Math.max(0, Number(val) || 0);
    setFormQuotedAmount(quoted);
    if (formDiscountPercentage > 0) {
      const discountAmt = (quoted * formDiscountPercentage) / 100;
      setFormExpectedFinalAmount(Math.round(Math.max(0, quoted - discountAmt)));
    } else if (formExpectedFinalAmount === 0 || formExpectedFinalAmount > quoted) {
      setFormExpectedFinalAmount(quoted);
    }
  };

  // Status Change with Conditional Follow-up handling
  const handleStatusChange = (newStatus: string | null) => {
    const st = (newStatus as NegotiationStatus) || 'In Progress';
    setFormStatus(st);
    if (st !== 'Awaiting Client') {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.nextFollowUpDate;
        return next;
      });
      // NOTE: We do NOT clear formNextFollowUpDate, preserving any previously saved follow-up date
    }
    if (st !== 'Lost') {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.lossReason;
        return next;
      });
    }
  };

  // Submit Modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!formLeadName.trim()) newErrors.leadName = 'Lead / Client Name is required';
    if (!formAssignedToName.trim()) newErrors.assignedToName = 'Assigned Employee is required';
    if (!formNegotiationDate) newErrors.negotiationDate = 'Negotiation Date is required';

    // CONDITIONAL VALIDATION: Required ONLY when status is "Awaiting Client"
    if (formStatus === 'Awaiting Client') {
      if (!formNextFollowUpDate || !formNextFollowUpDate.trim()) {
        newErrors.nextFollowUpDate = 'Next Follow-up Date is required when status is Awaiting Client';
      }
    }

    // CONDITIONAL VALIDATION: Required ONLY when status is "Lost"
    if (formStatus === 'Lost') {
      if (!formLossReason || !formLossReason.trim()) {
        newErrors.lossReason = 'Reason for Lost Deal is required when status is Lost';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      notifications.show({
        title: 'Validation Error',
        message: 'Please resolve the highlighted fields before saving.',
        color: 'red',
      });
      return;
    }

    const payload: Partial<NegotiationFormData> = {
      negotiationId: formNegotiationId.trim() || undefined,
      leadId: formLeadId || lead?.id || undefined,
      leadName: formLeadName.trim(),
      clientName: formClientName.trim() || formLeadName.trim(),
      contactId: formContactId || undefined,
      quotationId: formQuotationId || undefined,
      quotationNumber: formQuotationNumber.trim() || undefined,
      proposalNumber: formProposalNumber.trim() || undefined,
      assignedTo: formAssignedTo || undefined,
      assignedToName: formAssignedToName.trim() || 'Admin Employee',
      negotiationDate: formNegotiationDate,
      status: formStatus,
      quotedAmount: formQuotedAmount,
      expectedFinalAmount: formExpectedFinalAmount,
      discountPercentage: formDiscountPercentage,
      paymentTerms: formPaymentTerms,
      scopeChanges: formScopeChanges.trim() || undefined,
      deliveryTimeline: formDeliveryTimeline.trim() || undefined,
      clientRequirements: formClientRequirements.trim() || undefined,
      notes: formNotes.trim() || undefined,
      nextFollowUpDate: formNextFollowUpDate ? formNextFollowUpDate.trim() : undefined,
      lossReason: formStatus === 'Lost' ? formLossReason.trim() : undefined,
    };

    setSubmitting(true);
    try {
      if (editingNegotiation) {
        await leadService.updateNegotiation(editingNegotiation.id, payload);
        notifications.show({
          title: 'Negotiation Updated',
          message: `Negotiation ${editingNegotiation.negotiationId} updated successfully.`,
          color: 'blue',
        });
      } else {
        const created = await leadService.createNegotiation(payload);
        notifications.show({
          title: 'Negotiation Created',
          message: `New negotiation ${created.negotiationId} created successfully.`,
          color: 'teal',
        });
      }

      // Sync with parent lead deal state if callback provided
      if (onUpdateNegotiation && legacyNegotiation) {
        onUpdateNegotiation({
          ...legacyNegotiation,
          currentAgreedAmount: formExpectedFinalAmount,
          discountPercentage: formDiscountPercentage,
          status: formStatus === 'Won' ? 'Terms Agreed' : 'In Discussion',
        });
      }

      setModalOpen(false);
      setEditingNegotiation(null);
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Save Failed',
        message: err.message || 'Could not save negotiation record.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await leadService.deleteNegotiation(deleteTarget.id);
      notifications.show({
        title: 'Negotiation Deleted',
        message: `Negotiation ${deleteTarget.negotiationId} has been removed.`,
        color: 'blue',
      });
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Delete Failed',
        message: err.message || 'Could not delete negotiation record.',
        color: 'red',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Quick Mark Won
  const handleQuickMarkWon = async (neg: Negotiation) => {
    try {
      await leadService.updateNegotiation(neg.id, {
        status: 'Won',
        notes: `Quick-marked as Won from Negotiation list view.`,
      });
      notifications.show({
        title: 'Negotiation Won! 🎉',
        message: `${neg.negotiationId} commercial terms accepted. Ready for Contract.`,
        color: 'teal',
      });
      if (onUpdateNegotiation && legacyNegotiation) {
        onUpdateNegotiation({
          ...legacyNegotiation,
          status: 'Terms Agreed',
        });
      }
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update status.',
        color: 'red',
      });
    }
  };

  const handleDownloadSummary = (neg: Negotiation) => {
    notifications.show({
      title: 'Commercial Terms Export',
      message: `Exporting executed negotiation terms summary for ${neg.negotiationId}...`,
      color: 'blue',
    });
  };

  const handleDetailsStatusChange = async (newStatus: string) => {
    if (!detailsNegotiation || detailsNegotiation.status === newStatus) return;
    try {
      await leadService.updateNegotiation(detailsNegotiation.id, {
        status: newStatus as NegotiationStatus,
      });
      setDetailsNegotiation((prev) => (prev ? { ...prev, status: newStatus as NegotiationStatus } : null));
      notifications.show({
        title: 'Status Updated',
        message: `Negotiation status changed to ${newStatus}.`,
        color: 'blue',
      });
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update status.',
        color: 'red',
      });
    }
  };

  // Render Status Badge matching Proposal section design
  const renderStatusBadge = (statusVal?: string | null) => {
    const st = (statusVal || 'In Progress').trim();
    const sLow = st.toLowerCase();
    let bg = isDark ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (sLow === 'won' || sLow === 'accepted') {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#F0FDF4';
      color = isDark ? '#6EE7B7' : '#16A34A';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#BBF7D0';
    } else if (sLow === 'lost') {
      bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#DC2626';
      border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
    } else if (sLow === 'awaiting client') {
      bg = isDark ? 'rgba(245, 158, 11, 0.16)' : '#FFFBEB';
      color = isDark ? '#FCD34D' : '#D97706';
      border = isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A';
    } else if (sLow === 'revised quotation') {
      bg = isDark ? 'rgba(139, 92, 246, 0.16)' : '#F5F3FF';
      color = isDark ? '#C4B5FD' : '#7C3AED';
      border = isDark ? 'rgba(139, 92, 246, 0.35)' : '#DDD6FE';
    } else if (sLow === 'draft') {
      bg = isDark ? 'rgba(148, 163, 184, 0.16)' : '#F8FAFC';
      color = isDark ? '#94A3B8' : '#64748B';
      border = isDark ? 'rgba(148, 163, 184, 0.3)' : '#E2E8F0';
    }

    return (
      <Badge
        size="sm"
        radius="sm"
        style={{
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          fontWeight: 700,
          textTransform: 'capitalize',
          fontSize: '11px',
          padding: '2px 8px',
        }}
      >
        {st}
      </Badge>
    );
  };

  const formatDisplayDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    try {
      const parts = dateString.split('T')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  // Build Lead / Contact select options
  const leadOptions: ComboboxItem[] = useMemo(() => {
    const list: ComboboxItem[] = [];
    if (lead && !leads.some((l) => l.id === lead.id)) {
      list.push({
        value: `lead:${lead.id}`,
        label: `${lead.name} (${lead.companyName ? `${lead.companyName} • ` : ''}Current Lead)`,
      });
    }
    leads.forEach((l) => {
      list.push({
        value: `lead:${l.id}`,
        label: `${l.name} (${l.companyName ? `${l.companyName} • ` : ''}Lead)`,
      });
    });
    contacts.forEach((c) => {
      list.push({
        value: `contact:${c.id}`,
        label: `${c.name} (${c.companyName ? `${c.companyName} • ` : ''}Contact)`,
      });
    });
    return list;
  }, [leads, contacts, lead]);

  const employeeOptions: ComboboxItem[] = useMemo(() => {
    return employees.map((e) => ({
      value: `emp:${e.id}`,
      label: `${e.name} (${e.designation || e.role || 'Staff'})`,
    }));
  }, [employees]);

  const quotationOptions: ComboboxItem[] = useMemo(() => {
    return quotations.map((q) => ({
      value: q.quotationNumber,
      label: `${q.quotationNumber} — ${q.contactName || 'Client'} (₹${Number(q.grandTotal || 0).toLocaleString('en-IN')})`,
    }));
  }, [quotations]);

  const paymentTermsOptions = [
    { value: 'Milestone Based', label: 'Milestone Based' },
    { value: 'Full Payment', label: 'Full Payment' },
    { value: 'Partial Payment', label: 'Partial Payment' },
    { value: 'Advance Payment', label: 'Advance Payment' },
    { value: '50% Advance + 50% Completion', label: '50% Advance + 50% Completion' },
    { value: '30% Advance + 70% Delivery', label: '30% Advance + 70% Delivery' },
    { value: 'Net 30 Days', label: 'Net 30 Days' },
    { value: 'Net 60 Days', label: 'Net 60 Days' },
  ];

  const paymentTermList = useMemo(() => {
    const base = [...paymentTermsOptions];
    if (formPaymentTerms && !base.some((b) => b.value === formPaymentTerms)) {
      return [{ value: formPaymentTerms, label: formPaymentTerms }, ...base];
    }
    return base;
  }, [formPaymentTerms]);

  const negotiationStatusOptions = useMemo(() => {
    const list = [
      { value: 'In Progress', label: 'In Progress' },
      { value: 'Awaiting Client', label: 'Awaiting Client' },
      { value: 'Revised Quotation', label: 'Revised Quotation' },
      { value: 'Won', label: 'Won' },
      { value: 'Lost', label: 'Lost' },
    ];
    if (formStatus === 'Draft') {
      list.unshift({ value: 'Draft', label: 'Draft' });
    }
    return list;
  }, [formStatus]);

  const statusDropdownOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Awaiting Client', label: 'Awaiting Client' },
    { value: 'Revised Quotation', label: 'Revised Quotation' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' },
  ];

  return (
    <Box>
      {/* Top Section Summary & Actions matching Proposal design */}
      <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">
        <div>
          <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
            Negotiation
          </Text>
          <Text size="xs" c="dimmed">
            Manage commercial negotiations, pricing terms, and scope revisions with {lead ? lead.name : 'the client'}.
          </Text>
        </div>

        <Group gap="sm">
          {canCreate && (
            <Button
              size="sm"
              leftSection={<IconPlus size={14} />}
              onClick={handleOpenCreateModal}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                color: '#FFF',
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              Create Negotiation
            </Button>
          )}

          {onNavigateSection && (
            <Button
              size="sm"
              variant="light"
              color="blue"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => onNavigateSection('contracts')}
              style={{ borderRadius: 10, fontWeight: 700 }}
            >
              Proceed to Contracts
            </Button>
          )}
        </Group>
      </Group>

      {/* Main Table Content matching Proposals Table Design */}
      {loading ? (
        <Center py={60}>
          <Stack align="center" gap="sm">
            <Loader size="lg" color="blue" />
            <Text size="sm" c="dimmed">Loading negotiation records...</Text>
          </Stack>
        </Center>
      ) : filteredNegotiations.length === 0 ? (
        <Paper
          radius="lg"
          p="3rem"
          style={{
            background: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          <ThemeIcon size={56} radius="xl" color="indigo" variant="light" mb="md" style={{ margin: '0 auto' }}>
            <IconScale size={28} />
          </ThemeIcon>
          <Text fw={700} size="16px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
            No Negotiations Found
          </Text>
          <Text size="sm" c="dimmed" mt={4} mb="lg">
            No commercial negotiations have been created for {lead ? lead.name : 'this deal'} yet.
          </Text>
          {canCreate && (
            <Button
              size="sm"
              leftSection={<IconPlus size={15} />}
              onClick={handleOpenCreateModal}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                color: '#FFF',
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              Create First Negotiation
            </Button>
          )}
        </Paper>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <Paper
            visibleFrom="sm"
            radius="lg"
            style={{
              background: isDark ? '#111827' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
              marginTop: 16,
            }}
          >
            <Table.ScrollContainer minWidth={950}>
              <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
                <Table.Thead
                  style={{
                    background: isDark ? '#0F172A' : '#FBFBFC',
                    borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
                  }}
                >
                  <Table.Tr>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                      LEAD NAME
                    </Table.Th>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                      NEGOTIATION DATE
                    </Table.Th>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                      NEXT FOLLOW-UP DATE
                    </Table.Th>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                      COMMERCIAL DETAILS
                    </Table.Th>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                      STATUS
                    </Table.Th>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                      ACTIONS
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedNegotiations.map((item) => (
                    <Table.Tr
                      key={item.id}
                      style={{
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                      }}
                    >
                      {/* 1. LEAD NAME */}
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Box
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: isDark ? 'rgba(79, 70, 229, 0.18)' : '#EEF2FF',
                              color: isDark ? '#A5B4FC' : '#4F46E5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 14,
                              flexShrink: 0,
                              border: isDark ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid #E0E7FF',
                            }}
                          >
                            <IconScale size={19} stroke={1.8} />
                          </Box>
                          <Text
                            size="sm"
                            fw={700}
                            style={{
                              color: isDark ? '#F8FAFC' : '#0F172A',
                              cursor: 'pointer',
                            }}
                            onClick={() => setDetailsNegotiation(item)}
                          >
                            {item.leadName || item.clientName || 'Client Deal'}
                          </Text>
                        </Group>
                      </Table.Td>

                      {/* 2. NEGOTIATION DATE */}
                      <Table.Td>
                        <Group gap={6} align="center">
                          <IconCalendar size={13} style={{ color: isDark ? '#94A3B8' : '#64748B' }} />
                          <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                            {formatDisplayDate(item.negotiationDate)}
                          </Text>
                        </Group>
                      </Table.Td>

                      {/* 3. NEXT FOLLOW-UP DATE (Conditional on Awaiting Client) */}
                      <Table.Td>
                        {item.status === 'Awaiting Client' ? (
                          item.nextFollowUpDate ? (
                            <Badge size="sm" variant="light" color="orange" radius="sm">
                              🕒 {formatDisplayDate(item.nextFollowUpDate)}
                            </Badge>
                          ) : (
                            <Badge size="sm" variant="light" color="gray" radius="sm">
                              Pending Date
                            </Badge>
                          )
                        ) : (
                          <Text size="xs" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>

                      {/* 4. COMMERCIAL DETAILS */}
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm" fw={800} style={{ color: isDark ? '#38BDF8' : '#2563EB' }}>
                            ₹{Number(item.expectedFinalAmount || item.quotedAmount || 0).toLocaleString('en-IN')}
                          </Text>
                          <Text size="11px" c="dimmed">
                            Quoted: ₹{Number(item.quotedAmount || 0).toLocaleString('en-IN')}
                            {Number(item.discountPercentage || 0) > 0 ? ` (${item.discountPercentage}% off)` : ''}
                            {item.paymentTerms ? ` • ${item.paymentTerms}` : ''}
                          </Text>
                        </Stack>
                      </Table.Td>

                      {/* 5. STATUS */}
                      <Table.Td>
                        {renderStatusBadge(item.status)}
                      </Table.Td>

                      {/* 6. ACTIONS */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group justify="flex-end" gap={6} wrap="nowrap">
                          <Tooltip label="View Details" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              size="md"
                              radius="md"
                              onClick={() => setDetailsNegotiation(item)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Create Revised Quotation" withArrow>
                            <ActionIcon
                              variant="light"
                              color="indigo"
                              size="md"
                              radius="md"
                              onClick={() => handleCreateRevisionFromNegotiation(item)}
                            >
                              <IconPlus size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Download Terms" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="indigo"
                              size="md"
                              radius="md"
                              onClick={() => handleDownloadSummary(item)}
                            >
                              <IconDownload size={16} />
                            </ActionIcon>
                          </Tooltip>

                          {item.status !== 'Won' && (
                            <Tooltip label="Mark Accepted" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="teal"
                                size="md"
                                radius="md"
                                onClick={() => handleQuickMarkWon(item)}
                              >
                                <IconCheck size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}

                          {canEdit && (
                            <Tooltip label="Edit Negotiation" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                size="md"
                                radius="md"
                                onClick={() => handleOpenEditModal(item)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}

                          {canDelete && (
                            <Tooltip label="Delete Negotiation" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="md"
                                radius="md"
                                onClick={() => setDeleteTarget(item)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>

          {/* MOBILE CARDS VIEW */}
          <Stack gap="md" hiddenFrom="sm" mt="md">
            {paginatedNegotiations.map((item) => (
              <Paper
                key={item.id}
                p="md"
                radius="lg"
                style={{
                  background: isDark ? '#111827' : '#FFFFFF',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                  boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
                }}
              >
                <Group justify="space-between" align="flex-start" mb="xs">
                  <div>
                    <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      {item.leadName || item.clientName || 'Client Deal'}
                    </Text>
                    {item.quotationNumber ? (
                      <Group gap={6} mt={2}>
                        <Badge size="xs" variant="light" color="indigo" radius="sm">
                          📄 {item.quotationNumber}
                        </Badge>
                      </Group>
                    ) : item.proposalNumber ? (
                      <Group gap={6} mt={2}>
                        <Badge size="xs" variant="light" color="indigo" radius="sm">
                          📄 {item.proposalNumber}
                        </Badge>
                      </Group>
                    ) : null}
                  </div>
                  {renderStatusBadge(item.status)}
                </Group>

                <SimpleGrid cols={2} spacing="xs" my="xs">
                  <div>
                    <Text size="11px" c="dimmed">
                      Negotiation Date
                    </Text>
                    <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                      {formatDisplayDate(item.negotiationDate)}
                    </Text>
                  </div>
                  <div>
                    <Text size="11px" c="dimmed">
                      Next Follow-up Date
                    </Text>
                    {item.status === 'Awaiting Client' ? (
                      <Badge size="xs" variant="light" color="orange">
                        🕒 {formatDisplayDate(item.nextFollowUpDate)}
                      </Badge>
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </div>
                  <div>
                    <Text size="11px" c="dimmed">
                      Expected Final Amount
                    </Text>
                    <Text size="xs" fw={800} style={{ color: isDark ? '#38BDF8' : '#2563EB' }}>
                      ₹{Number(item.expectedFinalAmount || item.quotedAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </div>
                  <div>
                    <Text size="11px" c="dimmed">
                      Quoted / Terms
                    </Text>
                    <Text size="xs" c="dimmed">
                      ₹{Number(item.quotedAmount || 0).toLocaleString('en-IN')} • {item.paymentTerms || 'Milestone Based'}
                    </Text>
                  </div>
                </SimpleGrid>

                <Divider my="xs" />

                <Group justify="flex-end" gap={6}>
                  <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => setDetailsNegotiation(item)}>
                    <IconEye size={15} />
                  </ActionIcon>
                  {canEdit && (
                    <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => handleOpenEditModal(item)}>
                      <IconEdit size={15} />
                    </ActionIcon>
                  )}
                  {canDelete && (
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => setDeleteTarget(item)}>
                      <IconTrash size={15} />
                    </ActionIcon>
                  )}
                </Group>
              </Paper>
            ))}
          </Stack>

          {filteredNegotiations.length > pageSize && (
            <Group justify="space-between" align="center" mt="lg">
              <Text size="xs" c="dimmed">
                Showing {Math.min((page - 1) * pageSize + 1, filteredNegotiations.length)} to{' '}
                {Math.min(page * pageSize, filteredNegotiations.length)} of {filteredNegotiations.length} records
              </Text>
              <Pagination
                total={totalPages}
                value={page}
                onChange={setPage}
                color="blue"
                radius="md"
                size="sm"
              />
            </Group>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. CREATE / EDIT MODAL                                                    */}
      {/* ========================      {/* ========================================================================= */}
      {/* 4. CREATE / EDIT MODAL (MATCHING PROPOSAL MODAL DESIGN)                  */}
      {/* ========================================================================= */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          if (!submitting) {
            setModalOpen(false);
            setEditingNegotiation(null);
          }
        }}
        size="880px"
        radius="lg"
        centered
        withCloseButton={false}
        styles={{
          content: {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
          },
          body: {
            padding: '26px 30px',
            maxHeight: 'calc(92vh - 20px)',
            overflowY: 'auto',
          },
        }}
        closeOnClickOutside={!submitting}
      >
        {/* Header matching Create Proposal Modal */}
        <Group justify="space-between" align="flex-start" mb="lg">
          <Group gap="sm" align="center">
            <Box
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#60A5FA' : '#2563EB',
              }}
            >
              <IconFileDescription size={22} stroke={1.8} />
            </Box>
            <div>
              <Text fw={800} size="19px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
                {editingNegotiation ? 'Edit Negotiation' : 'Create Negotiation'}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Enter negotiation details
              </Text>
            </div>
          </Group>

          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            radius="100px"
            onClick={() => {
              setModalOpen(false);
              setEditingNegotiation(null);
            }}
          >
            <IconX size={18} />
          </ActionIcon>
        </Group>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack gap="md">
            {/* ================================================================= */}
            {/* SECTION 1: BASIC DETAILS                                          */}
            {/* ================================================================= */}
            <Box>
              <Group gap="xs" mb="xs">
                <ThemeIcon size="xs" radius="xl" color="blue" variant="light">
                  <IconFileDescription size={12} />
                </ThemeIcon>
                <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.05em', color: isDark ? '#93C5FD' : '#2563EB' }}>
                  1. Basic Details
                </Text>
              </Group>
              <Divider mb="sm" color={isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'} />

              <Stack gap="sm">
                {/* Row 1: Negotiation ID & Lead / Client Name */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    label="Negotiation ID"
                    placeholder="Auto-generated ID"
                    value={formNegotiationId}
                    readOnly
                    disabled
                    radius="md"
                  />
                  <Select
                    label="Lead / Client Name"
                    withAsterisk
                    placeholder="Select lead or client"
                    data={leadOptions}
                    searchable
                    value={leadOrContactKey}
                    onChange={handleLeadSelect}
                    error={errors.leadName}
                    radius="md"
                    required
                  />
                </SimpleGrid>

                {/* Row 2: Quotation / Proposal & Assigned Employee */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Select
                    label="Quotation / Proposal"
                    placeholder="Link quotation or proposal (optional)"
                    data={quotationOptions}
                    searchable
                    clearable
                    value={quotationOrProposal}
                    onChange={handleQuotationSelect}
                    radius="md"
                  />
                  <Select
                    label="Assigned Employee"
                    withAsterisk
                    placeholder="Select assigned employee"
                    data={employeeOptions}
                    searchable
                    value={assignedEmployeeKey || null}
                    onChange={handleEmployeeSelect}
                    error={errors.assignedToName}
                    radius="md"
                    required
                  />
                </SimpleGrid>

                {/* Row 3: Negotiation Date & Status */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <MeetingDatePicker
                    label="Negotiation Date"
                    placeholder="dd-mm-yyyy"
                    value={formNegotiationDate}
                    onChange={(val) => {
                      setFormNegotiationDate(val);
                      if (errors.negotiationDate) setErrors((prev) => ({ ...prev, negotiationDate: '' }));
                    }}
                    error={errors.negotiationDate}
                    required
                    zIndex={3000}
                  />
                  <Select
                    label="Status"
                    withAsterisk
                    data={negotiationStatusOptions}
                    value={formStatus}
                    onChange={handleStatusChange}
                    allowDeselect={false}
                    required
                    radius="md"
                  />
                </SimpleGrid>
              </Stack>
            </Box>

            {/* ================================================================= */}
            {/* SECTION 2: COMMERCIAL DETAILS                                     */}
            {/* ================================================================= */}
            <Box mt="xs">
              <Group gap="xs" mb="xs">
                <ThemeIcon size="xs" radius="xl" color="teal" variant="light">
                  <IconCurrencyRupee size={12} />
                </ThemeIcon>
                <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.05em', color: isDark ? '#6EE7B7' : '#059669' }}>
                  2. Commercial Details
                </Text>
              </Group>
              <Divider mb="sm" color={isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'} />

              <Stack gap="sm">
                {/* Row 1: Quoted Amount, Discount (%), Expected Final Amount */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <NumberInput
                    label="Quoted Amount"
                    withAsterisk
                    placeholder="e.g. 85,000"
                    value={formQuotedAmount === 0 ? '' : formQuotedAmount}
                    onChange={handleQuotedAmountChange}
                    min={0}
                    thousandSeparator=","
                    prefix="₹ "
                    radius="md"
                    required
                  />
                  <NumberInput
                    label="Discount (%)"
                    placeholder="e.g. 10%"
                    value={formDiscountPercentage === 0 ? '' : formDiscountPercentage}
                    onChange={handleDiscountChange}
                    min={0}
                    max={100}
                    suffix="%"
                    radius="md"
                  />
                  <NumberInput
                    label="Expected Final Amount"
                    placeholder="e.g. 76,500"
                    value={formExpectedFinalAmount === 0 ? '' : formExpectedFinalAmount}
                    onChange={handleExpectedFinalAmountChange}
                    min={0}
                    thousandSeparator=","
                    prefix="₹ "
                    radius="md"
                  />
                </SimpleGrid>

                {/* Row 2: Payment Terms & Delivery Timeline */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Select
                    label="Payment Terms"
                    placeholder="Select payment terms"
                    data={paymentTermList}
                    value={formPaymentTerms || null}
                    onChange={(val) => setFormPaymentTerms(val || '')}
                    searchable
                    radius="md"
                  />
                  <TextInput
                    label="Delivery Timeline"
                    placeholder="e.g. 45 Days, 6 Weeks, 3 Months"
                    value={formDeliveryTimeline}
                    onChange={(e) => setFormDeliveryTimeline(e.currentTarget.value)}
                    radius="md"
                  />
                </SimpleGrid>

                {/* Row 3: Project Scope Changes */}
                <Textarea
                  label="Project Scope Changes"
                  placeholder="Describe any additions, removals, or modifications requested by the client..."
                  value={formScopeChanges}
                  onChange={(e) => setFormScopeChanges(e.currentTarget.value)}
                  minRows={2}
                  radius="md"
                />
              </Stack>
            </Box>

            {/* ================================================================= */}
            {/* SECTION 3: DISCUSSION DETAILS                                     */}
            {/* ================================================================= */}
            <Box mt="xs">
              <Group gap="xs" mb="xs">
                <ThemeIcon size="xs" radius="xl" color="violet" variant="light">
                  <IconMessageCircle size={12} />
                </ThemeIcon>
                <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.05em', color: isDark ? '#C4B5FD' : '#7C3AED' }}>
                  3. Discussion Details
                </Text>
              </Group>
              <Divider mb="sm" color={isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'} />

              <Stack gap="sm">
                <Textarea
                  label="Client Requirements / Objections"
                  placeholder="Record client concerns, requested changes, and objections..."
                  value={formClientRequirements}
                  onChange={(e) => setFormClientRequirements(e.currentTarget.value)}
                  minRows={2}
                  radius="md"
                />

                <Textarea
                  label="Negotiation Notes"
                  placeholder="Record discussion summaries, commitments, and decisions..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.currentTarget.value)}
                  minRows={2}
                  radius="md"
                />

                {/* CONDITIONAL FIELD: Next Follow-up Date (Required ONLY when status is Awaiting Client) */}
                {formStatus === 'Awaiting Client' && (
                  <MeetingDatePicker
                    label="Next Follow-up Date"
                    placeholder="dd-mm-yyyy"
                    value={formNextFollowUpDate}
                    onChange={(val) => {
                      setFormNextFollowUpDate(val);
                      if (errors.nextFollowUpDate) setErrors((prev) => ({ ...prev, nextFollowUpDate: '' }));
                    }}
                    error={errors.nextFollowUpDate}
                    required
                    zIndex={3000}
                  />
                )}

                {/* CONDITIONAL FIELD: Reason for Lost Deal (Required ONLY when status is Lost) */}
                {formStatus === 'Lost' && (
                  <TextInput
                    label="Reason for Lost Deal"
                    withAsterisk
                    placeholder="e.g. Budget constraints, opted for competitor, project postponed"
                    value={formLossReason}
                    onChange={(e) => {
                      setFormLossReason(e.currentTarget.value);
                      if (errors.lossReason) setErrors((prev) => ({ ...prev, lossReason: '' }));
                    }}
                    error={errors.lossReason}
                    required
                    radius="md"
                  />
                )}
              </Stack>
            </Box>

            {/* Action Buttons: Cancel & Create Negotiation */}
            <Group justify="flex-end" gap="sm" mt="lg" pb="xs">
              <Button
                variant="default"
                radius="md"
                onClick={() => {
                  setModalOpen(false);
                  setEditingNegotiation(null);
                }}
                disabled={submitting}
                style={{
                  fontWeight: 600,
                  minWidth: 90,
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                radius="md"
                loading={submitting}
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  minWidth: 140,
                }}
              >
                {editingNegotiation ? 'Update Negotiation' : 'Create Negotiation'}
              </Button>
            </Group>
          </Stack>
        </Box>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. DETAILS MODAL (MATCHING QUOTATION MODAL DESIGN & POPUP SIZE)           */}
      {/* ========================================================================= */}
      <Modal
        opened={Boolean(detailsNegotiation)}
        onClose={() => setDetailsNegotiation(null)}
        size="860px"
        padding="xl"
        radius="lg"
        centered
        withCloseButton={false}
        styles={{
          header: { display: 'none' },
          body: {
            padding: 0,
            maxHeight: 'calc(90vh - 20px)',
            overflowY: 'auto',
          },
          content: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            borderRadius: '16px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {detailsNegotiation && (
          <Box p={{ base: 'md', sm: 'xl' }} pb={{ base: 'xl', sm: '2xl' }}>
            {/* Modal Top Header */}
            <Group justify="space-between" align="center" mb="lg">
              <Group gap="sm">
                <Box
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                  }}
                >
                  <IconScale size={24} />
                </Box>
                <div>
                  <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
                    Negotiation Details
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    Negotiation Ref: <span style={{ fontWeight: 700, color: '#3B82F6' }}>{detailsNegotiation.negotiationId}</span>
                  </Text>
                </div>
              </Group>

              {/* Status Selector */}
              <Group gap="xs">
                <Select
                  size="xs"
                  data={['Draft', 'In Progress', 'Awaiting Client', 'Revised Quotation', 'Won', 'Lost']}
                  value={detailsNegotiation.status || 'In Progress'}
                  onChange={(val) => val && handleDetailsStatusChange(val)}
                  style={{ width: 150 }}
                  styles={{
                    input: {
                      fontWeight: 700,
                      borderRadius: 8,
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    },
                  }}
                />
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  radius="md"
                  onClick={() => setDetailsNegotiation(null)}
                >
                  <IconCheck size={18} />
                </ActionIcon>
              </Group>
            </Group>

            <Divider mb="lg" color={isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'} />

            {/* Read-only Information Grid */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="lg">
              <TextInput
                label="Negotiation ID"
                value={detailsNegotiation.negotiationId}
                readOnly
                leftSection={<IconFileText size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Lead / Client Name"
                value={detailsNegotiation.leadName || detailsNegotiation.clientName || 'N/A'}
                readOnly
                leftSection={<IconUser size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Quotation / Proposal"
                value={detailsNegotiation.quotationNumber || detailsNegotiation.proposalNumber || 'None Linked'}
                readOnly
                leftSection={<IconFileDescription size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Assigned Employee"
                value={detailsNegotiation.assignedToName || 'Unassigned'}
                readOnly
                leftSection={<IconUserCheck size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Negotiation Date"
                value={formatDisplayDate(detailsNegotiation.negotiationDate)}
                readOnly
                leftSection={<IconCalendar size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Payment Terms"
                value={detailsNegotiation.paymentTerms || 'Milestone Based'}
                readOnly
                leftSection={<IconClock size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Delivery Timeline"
                value={detailsNegotiation.deliveryTimeline || 'N/A'}
                readOnly
                leftSection={<IconTruckDelivery size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              {detailsNegotiation.nextFollowUpDate && (
                <TextInput
                  label="Next Follow-up Date"
                  value={formatDisplayDate(detailsNegotiation.nextFollowUpDate)}
                  readOnly
                  leftSection={<IconCalendarEvent size={16} color="#EAB308" />}
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      color: isDark ? '#FCD34D' : '#B45309',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      fontWeight: 600,
                    },
                  }}
                />
              )}

              {detailsNegotiation.status === 'Lost' && detailsNegotiation.lossReason && (
                <TextInput
                  label="Reason for Lost Deal"
                  value={detailsNegotiation.lossReason}
                  readOnly
                  leftSection={<IconAlertCircle size={16} color="#EF4444" />}
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#FEF2F2',
                      color: isDark ? '#FCA5A5' : '#DC2626',
                      borderColor: isDark ? '#7F1D1D' : '#FECACA',
                      fontWeight: 600,
                    },
                  }}
                />
              )}
            </SimpleGrid>

            {/* Financial Summary Card */}
            <Paper
              p="md"
              radius="md"
              mb="lg"
              style={{
                background: isDark ? '#1E293B' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
              }}
            >
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <div>
                  <Text size="11px" c="dimmed" fw={600}>
                    Quoted Amount
                  </Text>
                  <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    {formatCurrency(detailsNegotiation.quotedAmount)}
                  </Text>
                </div>
                <div>
                  <Text size="11px" c="dimmed" fw={600}>
                    Discount (%)
                  </Text>
                  <Text size="sm" fw={700} style={{ color: '#E11D48' }}>
                    {detailsNegotiation.discountPercentage ? `${detailsNegotiation.discountPercentage}%` : '0%'}
                  </Text>
                </div>
                <div>
                  <Text size="11px" c="dimmed" fw={600}>
                    Expected Final Amount
                  </Text>
                  <Text size="md" fw={800} style={{ color: '#2563EB' }}>
                    {formatCurrency(detailsNegotiation.expectedFinalAmount)}
                  </Text>
                </div>
              </SimpleGrid>
            </Paper>

            {/* Scope Changes & Discussion Notes (if present) */}
            {(detailsNegotiation.scopeChanges || detailsNegotiation.clientRequirements || detailsNegotiation.notes) && (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="lg">
                {detailsNegotiation.scopeChanges && (
                  <Textarea
                    label="Project Scope Changes"
                    value={detailsNegotiation.scopeChanges}
                    readOnly
                    minRows={2}
                    styles={{
                      input: {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        fontWeight: 500,
                      },
                    }}
                  />
                )}
                {detailsNegotiation.clientRequirements && (
                  <Textarea
                    label="Client Requirements / Objections"
                    value={detailsNegotiation.clientRequirements}
                    readOnly
                    minRows={2}
                    styles={{
                      input: {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        fontWeight: 500,
                      },
                    }}
                  />
                )}
                {detailsNegotiation.notes && (
                  <Textarea
                    label="Negotiation Notes"
                    value={detailsNegotiation.notes}
                    readOnly
                    minRows={2}
                    styles={{
                      input: {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        fontWeight: 500,
                      },
                    }}
                  />
                )}
              </SimpleGrid>
            )}

            {/* History Timeline */}
            {detailsNegotiation.discussionHistory && detailsNegotiation.discussionHistory.length > 0 && (
              <Box mb="lg">
                <Text fw={700} size="sm" mb="xs" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  History Timeline ({detailsNegotiation.discussionHistory.length})
                </Text>
                <Paper
                  p="md"
                  radius="md"
                  style={{
                    background: isDark ? '#1E293B' : '#F8FAFC',
                    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
                  }}
                >
                  <Timeline active={detailsNegotiation.discussionHistory.length} bulletSize={18} lineWidth={2}>
                    {detailsNegotiation.discussionHistory.map((item, idx) => (
                      <Timeline.Item
                        key={item.id || idx}
                        bullet={<IconMessageCircle size={10} />}
                        title={<Text size="xs" fw={700}>{item.topic || 'Update'}</Text>}
                      >
                        <Text size="11px" c="dimmed">
                          {item.author} • {formatDisplayDate(item.date)}
                        </Text>
                        <Text size="xs" mt={2}>{item.notes}</Text>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </Paper>
              </Box>
            )}

            {/* Footer Buttons */}
            <Divider mb="lg" color={isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'} />
            <Group justify="space-between" align="center">
              <Button
                variant="default"
                onClick={() => setDetailsNegotiation(null)}
                style={{ borderRadius: 10, fontWeight: 600 }}
              >
                Close
              </Button>
              <Group gap="xs">
                {canDelete && (
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconTrash size={15} />}
                    onClick={() => {
                      const tgt = detailsNegotiation;
                      setDetailsNegotiation(null);
                      setDeleteTarget(tgt);
                    }}
                    style={{ borderRadius: 10, fontWeight: 600 }}
                  >
                    Delete
                  </Button>
                )}
                {canEdit && (
                  <Button
                    color="blue"
                    leftSection={<IconEdit size={15} />}
                    onClick={() => {
                      const tgt = detailsNegotiation;
                      setDetailsNegotiation(null);
                      handleOpenEditModal(tgt);
                    }}
                    style={{
                      borderRadius: 10,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                    }}
                  >
                    Edit Negotiation
                  </Button>
                )}
              </Group>
            </Group>
          </Box>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 6. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={18} color="#EF4444" />
            <Text fw={700}>Delete Negotiation</Text>
          </Group>
        }
        radius="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete negotiation record{' '}
            <b>{deleteTarget?.negotiationId}</b> ({deleteTarget?.leadName})?
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmDelete} loading={deleteLoading}>
              Delete Record
            </Button>
          </Group>
        </Stack>
      </Modal>
      {/* 7. REVISION QUOTATION MODAL */}
      <QuotationModal
        opened={revisionQuoteModalOpen}
        onClose={() => {
          setRevisionQuoteModalOpen(false);
          setRevisionBaseQuote(null);
          setActiveNegotiationForRevision(null);
        }}
        isRevision={true}
        baseQuotation={revisionBaseQuote}
        onSuccess={handleRevisionQuoteSaved}
        initialLead={lead}
        onNavigateSection={onNavigateSection}
      />
    </Box>
  );
};



// =========================================================================
// 3. LEAD CONTRACT SECTION
// =========================================================================

export { LeadContractSection } from './LeadContractSection';



// =========================================================================
// 4. LEAD INVOICE SECTION
// =========================================================================

export { LeadInvoiceSection } from './sections/LeadInvoiceSection';
export type { LeadInvoiceSectionProps } from './sections/LeadInvoiceSection';


// =========================================================================
// 5. LEAD PAYMENT SECTION (Dynamically synced to Billing & Invoices)
// =========================================================================

export { LeadPaymentSection } from './sections/LeadPaymentSection';
export type { LeadPaymentSectionProps } from './sections/LeadPaymentSection';


// =========================================================================
// 6. LEAD PROGRESS SECTION (Dynamically synced to Project Management)
// =========================================================================

export { LeadProgressSection } from './sections/LeadProgressSection';
export type { LeadProgressSectionProps } from './sections/LeadProgressSection';


// =========================================================================
// 7. LEAD HANDOVER SECTION (Delivery & Client Acceptance)
// =========================================================================

export { LeadHandoverSection, cleanWorkText, cleanComments } from './sections/LeadHandoverSection';
export type { LeadHandoverSectionProps } from './sections/LeadHandoverSection';

