import { SupportTicketService } from '../services/supportTicket.service.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';

export class SupportTicketController {
  /**
   * POST /api/support-tickets
   */
  static async createTicket(req, res) {
    try {
      const ticket = await SupportTicketService.createTicket(req.body, req.user);
      return sendSuccess(res, ticket, 'Support ticket created successfully', 201);
    } catch (error) {
      console.error('[SupportTicketController.createTicket] Error:', error);
      return sendError(res, error.message || 'Failed to create support ticket', error.status || 500);
    }
  }

  /**
   * GET /api/support-tickets
   */
  static async getTickets(req, res) {
    try {
      const {
        search,
        status,
        priority,
        issueType,
        assignedTeam,
        assignedTo,
        customerId,
        projectId,
        viewTab = 'all',
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = req.query;

      const filters = {
        search,
        status,
        priority,
        issueType,
        assignedTeam,
        assignedTo,
        customerId,
        projectId,
        viewTab,
        dateFrom,
        dateTo,
      };

      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sortBy,
        sortOrder,
      };

      const result = await SupportTicketService.getTickets(filters, options, req.user);
      return sendPaginated(
        res,
        result.tickets,
        result.total,
        result.page,
        result.limit,
        'Support tickets retrieved successfully'
      );
    } catch (error) {
      console.error('[SupportTicketController.getTickets] Error:', error);
      return sendError(res, error.message || 'Failed to retrieve support tickets', 500);
    }
  }

  /**
   * GET /api/support-tickets/metadata
   */
  static async getMetadata(req, res) {
    try {
      const data = await SupportTicketService.getDropdownMetadata();
      return sendSuccess(res, data, 'Dropdown metadata retrieved successfully');
    } catch (error) {
      console.error('[SupportTicketController.getMetadata] Error:', error);
      return sendError(res, error.message || 'Failed to fetch dropdown metadata', 500);
    }
  }

  /**
   * GET /api/support-tickets/stats
   */
  static async getStats(req, res) {
    try {
      const data = await SupportTicketService.getStats(req.user);
      return sendSuccess(res, data, 'Ticket stats retrieved successfully');
    } catch (error) {
      console.error('[SupportTicketController.getStats] Error:', error);
      return sendError(res, error.message || 'Failed to fetch ticket stats', 500);
    }
  }

  /**
   * GET /api/support-tickets/:id
   */
  static async getTicketById(req, res) {
    try {
      const { id } = req.params;
      const ticket = await SupportTicketService.getTicketById(id, req.user);
      return sendSuccess(res, ticket, 'Support ticket retrieved successfully');
    } catch (error) {
      console.error('[SupportTicketController.getTicketById] Error:', error);
      return sendError(res, error.message || 'Failed to retrieve ticket', error.status || 500);
    }
  }

  /**
   * PUT /api/support-tickets/:id
   */
  static async updateTicket(req, res) {
    try {
      const { id } = req.params;
      const updated = await SupportTicketService.updateTicket(id, req.body, req.user);
      return sendSuccess(res, updated, 'Support ticket updated successfully');
    } catch (error) {
      console.error('[SupportTicketController.updateTicket] Error:', error);
      return sendError(res, error.message || 'Failed to update ticket', error.status || 500);
    }
  }

  /**
   * PATCH /api/support-tickets/:id/status
   */
  static async changeStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, ...rest } = req.body;
      if (!status) {
        return sendError(res, 'Target status is required', 400);
      }
      const updated = await SupportTicketService.changeStatus(id, status, rest, req.user);
      return sendSuccess(res, updated, `Ticket status updated to ${status}`);
    } catch (error) {
      console.error('[SupportTicketController.changeStatus] Error:', error);
      return sendError(res, error.message || 'Failed to change ticket status', error.status || 500);
    }
  }

  /**
   * PATCH /api/support-tickets/:id/assignment
   */
  static async reassignTicket(req, res) {
    try {
      const { id } = req.params;
      const updated = await SupportTicketService.reassignTicket(id, req.body, req.user);
      return sendSuccess(res, updated, 'Ticket assignment updated successfully');
    } catch (error) {
      console.error('[SupportTicketController.reassignTicket] Error:', error);
      return sendError(res, error.message || 'Failed to reassign ticket', error.status || 500);
    }
  }

  /**
   * POST /api/support-tickets/:id/comments
   */
  static async addComment(req, res) {
    try {
      const { id } = req.params;
      const comment = await SupportTicketService.addComment(id, req.body, req.user);
      return sendSuccess(res, comment, 'Comment posted successfully', 201);
    } catch (error) {
      console.error('[SupportTicketController.addComment] Error:', error);
      return sendError(res, error.message || 'Failed to post comment', error.status || 500);
    }
  }

  /**
   * POST /api/support-tickets/:id/attachments
   */
  static async uploadAttachments(req, res) {
    try {
      const { id } = req.params;
      const files = req.files || [];
      if (files.length === 0) {
        return sendError(res, 'No files were uploaded', 400);
      }
      const attachments = await SupportTicketService.addAttachments(id, files, req.user);
      return sendSuccess(res, attachments, 'Files uploaded successfully', 201);
    } catch (error) {
      console.error('[SupportTicketController.uploadAttachments] Error:', error);
      return sendError(res, error.message || 'Failed to upload attachments', error.status || 500);
    }
  }

  /**
   * POST /api/support-tickets/:id/resolve
   */
  static async resolveTicket(req, res) {
    try {
      const { id } = req.params;
      const resolved = await SupportTicketService.resolveTicket(id, req.body, req.user);
      return sendSuccess(res, resolved, 'Ticket marked as resolved');
    } catch (error) {
      console.error('[SupportTicketController.resolveTicket] Error:', error);
      return sendError(res, error.message || 'Failed to resolve ticket', error.status || 500);
    }
  }

  /**
   * POST /api/support-tickets/:id/reopen
   */
  static async reopenTicket(req, res) {
    try {
      const { id } = req.params;
      const reopened = await SupportTicketService.reopenTicket(id, req.body, req.user);
      return sendSuccess(res, reopened, 'Ticket reopened successfully');
    } catch (error) {
      console.error('[SupportTicketController.reopenTicket] Error:', error);
      return sendError(res, error.message || 'Failed to reopen ticket', error.status || 500);
    }
  }

  /**
   * DELETE /api/support-tickets/:id
   */
  static async deleteTicket(req, res) {
    try {
      const { id } = req.params;
      const deleted = await SupportTicketService.deleteTicket(id, req.user);
      return sendSuccess(res, deleted, 'Ticket deleted successfully');
    } catch (error) {
      console.error('[SupportTicketController.deleteTicket] Error:', error);
      return sendError(res, error.message || 'Failed to delete ticket', error.status || 500);
    }
  }
}

export default SupportTicketController;

