import { Quotation } from './billing';

export type LeadContactType = 'Company Representative' | 'Individual';
export type LeadRequirementCategory = 'Product' | 'Service';

export type LeadStatus =
  | 'New'
  | 'In Progress'
  | 'Contacted'
  | 'Qualified'
  | 'Proposal Sent'
  | 'In Negotiation'
  | 'Completed'
  | 'Complete'
  | 'Won'
  | 'Lost';

export type LeadStage =
  | 'Initialization'
  | 'Qualification'
  | 'Discovery'
  | 'Requirement Analysis'
  | 'Demo / Presentation'
  | 'Proposal'
  | 'Negotiation'
  | 'Decision Making'
  | 'Won'
  | 'Lost';

export interface LeadActivity {
  type: string;
  title: string;
  status?: string | null;
  direction?: string | null;
  meetingTitle?: string | null;
  followUpDate?: string | null;
  nextFollowDate?: string | null;
  date?: string | null;
  time?: string | null;
  performedBy?: string | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  leadId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  registeredState?: string | null;
  state?: string | null;
  source?: string | null;
  customSource?: string | null;

  // Professional details
  contactType?: LeadContactType | string | null;
  companyName?: string | null;
  designation?: string | null;
  profession?: string | null;

  // Requirement details
  category?: LeadRequirementCategory | string | null;
  productList: string[];
  serviceList: string[];
  product?: string | null;
  service?: string | null;

  // Pipeline Status & Stage
  status: LeadStatus | string;
  stage?: LeadStage | string | null;
  priority?: string | null;
  tag?: string | null;
  tagPriority?: string | null;

  // Assignment & Additional Details
  assignedTo?: string | null;
  assignedToName?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  notes?: string | null;
  agenda?: string | null;

  displayCompany?: string;
  lastActivity?: LeadActivity | null;
  nextFollowDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  source?: string;
  customSource?: string;
  contactType?: LeadContactType | string;
  companyName?: string;
  designation?: string;
  profession?: string;
  category?: LeadRequirementCategory | string;
  productList?: string[];
  serviceList?: string[];
  status?: LeadStatus | string;
  stage?: LeadStage | string;
  priority?: string;
  tag?: string;
  tagPriority?: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  notes?: string | null;
}

export interface LeadFilter {
  search?: string;
  status?: string;
  stage?: string;
  category?: string;
  source?: string;
  companyName?: string;
  contactType?: string;
  assignedTo?: string;
  createdBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface LeadPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeadStats {
  total: number;
  new: number;
  inProgress: number;
  won: number;
  completed?: number;
  complete?: number;
  lost: number;
}

export interface LeadMetadata {
  sources: string[];
  statuses: string[];
  stages: string[];
  categories: string[];
  contactTypes: string[];
  productOptions: string[];
  serviceOptions: string[];
}

export interface ScheduledMeeting {
  id: string;
  leadId: string;
  title: string;
  meetingType: string;
  date: string;
  meetingDate?: string;
  time: string;
  startTime?: string;
  meetingTime?: string;
  endTime?: string;
  duration: string;
  hostName: string;
  employeeName?: string;
  meetingLink?: string;
  agenda?: string;
  purpose?: string;
  stageAfterMeeting?: string;
  project?: string;
  status: 'Scheduled' | 'Rescheduled' | 'Completed' | 'Cancelled' | 'In Progress' | string;
  meetingStatus?: string;
  requirements?: string;
  notes?: string;
  requirementFileName?: string;
  requirementFileUrl?: string;
  requirementFileSize?: string;
  internalAttendees?: string[] | string;
  clientAttendees?: string[] | string;
  rescheduleReason?: string;
  rescheduleHistory?: any[];
  meetingOutcome?: string;
  outcome?: string;
  createdAt: string;
}

// ----------------------------------------------------
// LEAD DEAL PIPELINE TYPES
// ----------------------------------------------------
export type LeadSectionType =
  | 'meetings'
  | 'proposal'
  | 'proposals'
  | 'quotation'
  | 'quotations'
  | 'negotiation'
  | 'contract'
  | 'contracts'
  | 'invoice'
  | 'invoices'
  | 'payment'
  | 'payments'
  | 'progress';

export interface SectionMeta {
  id: LeadSectionType;
  stepNumber: number;
  label: string;
  badgeLabel?: string;
  description: string;
}

export interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface LeadProposal {
  id: string;
  leadId: string;
  proposalNumber: string;
  title: string;
  issueDate: string;
  validUntil: string;
  status: 'Draft' | 'Sent' | 'Under Review' | 'Accepted' | 'Rejected';
  rejectionReason?: string | null;
  currency: string;
  items: ProposalItem[];
  discountPercent: number;
  taxPercent: number;
  subtotal: number;
  totalAmount: number;
  notes: string;
  terms: string;
  documentName?: string;
  documentUrl?: string;
  documentSize?: string;
  createdAt: string;
}

export type NegotiationStatus =
  | 'Draft'
  | 'In Progress'
  | 'Awaiting Client'
  | 'Revised Quotation'
  | 'Won'
  | 'Lost';

export interface NegotiationDiscussionEntry {
  id: string;
  date: string;
  author: string;
  topic?: string;
  notes: string;
  priceImpact?: number;
  status?: string;
  createdAt?: string;
}

export interface Negotiation {
  id: string;
  negotiationId: string; // e.g. NEG-1001
  leadId?: string | null;
  leadName: string;
  clientName?: string | null;
  contactId?: string | null;
  quotationId?: string | null;
  quotationNumber?: string | null;
  proposalId?: string | null;
  proposalNumber?: string | null;
  assignedTo?: string | null;
  assignedToName: string;
  negotiationDate: string; // YYYY-MM-DD
  status: NegotiationStatus;
  quotedAmount: number;
  expectedFinalAmount: number;
  discountPercentage: number;
  discountAmount: number;
  paymentTerms?: string | null;
  scopeChanges?: string | null;
  deliveryTimeline?: string | null;
  clientRequirements?: string | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
  discussionHistory?: NegotiationDiscussionEntry[];
  lossReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NegotiationFormData {
  negotiationId?: string;
  leadId?: string;
  leadName: string;
  clientName?: string;
  contactId?: string;
  quotationId?: string;
  quotationNumber?: string;
  proposalId?: string;
  proposalNumber?: string;
  assignedTo?: string;
  assignedToName: string;
  negotiationDate: string;
  status: NegotiationStatus;
  quotedAmount: number;
  expectedFinalAmount: number;
  discountPercentage: number;
  paymentTerms?: string;
  scopeChanges?: string;
  deliveryTimeline?: string;
  clientRequirements?: string;
  notes?: string;
  nextFollowUpDate?: string;
  lossReason?: string;
}

export interface NegotiationStats {
  total: number;
  inProgress: number;
  awaitingClient: number;
  revisedQuotation: number;
  won: number;
  lost: number;
  totalQuotedValue: number;
  totalExpectedValue: number;
}

export interface NegotiationFilters {
  status?: string;
  search?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  leadId?: string;
  contactId?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NegotiationEntry {
  id: string;
  date: string;
  author: string;
  topic: string;
  notes: string;
  priceImpact?: number;
  type: 'scope' | 'pricing' | 'terms' | 'general';
}

export interface LeadNegotiation {
  leadId: string;
  originalQuotedAmount: number;
  currentAgreedAmount: number;
  discountPercentage: number;
  status: 'In Discussion' | 'Counter-Offer Received' | 'Terms Agreed' | 'Stalled';
  decisionMaker: string;
  keyConcessions: string[];
  nextFollowUpDate?: string;
  entries: NegotiationEntry[];
}


export type ContractType =
  | 'Software Development'
  | 'IT Product Sales'
  | 'IT Services'
  | 'AMC/Support'
  | 'Subscription/License'
  | 'Other';

export type ContractApprovalStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected';

export type ContractSignatureStatus =
  | 'Pending'
  | 'Partially Signed'
  | 'Signed'
  | 'Rejected';

export type ContractStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Pending Signature'
  | 'Active'
  | 'On Hold'
  | 'Completed'
  | 'Terminated'
  | 'Expired';

export type ContractPaymentMethod =
  | 'Full Payment'
  | 'Partial Payment'
  | 'Milestone-Based Payment';

export type ContractPaymentDueTerms =
  | 'Due on Receipt'
  | 'Net 15'
  | 'Net 30'
  | 'Custom';

export interface ContractDocumentRevision {
  version: string;
  documentName: string;
  documentUrl?: string | null;
  uploadedBy?: string;
  uploadedAt?: string;
  notes?: string;
}

export interface ContractProductItem {
  id?: string;
  name: string;
  quantity: number;
  unit?: string;
  partNumber?: string;
  unitPrice?: number;
  description?: string;
}

export interface Contract {
  id: string;
  contractId?: string;
  title: string;
  contractType?: ContractType | string;
  clientName?: string | null;
  leadId?: string | null;
  leadName?: string | null;
  contactId?: string | null;
  customerId?: string | null;
  quotationId?: string | null;
  quotationNumber?: string | null;
  proposalId?: string | null;
  proposalTitle?: string | null;
  proposalNumber?: string | null;
  negotiationId?: string | null;
  negotiationTitle?: string | null;
  negotiationNumber?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  contractDate?: string;

  // Project & Scope Details
  projectName?: string | null;
  projectDescription?: string | null;
  scopeOfWork?: string | null;
  deliverables?: string | null;
  acceptanceCriteria?: string | null;
  responsibilities?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  specialConditions?: string | null;

  // Type-Specific Fields
  productDetails?: ContractProductItem[];
  deliveryDetails?: string | null;
  warrantyTerms?: string | null;
  supportPeriod?: string | null;
  slaTerms?: string | null;
  responseTime?: string | null;
  licenseQuantity?: number;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  renewalDetails?: string | null;

  // Commercial & Payment Terms
  contractValue: number;
  currency?: string;
  discountAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  taxIncluded?: boolean;
  finalContractAmount?: number;
  paymentMethod?: ContractPaymentMethod | string;
  paymentDueTerms?: ContractPaymentDueTerms | string;
  customPaymentDueTerms?: string | null;
  advancePaymentType?: 'amount' | 'percentage';
  advancePaymentValue?: number;
  advancePaymentAmount?: number;
  quotationValueMismatchConfirmed?: boolean;

  // Legal Clauses
  confidentialityClause?: string | null;
  terminationClause?: string | null;
  additionalTerms?: string | null;

  // Documents & Signatures
  contractDocument?: string | null;
  documentName?: string | null;
  documentUrl?: string | null;
  documentSize?: string | null;
  documentVersion?: string;
  documentVersions?: ContractDocumentRevision[];
  attachments?: string[];
  clientSignatoryName?: string | null;
  clientSignatoryEmail?: string | null;
  companySignatoryName?: string | null;
  companySignatoryEmail?: string | null;
  signatureStatus?: ContractSignatureStatus | string;
  signedDate?: string | null;

  // Approval Workflow
  approvalStatus?: ContractApprovalStatus | string;
  approvedBy?: string | null;
  approvalDate?: string | null;
  rejectionReason?: string | null;
  internalNotes?: string | null;

  // Status
  status: ContractStatus | string;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;

  // Compatibility fields for legacy references
  contractNumber?: string;
  effectiveDate?: string;
  expiryDate?: string;
  durationMonths?: number;
  signedByClient?: boolean;
  clientSignedDate?: string;
  signedByCompany?: boolean;
  companySignerName?: string;
  clientSignerName?: string;
  paymentTerms?: string;
  scopeSummary?: string;
}

export interface ContractFormData {
  contractId?: string;
  title: string;
  contractType: ContractType | string;
  clientName: string;
  leadId?: string;
  leadName?: string;
  contactId?: string;
  customerId?: string;
  quotationId?: string;
  quotationNumber?: string;
  proposalId?: string;
  proposalTitle?: string;
  proposalNumber?: string;
  negotiationId?: string;
  negotiationTitle?: string;
  negotiationNumber?: string;
  assignedTo?: string;
  assignedToName?: string;
  contractDate: string;

  // Project & Scope Details
  projectName?: string;
  projectDescription?: string;
  scopeOfWork?: string;
  deliverables?: string;
  acceptanceCriteria?: string;
  responsibilities?: string;
  startDate: string;
  endDate: string;
  specialConditions?: string;

  // Type-Specific Fields
  productDetails?: ContractProductItem[];
  deliveryDetails?: string;
  warrantyTerms?: string;
  supportPeriod?: string;
  slaTerms?: string;
  responseTime?: string;
  licenseQuantity?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  renewalDetails?: string;

  // Commercial & Payment Terms
  contractValue: number;
  currency?: string;
  discountAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  taxIncluded?: boolean;
  finalContractAmount?: number;
  paymentMethod?: ContractPaymentMethod | string;
  paymentDueTerms?: ContractPaymentDueTerms | string;
  customPaymentDueTerms?: string;
  advancePaymentType?: 'amount' | 'percentage';
  advancePaymentValue?: number;
  advancePaymentAmount?: number;
  quotationValueMismatchConfirmed?: boolean;

  // Legal Clauses
  confidentialityClause?: string;
  terminationClause?: string;
  additionalTerms?: string;

  // Documents & Signatures
  contractDocument?: string;
  documentName?: string;
  documentUrl?: string;
  documentSize?: string;
  documentVersion?: string;
  documentVersions?: ContractDocumentRevision[];
  versionNotes?: string;
  attachments?: string[];
  clientSignatoryName?: string;
  clientSignatoryEmail?: string;
  companySignatoryName?: string;
  companySignatoryEmail?: string;
  signatureStatus: ContractSignatureStatus | string;
  signedDate?: string;

  // Approval Workflow
  approvalStatus: ContractApprovalStatus | string;
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
  internalNotes?: string;

  // Status
  status: ContractStatus | string;
  isApprovalSubmission?: boolean;
  isApprovalAction?: boolean;
}

export interface ContractStats {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  active: number;
  signed: number;
  completed: number;
  terminated: number;
  totalContractValue: number;
}

export interface ContractFilters {
  status?: string;
  contractType?: string;
  approvalStatus?: string;
  signatureStatus?: string;
  search?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  leadId?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type LeadContract = Contract;

export interface LeadInvoiceItem {
  id: string;
  invoiceNumber: string;
  title: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: 'Draft' | 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';
  type: 'Advance (40%)' | 'Milestone 1 (30%)' | 'Final Handover (30%)' | 'Custom';
  description?: string;
}

export interface LeadPaymentRecord {
  id: string;
  receiptNumber: string;
  date: string;
  amount: number;
  method: 'Bank Transfer (NEFT/IMPS)' | 'UPI' | 'Credit Card' | 'Cheque';
  referenceId: string;
  invoiceNumber: string;
  status: 'Confirmed' | 'Pending';
  notes?: string;
}

export interface ProjectMilestoneItem {
  id: string;
  title: string;
  description: string;
  percentage: number;
  status: 'Completed' | 'In Progress' | 'Upcoming';
  targetDate: string;
}

export interface LeadProgressData {
  leadId: string;
  projectName: string;
  projectCode: string;
  overallPercentage: number;
  status: 'Planning' | 'In Development' | 'Testing & UAT' | 'Completed' | string;
  projectManager?: string;
  techLead?: string;
  targetDeliveryDate: string;
  stagingUrl?: string;
  repoUrl?: string;
  milestones: ProjectMilestoneItem[];
}

export interface LeadHandoverChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface HandoverAttachment {
  id: string;
  name: string;
  url?: string;
  fileType?: string;
  fileSize?: string;
  uploadedAt?: string;
}

export interface HandoverCommentItem {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  role?: string;
}

export interface LeadHandoverData {
  // 14 Required Fields
  handoverId: string;
  handoverTitle: string;
  handoverType:
    | 'Project Delivery'
    | 'Module Release'
    | 'Client Handover'
    | 'Internal Transition'
    | 'Shift / Task Handover'
    | 'Maintenance & Support'
    | string;
  projectModule: string;
  fromEmployee: string;
  toEmployee: string;
  handoverDate: string;
  completedWork: string;
  pendingTasks: string;
  documents: HandoverAttachment[];
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  approvalStatus: 'Pending Approval' | 'Approved' | 'Rejected' | 'Revision Requested' | string;
  handoverStatus: 'Draft' | 'In Progress' | 'Submitted' | 'Completed' | 'On Hold' | string;
  comments: HandoverCommentItem[];

  // Optional / compatibility properties
  leadId?: string;
  status?: string;
  projectName?: string;
  projectCode?: string;
  clientRepresentative?: string;
  handoverLead?: string;
  checklist?: LeadHandoverChecklistItem[];
  liveUrl?: string;
  adminPortalUrl?: string;
  repoUrl?: string;
  figmaUrl?: string;
  userManualUrl?: string;
  warrantyPeriod?: string;
  supportContact?: string;
  amcStatus?: string;
  handoverNotes?: string;
}

export interface LeadDealData {
  proposals: LeadProposal[];
  quotations?: Quotation[];
  negotiation: LeadNegotiation;
  contract: LeadContract;
  invoices: LeadInvoiceItem[];
  payments: LeadPaymentRecord[];
  progress: LeadProgressData;
  handover?: LeadHandoverData;
}


