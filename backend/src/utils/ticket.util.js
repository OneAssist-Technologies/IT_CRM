import { query } from '../config/db.js';

export const VALID_STATUSES = [
  'New',
  'Assigned',
  'In Progress',
  'Pending Customer',
  'On Hold',
  'Resolved',
  'Reopened',
  'Closed',
  'Cancelled',
];

export const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const VALID_SOURCES = ['Customer', 'Email', 'Phone', 'Internal', 'Project'];

export const VALID_ISSUE_TYPES = [
  'Bug',
  'Technical Issue',
  'UI / Design Issue',
  'Performance Issue',
  'Feature Request',
  'Change Request',
  'General Support',
];

/**
 * Allowed status transitions map
 */
export const ALLOWED_STATUS_TRANSITIONS = {
  New: ['Assigned', 'Cancelled'],
  Assigned: ['In Progress', 'Cancelled'],
  'In Progress': ['Pending Customer', 'On Hold', 'Resolved'],
  'Pending Customer': ['In Progress'],
  'On Hold': ['In Progress'],
  Resolved: ['In Progress', 'Reopened', 'Closed'],
  Reopened: ['In Progress'],
  Closed: [],
  Cancelled: [],
};

/**
 * Calculate target SLA dates based on priority
 */
export function calculateSLADates(priority = 'Medium', startDate = new Date()) {
  const base = new Date(startDate);
  let firstResponseHours = 8;
  let resolutionHours = 72;

  switch (String(priority).trim().toLowerCase()) {
    case 'critical':
      firstResponseHours = 1;
      resolutionHours = 8;
      break;
    case 'high':
      firstResponseHours = 4;
      resolutionHours = 24;
      break;
    case 'medium':
      firstResponseHours = 8;
      resolutionHours = 72;
      break;
    case 'low':
      firstResponseHours = 24;
      resolutionHours = 120;
      break;
    default:
      firstResponseHours = 8;
      resolutionHours = 72;
      break;
  }

  const firstResponseDue = new Date(base.getTime() + firstResponseHours * 60 * 60 * 1000);
  const resolutionDue = new Date(base.getTime() + resolutionHours * 60 * 60 * 1000);

  return {
    firstResponseDue,
    resolutionDue,
  };
}

/**
 * Generate next sequential Ticket Number (e.g. TKT-000001)
 */
export async function generateTicketNumber() {
  const prefix = 'TKT-';

  const sql = `
    SELECT ticket_number 
    FROM support_tickets 
    WHERE ticket_number LIKE $1 
    ORDER BY ticket_number DESC 
    LIMIT 1;
  `;
  const result = await query(sql, [`${prefix}%`]);

  let nextSequence = 1;
  if (result.rows && result.rows.length > 0) {
    const lastNumberStr = result.rows[0].ticket_number;
    const match = lastNumberStr.match(/\d+$/);
    if (match) {
      const parsedSeq = parseInt(match[0], 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }

  return `${prefix}${String(nextSequence).padStart(6, '0')}`;
}

/**
 * Verify whether a status transition is permitted
 */
export function isValidTransition(currentStatus, targetStatus) {
  if (!currentStatus || !targetStatus) return false;
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

/**
 * Formats a raw database row into an API-friendly structure
 */
export function formatTicketRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    subject: row.subject,
    description: row.description,
    source: row.source,
    customerId: row.customer_id,
    customerName: row.customer_name || null,
    contactId: row.contact_id,
    contactName: row.contact_name || null,
    contactEmail: row.contact_email || null,
    contactPhone: row.contact_phone || null,
    projectId: row.project_id,
    projectName: row.project_name || null,
    projectStatus: row.project_status || null,
    projectManagerName: row.project_manager_name || null,
    handoverId: row.handover_id || null,
    contractId: row.contract_id || null,
    contractTitle: row.contract_title || null,
    contractType: row.contract_type || null,
    slaTerms: row.sla_terms || null,
    warrantyTerms: row.warranty_terms || null,
    affectedModule: row.affected_module || null,
    issueType: row.issue_type,
    priority: row.priority,
    status: row.status,
    assignedTeam: row.assigned_team || null,
    assignedTo: row.assigned_to || null,
    assignedToName: row.assigned_to_name || null,
    assignedToEmail: row.assigned_to_email || null,
    assignedToAvatar: row.assigned_to_avatar || null,
    teamLeadId: row.team_lead_id || null,
    teamLeadName: row.team_lead_name || null,
    qaAssignedTo: row.qa_assigned_to || null,
    qaAssignedToName: row.qa_assigned_to_name || null,
    reportedBy: row.reported_by,
    reportedById: row.reported_by_id,
    reportedAt: row.reported_at,
    firstResponseAt: row.first_response_at,
    firstResponseDueAt: row.first_response_due_at,
    resolutionDueAt: row.resolution_due_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    reopenedCount: row.reopened_count || 0,
    stepsToReproduce: row.steps_to_reproduce || '',
    expectedResult: row.expected_result || '',
    actualResult: row.actual_result || '',
    environment: row.environment || 'Production',
    browserDevice: row.browser_device || '',
    errorMessage: row.error_message || '',
    rootCause: row.root_cause || '',
    workaround: row.workaround || '',
    resolutionDescription: row.resolution_description || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOverdue:
      row.resolution_due_at &&
      new Date(row.resolution_due_at) < new Date() &&
      !['Resolved', 'Closed', 'Cancelled'].includes(row.status),
  };
}

export default {
  VALID_STATUSES,
  VALID_PRIORITIES,
  VALID_SOURCES,
  VALID_ISSUE_TYPES,
  ALLOWED_STATUS_TRANSITIONS,
  calculateSLADates,
  generateTicketNumber,
  isValidTransition,
  formatTicketRow,
};

