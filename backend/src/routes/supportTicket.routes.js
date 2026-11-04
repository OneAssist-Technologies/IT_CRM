import { Router } from 'express';
import { SupportTicketController } from '../controllers/supportTicket.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { ticketUpload } from '../middlewares/ticketUpload.middleware.js';

const router = Router();

// Apply authentication to all ticket endpoints
router.use(requireAuth);

// Metadata for ticket creation form dropdowns
router.get('/metadata', SupportTicketController.getMetadata);
router.get('/stats', SupportTicketController.getStats);

// List and Create
router.get('/', SupportTicketController.getTickets);
router.post('/', SupportTicketController.createTicket);

// Single Ticket Retrieval, Updates, and Deletion
router.get('/:id', SupportTicketController.getTicketById);
router.put('/:id', SupportTicketController.updateTicket);
router.delete('/:id', SupportTicketController.deleteTicket);

// Status and Assignment State Transitions
router.patch('/:id/status', SupportTicketController.changeStatus);
router.patch('/:id/assignment', SupportTicketController.reassignTicket);

// Conversation & Comments
router.post('/:id/comments', SupportTicketController.addComment);
router.post('/:id/replies', (req, res, next) => {
  req.body.type = 'public_reply';
  return SupportTicketController.addComment(req, res, next);
});
router.post('/:id/notes', (req, res, next) => {
  req.body.type = 'internal_note';
  return SupportTicketController.addComment(req, res, next);
});

// File Uploads
router.post('/:id/attachments', ticketUpload.array('attachments', 10), SupportTicketController.uploadAttachments);

// Lifecycle actions
router.post('/:id/resolve', SupportTicketController.resolveTicket);
router.post('/:id/reopen', SupportTicketController.reopenTicket);

export default router;

