export type TicketStatus =
  | 'New'
  | 'Assigned'
  | 'In Progress'
  | 'Pending Customer'
  | 'On Hold'
  | 'Resolved'
  | 'Reopened'
  | 'Closed'
  | 'Cancelled';

export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type TicketIssueType =
  | 'Bug'
  | 'Technical Issue'
  | 'UI / Design Issue'
  | 'Performance Issue'
  | 'Feature Request'
  | 'Change Request'
  | 'General Support';

export type TicketSource = 'Customer' | 'Email' | 'Phone' | 'Internal' | 'Project';

export type TicketEnvironment = 'Production' | 'Staging' | 'Development';

export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  filePath: string;
  mimeType?: string;
  fileSize?: number;
  uploadedBy?: string;
  uploadedById?: string;
  uploadedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  type: 'public_reply' | 'internal_note';
  isInternal?: boolean;
  message: string;
  authorId?: string;
  authorName: string;
  authorRole?: string;
  attachments?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketAssignment {
  id: string;
  ticketId: string;
  team?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedBy?: string;
  assignedByName?: string;
  assignedAt: string;
  unassignedAt?: string;
  assignmentReason?: string;
}

export interface TicketHistory {
  id: string;
  ticketId: string;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  performedBy: string;
  performedById?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  source: TicketSource;
  customerId?: string;
  customerName?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  projectId?: string;
  projectName?: string;
  projectStatus?: string;
  projectManagerName?: string;
  handoverId?: string;
  contractId?: string;
  contractTitle?: string;
  contractType?: string;
  slaTerms?: string;
  warrantyTerms?: string;
  affectedModule?: string;
  issueType: TicketIssueType;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTeam?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  assignedToAvatar?: string;
  teamLeadId?: string;
  teamLeadName?: string;
  qaAssignedTo?: string;
  qaAssignedToName?: string;
  reportedBy: string;
  reportedById?: string;
  reportedAt: string;
  firstResponseAt?: string;
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
  targetResolutionDate?: string;
  resolvedAt?: string;
  closedAt?: string;
  reopenedCount: number;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  environment?: TicketEnvironment;
  browserDevice?: string;
  errorMessage?: string;
  rootCause?: string;
  workaround?: string;
  resolutionDescription?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
  attachments?: TicketAttachment[];
  assignments?: TicketAssignment[];
  comments?: TicketComment[];
  history?: TicketHistory[];
}

export interface TicketFilters {
  search?: string;
  status?: string;
  priority?: string;
  issueType?: string;
  assignedTeam?: string;
  assignedTo?: string;
  customerId?: string;
  projectId?: string;
  viewTab?: 'all' | 'my' | 'unassigned';
  dateFrom?: string;
  dateTo?: string;
}

export interface TicketDropdownMetadata {
  customers: Array<{ id: string; code: string; name: string; contactPerson?: string; email?: string; phone?: string }>;
  projects: Array<{ id: string; code: string; name: string; clientName?: string; contactId?: string; status?: string; projectManagerName?: string }>;
  contacts: Array<{ id: string; code: string; name: string; email?: string; phone?: string; companyName?: string }>;
  leads?: Array<{ id: string; code: string; name: string; email?: string; phone?: string; companyName?: string }>;
  employees: Array<{ id: string; code: string; name: string; email?: string; department?: string; designation?: string; role?: string; status?: string }>;
  contracts: Array<{ id: string; code: string; title: string; clientName?: string; contactId?: string; contractType?: string; slaTerms?: string; warrantyTerms?: string }>;
  teams: string[];
}

