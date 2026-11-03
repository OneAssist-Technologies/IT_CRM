import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Menu,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Divider,
  ActionIcon,
  Card,
  Table,
  Pagination,
  Tooltip,
  Center,
  Loader,
  SegmentedControl,
  Checkbox,
  Alert,
  ComboboxItem,
  ScrollArea,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconFileCheck,
  IconPlus,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconDownload,
  IconSend,
  IconBuilding,
  IconCalendar,
  IconClock,
  IconShieldCheck,
  IconAlertTriangle,
  IconUser,
  IconMail,
  IconSearch,
  IconEdit,
  IconTrash,
  IconEye,
  IconFileText,
  IconUpload,
  IconX,
  IconHistory,
  IconFileSpreadsheet,
  IconInfoCircle,
  IconBriefcase,
  IconRefresh,
  IconDevices,
  IconHeadset,
  IconLicense,
  IconFileDescription,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  Lead,
  Contract,
  ContractFormData,
  ContractStats,
  ContractType,
  ContractApprovalStatus,
  ContractSignatureStatus,
  ContractStatus,
  ContractPaymentMethod,
  ContractPaymentDueTerms,
  ContractProductItem,
  ContractDocumentRevision,
} from '../../../types/lead';
import { Quotation } from '../../../types/billing';
import { Negotiation } from '../../../types/lead';
import { leadService } from '../../../services/leadService';
import { billingService } from '../../../services/billingService';
import { useEmployee } from '../../../context/EmployeeContext';
import { useContact } from '../../../context/ContactContext';
import { useLead } from '../../../context/LeadContext';
import { usePermissions } from '../../../context/AccessControlContext';
import { useCRM } from '../../../context/CRMContext';
import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';
import {
  DateFilterControl,
  DateFilterValue,
  DEFAULT_DATE_FILTER,
  isDateMatchingFilter,
} from '../../../components/common/DateFilterControl';

export const CONTRACT_STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft', color: '#64748B' },
  { value: 'Pending Approval', label: 'Pending Approval', color: '#3B82F6' },
  { value: 'Approved', label: 'Approved', color: '#06B6D4' },
  { value: 'Pending Signature', label: 'Pending Signature', color: '#6366F1' },
  { value: 'Active', label: 'Active', color: '#10B981' },
  { value: 'Completed', label: 'Completed', color: '#059669' },
  { value: 'On Hold', label: 'On Hold', color: '#F59E0B' },
  { value: 'Terminated', label: 'Terminated', color: '#EF4444' },
];

type ActiveContractTabType =
  | 'ALL'
  | 'ACTIVE'
  | 'PENDING_APPROVAL'
  | 'PENDING_SIGNATURE'
  | 'SIGNED'
  | 'COMPLETED'
  | 'TERMINATED';

interface LeadContractSectionProps {
  lead?: Lead | null;
  isDark?: boolean;
  contract?: Contract | null;
  onUpdateContract?: (contract: Contract) => void;
  onNavigateSection?: (section: any) => void;
}

export const LeadContractSection: React.FC<LeadContractSectionProps> = ({
  lead,
  isDark: propIsDark,
  contract: legacyContract,
  onUpdateContract,
  onNavigateSection,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = propIsDark !== undefined ? propIsDark : computedColorScheme === 'dark';

  // Contexts
  const { employees } = useEmployee();
  const { contacts } = useContact();
  const { leads } = useLead();
  const { currentUser } = useCRM();
  const { can, isSuperAdmin } = usePermissions();

  const canCreate = isSuperAdmin || can('leads', 'create');
  const canEdit = isSuperAdmin || can('leads', 'edit');
  const canDelete = isSuperAdmin || can('leads', 'delete');
  const canApprove = isSuperAdmin || can('leads', 'approve') || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  // Contracts & Data State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);

  // Filter States
  const [activeTab, setActiveTab] = useState<ActiveContractTabType>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('All');
  const [approvalFilter, setApprovalFilter] = useState<string>('All');
  const [signatureFilter, setSignatureFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Modals
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [detailsContract, setDetailsContract] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Rejection Modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState<boolean>(false);
  const [rejectionTargetId, setRejectionTargetId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState<string>('');
  const [rejectionSubmitting, setRejectionSubmitting] = useState<boolean>(false);

  // Document Preview Modal
  const [previewDocModal, setPreviewDocModal] = useState<{ open: boolean; title: string; url: string; name: string }>({
    open: false,
    title: '',
    url: '',
    name: '',
  });

  // =========================================================================
  // FORM STATE - 5 SECTIONS
  // =========================================================================

  // SECTION 1: Contract Information
  const [formContractId, setFormContractId] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formContractType, setFormContractType] = useState<ContractType>('Software Development');
  const [formClientId, setFormClientId] = useState<string>('');
  const [formClientName, setFormClientName] = useState<string>('');
  const [formLeadId, setFormLeadId] = useState<string>('');
  const [formQuotationId, setFormQuotationId] = useState<string>('');
  const [formQuotationNumber, setFormQuotationNumber] = useState<string>('');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [formNegotiationId, setFormNegotiationId] = useState<string>('');
  const [formNegotiationNumber, setFormNegotiationNumber] = useState<string>('');
  const [assignedEmployeeKey, setAssignedEmployeeKey] = useState<string>('');
  const [formAssignedTo, setFormAssignedTo] = useState<string>('');
  const [formAssignedToName, setFormAssignedToName] = useState<string>('');
  const [formContractDate, setFormContractDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // SECTION 2: Project & Scope
  const [formProjectName, setFormProjectName] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formScopeOfWork, setFormScopeOfWork] = useState<string>('');
  const [formDeliverables, setFormDeliverables] = useState<string>('');
  const [formAcceptanceCriteria, setFormAcceptanceCriteria] = useState<string>('');

  // Type-Specific Fields
  // IT Product Sales
  const [formProductDetails, setFormProductDetails] = useState<ContractProductItem[]>([]);
  const [formDeliveryDetails, setFormDeliveryDetails] = useState<string>('');
  const [formWarrantyTerms, setFormWarrantyTerms] = useState<string>('');

  // AMC/Support
  const [formSupportPeriod, setFormSupportPeriod] = useState<string>('');
  const [formSlaTerms, setFormSlaTerms] = useState<string>('');
  const [formResponseTime, setFormResponseTime] = useState<string>('');

  // Subscription/License
  const [formLicenseQuantity, setFormLicenseQuantity] = useState<number>(1);
  const [formSubscriptionStartDate, setFormSubscriptionStartDate] = useState<string>('');
  const [formSubscriptionEndDate, setFormSubscriptionEndDate] = useState<string>('');
  const [formRenewalDetails, setFormRenewalDetails] = useState<string>('');

  // SECTION 3: Contract Value & Payment Terms
  const [formContractValue, setFormContractValue] = useState<number>(0);
  const [formCurrency, setFormCurrency] = useState<string>('INR');
  const [formDiscountAmount, setFormDiscountAmount] = useState<number>(0);
  const [formTaxAmount, setFormTaxAmount] = useState<number>(0);
  const [formTaxRate, setFormTaxRate] = useState<number>(18.0);
  const [formTaxIncluded, setFormTaxIncluded] = useState<boolean>(false);
  const [formPaymentMethod, setFormPaymentMethod] = useState<ContractPaymentMethod>('Full Payment');
  const [formPaymentDueTerms, setFormPaymentDueTerms] = useState<ContractPaymentDueTerms>('Net 30');
  const [formCustomPaymentDueTerms, setFormCustomPaymentDueTerms] = useState<string>('');
  const [formAdvancePaymentType, setFormAdvancePaymentType] = useState<'amount' | 'percentage'>('percentage');
  const [formAdvancePaymentValue, setFormAdvancePaymentValue] = useState<number>(0);
  const [formDiscountAppliedFromQuote, setFormDiscountAppliedFromQuote] = useState<boolean>(false);
  const [quotationMismatchConfirmed, setQuotationMismatchConfirmed] = useState<boolean>(false);

  // SECTION 4: Documents & Signatures
  const [formContractDocument, setFormContractDocument] = useState<string>('');
  const [formDocumentFileUrl, setFormDocumentFileUrl] = useState<string>('');
  const [formDocumentVersion, setFormDocumentVersion] = useState<string>('v1.0');
  const [formDocumentVersions, setFormDocumentVersions] = useState<ContractDocumentRevision[]>([]);
  const [formRevisionNotes, setFormRevisionNotes] = useState<string>('');
  const [formIsNewRevisionUpload, setFormIsNewRevisionUpload] = useState<boolean>(false);
  const [formAttachments, setFormAttachments] = useState<string[]>([]);
  const [formClientSignatoryName, setFormClientSignatoryName] = useState<string>('');
  const [formClientSignatoryEmail, setFormClientSignatoryEmail] = useState<string>('');
  const [formCompanySignatoryName, setFormCompanySignatoryName] = useState<string>('');
  const [formCompanySignatoryEmail, setFormCompanySignatoryEmail] = useState<string>('');
  const [formSignatureStatus, setFormSignatureStatus] = useState<ContractSignatureStatus>('Pending');
  const [formSignedDate, setFormSignedDate] = useState<string>('');

  // SECTION 5: Approval Workflow & Status
  const [formApprovalStatus, setFormApprovalStatus] = useState<ContractApprovalStatus>('Draft');
  const [formApprovedBy, setFormApprovedBy] = useState<string>('');
  const [formApprovalDate, setFormApprovalDate] = useState<string>('');
  const [formRejectionReason, setFormRejectionReason] = useState<string>('');
  const [formInternalNotes, setFormInternalNotes] = useState<string>('');
  const [formStatus, setFormStatus] = useState<ContractStatus>('Draft');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Generate Unique ID fallback for UI display before server confirmation
  const generateLocalContractNumber = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `CNT-${year}-${randomNum}`;
  };

  // -------------------------------------------------------------------------
  // Computed Commercials
  // -------------------------------------------------------------------------
  const computedFinalAmount = useMemo(() => {
    const base = Math.max(0, Number(formContractValue) || 0);
    const disc = Math.max(0, Number(formDiscountAmount) || 0);
    const tax = Math.max(0, Number(formTaxAmount) || 0);
    return Math.max(0, base - disc + tax);
  }, [formContractValue, formDiscountAmount, formTaxAmount]);

  const computedAdvancePayable = useMemo(() => {
    const finalAmt = computedFinalAmount;
    const val = Math.max(0, Number(formAdvancePaymentValue) || 0);
    if (formAdvancePaymentType === 'percentage') {
      return (finalAmt * val) / 100;
    }
    return Math.min(finalAmt, val);
  }, [computedFinalAmount, formAdvancePaymentType, formAdvancePaymentValue]);

  // Check if contract value differs from selected quotation
  const hasQuotationValueMismatch = useMemo(() => {
    if (!selectedQuotation) return false;
    const quoteVal = Number(selectedQuotation.grandTotal || selectedQuotation.subtotal || 0);
    const contractVal = Number(formContractValue) || 0;
    return Math.abs(quoteVal - contractVal) > 1; // Tolerance for small rounding
  }, [selectedQuotation, formContractValue]);

  // Load contracts, quotations, negotiations
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsRes, statsRes, quotesRes, negsRes] = await Promise.all([
        leadService.getContracts({
          leadId: lead?.id || undefined,
          limit: 100,
        }),
        leadService.getContractStats(lead?.id).catch(() => null),
        billingService.getQuotations().catch(() => []),
        leadService.getNegotiations({ leadId: lead?.id || undefined, limit: 100 }).catch(() => null),
      ]);

      setContracts(contractsRes.data || []);
      if (statsRes) setStats(statsRes);
      if (Array.isArray(quotesRes)) {
        const flattenedQuotes: Quotation[] = [];
        quotesRes.forEach((q) => {
          if (q.allRevisions && q.allRevisions.length > 0) {
            flattenedQuotes.push(...q.allRevisions);
          } else {
            flattenedQuotes.push(q);
          }
        });
        setQuotations(flattenedQuotes);
      }
      if (negsRes && negsRes.data) setNegotiations(negsRes.data);
    } catch (err: any) {
      notifications.show({
        title: 'Error Loading Contracts',
        message: err.message || 'Could not fetch contracts list',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [lead?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------------------
  // KPI Statistics
  // -------------------------------------------------------------------------
  const totalCount = contracts.length;
  const activeCount = useMemo(
    () => contracts.filter((c) => (c.status || '').toLowerCase() === 'active').length,
    [contracts]
  );
  const pendingApprovalCount = useMemo(
    () => contracts.filter((c) => (c.approvalStatus || '').toLowerCase() === 'pending approval' || (c.status || '').toLowerCase() === 'pending approval').length,
    [contracts]
  );
  const pendingSignatureCount = useMemo(
    () => contracts.filter((c) => (c.status || '').toLowerCase() === 'pending signature' || (c.status || '').toLowerCase() === 'sent for signature').length,
    [contracts]
  );
  const signedCount = useMemo(
    () => contracts.filter((c) => (c.signatureStatus || '').toLowerCase() === 'signed').length,
    [contracts]
  );
  const completedCount = useMemo(
    () => contracts.filter((c) => (c.status || '').toLowerCase() === 'completed').length,
    [contracts]
  );
  const terminatedCount = useMemo(
    () => contracts.filter((c) => (c.status || '').toLowerCase() === 'terminated' || (c.status || '').toLowerCase() === 'expired').length,
    [contracts]
  );

  const totalContractValueSum = useMemo(
    () => contracts.reduce((acc, curr) => acc + (Number(curr.finalContractAmount || curr.contractValue) || 0), 0),
    [contracts]
  );

  // -------------------------------------------------------------------------
  // Contracts list
  // -------------------------------------------------------------------------
  const filteredContracts = contracts;

  const totalPages = Math.ceil(filteredContracts.length / pageSize) || 1;
  const paginatedContracts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredContracts.slice(start, start + pageSize);
  }, [filteredContracts, page, pageSize]);

  // Options
  const contractTypeOptions: ComboboxItem[] = [
    { value: 'Software Development', label: 'Software Development' },
    { value: 'IT Product Sales', label: 'IT Product Sales' },
    { value: 'IT Services', label: 'IT Services' },
    { value: 'AMC/Support', label: 'AMC/Support' },
    { value: 'Subscription/License', label: 'Subscription/License' },
    { value: 'Other', label: 'Other' },
  ];

  const approvalStatusOptions: ComboboxItem[] = [
    { value: 'Draft', label: 'Draft' },
    { value: 'Pending Approval', label: 'Pending Approval' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  const signatureStatusOptions: ComboboxItem[] = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Partially Signed', label: 'Partially Signed' },
    { value: 'Signed', label: 'Signed' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  const contractStatusOptions: ComboboxItem[] = [
    { value: 'Draft', label: 'Draft' },
    { value: 'Active', label: 'Active' },
    { value: 'Pending Signature', label: 'Pending Signature' },
    { value: 'On Hold', label: 'On Hold' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Terminated', label: 'Terminated' },
    { value: 'Expired', label: 'Expired' },
  ];

  const paymentMethodOptions: ComboboxItem[] = [
    { value: 'Full Payment', label: 'Full Payment' },
    { value: 'Partial Payment', label: 'Partial Payment' },
    { value: 'Milestone-Based Payment', label: 'Milestone-Based Payment' },
  ];

  const paymentDueTermsOptions: ComboboxItem[] = [
    { value: 'Due on Receipt', label: 'Due on Receipt' },
    { value: 'Net 15', label: 'Net 15' },
    { value: 'Net 30', label: 'Net 30' },
    { value: 'Custom', label: 'Custom' },
  ];

  // Client Selection Options from CRM Contacts & Customers
  const clientOptions: ComboboxItem[] = useMemo(() => {
    const list: ComboboxItem[] = [];
    contacts.forEach((c) => {
      const label = c.companyName ? `${c.companyName} (${c.name})` : c.name;
      list.push({
        value: `contact:${c.id}`,
        label: `${label} — Contact`,
      });
    });
    leads.forEach((l) => {
      const label = l.companyName ? `${l.companyName} (${l.name})` : l.name;
      list.push({
        value: `lead:${l.id}`,
        label: `${label} — Lead`,
      });
    });
    return list;
  }, [contacts, leads]);

  // Quotation Selection Options
  const quotationSelectOptions: ComboboxItem[] = useMemo(() => {
    return quotations.map((q) => {
      const isAccepted = (q.status || '').toLowerCase() === 'accepted';
      const isSuperseded = (q.status || '').toLowerCase() === 'superseded';
      const verTag = q.revisionName || (q.version ? `V${q.version}` : '');
      const statusBadge = isAccepted ? '⭐ ACCEPTED' : isSuperseded ? '⚠️ SUPERSEDED' : q.status;
      return {
        value: q.id,
        label: `${q.quotationNumber} ${verTag ? `[${verTag}]` : ''} — ${q.companyName || q.contactName || 'Client'} [${statusBadge}] (₹${Number(q.grandTotal || 0).toLocaleString('en-IN')})`,
        disabled: isSuperseded,
      };
    });
  }, [quotations]);

  // Negotiation Selection Options
  const negotiationSelectOptions: ComboboxItem[] = useMemo(() => {
    return negotiations.map((n) => ({
      value: n.id,
      label: `${n.negotiationId} — ${n.clientName || n.leadName || 'Deal'} (₹${Number(n.expectedFinalAmount || n.quotedAmount || 0).toLocaleString('en-IN')})`,
    }));
  }, [negotiations]);

  // Employee Selection Options
  const employeeOptions: ComboboxItem[] = useMemo(() => {
    return employees.map((e) => ({
      value: `emp:${e.id}`,
      label: `${e.name} (${e.designation || e.role || 'Staff'})`,
    }));
  }, [employees]);

  // -------------------------------------------------------------------------
  // Handlers for Linking
  // -------------------------------------------------------------------------

  // Handle Client Selection
  const handleClientSelect = (val: string | null) => {
    if (!val) {
      setFormClientId('');
      setFormClientName('');
      return;
    }
    setFormClientId(val);
    if (val.startsWith('contact:')) {
      const cId = val.replace('contact:', '');
      const found = contacts.find((c) => c.id === cId);
      if (found) {
        setFormClientName(found.companyName || found.name);
        setFormClientSignatoryName(found.name || '');
        setFormClientSignatoryEmail(found.email || '');
      }
    } else if (val.startsWith('lead:')) {
      const lId = val.replace('lead:', '');
      const found = leads.find((l) => l.id === lId);
      if (found) {
        setFormClientName(found.companyName || found.name);
        setFormLeadId(found.id);
        setFormClientSignatoryName(found.name || '');
        setFormClientSignatoryEmail(found.email || '');
      }
    }
  };

  // Handle Quotation Selection: Auto-populate commercial & client details
  const handleQuotationSelect = (val: string | null) => {
    if (!val) {
      setFormQuotationId('');
      setFormQuotationNumber('');
      setSelectedQuotation(null);
      setFormDiscountAppliedFromQuote(false);
      setQuotationMismatchConfirmed(false);
      return;
    }

    const quote = quotations.find((q) => q.id === val);
    if (!quote) return;

    if ((quote.status || '').toLowerCase() === 'superseded') {
      notifications.show({
        title: 'Superseded Quotation',
        message: 'This quotation revision has been superseded by a newer version and cannot be linked to a contract. Please select the accepted active revision.',
        color: 'red',
      });
      return;
    }

    setSelectedQuotation(quote);
    setFormQuotationId(quote.id);
    setFormQuotationNumber(quote.quotationNumber);

    // Auto-populate Client Details
    if (quote.companyName || quote.contactName) {
      setFormClientName(quote.companyName || quote.contactName);
      if (quote.contactId) {
        setFormClientId(`contact:${quote.contactId}`);
      }
    }
    if (quote.contactEmail) {
      setFormClientSignatoryEmail(quote.contactEmail);
    }
    if (quote.contactName) {
      setFormClientSignatoryName(quote.contactName);
    }
    if (quote.leadId && !formLeadId) {
      setFormLeadId(quote.leadId);
    }

    // Commercial details auto-population
    // Quote subtotal as base contract value
    const baseVal = Number(quote.subtotal || quote.grandTotal || 0);
    const disc = Number(quote.discountAmount || 0);
    const tax = Number(quote.taxAmount || 0);

    setFormContractValue(baseVal);
    setFormDiscountAmount(disc);
    setFormDiscountAppliedFromQuote(disc > 0);
    setFormTaxAmount(tax);
    setFormTaxIncluded(false); // Typically GST in quotations is calculated over subtotal
    setFormCurrency(quote.currency || 'INR');

    // Pre-fill payment terms if available
    if (quote.paymentTerms) {
      if (['Due on Receipt', 'Net 15', 'Net 30'].includes(quote.paymentTerms)) {
        setFormPaymentDueTerms(quote.paymentTerms as ContractPaymentDueTerms);
      } else {
        setFormPaymentDueTerms('Custom');
        setFormCustomPaymentDueTerms(quote.paymentTerms);
      }
    }

    // Pre-fill products if quotation items exist
    if (quote.items && quote.items.length > 0) {
      const itemsList: ContractProductItem[] = quote.items.map((it) => ({
        id: it.id,
        name: it.itemName,
        quantity: it.quantity || 1,
        unit: 'Unit',
        unitPrice: it.unitPrice || 0,
        description: it.description || '',
      }));
      setFormProductDetails(itemsList);
    }

    notifications.show({
      title: 'Quotation Data Linked',
      message: `Commercial terms, tax breakdown, and client details auto-populated from ${quote.quotationNumber}.`,
      color: 'teal',
    });
  };

  // Handle Negotiation Selection
  const handleNegotiationSelect = (val: string | null) => {
    if (!val) {
      setFormNegotiationId('');
      setFormNegotiationNumber('');
      return;
    }
    const neg = negotiations.find((n) => n.id === val);
    if (!neg) return;

    setFormNegotiationId(neg.id);
    setFormNegotiationNumber(neg.negotiationId);

    if (neg.expectedFinalAmount && formContractValue === 0) {
      setFormContractValue(Number(neg.expectedFinalAmount));
    }
    if (neg.scopeChanges && !formScopeOfWork) {
      setFormScopeOfWork(neg.scopeChanges);
    }
  };

  // Handle Employee Selection
  const handleEmployeeSelect = (val: string | null) => {
    if (!val) {
      setAssignedEmployeeKey('');
      setFormAssignedTo('');
      setFormAssignedToName('');
      return;
    }
    setAssignedEmployeeKey(val);
    const id = val.replace('emp:', '');
    const found = employees.find((e) => e.id === id);
    if (found) {
      setFormAssignedTo(found.id);
      setFormAssignedToName(found.name);
      setFormCompanySignatoryName(found.name);
      setFormCompanySignatoryEmail(found.email || 'contracts@omnitech.io');
    }
  };

  // Handle Document Upload & Version Tracking
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      notifications.show({
        title: 'File Too Large',
        message: 'Contract document file size must be less than 25MB.',
        color: 'red',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result as string;
      setFormContractDocument(file.name);
      setFormDocumentFileUrl(fileData);

      if (formIsNewRevisionUpload) {
        // Increment document version (e.g. v1.0 -> v1.1 or v2.0)
        const currentVer = formDocumentVersion || 'v1.0';
        const num = parseFloat(currentVer.replace(/[^\d.]/g, '')) || 1.0;
        const nextVer = `v${(num + 0.1).toFixed(1)}`;
        setFormDocumentVersion(nextVer);

        const newRevision: ContractDocumentRevision = {
          version: nextVer,
          documentName: file.name,
          documentUrl: fileData,
          uploadedBy: currentUser?.name || 'Staff',
          uploadedAt: new Date().toISOString(),
          notes: formRevisionNotes.trim() || `Revised document upload (${nextVer})`,
        };
        setFormDocumentVersions((prev) => [...prev, newRevision]);
        setFormRevisionNotes('');
        setFormIsNewRevisionUpload(false);

        notifications.show({
          title: 'Revised Version Uploaded',
          message: `${file.name} saved as version ${nextVer}.`,
          color: 'teal',
        });
      } else {
        notifications.show({
          title: 'Contract Document Attached',
          message: `${file.name} ready for digital signing.`,
          color: 'teal',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Add product item row
  const handleAddProductItem = () => {
    setFormProductDetails((prev) => [
      ...prev,
      {
        id: `prd-${Date.now()}`,
        name: '',
        quantity: 1,
        unit: 'Unit',
        partNumber: '',
        description: '',
      },
    ]);
  };

  const handleUpdateProductItem = (index: number, field: keyof ContractProductItem, value: any) => {
    setFormProductDetails((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveProductItem = (index: number) => {
    setFormProductDetails((prev) => prev.filter((_, i) => i !== index));
  };

  // -------------------------------------------------------------------------
  // Open Create Modal
  // -------------------------------------------------------------------------
  const handleOpenCreateModal = () => {
    setEditingContract(null);
    setFormContractId(generateLocalContractNumber());

    // Title starts empty to show placeholder
    setFormTitle('');
    setFormContractType('Software Development');

    // Data fetched from Lead
    const clientStr = lead?.companyName || lead?.name || '';
    setFormClientName(clientStr);
    if (lead?.id) {
      setFormLeadId(lead.id);
      setFormClientId(`lead:${lead.id}`);
    } else {
      setFormClientId('');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    setFormContractDate(todayStr);

    // Project & Scope - empty with placeholders
    setFormProjectName('');
    setFormStartDate('');
    setFormEndDate('');
    setFormScopeOfWork('');
    setFormDeliverables('');
    setFormAcceptanceCriteria('');

    // Reset type specifics - empty with placeholders
    setFormProductDetails([]);
    setFormDeliveryDetails('');
    setFormWarrantyTerms('');
    setFormSupportPeriod('');
    setFormSlaTerms('');
    setFormResponseTime('');
    setFormLicenseQuantity(0);
    setFormSubscriptionStartDate('');
    setFormSubscriptionEndDate('');
    setFormRenewalDetails('');

    // Check if an accepted quotation exists for this lead to auto-fetch!
    const acceptedQuote = quotations.find(
      (q) => q.status === 'Accepted' && (q.leadId === lead?.id || !q.leadId)
    );

    if (acceptedQuote) {
      setSelectedQuotation(acceptedQuote);
      setFormQuotationId(acceptedQuote.id);
      setFormQuotationNumber(acceptedQuote.quotationNumber);

      const baseVal = Number(acceptedQuote.subtotal || acceptedQuote.grandTotal || 0);
      const disc = Number(acceptedQuote.discountAmount || 0);
      const tax = Number(acceptedQuote.taxAmount || 0);

      setFormContractValue(baseVal);
      setFormDiscountAmount(disc);
      setFormDiscountAppliedFromQuote(disc > 0);
      setFormTaxAmount(tax);
      setFormCurrency(acceptedQuote.currency || 'INR');

      if (acceptedQuote.items && acceptedQuote.items.length > 0) {
        setFormProductDetails(
          acceptedQuote.items.map((it) => ({
            id: it.id,
            name: it.itemName,
            quantity: it.quantity || 1,
            unit: 'Unit',
            unitPrice: it.unitPrice || 0,
            description: it.description || '',
          }))
        );
      }

      if (acceptedQuote.paymentTerms) {
        if (['Due on Receipt', 'Net 15', 'Net 30'].includes(acceptedQuote.paymentTerms)) {
          setFormPaymentDueTerms(acceptedQuote.paymentTerms as ContractPaymentDueTerms);
        } else {
          setFormPaymentDueTerms('Custom');
          setFormCustomPaymentDueTerms(acceptedQuote.paymentTerms);
        }
      } else {
        setFormPaymentDueTerms('Net 30');
        setFormCustomPaymentDueTerms('');
      }
    } else {
      // Commercials - empty with placeholders
      setSelectedQuotation(null);
      setFormQuotationId('');
      setFormQuotationNumber('');
      setFormContractValue(0);
      setFormCurrency('INR');
      setFormDiscountAmount(0);
      setFormTaxAmount(0);
      setFormTaxRate(18.0);
      setFormTaxIncluded(false);
      setFormPaymentMethod('Milestone-Based Payment');
      setFormPaymentDueTerms('Net 30');
      setFormCustomPaymentDueTerms('');
      setFormDiscountAppliedFromQuote(false);
    }

    setFormAdvancePaymentType('percentage');
    setFormAdvancePaymentValue(0);
    setQuotationMismatchConfirmed(false);

    // Linked Negotiations
    setFormNegotiationId('');
    setFormNegotiationNumber('');

    // Employee / Company Signatory from Lead (if assigned)
    const leadAssigned = lead?.assignedTo ? employees.find((e) => e.id === lead.assignedTo || e.name === lead.assignedTo) : null;
    if (leadAssigned) {
      setAssignedEmployeeKey(`emp:${leadAssigned.id}`);
      setFormAssignedTo(leadAssigned.id);
      setFormAssignedToName(leadAssigned.name);
      setFormCompanySignatoryName(leadAssigned.name);
      setFormCompanySignatoryEmail(leadAssigned.email || '');
    } else {
      setAssignedEmployeeKey('');
      setFormAssignedTo('');
      setFormAssignedToName('');
      setFormCompanySignatoryName('');
      setFormCompanySignatoryEmail('');
    }

    // Documents & Signatures - empty with placeholders
    setFormContractDocument('');
    setFormDocumentFileUrl('');
    setFormDocumentVersion('v1.0');
    setFormDocumentVersions([]);
    setFormIsNewRevisionUpload(false);
    setFormRevisionNotes('');
    setFormAttachments([]);
    setFormClientSignatoryName(lead?.name || '');
    setFormClientSignatoryEmail(lead?.email || '');
    setFormSignatureStatus('Pending');
    setFormSignedDate('');

    // Workflow & Status
    setFormApprovalStatus('Draft');
    setFormApprovedBy('');
    setFormApprovalDate('');
    setFormRejectionReason('');
    setFormInternalNotes('');
    setFormStatus('Draft');

    setErrors({});
    setModalOpen(true);
  };

  // -------------------------------------------------------------------------
  // Open Edit Modal
  // -------------------------------------------------------------------------
  const handleOpenEditModal = (cnt: Contract) => {
    setEditingContract(cnt);
    setFormContractId(cnt.contractId || '');
    setFormTitle(cnt.title || '');
    setFormContractType((cnt.contractType as ContractType) || 'Software Development');
    setFormClientName(cnt.clientName || '');
    if (cnt.contactId) {
      setFormClientId(`contact:${cnt.contactId}`);
    } else if (cnt.leadId) {
      setFormClientId(`lead:${cnt.leadId}`);
    } else {
      setFormClientId('');
    }
    setFormLeadId(cnt.leadId || '');
    setFormQuotationId(cnt.quotationId || '');
    setFormQuotationNumber(cnt.quotationNumber || '');
    const matchedQuote = quotations.find((q) => q.id === cnt.quotationId || q.quotationNumber === cnt.quotationNumber);
    setSelectedQuotation(matchedQuote || null);

    setFormNegotiationId(cnt.negotiationId || '');
    setFormNegotiationNumber(cnt.negotiationNumber || '');

    setFormAssignedTo(cnt.assignedTo || '');
    setFormAssignedToName(cnt.assignedToName || '');
    setAssignedEmployeeKey(cnt.assignedTo ? `emp:${cnt.assignedTo}` : '');

    setFormContractDate(cnt.contractDate || new Date().toISOString().split('T')[0]);
    setFormProjectName(cnt.projectName || '');
    setFormStartDate(cnt.startDate || '');
    setFormEndDate(cnt.endDate || '');
    setFormScopeOfWork(cnt.scopeOfWork || '');
    setFormDeliverables(cnt.deliverables || '');
    setFormAcceptanceCriteria(cnt.acceptanceCriteria || '');

    // Type specifics
    setFormProductDetails(cnt.productDetails || []);
    setFormDeliveryDetails(cnt.deliveryDetails || '');
    setFormWarrantyTerms(cnt.warrantyTerms || '');
    setFormSupportPeriod(cnt.supportPeriod || '');
    setFormSlaTerms(cnt.slaTerms || '');
    setFormResponseTime(cnt.responseTime || '');
    setFormLicenseQuantity(cnt.licenseQuantity || 1);
    setFormSubscriptionStartDate(cnt.subscriptionStartDate || '');
    setFormSubscriptionEndDate(cnt.subscriptionEndDate || '');
    setFormRenewalDetails(cnt.renewalDetails || '');

    // Commercials
    setFormContractValue(Number(cnt.contractValue) || 0);
    setFormCurrency(cnt.currency || 'INR');
    setFormDiscountAmount(Number(cnt.discountAmount) || 0);
    setFormTaxAmount(Number(cnt.taxAmount) || 0);
    setFormTaxRate(Number(cnt.taxRate) || 18.0);
    setFormTaxIncluded(Boolean(cnt.taxIncluded));
    setFormPaymentMethod((cnt.paymentMethod as ContractPaymentMethod) || 'Full Payment');
    setFormPaymentDueTerms((cnt.paymentDueTerms as ContractPaymentDueTerms) || 'Net 30');
    setFormCustomPaymentDueTerms(cnt.customPaymentDueTerms || '');
    setFormAdvancePaymentType(cnt.advancePaymentType || 'percentage');
    setFormAdvancePaymentValue(Number(cnt.advancePaymentValue) || 0);
    setFormDiscountAppliedFromQuote(Boolean(cnt.discountAmount && cnt.quotationId));
    setQuotationMismatchConfirmed(Boolean(cnt.quotationValueMismatchConfirmed));

    // Documents & Signatures
    setFormContractDocument(cnt.contractDocument || cnt.documentName || '');
    setFormDocumentFileUrl(cnt.documentUrl || '');
    setFormDocumentVersion(cnt.documentVersion || 'v1.0');
    setFormDocumentVersions(cnt.documentVersions || []);
    setFormIsNewRevisionUpload(false);
    setFormRevisionNotes('');
    setFormAttachments(cnt.attachments || []);
    setFormClientSignatoryName(cnt.clientSignatoryName || '');
    setFormClientSignatoryEmail(cnt.clientSignatoryEmail || '');
    setFormCompanySignatoryName(cnt.companySignatoryName || '');
    setFormCompanySignatoryEmail(cnt.companySignatoryEmail || '');
    setFormSignatureStatus((cnt.signatureStatus as ContractSignatureStatus) || 'Pending');
    setFormSignedDate(cnt.signedDate || '');

    // Workflow
    setFormApprovalStatus((cnt.approvalStatus as ContractApprovalStatus) || 'Draft');
    setFormApprovedBy(cnt.approvedBy || '');
    setFormApprovalDate(cnt.approvalDate || '');
    setFormRejectionReason(cnt.rejectionReason || '');
    setFormInternalNotes(cnt.internalNotes || '');
    setFormStatus((cnt.status as ContractStatus) || 'Draft');

    setErrors({});
    setModalOpen(true);
  };

  // -------------------------------------------------------------------------
  // Form Validation & Submission
  // -------------------------------------------------------------------------
  const validateForm = (isSubmittingForApproval: boolean = false): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formTitle.trim()) newErrors.title = 'Contract Title is required';
    if (!formContractType) newErrors.contractType = 'Contract Type is required';
    if (!formClientName.trim()) newErrors.clientName = 'Client Name is required';
    if (!formContractDate) newErrors.contractDate = 'Contract Date is required';
    if (!formStartDate) newErrors.startDate = 'Start Date is required';
    if (!formEndDate) newErrors.endDate = 'End Date is required';

    if (formStartDate && formEndDate) {
      const s = new Date(formStartDate).getTime();
      const e = new Date(formEndDate).getTime();
      if (!isNaN(s) && !isNaN(e) && e <= s) {
        newErrors.endDate = 'End Date must be later than Start Date';
      }
    }

    if (formContractValue < 0) newErrors.contractValue = 'Contract Value cannot be negative';
    if (formDiscountAmount < 0) newErrors.discountAmount = 'Discount Amount cannot be negative';
    if (formTaxAmount < 0) newErrors.taxAmount = 'Tax Amount cannot be negative';

    // Signature validation if marking as Signed or Active
    if (formStatus === 'Active' || formSignatureStatus === 'Signed') {
      if (!formClientSignatoryName.trim()) newErrors.clientSignatoryName = 'Client Signatory Name is required for signed/active contracts';
      if (!formCompanySignatoryName.trim()) newErrors.companySignatoryName = 'Company Signatory Name is required for signed/active contracts';
      if (!formSignedDate) newErrors.signedDate = 'Signed Date is required when contract is active/signed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveContract = async (actionType: 'draft' | 'submit_approval' | 'approve' | 'reject' | 'save' = 'save') => {
    const isApprovalSubmission = actionType === 'submit_approval';
    if (!validateForm(isApprovalSubmission)) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please resolve the highlighted fields before saving.',
        color: 'red',
      });
      return;
    }

    let targetApprovalStatus: ContractApprovalStatus = formApprovalStatus;
    let targetStatus: ContractStatus = formStatus;

    if (actionType === 'draft') {
      targetApprovalStatus = 'Draft';
      targetStatus = 'Draft';
    } else if (actionType === 'submit_approval') {
      targetApprovalStatus = 'Pending Approval';
      targetStatus = 'Pending Approval';
    } else if (actionType === 'approve') {
      targetApprovalStatus = 'Approved';
      targetStatus = formSignatureStatus === 'Signed' ? 'Active' : 'Pending Signature';
    } else if (actionType === 'save') {
      targetStatus = formStatus;
      if (formStatus === 'Active' || formStatus === 'Completed') {
        targetApprovalStatus = 'Approved';
      } else if (formStatus === 'Draft') {
        targetApprovalStatus = 'Draft';
      }
    }

    const payload: Partial<ContractFormData> = {
      contractId: formContractId.trim() || undefined,
      title: formTitle.trim(),
      contractType: formContractType,
      clientName: formClientName.trim(),
      leadId: formLeadId || lead?.id || undefined,
      contactId: formClientId.startsWith('contact:') ? formClientId.replace('contact:', '') : undefined,
      quotationId: formQuotationId || undefined,
      quotationNumber: formQuotationNumber || undefined,
      negotiationId: formNegotiationId || undefined,
      negotiationNumber: formNegotiationNumber || undefined,
      assignedTo: formAssignedTo || undefined,
      assignedToName: formAssignedToName.trim() || undefined,
      contractDate: formContractDate,

      projectName: formProjectName.trim() || undefined,
      startDate: formStartDate,
      endDate: formEndDate,
      scopeOfWork: formScopeOfWork.trim() || undefined,
      deliverables: formDeliverables.trim() || undefined,
      acceptanceCriteria: formAcceptanceCriteria.trim() || undefined,

      // Type-specific
      productDetails: formProductDetails.length > 0 ? formProductDetails : undefined,
      deliveryDetails: formDeliveryDetails.trim() || undefined,
      warrantyTerms: formWarrantyTerms.trim() || undefined,
      supportPeriod: formSupportPeriod.trim() || undefined,
      slaTerms: formSlaTerms.trim() || undefined,
      responseTime: formResponseTime.trim() || undefined,
      licenseQuantity: Number(formLicenseQuantity) || 1,
      subscriptionStartDate: formSubscriptionStartDate || undefined,
      subscriptionEndDate: formSubscriptionEndDate || undefined,
      renewalDetails: formRenewalDetails.trim() || undefined,

      // Commercial
      contractValue: Number(formContractValue) || 0,
      currency: formCurrency,
      discountAmount: Number(formDiscountAmount) || 0,
      taxAmount: Number(formTaxAmount) || 0,
      taxRate: Number(formTaxRate) || 18.0,
      taxIncluded: Boolean(formTaxIncluded),
      finalContractAmount: computedFinalAmount,
      paymentMethod: formPaymentMethod,
      paymentDueTerms: formPaymentDueTerms,
      customPaymentDueTerms: formCustomPaymentDueTerms.trim() || undefined,
      advancePaymentType: formAdvancePaymentType,
      advancePaymentValue: Number(formAdvancePaymentValue) || 0,
      advancePaymentAmount: computedAdvancePayable,
      quotationValueMismatchConfirmed: true,

      // Documents & Signatures
      documentName: formContractDocument.trim() || undefined,
      documentUrl: formDocumentFileUrl || undefined,
      documentVersion: formDocumentVersion || 'v1.0',
      documentVersions: formDocumentVersions,
      versionNotes: formRevisionNotes.trim() || undefined,
      attachments: formAttachments.length > 0 ? formAttachments : undefined,
      clientSignatoryName: formClientSignatoryName.trim() || undefined,
      clientSignatoryEmail: formClientSignatoryEmail.trim() || undefined,
      companySignatoryName: formCompanySignatoryName.trim() || undefined,
      companySignatoryEmail: formCompanySignatoryEmail.trim() || undefined,
      signatureStatus: formSignatureStatus,
      signedDate: formSignatureStatus === 'Signed' ? formSignedDate : undefined,

      // Workflow
      approvalStatus: targetApprovalStatus,
      approvedBy: actionType === 'approve' ? currentUser?.name || 'Authorized Officer' : formApprovedBy || undefined,
      approvalDate: actionType === 'approve' ? new Date().toISOString() : formApprovalDate || undefined,
      rejectionReason: formRejectionReason.trim() || undefined,
      internalNotes: formInternalNotes.trim() || undefined,

      status: targetStatus,
      isApprovalSubmission,
    };

    setSubmitting(true);
    try {
      if (editingContract) {
        await leadService.updateContract(editingContract.id, payload);
        notifications.show({
          title: 'Contract Saved',
          message: `Contract ${editingContract.contractId} updated successfully.`,
          color: 'blue',
        });
      } else {
        const created = await leadService.createContract(payload);
        notifications.show({
          title: 'Contract Created',
          message: `New contract ${created.contractId} created successfully.`,
          color: 'teal',
        });
      }

      setModalOpen(false);
      setEditingContract(null);
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Save Failed',
        message: err.message || 'Could not save contract.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Workflow Actions
  // -------------------------------------------------------------------------

  // Submit for Approval from Table
  const handleSubmitForApproval = async (cnt: Contract) => {
    try {
      await leadService.submitContractForApproval(cnt.id);
      notifications.show({
        title: 'Submitted for Approval',
        message: `Contract ${cnt.contractId} submitted to executive review.`,
        color: 'blue',
      });
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Submission Failed',
        message: err.message || 'Could not submit contract for approval.',
        color: 'red',
      });
    }
  };

  // Approve Contract
  const handleApproveContract = async (id: string) => {
    try {
      await leadService.approveContract(id);
      notifications.show({
        title: 'Contract Approved ✓',
        message: 'Contract approved successfully. Status updated to Pending Signature / Active.',
        color: 'teal',
      });
      setModalOpen(false);
      setEditingContract(null);
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Approval Failed',
        message: err.message || 'Could not approve contract.',
        color: 'red',
      });
    }
  };

  // Reject Contract (Open Rejection Modal)
  const handleOpenRejectModal = (id: string) => {
    setRejectionTargetId(id);
    setRejectionReasonText('');
    setRejectionModalOpen(true);
  };

  // Confirm Rejection
  const handleConfirmRejection = async () => {
    if (!rejectionTargetId || !rejectionReasonText.trim()) {
      notifications.show({
        title: 'Reason Required',
        message: 'Please provide a clear reason for rejecting the contract.',
        color: 'red',
      });
      return;
    }

    setRejectionSubmitting(true);
    try {
      await leadService.rejectContract(rejectionTargetId, rejectionReasonText.trim());
      notifications.show({
        title: 'Contract Rejected',
        message: 'Contract returned to Draft state with recorded rejection notes.',
        color: 'orange',
      });
      setRejectionModalOpen(false);
      setRejectionTargetId(null);
      setModalOpen(false);
      setEditingContract(null);
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Rejection Failed',
        message: err.message || 'Could not reject contract.',
        color: 'red',
      });
    } finally {
      setRejectionSubmitting(false);
    }
  };

  // Delete Contract
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await leadService.deleteContract(deleteTarget.id);
      notifications.show({
        title: 'Contract Deleted',
        message: `Contract ${deleteTarget.contractId} has been permanently deleted.`,
        color: 'blue',
      });
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Delete Failed',
        message: err.message || 'Could not delete contract.',
        color: 'red',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Status Update Handler with dropdown options
  const handleStatusChange = async (cnt: Contract, newStatus: string) => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const patchData: Partial<ContractFormData> = {
        status: newStatus as ContractStatus,
      };

      if (newStatus === 'Active' || newStatus === 'Completed') {
        patchData.status = newStatus as ContractStatus;
        patchData.approvalStatus = 'Approved';
        patchData.signatureStatus = 'Signed';
        patchData.signedDate = cnt.signedDate || todayStr;
        patchData.clientSignatoryName = (cnt.clientSignatoryName && cnt.clientSignatoryName.trim()) || cnt.clientName || lead?.name || 'Authorized Client';
        patchData.clientSignatoryEmail = (cnt.clientSignatoryEmail && cnt.clientSignatoryEmail.trim()) || (cnt as any).clientEmail || lead?.email || 'client@example.com';
        patchData.companySignatoryName = (cnt.companySignatoryName && cnt.companySignatoryName.trim()) || cnt.assignedToName || 'OneAssist Representative';
        patchData.companySignatoryEmail = (cnt.companySignatoryEmail && cnt.companySignatoryEmail.trim()) || 'contracts@oneassist.tech';
      } else if (newStatus === 'Pending Signature') {
        patchData.status = 'Pending Signature';
        patchData.approvalStatus = 'Approved';
        patchData.signatureStatus = 'Pending';
      } else if (newStatus === 'Pending Approval') {
        patchData.status = 'Pending Approval';
        patchData.approvalStatus = 'Pending Approval';
        patchData.isApprovalSubmission = true;
      } else if (newStatus === 'Approved') {
        patchData.status = 'Approved';
        patchData.approvalStatus = 'Approved';
        patchData.isApprovalAction = true;
      } else if (newStatus === 'Draft') {
        patchData.status = 'Draft';
        patchData.approvalStatus = 'Draft';
        patchData.signatureStatus = 'Pending';
      } else {
        patchData.status = newStatus as ContractStatus;
      }

      // Optimistic update so UI reflects immediately
      setContracts((prev) =>
        prev.map((c) => (c.id === cnt.id ? { ...c, ...patchData } : c))
      );

      const updated = await leadService.updateContract(cnt.id, patchData);

      if (updated) {
        setContracts((prev) =>
          prev.map((c) => (c.id === cnt.id ? { ...c, ...updated } : c))
        );
      }

      notifications.show({
        title: 'Contract Status Updated',
        message: `Contract ${cnt.contractId || cnt.title} status changed to ${newStatus}.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      await loadData();
      if (onUpdateContract) {
        onUpdateContract({ ...cnt, ...patchData, ...(updated || {}) } as Contract);
      }
    } catch (err: any) {
      notifications.show({
        title: 'Update Failed',
        message: err.message || 'Could not update contract status.',
        color: 'red',
      });
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  // Quick Sign toggle
  const handleQuickSign = async (cnt: Contract) => {
    const isNowSigned = cnt.signatureStatus !== 'Signed';
    const newSigStatus: ContractSignatureStatus = isNowSigned ? 'Signed' : 'Pending';
    const todayStr = new Date().toISOString().split('T')[0];

    // Check if signatories are present
    if (isNowSigned && (!cnt.clientSignatoryName || !cnt.companySignatoryName)) {
      handleOpenEditModal(cnt);
      notifications.show({
        title: 'Signatories Required',
        message: 'Please enter client and company signatory details before signing.',
        color: 'orange',
      });
      return;
    }

    try {
      await leadService.updateContract(cnt.id, {
        signatureStatus: newSigStatus,
        signedDate: isNowSigned ? todayStr : undefined,
      });

      notifications.show({
        title: isNowSigned ? 'Contract Signed & Executed! 🎉' : 'Signature Status Reset',
        message: isNowSigned
          ? `Contract ${cnt.contractId} signed. Status synchronized.`
          : `Signature marked as pending.`,
        color: isNowSigned ? 'teal' : 'gray',
      });
      await loadData();
    } catch (err: any) {
      notifications.show({
        title: 'Signature Update Failed',
        message: err.message || 'Could not update signature.',
        color: 'red',
      });
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    const st = (status || 'Draft').toLowerCase();
    let color = 'gray';
    if (st === 'active') color = 'teal';
    else if (st === 'pending approval') color = 'blue';
    else if (st === 'pending signature' || st === 'sent for signature') color = 'indigo';
    else if (st === 'approved') color = 'cyan';
    else if (st === 'completed') color = 'green';
    else if (st === 'on hold') color = 'yellow';
    else if (st === 'terminated' || st === 'expired') color = 'red';
    else if (st === 'rejected') color = 'pink';

    return (
      <Badge
        size="md"
        variant="light"
        color={color}
        radius="md"
        style={{
          fontWeight: 700,
          fontSize: '12px',
          padding: '6px 12px',
          height: 26,
          textTransform: 'capitalize',
        }}
      >
        {status || 'Draft'}
      </Badge>
    );
  };

  return (
    <Box>
      {!modalOpen ? (
        /* CONTRACT LIST VIEW */
        <Box>
          {/* 1. Header & Actions matching Proposals & Quotations */}
          <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">
        <div>
          <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
            Contracts
          </Text>
          <Text size="xs" c="dimmed">
            Manage commercial contracts and agreements with {lead?.name || 'Client'}.
          </Text>
        </div>

        <Group gap="sm">
          {canCreate && (
            <Button
              size="sm"
              leftSection={<IconPlus size={14} />}
              onClick={handleOpenCreateModal}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#FFF',
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              Create Contract
            </Button>
          )}

          {onNavigateSection && (
            <Button
              size="sm"
              variant="light"
              color="blue"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => onNavigateSection('invoices')}
              style={{ borderRadius: 10, fontWeight: 700 }}
            >
              Proceed to Invoices
            </Button>
          )}
        </Group>
      </Group>

      {/* 2. Main Table Content matching Meetings, Proposals, Quotations */}
      {contracts.length === 0 ? (
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
          <ThemeIcon size={56} radius="xl" color="teal" variant="light" mb="md" style={{ margin: '0 auto' }}>
            <IconFileCheck size={28} />
          </ThemeIcon>
          <Text fw={700} size="16px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
            No Contracts Found
          </Text>
          <Text size="sm" c="dimmed" mt={4} mb="lg">
            No commercial contracts have been created for {lead?.name || 'this client'} yet.
          </Text>
          {canCreate && (
            <Button
              size="sm"
              leftSection={<IconPlus size={15} />}
              onClick={handleOpenCreateModal}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#FFF',
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              Create First Contract
            </Button>
          )}
        </Paper>
      ) : (
        <Paper
          radius="lg"
          withBorder
          style={{
            background: isDark ? '#1F2937' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
            overflow: 'hidden',
            boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 2px 10px rgba(0, 0, 0, 0.04)',
          }}
        >
          <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
            <Table.Thead
              style={{
                background: isDark ? '#111827' : '#F8FAFC',
                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Table.Tr>
                <Table.Th style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.05em', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', padding: '14px 20px' }}>
                  Title & Client
                </Table.Th>
                <Table.Th style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.05em', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', padding: '14px 16px' }}>
                  Contract Type
                </Table.Th>
                <Table.Th style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.05em', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', padding: '14px 16px' }}>
                  Contract Date
                </Table.Th>
                <Table.Th style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.05em', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', padding: '14px 16px' }}>
                  Contract Value
                </Table.Th>
                <Table.Th style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.05em', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', padding: '14px 16px' }}>
                  Status
                </Table.Th>
                <Table.Th style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.05em', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', textAlign: 'right', padding: '14px 20px' }}>
                  Actions
                </Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Center py="xl">
                      <Loader size="sm" color="teal" />
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                paginatedContracts.map((cnt) => (
                <Table.Tr
                  key={cnt.id}
                  style={{
                    borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                  }}
                >
                  {/* Title & Client */}
                  <Table.Td style={{ minWidth: 260, padding: '16px 20px' }}>
                    <Group gap="md" wrap="nowrap" align="center">
                      <Box
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
                          color: isDark ? '#6EE7B7' : '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #A7F3D0',
                        }}
                      >
                        <IconFileCheck size={22} stroke={1.9} />
                      </Box>
                      <Box style={{ minWidth: 0 }}>
                        <Text
                          fw={700}
                          size="sm"
                          style={{
                            fontSize: '14.5px',
                            color: isDark ? '#F8FAFC' : '#0F172A',
                            cursor: 'pointer',
                            lineHeight: 1.3,
                          }}
                          onClick={() => setDetailsContract(cnt)}
                        >
                          {cnt.title}
                        </Text>
                        <Group gap={6} wrap="nowrap" mt={4} align="center">
                          <IconBuilding size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                          <Text size="xs" c="dimmed" fw={500} truncate>
                            {cnt.clientName || lead?.name || 'Client'}
                          </Text>
                          {cnt.quotationNumber && (
                            <Badge size="xs" variant="light" color="blue" radius="sm" style={{ fontWeight: 600 }}>
                              {cnt.quotationNumber}
                            </Badge>
                          )}
                          {cnt.contractId && (
                            <Badge size="xs" variant="outline" color="gray" radius="sm">
                              {cnt.contractId}
                            </Badge>
                          )}
                        </Group>
                      </Box>
                    </Group>
                  </Table.Td>

                  {/* Contract Type */}
                  <Table.Td style={{ padding: '16px 16px' }}>
                    <Text size="sm" fw={600} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                      {cnt.contractType || 'Software Development'}
                    </Text>
                    <Text size="11px" c="dimmed" mt={2}>
                      Commercial Agreement
                    </Text>
                  </Table.Td>

                  {/* Dates */}
                  <Table.Td style={{ whiteSpace: 'nowrap', padding: '16px 16px' }}>
                    <Group gap={6} align="center" wrap="nowrap">
                      <IconCalendar size={15} color={isDark ? '#94A3B8' : '#64748B'} />
                      <Text size="sm" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                        {cnt.contractDate || cnt.startDate || '—'}
                      </Text>
                    </Group>
                  </Table.Td>

                  {/* Value */}
                  <Table.Td style={{ padding: '16px 16px' }}>
                    <Text fw={800} size="md" style={{ fontSize: '16px', color: isDark ? '#34D399' : '#059669', letterSpacing: '-0.02em' }}>
                      ₹{Number(cnt.finalContractAmount || cnt.contractValue || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text size="11px" c="dimmed" mt={1}>
                      {cnt.taxIncluded ? 'Incl. Tax' : 'Total Agreement Value'}
                    </Text>
                  </Table.Td>

                  {/* Lifecycle Status */}
                  <Table.Td style={{ padding: '16px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <Menu shadow="md" width={190} position="bottom-start" withinPortal radius="md">
                      <Menu.Target>
                        <Tooltip label="Click to update status" withArrow>
                          <Box style={{ display: 'inline-block', cursor: 'pointer' }}>
                            {renderStatusBadge(cnt.status || 'Draft')}
                          </Box>
                        </Tooltip>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Update Contract Status</Menu.Label>
                        {CONTRACT_STATUS_OPTIONS.map((opt) => {
                          const isSelected = (cnt.status || '').toLowerCase() === opt.value.toLowerCase();
                          return (
                            <Menu.Item
                              key={opt.value}
                              leftSection={
                                <Box
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: opt.color,
                                  }}
                                />
                              }
                              rightSection={isSelected ? <IconCheck size={14} color="#10B981" /> : undefined}
                              onClick={() => handleStatusChange(cnt, opt.value)}
                              style={{
                                fontWeight: isSelected ? 700 : 500,
                                backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : undefined,
                              }}
                            >
                              {opt.label}
                            </Menu.Item>
                          );
                        })}
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>

                  {/* Actions */}
                  <Table.Td style={{ textAlign: 'right', padding: '16px 20px' }}>
                    <Group gap={6} justify="flex-end" wrap="nowrap">
                      <Tooltip label="View Details" withArrow>
                        <ActionIcon size="md" radius="md" variant="light" color="blue" onClick={() => setDetailsContract(cnt)}>
                          <IconEye size={17} />
                        </ActionIcon>
                      </Tooltip>

                      {canEdit && (
                        <Tooltip label="Edit Contract" withArrow>
                          <ActionIcon size="md" radius="md" variant="light" color="gray" onClick={() => handleOpenEditModal(cnt)}>
                            <IconEdit size={17} />
                          </ActionIcon>
                        </Tooltip>
                      )}

                      {/* Submit for Approval Action if in Draft */}
                      {(cnt.approvalStatus === 'Draft' || !cnt.approvalStatus) && (
                        <Tooltip label="Submit for Approval" withArrow>
                          <ActionIcon size="md" radius="md" variant="light" color="teal" onClick={() => handleSubmitForApproval(cnt)}>
                            <IconSend size={17} />
                          </ActionIcon>
                        </Tooltip>
                      )}

                      {/* Update Status Button with Options Dropdown */}
                      <Menu shadow="md" width={190} position="bottom-end" withinPortal radius="md">
                        <Menu.Target>
                          <Tooltip label="Update Status" withArrow>
                            <ActionIcon
                              size="md"
                              radius="md"
                              variant="light"
                              color="teal"
                            >
                              <IconRefresh size={17} />
                            </ActionIcon>
                          </Tooltip>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Label>Update Status</Menu.Label>
                          {CONTRACT_STATUS_OPTIONS.map((opt) => {
                            const isSelected = (cnt.status || '').toLowerCase() === opt.value.toLowerCase();
                            return (
                              <Menu.Item
                                key={opt.value}
                                leftSection={
                                  <Box
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      backgroundColor: opt.color,
                                    }}
                                  />
                                }
                                rightSection={isSelected ? <IconCheck size={14} color="#10B981" /> : undefined}
                                onClick={() => handleStatusChange(cnt, opt.value)}
                                style={{
                                  fontWeight: isSelected ? 700 : 500,
                                  backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : undefined,
                                }}
                              >
                                {opt.label}
                              </Menu.Item>
                            );
                          })}
                        </Menu.Dropdown>
                      </Menu>

                      {canDelete && (
                        <Tooltip label="Delete Contract" withArrow>
                          <ActionIcon size="md" radius="md" variant="light" color="red" onClick={() => setDeleteTarget(cnt)}>
                            <IconTrash size={17} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="space-between" p="sm" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0' }}>
            <Text size="xs" c="dimmed">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredContracts.length)} of {filteredContracts.length}
            </Text>
            <Pagination total={totalPages} value={page} onChange={setPage} size="xs" color="teal" />
          </Group>
        )}
      </Paper>
      )}
        </Box>
      ) : (
        /* ========================================================================= */
        /* 5. FULL-PAGE CREATE / EDIT CONTRACT VIEW (SINGLE CARD DESIGN)            */
        /* ========================================================================= */
        <Paper
          p={{ base: 'md', sm: 'xl' }}
          radius="lg"
          style={{
            background: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
          }}
        >
          {/* Header inside the single card */}
          <Group justify="space-between" align="flex-start" mb="lg">
            <Group gap="md">
              <Box
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDark ? '#6EE7B7' : '#059669',
                }}
              >
                <IconFileCheck size={22} stroke={1.8} />
              </Box>
              <div>
                <Group gap="xs" align="center">
                  <Text fw={800} size="19px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
                    {editingContract
                      ? `Edit Contract • ${editingContract.contractId || editingContract.title}`
                      : lead
                      ? `Create Contract • ${lead.name}`
                      : 'Create Contract • New Agreement'}
                  </Text>
                  {editingContract && (
                    <Badge size="xs" variant="light" color="teal">
                      {editingContract.status}
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed" mt={2}>
                  {lead
                    ? `Configure and execute commercial contract for ${lead.name} (${lead.companyName || 'Lead'}) directly in CRM database`
                    : 'Configure contract parameters across information, scope, commercial value, documents, and approval.'}
                </Text>
              </div>
            </Group>

            <Button
              variant="light"
              color="gray"
              size="sm"
              radius="md"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => {
                if (!submitting) {
                  setModalOpen(false);
                  setEditingContract(null);
                }
              }}
              style={{ fontWeight: 600 }}
            >
              Back to Contracts
            </Button>
          </Group>

          <Stack gap="lg">
          {/* ===================================================================== */}
          {/* SECTION 1: CONTRACT INFORMATION                                       */}
          {/* ===================================================================== */}
          <Paper
            p="md"
            radius="md"
            style={{
              background: isDark ? '#111827' : '#F8FAFC',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            }}
          >
            <Group justify="space-between" align="center" mb="sm">
              <Group gap={6}>
                <ThemeIcon size="xs" color="teal" variant="light">
                  <IconFileDescription size={12} />
                </ThemeIcon>
                <Text size="xs" fw={800} style={{ color: isDark ? '#6EE7B7' : '#059669', letterSpacing: '0.04em' }}>
                  1. CONTRACT INFORMATION
                </Text>
              </Group>
              <Badge size="xs" variant="outline" color="teal">
                Required Core
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {/* Contract ID */}
              <TextInput
                label="Contract ID"
                value={formContractId}
                readOnly
                radius="md"
                styles={{ input: { fontFamily: 'monospace', fontWeight: 600 } }}
              />

              {/* Contract Title */}
              <TextInput
                label="Contract Title"
                placeholder="e.g. Master Services Agreement (MSA)"
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                }}
                error={errors.title}
                required
                radius="md"
              />

              {/* Contract Type */}
              <Select
                label="Contract Type"
                data={contractTypeOptions}
                value={formContractType}
                onChange={(v) => setFormContractType((v as ContractType) || 'Software Development')}
                required
                radius="md"
              />

              {/* Client Name */}
              <Select
                label="Client Name"
                placeholder="Select existing CRM client"
                data={clientOptions}
                value={formClientId}
                onChange={handleClientSelect}
                searchable
                required
                radius="md"
                error={errors.clientName}
              />

              {/* Related Proposal / Quotation */}
              <Select
                label="Related Proposal / Quotation"
                placeholder="Select an accepted or approved quotation"
                data={[{ value: '', label: 'None' }, ...quotationSelectOptions]}
                value={formQuotationId}
                onChange={handleQuotationSelect}
                radius="md"
                clearable
                searchable
              />

              {/* Related Negotiation */}
              <Select
                label="Related Negotiation"
                placeholder="Link an existing negotiation (optional)"
                data={[{ value: '', label: 'None' }, ...negotiationSelectOptions]}
                value={formNegotiationId}
                onChange={handleNegotiationSelect}
                radius="md"
                clearable
                searchable
              />

              {/* Assigned Employee */}
              <Select
                label="Assigned Employee"
                placeholder="Select responsible account manager / staff"
                data={employeeOptions}
                value={assignedEmployeeKey}
                onChange={handleEmployeeSelect}
                radius="md"
                searchable
              />

              {/* Contract Date */}
              <Box>
                <MeetingDatePicker
                  label="Contract Date"
                  value={formContractDate}
                  onChange={(date) => {
                    setFormContractDate(date);
                    if (errors.contractDate) setErrors((prev) => ({ ...prev, contractDate: '' }));
                  }}
                  placeholder="YYYY-MM-DD"
                  required
                />
                {errors.contractDate && (
                  <Text size="xs" c="red" mt={2}>
                    {errors.contractDate}
                  </Text>
                )}
              </Box>
            </SimpleGrid>
          </Paper>

          {/* ===================================================================== */}
          {/* SECTION 2: PROJECT & SCOPE                                            */}
          {/* ===================================================================== */}
          <Paper
            p="md"
            radius="md"
            style={{
              background: isDark ? '#111827' : '#F8FAFC',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            }}
          >
            <Group justify="space-between" align="center" mb="sm">
              <Group gap={6}>
                <ThemeIcon size="xs" color="blue" variant="light">
                  <IconBriefcase size={12} />
                </ThemeIcon>
                <Text size="xs" fw={800} style={{ color: isDark ? '#60A5FA' : '#2563EB', letterSpacing: '0.04em' }}>
                  2. PROJECT & SCOPE
                </Text>
              </Group>
              <Badge size="xs" variant="outline" color="blue">
                {formContractType}
              </Badge>
            </Group>

            {/* Core Project & Dates */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
              <TextInput
                label="Project Name"
                placeholder="e.g. Enterprise CRM Implementation"
                value={formProjectName}
                onChange={(e) => setFormProjectName(e.target.value)}
                radius="md"
              />

              <SimpleGrid cols={2} spacing="xs">
                <Box>
                  <MeetingDatePicker
                    label="Start Date *"
                    value={formStartDate}
                    onChange={(d) => {
                      setFormStartDate(d);
                      if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: '' }));
                    }}
                    placeholder="YYYY-MM-DD"
                    required
                  />
                  {errors.startDate && (
                    <Text size="xs" c="red" mt={2}>
                      {errors.startDate}
                    </Text>
                  )}
                </Box>

                <Box>
                  <MeetingDatePicker
                    label="End Date *"
                    value={formEndDate}
                    onChange={(d) => {
                      setFormEndDate(d);
                      if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: '' }));
                    }}
                    placeholder="YYYY-MM-DD"
                    required
                  />
                  {errors.endDate && (
                    <Text size="xs" c="red" mt={2}>
                      {errors.endDate}
                    </Text>
                  )}
                </Box>
              </SimpleGrid>
            </SimpleGrid>

            {/* Core Textareas: Scope, Deliverables, Acceptance Criteria */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
              <Textarea
                label="Scope of Work"
                placeholder="Detailed statement of technical and functional requirements"
                value={formScopeOfWork}
                onChange={(e) => setFormScopeOfWork(e.target.value)}
                autosize
                minRows={4}
                maxRows={8}
                radius="md"
              />

              <Textarea
                label="Deliverables & Key Milestones (Contractual Scope Description)"
                placeholder="e.g. Full source code, production deployment, manuals, reports"
                value={formDeliverables}
                onChange={(e) => setFormDeliverables(e.target.value)}
                autosize
                minRows={4}
                maxRows={8}
                radius="md"
              />
            </SimpleGrid>

            <Textarea
              label="Acceptance Criteria"
              placeholder="Explicit criteria and conditions required for client sign-off and milestone acceptance"
              value={formAcceptanceCriteria}
              onChange={(e) => setFormAcceptanceCriteria(e.target.value)}
              autosize
              minRows={3}
              maxRows={6}
              radius="md"
              mb="md"
            />

            {/* CONDITIONAL FIELDS BY CONTRACT TYPE */}

            {/* Conditional A: IT Product Sales */}
            {formContractType === 'IT Product Sales' && (
              <Box mt="md" p="sm" style={{ background: isDark ? '#1E293B' : '#EFF6FF', borderRadius: 8 }}>
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap={6}>
                    <IconDevices size={16} color="#3B82F6" />
                    <Text size="xs" fw={700} c="blue">
                      IT Product Sales Specifications
                    </Text>
                  </Group>
                  <Button size="compact-xs" variant="light" color="blue" leftSection={<IconPlus size={12} />} onClick={handleAddProductItem}>
                    Add Product Item
                  </Button>
                </Group>

                {formProductDetails.length > 0 ? (
                  <Stack gap="xs" mb="sm">
                    {formProductDetails.map((prod, idx) => (
                      <Group key={prod.id || idx} gap="xs" align="center">
                        <TextInput
                          placeholder="Product Name / Model"
                          size="xs"
                          value={prod.name}
                          onChange={(e) => handleUpdateProductItem(idx, 'name', e.target.value)}
                          style={{ flex: 2 }}
                        />
                        <NumberInput
                          placeholder="Qty"
                          size="xs"
                          min={1}
                          value={prod.quantity}
                          onChange={(v) => handleUpdateProductItem(idx, 'quantity', Number(v) || 1)}
                          style={{ width: 80 }}
                        />
                        <TextInput
                          placeholder="Part / SKU"
                          size="xs"
                          value={prod.partNumber || ''}
                          onChange={(e) => handleUpdateProductItem(idx, 'partNumber', e.target.value)}
                          style={{ width: 110 }}
                        />
                        <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleRemoveProductItem(idx)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                ) : (
                  <Text size="xs" c="dimmed" mb="sm">
                    No products added yet. Click &quot;Add Product Item&quot; to specify hardware/software SKUs.
                  </Text>
                )}

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  <TextInput
                    label="Delivery Details"
                    placeholder="Delivery logistics, shipping terms, fulfillment address"
                    value={formDeliveryDetails}
                    onChange={(e) => setFormDeliveryDetails(e.target.value)}
                    size="xs"
                  />
                  <TextInput
                    label="Warranty Terms"
                    placeholder="e.g. 1 Year On-site Manufacturer Hardware Warranty"
                    value={formWarrantyTerms}
                    onChange={(e) => setFormWarrantyTerms(e.target.value)}
                    size="xs"
                  />
                </SimpleGrid>
              </Box>
            )}

            {/* Conditional B: AMC/Support */}
            {formContractType === 'AMC/Support' && (
              <Box mt="md" p="sm" style={{ background: isDark ? '#1E293B' : '#F0FDF4', borderRadius: 8 }}>
                <Group gap={6} mb="xs">
                  <IconHeadset size={16} color="#10B981" />
                  <Text size="xs" fw={700} c="teal">
                    AMC & Support Service Level Parameters
                  </Text>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mb="xs">
                  <TextInput
                    label="Support Period"
                    placeholder="e.g. 12 Months (24/7 Coverage)"
                    value={formSupportPeriod}
                    onChange={(e) => setFormSupportPeriod(e.target.value)}
                    size="xs"
                  />
                  <TextInput
                    label="Service Level Agreement (SLA)"
                    placeholder="e.g. 99.9% Uptime Guarantee"
                    value={formSlaTerms}
                    onChange={(e) => setFormSlaTerms(e.target.value)}
                    size="xs"
                  />
                  <TextInput
                    label="Response Time"
                    placeholder="e.g. Critical: <1h, High: <4h, Normal: <8h"
                    value={formResponseTime}
                    onChange={(e) => setFormResponseTime(e.target.value)}
                    size="xs"
                  />
                  <TextInput
                    label="Renewal Details"
                    placeholder="e.g. Notice 30 days prior to expiry for renewal"
                    value={formRenewalDetails}
                    onChange={(e) => setFormRenewalDetails(e.target.value)}
                    size="xs"
                  />
                </SimpleGrid>
              </Box>
            )}

            {/* Conditional C: Subscription/License */}
            {formContractType === 'Subscription/License' && (
              <Box mt="md" p="sm" style={{ background: isDark ? '#1E293B' : '#FAF5FF', borderRadius: 8 }}>
                <Group gap={6} mb="xs">
                  <IconLicense size={16} color="#8B5CF6" />
                  <Text size="xs" fw={700} c="violet">
                    Subscription & License Specifications
                  </Text>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  <NumberInput
                    label="License Quantity"
                    placeholder="Number of seats / licenses"
                    min={1}
                    value={formLicenseQuantity === 0 ? '' : formLicenseQuantity}
                    onChange={(v) => setFormLicenseQuantity(Number(v) || 0)}
                    size="xs"
                  />
                  <TextInput
                    label="Renewal & Auto-Renewal Details"
                    placeholder="e.g. Auto-renew annually; 30-day written cancellation"
                    value={formRenewalDetails}
                    onChange={(e) => setFormRenewalDetails(e.target.value)}
                    size="xs"
                  />
                </SimpleGrid>
              </Box>
            )}
          </Paper>

          {/* ===================================================================== */}
          {/* SECTION 3: CONTRACT VALUE & PAYMENT TERMS                             */}
          {/* ===================================================================== */}
          <Paper
            p="md"
            radius="md"
            style={{
              background: isDark ? '#111827' : '#F8FAFC',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            }}
          >
            <Group justify="space-between" align="center" mb="sm">
              <Group gap={6}>
                <ThemeIcon size="xs" color="yellow" variant="light">
                  <IconFileSpreadsheet size={12} />
                </ThemeIcon>
                <Text size="xs" fw={800} style={{ color: isDark ? '#F59E0B' : '#D97706', letterSpacing: '0.04em' }}>
                  3. CONTRACT VALUE & PAYMENT TERMS
                </Text>
              </Group>
              <Badge size="xs" variant="outline" color="yellow">
                No Milestones / Billing Schedule
              </Badge>
            </Group>

            {/* Commercial Inputs */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mb="md">
              <NumberInput
                label="Contract Value *"
                placeholder="Base agreement value"
                value={formContractValue === 0 ? '' : formContractValue}
                onChange={(v) => {
                  setFormContractValue(Number(v) || 0);
                  if (errors.contractValue) setErrors((prev) => ({ ...prev, contractValue: '' }));
                }}
                min={0}
                thousandSeparator=","
                prefix="₹ "
                required
                radius="md"
                error={errors.contractValue}
              />

              <NumberInput
                label="Approved Discount Amount"
                placeholder="Discount amount (₹)"
                value={formDiscountAmount === 0 ? '' : formDiscountAmount}
                onChange={(v) => setFormDiscountAmount(Number(v) || 0)}
                min={0}
                thousandSeparator=","
                prefix="₹ "
                radius="md"
                description={formDiscountAppliedFromQuote ? 'Populated from accepted quotation' : undefined}
              />

              <NumberInput
                label="GST / Tax Amount"
                placeholder="Tax amount (₹)"
                value={formTaxAmount === 0 ? '' : formTaxAmount}
                onChange={(v) => setFormTaxAmount(Number(v) || 0)}
                min={0}
                thousandSeparator=","
                prefix="₹ "
                radius="md"
              />
            </SimpleGrid>

            {/* Final Amount Card */}
            <Paper
              p="sm"
              radius="md"
              mb="md"
              style={{
                background: isDark ? '#1F2937' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  Final Contract Amount
                </Text>
                <Text fw={900} size="22px" style={{ color: isDark ? '#34D399' : '#059669' }}>
                  ₹{computedFinalAmount.toLocaleString('en-IN')}
                </Text>
              </div>
            </Paper>

            {/* Payment Method, Due Terms, Advance */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Select
                label="Payment Method"
                data={paymentMethodOptions}
                value={formPaymentMethod}
                onChange={(v) => setFormPaymentMethod((v as ContractPaymentMethod) || 'Full Payment')}
                radius="md"
              />

              <Select
                label="Payment Due Terms"
                data={paymentDueTermsOptions}
                value={formPaymentDueTerms}
                onChange={(v) => setFormPaymentDueTerms((v as ContractPaymentDueTerms) || 'Net 30')}
                radius="md"
              />

              <Box>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" fw={500}>
                    Advance Payment
                  </Text>
                  <SegmentedControl
                    size="xs"
                    value={formAdvancePaymentType}
                    onChange={(v) => setFormAdvancePaymentType(v as 'amount' | 'percentage')}
                    data={[
                      { label: '%', value: 'percentage' },
                      { label: '₹', value: 'amount' },
                    ]}
                  />
                </Group>
                <NumberInput
                  placeholder={formAdvancePaymentType === 'percentage' ? 'Percentage (e.g. 20)' : 'Amount (₹)'}
                  value={formAdvancePaymentValue === 0 ? '' : formAdvancePaymentValue}
                  onChange={(v) => setFormAdvancePaymentValue(Number(v) || 0)}
                  min={0}
                  radius="md"
                />
                <Text size="10px" c="dimmed" mt={2}>
                  Payable Advance: <b>₹{Math.round(computedAdvancePayable).toLocaleString('en-IN')}</b>
                </Text>
              </Box>
            </SimpleGrid>

            {formPaymentDueTerms === 'Custom' && (
              <TextInput
                label="Custom Payment Due Terms"
                placeholder="Specify custom due conditions (e.g. 50% on UAT, 50% on Go-Live)"
                value={formCustomPaymentDueTerms}
                onChange={(e) => setFormCustomPaymentDueTerms(e.target.value)}
                radius="md"
                mt="xs"
              />
            )}
          </Paper>

          {/* ===================================================================== */}
          {/* SECTION 4: DOCUMENTS & SIGNATURES                                     */}
          {/* ===================================================================== */}
          <Paper
            p="md"
            radius="md"
            style={{
              background: isDark ? '#111827' : '#F8FAFC',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            }}
          >
            <Group justify="space-between" align="center" mb="sm">
              <Group gap={6}>
                <ThemeIcon size="xs" color="indigo" variant="light">
                  <IconShieldCheck size={12} />
                </ThemeIcon>
                <Text size="xs" fw={800} style={{ color: isDark ? '#A5B4FC' : '#4F46E5', letterSpacing: '0.04em' }}>
                  4. DOCUMENTS & SIGNATURES
                </Text>
              </Group>
              <Badge size="xs" variant="outline" color="indigo">
                Version {formDocumentVersion}
              </Badge>
            </Group>

            {/* Document Upload & Actions */}
            <Paper p="sm" radius="md" mb="md" style={{ background: isDark ? '#1F2937' : '#FFFFFF', border: '1px dashed #94A3B8' }}>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept=".pdf,.doc,.docx" />
              <Group justify="space-between" align="center">
                <Group gap="sm" align="center">
                  <ThemeIcon size="md" color="indigo" variant="light" radius="md">
                    <IconFileText size={18} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" fw={700}>
                      {formContractDocument || 'No contract document attached'}
                    </Text>
                    <Text size="10px" c="dimmed">
                      PDF, DOCX up to 25MB with automated version tracking
                    </Text>
                  </div>
                </Group>

                <Group gap="xs">
                  {formContractDocument && (
                    <>
                      <Button
                        size="xs"
                        variant="subtle"
                        leftSection={<IconEye size={13} />}
                        onClick={() =>
                          setPreviewDocModal({
                            open: true,
                            title: formContractDocument,
                            url: formDocumentFileUrl,
                            name: formContractDocument,
                          })
                        }
                      >
                        View
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        leftSection={<IconDownload size={13} />}
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = formDocumentFileUrl || '#';
                          link.download = formContractDocument;
                          link.click();
                        }}
                      >
                        Download
                      </Button>
                    </>
                  )}
                  <Button
                    size="xs"
                    variant="light"
                    color="indigo"
                    leftSection={<IconUpload size={13} />}
                    onClick={() => {
                      setFormIsNewRevisionUpload(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    Upload Document
                  </Button>
                  {formContractDocument && (
                    <Button
                      size="xs"
                      variant="outline"
                      color="teal"
                      leftSection={<IconHistory size={13} />}
                      onClick={() => {
                        setFormIsNewRevisionUpload(true);
                        fileInputRef.current?.click();
                      }}
                    >
                      Upload Revised Version
                    </Button>
                  )}
                </Group>
              </Group>

              {/* Document Version History */}
              {formDocumentVersions.length > 0 && (
                <Box mt="xs" pt="xs" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0' }}>
                  <Text size="10px" fw={700} c="dimmed" tt="uppercase" mb={4}>
                    Version History ({formDocumentVersions.length})
                  </Text>
                  <Group gap="xs" wrap="wrap">
                    {formDocumentVersions.map((v, i) => (
                      <Badge key={i} size="xs" variant="light" color="blue">
                        {v.version}: {v.documentName} ({new Date(v.uploadedAt || Date.now()).toLocaleDateString()})
                      </Badge>
                    ))}
                  </Group>
                </Box>
              )}
            </Paper>

            {/* Signatory Fields */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
              <TextInput
                label="Client Signatory Name *"
                placeholder="Authorized Client Officer"
                value={formClientSignatoryName}
                onChange={(e) => {
                  setFormClientSignatoryName(e.target.value);
                  if (errors.clientSignatoryName) setErrors((prev) => ({ ...prev, clientSignatoryName: '' }));
                }}
                error={errors.clientSignatoryName}
                radius="md"
              />

              <TextInput
                label="Company Signatory Name *"
                placeholder="Authorized Company Officer"
                value={formCompanySignatoryName}
                onChange={(e) => {
                  setFormCompanySignatoryName(e.target.value);
                  if (errors.companySignatoryName) setErrors((prev) => ({ ...prev, companySignatoryName: '' }));
                }}
                error={errors.companySignatoryName}
                radius="md"
              />

              <Select
                label="Contract Status"
                data={contractStatusOptions}
                value={formStatus}
                onChange={(v) => {
                  const newStatus = (v as ContractStatus) || 'Draft';
                  setFormStatus(newStatus);
                  if (newStatus === 'Active' || newStatus === 'Completed') {
                    setFormSignatureStatus('Signed');
                    if (!formSignedDate) {
                      setFormSignedDate(new Date().toISOString().split('T')[0]);
                    }
                  } else if (newStatus === 'Pending Signature' || newStatus === 'Draft') {
                    setFormSignatureStatus('Pending');
                  }
                }}
                radius="md"
              />

              <Box>
                <MeetingDatePicker
                  label={formStatus === 'Active' || formSignatureStatus === 'Signed' ? 'Signed Date *' : 'Signed Date'}
                  value={formSignedDate}
                  onChange={(d) => {
                    setFormSignedDate(d);
                    if (errors.signedDate) setErrors((prev) => ({ ...prev, signedDate: '' }));
                  }}
                  placeholder="YYYY-MM-DD"
                  required={formStatus === 'Active' || formSignatureStatus === 'Signed'}
                />
                {errors.signedDate && (
                  <Text size="xs" c="red" mt={2}>
                    {errors.signedDate}
                  </Text>
                )}
              </Box>
            </SimpleGrid>

            {/* Internal remarks / notes */}
            <Textarea
              label="Internal Notes"
              placeholder="Internal remarks, legal review notes, client negotiation considerations"
              value={formInternalNotes}
              onChange={(e) => setFormInternalNotes(e.target.value)}
              autosize
              minRows={2}
              maxRows={5}
              radius="md"
            />
          </Paper>

          {/* Form Actions Footer */}
          <Divider my="md" />
          <Group justify="space-between" align="center">
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => {
                setModalOpen(false);
                setEditingContract(null);
              }}
              disabled={submitting}
              radius="md"
            >
              Back to Contracts
            </Button>

            <Group gap="sm">
              <Button
                variant="default"
                onClick={() => {
                  setModalOpen(false);
                  setEditingContract(null);
                }}
                disabled={submitting}
                radius="md"
              >
                Cancel
              </Button>

              {/* Save as Draft */}
              <Button
                variant="light"
                color="gray"
                radius="md"
                loading={submitting}
                leftSection={<IconFileText size={15} />}
                onClick={() => handleSaveContract('draft')}
              >
                Save as Draft
              </Button>

              {/* Save Contract / Save Changes */}
              <Button
                radius="md"
                color="blue"
                loading={submitting}
                leftSection={<IconCheck size={15} />}
                onClick={() => handleSaveContract('save')}
              >
                {editingContract ? 'Save Changes ✓' : 'Save Contract'}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Paper>
  )}

      {/* ========================================================================= */}
      {/* 6. REJECTION REASON MODAL                                                 */}
      {/* ========================================================================= */}
      <Modal
        opened={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        title="Reject Contract"
        radius="md"
        centered
      >
        <Stack gap="md">
          <Text size="xs" c="dimmed">
            Please provide a specific rejection rationale. This note will be recorded and sent to the contract author for revisions.
          </Text>
          <Textarea
            label="Rejection Reason *"
            placeholder="e.g. Commercial discount exceeds 15% threshold; requires revised executive sign-off on Annexure B."
            value={rejectionReasonText}
            onChange={(e) => setRejectionReasonText(e.target.value)}
            autosize
            minRows={3}
            maxRows={6}
            required
            autoFocus
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setRejectionModalOpen(false)} disabled={rejectionSubmitting}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmRejection} loading={rejectionSubmitting}>
              Confirm Rejection
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ========================================================================= */}
      {/* 7. VIEW CONTRACT DETAILS MODAL                                            */}
      {/* ========================================================================= */}
      <Modal
        opened={!!detailsContract}
        onClose={() => setDetailsContract(null)}
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
            padding: '24px 28px',
            maxHeight: 'calc(92vh - 20px)',
            overflowY: 'auto',
          },
        }}
      >
        {detailsContract && (
          <Stack gap="md">
            {/* Header */}
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                <ThemeIcon size="xl" radius="md" color="teal" variant="light">
                  <IconFileCheck size={26} />
                </ThemeIcon>
                <div>
                  <Text fw={800} size="lg">
                    {detailsContract.title}
                  </Text>
                  <Group gap="xs" mt={2}>
                    <Badge size="xs" color="teal" variant="light" style={{ fontFamily: 'monospace' }}>
                      {detailsContract.contractId}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {detailsContract.clientName}
                    </Text>
                    {renderStatusBadge(detailsContract.status || 'Draft')}
                  </Group>
                </div>
              </Group>

              <ActionIcon variant="subtle" color="gray" onClick={() => setDetailsContract(null)}>
                <IconX size={18} />
              </ActionIcon>
            </Group>

            <Divider />

            {/* Commercial Highlights Card */}
            <Paper p="md" radius="md" style={{ background: isDark ? '#111827' : '#F8FAFC' }}>
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                <div>
                  <Text size="10px" fw={700} c="dimmed" tt="uppercase">
                    Contract Value
                  </Text>
                  <Text fw={800} size="md">
                    ₹{Number(detailsContract.contractValue || 0).toLocaleString('en-IN')}
                  </Text>
                </div>

                <div>
                  <Text size="10px" fw={700} c="dimmed" tt="uppercase">
                    Final Amount
                  </Text>
                  <Text fw={800} size="md" c="teal">
                    ₹{Number(detailsContract.finalContractAmount || detailsContract.contractValue || 0).toLocaleString('en-IN')}
                  </Text>
                </div>

                <div>
                  <Text size="10px" fw={700} c="dimmed" tt="uppercase">
                    Payment Terms
                  </Text>
                  <Text fw={700} size="xs">
                    {detailsContract.paymentMethod} ({detailsContract.paymentDueTerms})
                  </Text>
                </div>

                <div>
                  <Text size="10px" fw={700} c="dimmed" tt="uppercase">
                    Approval Status
                  </Text>
                  <Box mt={2}>{renderStatusBadge(detailsContract.approvalStatus || 'Draft')}</Box>
                </div>
              </SimpleGrid>
            </Paper>

            {/* Scope & Deliverables */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Paper p="sm" radius="md" withBorder style={{ background: isDark ? '#1F2937' : '#FFFFFF' }}>
                <Text size="xs" fw={700} c="blue" mb={4}>
                  Scope of Work
                </Text>
                <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>
                  {detailsContract.scopeOfWork || 'Standard technical scope.'}
                </Text>
              </Paper>

              <Paper p="sm" radius="md" withBorder style={{ background: isDark ? '#1F2937' : '#FFFFFF' }}>
                <Text size="xs" fw={700} c="teal" mb={4}>
                  Deliverables & Key Milestones
                </Text>
                <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>
                  {detailsContract.deliverables || 'Source code, cloud deployment, user documentation.'}
                </Text>
              </Paper>
            </SimpleGrid>

            {/* Acceptance Criteria */}
            {detailsContract.acceptanceCriteria && (
              <Paper p="sm" radius="md" withBorder style={{ background: isDark ? '#1F2937' : '#FFFFFF' }}>
                <Text size="xs" fw={700} c="indigo" mb={4}>
                  Acceptance Criteria
                </Text>
                <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>
                  {detailsContract.acceptanceCriteria}
                </Text>
              </Paper>
            )}

            {/* Signatures & Revisions */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Paper p="sm" radius="md" withBorder style={{ background: isDark ? '#1F2937' : '#FFFFFF' }}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={4}>
                  Client Signatory
                </Text>
                <Text size="xs" fw={600}>
                  {detailsContract.clientSignatoryName || 'Not specified'}
                </Text>
                <Text size="11px" c="dimmed">
                  {detailsContract.clientSignatoryEmail || 'No email registered'}
                </Text>
              </Paper>

              <Paper p="sm" radius="md" withBorder style={{ background: isDark ? '#1F2937' : '#FFFFFF' }}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={4}>
                  Company Signatory
                </Text>
                <Text size="xs" fw={600}>
                  {detailsContract.companySignatoryName || 'OmniTech Solutions Representative'}
                </Text>
                <Text size="11px" c="dimmed">
                  {detailsContract.companySignatoryEmail || 'contracts@omnitech.io'}
                </Text>
              </Paper>
            </SimpleGrid>

            {/* Actions in View Modal */}
            <Group justify="flex-end" mt="md">
              {canEdit && (
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconEdit size={14} />}
                  onClick={() => {
                    const cnt = detailsContract;
                    setDetailsContract(null);
                    handleOpenEditModal(cnt);
                  }}
                >
                  Edit Contract
                </Button>
              )}
              <Button size="xs" color="teal" onClick={() => setDetailsContract(null)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 8. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Contract"
        radius="md"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to permanently delete contract <b>{deleteTarget?.contractId}</b> ({deleteTarget?.title})? This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmDelete} loading={deleteLoading}>
              Delete Contract
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ========================================================================= */}
      {/* 9. DOCUMENT PREVIEW MODAL                                                 */}
      {/* ========================================================================= */}
      <Modal
        opened={previewDocModal.open}
        onClose={() => setPreviewDocModal({ open: false, title: '', url: '', name: '' })}
        title={`Contract Document: ${previewDocModal.name}`}
        size="lg"
        radius="md"
        centered
      >
        <Paper p="xl" style={{ textAlign: 'center', background: isDark ? '#111827' : '#F8FAFC' }}>
          <IconFileText size={64} color="#3B82F6" style={{ margin: '0 auto 12px' }} />
          <Text fw={700} size="md">
            {previewDocModal.name}
          </Text>
          <Text size="xs" c="dimmed" mt={4} mb="md">
            Legally binding contract document attached and verified.
          </Text>
          <Group justify="center" gap="sm">
            <Button
              color="blue"
              leftSection={<IconDownload size={14} />}
              onClick={() => {
                const link = document.createElement('a');
                link.href = previewDocModal.url || '#';
                link.download = previewDocModal.name;
                link.click();
              }}
            >
              Download File
            </Button>
          </Group>
        </Paper>
      </Modal>
    </Box>
  );
};

export default LeadContractSection;
