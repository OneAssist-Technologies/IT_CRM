import { SupportTicketModel } from '../models/supportTicket.model.js';
import {
  generateTicketNumber,
  calculateSLADates,
  isValidTransition,
  VALID_STATUSES,
  VALID_PRIORITIES,
  VALID_ISSUE_TYPES,
} from '../utils/ticket.util.js';
import { io } from '../utils/socket.js';

export class SupportTicketService {
  /**
   * 1. Create a new support ticket
   */
  static async createTicket(data, user) {
    if (!data.subject || !String(data.subject).trim()) {
      const err = new Error('Subject is required');
      err.status = 400;
      throw err;
    }
    if (!data.description || !String(data.description).trim()) {
      const err = new Error('Description is required');
      err.status = 400;
      throw err;
    }

    const ticketNumber = await generateTicketNumber();
    const priority = data.priority || 'Medium';
    const { firstResponseDue, resolutionDue } = calculateSLADates(priority);

    // Initial status: Assigned if assigned_to is provided, else New
    const initialStatus = data.assigned_to ? 'Assigned' : 'New';

    const insertPayload = {
      ticket_number: ticketNumber,
      subject: String(data.subject).trim(),
      description: String(data.description).trim(),
      source: data.source || 'Customer',
      customer_id: data.customer_id || null,
      contact_id: data.contact_id || null,
      contact_name: data.contact_name || null,
      project_id: data.project_id || null,
      handover_id: data.handover_id || null,
      contract_id: data.contract_id || null,
      affected_module: data.affected_module || null,
      issue_type: data.issue_type || 'Bug',
      priority,
      status: initialStatus,
      assigned_team: data.assigned_team || null,
      assigned_to: data.assigned_to || null,
      team_lead_id: data.team_lead_id || null,
      qa_assigned_to: data.qa_assigned_to || null,
      reported_by: data.reported_by || user?.name || 'Authorized Staff',
      reported_by_id: data.reported_by_id || user?.id || null,
      reported_at: new Date(),
      first_response_due_at: firstResponseDue,
      resolution_due_at: data.due_date ? new Date(data.due_date) : resolutionDue,
      steps_to_reproduce: data.steps_to_reproduce || '',
      expected_result: data.expected_result || '',
      actual_result: data.actual_result || '',
      environment: data.environment || 'Production',
      browser_device: data.browser_device || '',
      error_message: data.error_message || '',
      root_cause: data.root_cause || '',
      workaround: data.workaround || '',
      resolution_description: data.resolution_description || '',
      created_by: user?.id || null,
    };

    const newTicket = await SupportTicketModel.create(insertPayload);

    // Initial Audit History Log
    await SupportTicketModel.addHistory({
      ticket_id: newTicket.id,
      action: 'CREATED',
      field_name: 'status',
      old_value: null,
      new_value: initialStatus,
      reason: `Ticket created with ID ${newTicket.ticketNumber}`,
      performed_by: user?.name || 'System',
      performed_by_id: user?.id || null,
    });

    // If assigned upon creation, log assignment
    if (data.assigned_to) {
      await SupportTicketModel.addAssignment({
        ticket_id: newTicket.id,
        team: data.assigned_team,
        assigned_to: data.assigned_to,
        assigned_to_name: newTicket.assignedToName || 'Assigned Staff',
        assigned_by: user?.id,
        assigned_by_name: user?.name || 'System',
        assignment_reason: 'Initial assignment upon ticket creation',
      });
    }

    // Emit Real-time WebSockets event
    try {
      io.emit('ticket:created', newTicket);
    } catch (_) {}

    return newTicket;
  }

  /**
   * 2. Query tickets with filters and pagination
   */
  static async getTickets(filters, options, user) {
    // If user requested 'my' tickets and did not pass explicit userId, fallback to user.id
    if (filters.viewTab === 'my') {
      filters.userId = user?.id;
      filters.employeeId = user?.employeeId || user?.id;
    }
    return await SupportTicketModel.findTickets(filters, options);
  }

  /**
   * 3. Get detailed ticket record with sub-collections
   */
  static async getTicketById(id, user) {
    const ticket = await SupportTicketModel.findById(id);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.status = 404;
      throw err;
    }

    // Only internal staff can view internal notes
    const isInternalStaff = user && (user.role || '').toUpperCase() !== 'CUSTOMER';

    const [attachments, assignments, comments, history] = await Promise.all([
      SupportTicketModel.getAttachments(ticket.id),
      SupportTicketModel.getAssignments(ticket.id),
      SupportTicketModel.getComments(ticket.id, isInternalStaff),
      SupportTicketModel.getHistory(ticket.id),
    ]);

    return {
      ...ticket,
      attachments,
      assignments,
      comments,
      history,
    };
  }

  /**
   * 4. Update ticket details
   */
  static async updateTicket(id, data, user) {
    const existing = await SupportTicketModel.findById(id);
    if (!existing) {
      const err = new Error('Ticket not found');
      err.status = 404;
      throw err;
    }

    if (data.due_date && !data.resolution_due_at) {
      data.resolution_due_at = new Date(data.due_date);
    }

    const updated = await SupportTicketModel.update(existing.id, data);

    // Audit log
    await SupportTicketModel.addHistory({
      ticket_id: existing.id,
      action: 'UPDATED',
      field_name: 'general_details',
      old_value: null,
      new_value: 'Ticket details updated',
      reason: data.update_reason || 'Information updated by staff',
      performed_by: user?.name || 'Staff',
      performed_by_id: user?.id || null,
    });

    try {
      io.emit('ticket:updated', updated);
    } catch (_) {}

    return updated;
  }

  /**
   * 5. Transition Ticket Status with State Machine enforcement
   */
  static async changeStatus(id, targetStatus, payload = {}, user) {
    const ticket = await SupportTicketModel.findById(id);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.status = 404;
      throw err;
    }

    if (!VALID_STATUSES.includes(targetStatus)) {
      const err = new Error(`Invalid status: ${targetStatus}`);
      err.status = 400;
      throw err;
    }

    if (!isValidTransition(ticket.status, targetStatus)) {
      const err = new Error(
        `Invalid status transition from "${ticket.status}" to "${targetStatus}". Allowed transitions: ${
          SupportTicketService.getAllowedTransitions(ticket.status).join(', ') || 'None'
        }`
      );
      err.status = 400;
      throw err;
    }

    const updateFields = { status: targetStatus };

    // Enforcement: Resolving requires resolution details
    if (targetStatus === 'Resolved') {
      const resolutionDesc = payload.resolution_description || payload.resolutionDescription;
      if (!resolutionDesc || !String(resolutionDesc).trim()) {
        const err = new Error('Resolution description is required when resolving a ticket');
        err.status = 400;
        throw err;
      }
      updateFields.resolved_at = new Date();
      updateFields.resolution_description = String(resolutionDesc).trim();
      if (payload.root_cause || payload.rootCause) {
        updateFields.root_cause = String(payload.root_cause || payload.rootCause).trim();
      }
      if (payload.workaround) {
        updateFields.workaround = String(payload.workaround).trim();
      }
    }

    // Enforcement: Reopening increments reopened count and logs reason
    if (targetStatus === 'Reopened') {
      updateFields.reopened_count = (ticket.reopenedCount || 0) + 1;
      updateFields.resolved_at = null; // Clear resolved date on reopen
    }

    // Closing sets closed_at
    if (targetStatus === 'Closed') {
      updateFields.closed_at = new Date();
    }

    const updated = await SupportTicketModel.update(ticket.id, updateFields);

    // Audit History Entry
    await SupportTicketModel.addHistory({
      ticket_id: ticket.id,
      action: 'STATUS_CHANGED',
      field_name: 'status',
      old_value: ticket.status,
      new_value: targetStatus,
      reason: payload.reason || payload.notes || `Status changed from ${ticket.status} to ${targetStatus}`,
      performed_by: user?.name || 'Staff',
      performed_by_id: user?.id || null,
    });

    try {
      io.emit('ticket:status_changed', {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        oldStatus: ticket.status,
        newStatus: targetStatus,
        updated,
      });
    } catch (_) {}

    return updated;
  }

  /**
   * 6. Reassign ticket to another employee, lead, QA or team
   */
  static async reassignTicket(id, assignmentData, user) {
    const ticket = await SupportTicketModel.findById(id);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.status = 404;
      throw err;
    }

    const updateFields = {};
    if (assignmentData.assigned_team !== undefined) {
      updateFields.assigned_team = assignmentData.assigned_team;
    }
    if (assignmentData.assigned_to !== undefined) {
      updateFields.assigned_to = assignmentData.assigned_to;
      // If newly assigned from New status, advance status to Assigned
      if (ticket.status === 'New' && assignmentData.assigned_to) {
        updateFields.status = 'Assigned';
      }
    }
    if (assignmentData.team_lead_id !== undefined) {
      updateFields.team_lead_id = assignmentData.team_lead_id;
    }
    if (assignmentData.qa_assigned_to !== undefined) {
      updateFields.qa_assigned_to = assignmentData.qa_assigned_to;
    }

    const updated = await SupportTicketModel.update(ticket.id, updateFields);

    // Log assignment record
    await SupportTicketModel.addAssignment({
      ticket_id: ticket.id,
      team: assignmentData.assigned_team || ticket.assignedTeam,
      assigned_to: assignmentData.assigned_to || ticket.assignedTo,
      assigned_to_name: updated.assignedToName || 'Staff',
      assigned_by: user?.id,
      assigned_by_name: user?.name || 'Staff',
      assignment_reason: assignmentData.reason || 'Ticket reassignment',
    });

    // Audit log
    await SupportTicketModel.addHistory({
      ticket_id: ticket.id,
      action: 'REASSIGNED',
      field_name: 'assigned_to',
      old_value: ticket.assignedToName || ticket.assignedTo || 'Unassigned',
      new_value: updated.assignedToName || updated.assignedTo || 'Unassigned',
      reason: assignmentData.reason || 'Assignment updated',
      performed_by: user?.name || 'Staff',
      performed_by_id: user?.id || null,
    });

    try {
      io.emit('ticket:assigned', updated);
    } catch (_) {}

    return updated;
  }

  /**
   * 7. Add Comment (Public Reply or Internal Note)
   */
  static async addComment(id, commentData, user) {
    const ticket = await SupportTicketModel.findById(id);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.status = 404;
      throw err;
    }

    if (!commentData.message || !String(commentData.message).trim()) {
      const err = new Error('Comment message is required');
      err.status = 400;
      throw err;
    }

    const type = commentData.type === 'internal_note' ? 'internal_note' : 'public_reply';

    const comment = await SupportTicketModel.addComment({
      ticket_id: ticket.id,
      type,
      message: String(commentData.message).trim(),
      author_id: user?.id || null,
      author_name: user?.name || 'Staff',
      author_role: user?.role || 'Support Agent',
      attachments: commentData.attachments || [],
    });

    // If first response from staff to customer ticket, capture first_response_at
    if (type === 'public_reply' && !ticket.firstResponseAt) {
      await SupportTicketModel.update(ticket.id, {
        first_response_at: new Date(),
      });
    }

    // Log audit
    await SupportTicketModel.addHistory({
      ticket_id: ticket.id,
      action: 'COMMENTED',
      field_name: type,
      old_value: null,
      new_value: `${type === 'internal_note' ? 'Internal note' : 'Public reply'} added`,
      reason: String(commentData.message).substring(0, 80),
      performed_by: user?.name || 'Staff',
      performed_by_id: user?.id || null,
    });

    try {
      io.emit('ticket:comment_added', { ticketId: ticket.id, comment });
    } catch (_) {}

    return comment;
  }

  /**
   * 8. Attach uploaded files to ticket
   */
  static async addAttachments(id, files = [], user) {
    const ticket = await SupportTicketModel.findById(id);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.status = 404;
      throw err;
    }

    const added = [];
    for (const f of files) {
      const att = await SupportTicketModel.addAttachment({
        ticket_id: ticket.id,
        file_name: f.originalname || f.filename,
        file_path: f.path.replace(/\\/g, '/'),
        mime_type: f.mimetype,
        file_size: f.size,
        uploaded_by: user?.name || 'Staff',
        uploaded_by_id: user?.id || null,
      });
      added.push(att);
    }

    return added;
  }

  /**
   * 9. Resolve Ticket with description
   */
  static async resolveTicket(id, resolveData = {}, user) {
    return await this.changeStatus(id, 'Resolved', resolveData, user);
  }

  /**
   * 10. Reopen Ticket with reason
   */
  static async reopenTicket(id, reopenData = {}, user) {
    return await this.changeStatus(id, 'Reopened', reopenData, user);
  }

  /**
   * 11. Fetch Dropdown Metadata for Form Builders
   */
  static async getDropdownMetadata() {
    return await SupportTicketModel.getDropdownMetadata();
  }

  /**
   * 12. Fetch Ticket Stats
   */
  static async getStats(user) {
    const userId = user?.employeeId || user?.id;
    return await SupportTicketModel.getStats(userId);
  }

  /**
   * 13. Delete Ticket
   */
  static async deleteTicket(id, user) {
    const existing = await SupportTicketModel.findById(id);
    if (!existing) {
      const err = new Error('Ticket not found');
      err.status = 404;
      throw err;
    }

    const deleted = await SupportTicketModel.delete(existing.id);

    try {
      io.emit('ticket:deleted', { id: existing.id, ticketNumber: existing.ticketNumber });
    } catch (_) {}

    return deleted;
  }

  static getAllowedTransitions(currentStatus) {
    const map = {
      New: ['Assigned', 'Cancelled'],
      Assigned: ['In Progress', 'Cancelled'],
      'In Progress': ['Pending Customer', 'On Hold', 'Resolved'],
      'Pending Customer': ['In Progress'],
      'On Hold': ['In Progress'],
      Resolved: ['Reopened', 'Closed'],
      Reopened: ['In Progress'],
      Closed: [],
      Cancelled: [],
    };
    return map[currentStatus] || [];
  }
}

export default SupportTicketService;

