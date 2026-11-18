import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authorizePermission } from '../middlewares/permission.middleware.js';
import {
  getBillingDashboard,
  getProductsServices,
  createProductServiceItem,
  updateProductServiceItem,
  deleteProductServiceItem,
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  convertQuotationToOrder,
  createQuotationRevision,
  updateQuotationStatus,
  getQuotationRevisions,
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  getBillingProjects,
  getMilestones,
  createMilestone,
  updateMilestone,
  approveMilestone,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  cancelInvoice,
  sendInvoice,
  getPayments,
  getPaymentById,
  recordPayment,
  getBillingReports,
  getBillingSettings,
  updateBillingSettings,
  getBillingAuditLogs,
  getDocumentLookup,
} from '../controllers/invoice.controller.js';

const router = Router();

// =============================================================================
// 1. BILLING DASHBOARD
// =============================================================================
router.get('/dashboard', requireAuth, authorizePermission('billing', 'view'), getBillingDashboard);

// =============================================================================
// 2. PRODUCTS & SERVICES CATALOGUE
// =============================================================================
router.get('/products-services', requireAuth, authorizePermission('billing', 'view'), getProductsServices);
router.post('/products-services', requireAuth, authorizePermission('billing', 'create'), createProductServiceItem);
router.put('/products-services/:id', requireAuth, authorizePermission('billing', 'edit'), updateProductServiceItem);
router.delete('/products-services/:id', requireAuth, authorizePermission('billing', 'delete'), deleteProductServiceItem);

// =============================================================================
// 3. QUOTATIONS & REVISIONS
// =============================================================================
router.get('/quotations', requireAuth, authorizePermission(['quotations', 'billing', 'leads'], 'view'), getQuotations);
router.get('/quotations/:id', requireAuth, authorizePermission(['quotations', 'billing', 'leads'], 'view'), getQuotationById);
router.get('/quotations/:id/revisions', requireAuth, authorizePermission(['quotations', 'billing', 'leads'], 'view'), getQuotationRevisions);
router.post('/quotations', requireAuth, authorizePermission(['quotations', 'billing', 'leads'], 'create'), createQuotation);
router.put('/quotations/:id', requireAuth, authorizePermission(['quotations', 'billing', 'leads'], 'edit'), updateQuotation);
router.patch('/quotations/:id/status', requireAuth, authorizePermission(['quotations', 'billing', 'leads'], 'edit'), updateQuotationStatus);
router.post('/quotations/:id/revise', requireAuth, authorizePermission(['quotations', 'billing', 'leads'], 'create'), createQuotationRevision);
router.delete('/quotations/:id', requireAuth, authorizePermission(['quotations', 'billing', 'leads'], 'delete'), deleteQuotation);
router.post('/quotations/:id/convert', requireAuth, authorizePermission(['quotations', 'billing', 'leads'], 'create'), convertQuotationToOrder);

// =============================================================================
// 4. SALES ORDERS & CONTRACTS
// =============================================================================
router.get('/orders', requireAuth, authorizePermission('billing', 'view'), getSalesOrders);
router.get('/orders/:id', requireAuth, authorizePermission('billing', 'view'), getSalesOrderById);
router.post('/orders', requireAuth, authorizePermission('billing', 'create'), createSalesOrder);
router.put('/orders/:id', requireAuth, authorizePermission('billing', 'edit'), updateSalesOrder);

// =============================================================================
// 5. PROJECTS & MILESTONES
// =============================================================================
router.get('/projects', requireAuth, authorizePermission('billing', 'view'), getBillingProjects);
router.get('/milestones', requireAuth, authorizePermission('billing', 'view'), getMilestones);
router.post('/milestones', requireAuth, authorizePermission('billing', 'create'), createMilestone);
router.put('/milestones/:id', requireAuth, authorizePermission('billing', 'edit'), updateMilestone);
router.post('/milestones/:id/approve', requireAuth, authorizePermission('billing', 'approve'), approveMilestone);

// =============================================================================
// 6. INVOICES
// =============================================================================
router.get('/invoices', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'view'), getInvoices);
router.get('/invoices/:id', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'view'), getInvoiceById);
router.post('/invoices', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'create'), createInvoice);
router.put('/invoices/:id', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'edit'), updateInvoice);
router.post('/invoices/:id/cancel', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'delete'), cancelInvoice);
router.post('/invoices/:id/send', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'edit'), sendInvoice);

// =============================================================================
// 7. PAYMENTS
// =============================================================================
router.get('/payments', requireAuth, authorizePermission('billing', 'view'), getPayments);
router.get('/payments/:id', requireAuth, authorizePermission('billing', 'view'), getPaymentById);
router.post('/payments', requireAuth, authorizePermission('billing', 'create'), recordPayment);

// =============================================================================
// 8. BILLING REPORTS
// =============================================================================
router.get('/reports', requireAuth, authorizePermission('billing', 'export'), getBillingReports);

// =============================================================================
// 9. BILLING SETTINGS & AUDIT LOGS
// =============================================================================
router.get('/settings', requireAuth, authorizePermission('billing', 'view'), getBillingSettings);
router.put('/settings', requireAuth, authorizePermission('billing', 'edit'), updateBillingSettings);
router.get('/audit-logs', requireAuth, authorizePermission('billing', 'view'), getBillingAuditLogs);

// =============================================================================
// 10. DOCUMENT LOOKUP FOR QUOTATION IMPORT
// =============================================================================
router.get('/document-lookup', requireAuth, getDocumentLookup);

// Dedicated Invoice Router for /api/invoices
export const invoiceRouter = Router();
invoiceRouter.get('/document-lookup', requireAuth, getDocumentLookup);
invoiceRouter.get('/', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'view'), getInvoices);
invoiceRouter.get('/:id', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'view'), getInvoiceById);
invoiceRouter.post('/', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'create'), createInvoice);
invoiceRouter.put('/:id', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'edit'), updateInvoice);
invoiceRouter.post('/:id/cancel', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'delete'), cancelInvoice);
invoiceRouter.post('/:id/send', requireAuth, authorizePermission(['invoices', 'billing', 'leads'], 'edit'), sendInvoice);

export { router as billingRouter };
export default router;
