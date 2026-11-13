export type ContactType = 'Company Representative' | 'Individual';
export type RequirementCategory = 'Product' | 'Service';
export type ContactMode = 'Call' | 'Email' | 'Meeting' | 'WhatsApp' | 'Other';
export type MeetingType = 'Virtual' | 'In-person';
export type ContactStatus =
  | 'New'
  | 'Active'
  | 'Qualified'
  | 'In Progress'
  | 'On Hold'
  | 'Pending'
  | 'Follow-up Required'
  | 'Completed'
  | 'Won'
  | 'Lost'
  | 'Cancelled'
  | 'Inactive'
  | 'Disqualified';

export type ContactStage =
  | 'New Lead'
  | 'Qualification'
  | 'Discovery'
  | 'Requirement Analysis'
  | 'Demo / Presentation'
  | 'Proposal'
  | 'Negotiation'
  | 'Decision Making'
  | 'Won'
  | 'Lost'
  | 'Contract / Agreement'
  | 'Closed Won'
  | 'Closed Lost'
  | 'Initialization';
export type QualificationStatus = 'Qualified' | 'Unqualified' | 'Pending' | 'In Progress' | 'Disqualified' | 'Follow-up Required' | 'Follow-up';
export type ContactPriority = 'High' | 'Medium' | 'Low';
export type AssignmentStatus = 'Assigned' | 'Unassigned';

export interface EmployeeOption {
  id: string;
  name: string;
  empCode: string;
  email: string;
  designation?: string | null;
  department?: string | null;
}

export interface CompanyOption {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  address?: string | null;
}

export interface LeadOption {
  id: string;
  leadId: string;
  title: string;
  companyName?: string | null;
  status: string;
}

export interface Contact {
  id: string;
  contactId: string;
  bulkId?: string | null;
  batchId?: string | null;
  importedContactId?: string | null;
  isImportedToContact?: boolean | null;

  // 1. Basic Contact Information
  name: string;
  email?: string | null;
  phone: string; // Mobile Number
  address?: string | null;
  location?: string | null;
  source?: string | null;
  website?: string | null;
  customSource?: string | null;

  // 2. Professional & Company Information
  contactType?: ContactType | string | null;
  companyName?: string | null;
  contactPerson?: string | null;
  estimatedValue?: string | null;
  expectedCloseDate?: string | null;
  description?: string | null;
  designation?: string | null;
  profession?: string | null;

  // Company Verification & Firmographic Details
  gstNumber?: string | null;
  employeeCount?: string | null;
  companyPan?: string | null;
  cinNumber?: string | null;
  companyWebsite?: string | null;
  linkedinUrl?: string | null;
  annualTurnover?: string | null;
  annualRevenue?: string | null;
  verificationStatus?: 'Verified' | 'Pending' | 'Unverified' | string | null;
  registeredState?: string | null;

  // 3. Requirement Details
  category?: RequirementCategory | string | null;
  productList: string[];
  serviceList: string[];
  customProduct?: string | null;
  productCode?: string | null;

  // 4. Interaction & Follow-up Details
  contactMode?: ContactMode | string | null;
  callType?: string | null;
  callDate?: string | null;
  callFromTime?: string | null;
  callToTime?: string | null;
  callDuration?: string | null;
  callStatus?: string | null;
  customContactMode?: string | null;
  meetingType?: MeetingType | string | null;
  nextFollowDate?: string | null;
  remarks?: string | null;
  notes?: string | null;

  // WhatsApp Interaction Details
  whatsappMessageType?: string | null;
  whatsappStatus?: string | null;
  whatsappDate?: string | null;
  whatsappTime?: string | null;

  // Email Interaction Details
  emailType?: string | null;
  emailStatus?: string | null;
  emailDate?: string | null;
  emailTime?: string | null;

  // Other Activity Details
  activityType?: string | null;
  activityStatus?: string | null;
  activityDate?: string | null;
  activityTime?: string | null;

  // Meeting Interaction Details
  meetingTitle?: string | null;
  meetingPurpose?: string | null;
  meetingHostId?: string | null;
  meetingHostName?: string | null;
  meetingDate?: string | null;
  meetingFromTime?: string | null;
  meetingToTime?: string | null;
  meetingDuration?: string | null;
  meetingLocation?: string | null;
  meetingStatus?: string | null;
  rescheduleDate?: string | null;
  rescheduleTime?: string | null;
  rescheduledDate?: string | null;
  rescheduledTime?: string | null;

  // 5. Qualification Details
  status: ContactStatus | string;
  stage?: ContactStage | string | null;
  businessNeed?: string | null;
  budgetRange?: string | null;
  decisionMaker?: string | null;
  purchaseTimeline?: string | null;
  interestedService?: string | null;
  priority?: ContactPriority | string | null;
  tagPriority?: string | null;
  qualificationStatus?: QualificationStatus | string | null;
  qualifiedBy?: string | null;
  qualificationDate?: string | null;
  unqualifiedReason?: string | null;
  disqualificationReason?: string | null;
  estimatedBudget?: number | string | null;
  projectType?: string | null;
  expectedUsers?: number | string | null;
  expectedGoLiveDate?: string | null;
  influencer?: string | null;
  otherOptions?: string | null;

  // 6. Assignment & System Metadata
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedBy?: string | null;
  createdBy?: string | null;
  assignmentStatus?: AssignmentStatus | string | null;

  // 7. Verified Odoo ERP Contact Fields
  title?: string | null;
  mobile?: string | null;
  tags?: string[];
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  paymentTerms?: string | null;
  creditLimit?: string | null;
  internalReference?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ContactFormData {
  id?: string;
  contactId?: string;
  leadId?: string;
  leadCode?: string;

  // 1. Basic Contact Information
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: string;
  source?: string;
  website?: string;
  customSource?: string;

  // 2. Professional & Company Information
  contactType?: ContactType | string;
  companyName?: string;
  contactPerson?: string;
  estimatedValue?: string;
  expectedCloseDate?: string;
  description?: string;
  designation?: string;
  profession?: string;

  // Company Verification & Firmographic Details
  gstNumber?: string;
  employeeCount?: string;
  companyPan?: string;
  cinNumber?: string;
  companyWebsite?: string;
  linkedinUrl?: string;
  annualTurnover?: string;
  annualRevenue?: string;
  verificationStatus?: 'Verified' | 'Pending' | 'Unverified' | string;
  registeredState?: string;

  // 3. Requirement Details
  category?: RequirementCategory | string;
  productList?: string[];
  serviceList?: string[];
  customProduct?: string;

  // 4. Interaction & Follow-up Details
  contactMode?: ContactMode | string;
  callType?: string;
  callDate?: string;
  callFromTime?: string;
  callToTime?: string;
  callDuration?: string;
  callStatus?: string;
  customContactMode?: string;
  meetingType?: MeetingType | string;
  nextFollowDate?: string | null;
  remarks?: string;
  notes?: string;

  // WhatsApp Interaction Details
  whatsappMessageType?: string;
  whatsappStatus?: string;
  whatsappDate?: string;
  whatsappTime?: string;

  // Email Interaction Details
  emailType?: string;
  emailStatus?: string;
  emailDate?: string;
  emailTime?: string;

  // Other Activity Details
  activityType?: string;
  activityStatus?: string;
  activityDate?: string;
  activityTime?: string;

  // Meeting Interaction Details
  meetingTitle?: string;
  meetingPurpose?: string;
  meetingHostId?: string;
  meetingHostName?: string;
  meetingDate?: string;
  meetingFromTime?: string;
  meetingToTime?: string;
  meetingDuration?: string;
  meetingLocation?: string;
  meetingStatus?: string;
  rescheduleDate?: string;
  rescheduleTime?: string;
  rescheduledDate?: string;
  rescheduledTime?: string;

  // 5. Qualification & Status
  status?: ContactStatus | string;
  stage?: ContactStage | string;
  businessNeed?: string;
  budgetRange?: string;
  decisionMaker?: string;
  purchaseTimeline?: string;
  interestedService?: string;
  priority?: ContactPriority | string;
  tagPriority?: string;
  qualificationStatus?: QualificationStatus | string;
  qualifiedBy?: string;
  qualificationDate?: string;
  unqualifiedReason?: string;
  disqualificationReason?: string;
  estimatedBudget?: number | string;
  projectType?: string;
  expectedUsers?: number | string;
  expectedGoLiveDate?: string;
  influencer?: string;
  otherOptions?: string;

  // 6. Assignment
  assignedTo?: string;
  assignedToName?: string;
  assignedBy?: string;
  assignmentStatus?: AssignmentStatus | string;
  createdBy?: string;

  // 7. Verified Odoo ERP Contact Fields
  title?: string;
  mobile?: string;
  tags?: string[];
  street?: string;
  street2?: string;
  city?: string;
  zip?: string;
  country?: string;
  paymentTerms?: string;
  creditLimit?: string;
  internalReference?: string;
}

export interface ContactFilter {
  tab?: string;
  section?: string;
  search?: string;
  companyName?: string;
  contactType?: string;
  category?: string;
  source?: string;
  status?: string;
  stage?: string;
  qualificationStatus?: string;
  priority?: string;
  assignedTo?: string;
  assignmentStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ContactPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface ContactStats {
  total: number;
  new: number;
  active: number;
  qualified: number;
  qualification?: number;
  disqualified: number;
  assigned: number;
  unassigned: number;
  highPriority: number;
  bulkImport?: number;
  bulkBatches?: number;
}

export interface ContactMetadata {
  contactTypes: string[];
  sources: string[];
  categories: string[];
  productOptions: string[];
  serviceOptions: string[];
  catalogProducts?: string[];
  catalogServices?: string[];
  contactModes: string[];
  meetingTypes: string[];
  statuses: string[];
  stages: string[];
  qualificationStatuses: string[];
  priorities: string[];
  projectTypes: string[];
  assignmentStatuses: string[];
  employees: EmployeeOption[];
  companies: CompanyOption[];
  leads: LeadOption[];
  titles?: string[];
  odooTags?: string[];
  paymentTermOptions?: string[];
  countries?: string[];
}

export interface BulkUploadContact {
  id: string;
  bulkId?: string | null;
  batchId?: string | null;
  fileName?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  contactPerson?: string | null;
  designation?: string | null;
  profession?: string | null;
  category?: string | null;
  source?: string | null;
  remarks?: string | null;
  status?: string | null;
  stage?: string | null;
  priority?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignmentStatus?: string | null;
  isImportedToContact?: boolean;
  importedContactId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FailedRowInfo {
  row: number;
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  reason?: string;
}

export interface ImportBatch {
  id: string;
  batchId: string;
  fileName: string;
  fileSize?: number;
  totalRows: number;
  importedCount: number;
  failedCount: number;
  status: 'Completed' | 'Partial' | 'Failed' | string;
  failedRows?: FailedRowInfo[] | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}


