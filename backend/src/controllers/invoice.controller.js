import * as invoiceService from '../services/invoice.service.js';
const billingService = invoiceService;
import { sendSuccess, sendError } from '../utils/response.js';

// =============================================================================
// 1. BILLING DASHBOARD
// =============================================================================
export async function getBillingDashboard(req, res) {
  try {
    const data = await billingService.getBillingDashboardService();
    return sendSuccess(res, data, 'Billing dashboard metrics fetched successfully.');
  } catch (error) {
    console.error('getBillingDashboard error:', error);
    return sendError(res, error.message || 'Failed to fetch billing dashboard.', error.status || 500);
  }
}

// =============================================================================
// 2. PRODUCTS & SERVICES
// =============================================================================
export async function getProductsServices(req, res) {
  try {
    const items = await billingService.getProductsServicesService(req.query);
    return sendSuccess(res, items, 'Products and services retrieved.');
  } catch (error) {
    console.error('getProductsServices error:', error);
    return sendError(res, error.message || 'Failed to fetch products & services.', error.status || 500);
  }
}

export async function createProductServiceItem(req, res) {
  try {
    const item = await billingService.createProductService(req.body, req.user);
    return sendSuccess(res, item, 'Item added to catalogue.', 201);
  } catch (error) {
    console.error('createProductServiceItem error:', error);
    return sendError(res, error.message || 'Failed to create item.', error.status || 400);
  }
}

export async function updateProductServiceItem(req, res) {
  try {
    const item = await billingService.updateProductService(req.params.id, req.body, req.user);
    return sendSuccess(res, item, 'Item updated successfully.');
  } catch (error) {
    console.error('updateProductServiceItem error:', error);
    return sendError(res, error.message || 'Failed to update item.', error.status || 400);
  }
}

export async function deleteProductServiceItem(req, res) {
  try {
    await billingService.deleteProductService(req.params.id, req.user);
    return sendSuccess(res, null, 'Item deleted from catalogue.');
  } catch (error) {
    console.error('deleteProductServiceItem error:', error);
    return sendError(res, error.message || 'Failed to delete item.', error.status || 400);
  }
}

// =============================================================================
// 3. QUOTATIONS
// =============================================================================
export async function getQuotations(req, res) {
  try {
    const quotes = await billingService.getQuotationsService(req.query);
    return sendSuccess(res, quotes, 'Quotations retrieved successfully.');
  } catch (error) {
    console.error('getQuotations error:', error);
    return sendError(res, error.message || 'Failed to fetch quotations.', error.status || 500);
  }
}

export async function getQuotationById(req, res) {
  try {
    const quote = await billingService.getQuotationByIdService(req.params.id);
    return sendSuccess(res, quote, 'Quotation details retrieved.');
  } catch (error) {
    return sendError(res, error.message || 'Quotation not found.', error.status || 404);
  }
}

export async function createQuotation(req, res) {
  try {
    const quote = await billingService.createQuotationService(req.body, req.user);
    return sendSuccess(res, quote, 'Quotation generated successfully.', 201);
  } catch (error) {
    console.error('createQuotation error:', error);
    return sendError(res, error.message || 'Failed to generate quotation.', error.status || 400);
  }
}

export async function updateQuotation(req, res) {
  try {
    const quote = await billingService.updateQuotationService(req.params.id, req.body, req.user);
    return sendSuccess(res, quote, 'Quotation updated successfully.');
  } catch (error) {
    console.error('updateQuotation error:', error);
    return sendError(res, error.message || 'Failed to update quotation.', error.status || 400);
  }
}

export async function deleteQuotation(req, res) {
  try {
    await billingService.deleteQuotationService(req.params.id, req.user);
    return sendSuccess(res, null, 'Quotation deleted successfully.');
  } catch (error) {
    console.error('deleteQuotation error:', error);
    return sendError(res, error.message || 'Failed to delete quotation.', error.status || 400);
  }
}

export async function convertQuotationToOrder(req, res) {
  try {
    const order = await billingService.convertQuotationToOrderService(req.params.id, req.body, req.user);
    return sendSuccess(res, order, 'Quotation successfully converted to Sales Order.', 201);
  } catch (error) {
    console.error('convertQuotationToOrder error:', error);
    return sendError(res, error.message || 'Failed to convert quotation.', error.status || 400);
  }
}

export async function createQuotationRevision(req, res) {
  try {
    const revision = await billingService.createQuotationRevisionService(req.params.id, req.body, req.user);
    return sendSuccess(res, revision, 'Quotation revision created successfully.', 201);
  } catch (error) {
    console.error('createQuotationRevision error:', error);
    return sendError(res, error.message || 'Failed to create quotation revision.', error.status || 400);
  }
}

export async function updateQuotationStatus(req, res) {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return sendError(res, 'Status is required.', 400);
    }
    const updated = await billingService.updateQuotationStatusService(req.params.id, status, req.user, notes);
    return sendSuccess(res, updated, 'Quotation status updated successfully.');
  } catch (error) {
    console.error('updateQuotationStatus error:', error);
    return sendError(res, error.message || 'Failed to update quotation status.', error.status || 400);
  }
}

export async function getQuotationRevisions(req, res) {
  try {
    const revisions = await billingService.getQuotationRevisionsService(req.params.id);
    return sendSuccess(res, revisions, 'Quotation revisions retrieved successfully.');
  } catch (error) {
    console.error('getQuotationRevisions error:', error);
    return sendError(res, error.message || 'Failed to fetch quotation revisions.', error.status || 400);
  }
}

// =============================================================================
// 4. SALES ORDERS & CONTRACTS
// =============================================================================
export async function getSalesOrders(req, res) {
  try {
    const orders = await billingService.getSalesOrdersService(req.query);
    return sendSuccess(res, orders, 'Sales orders retrieved.');
  } catch (error) {
    console.error('getSalesOrders error:', error);
    return sendError(res, error.message || 'Failed to fetch sales orders.', error.status || 500);
  }
}

export async function getSalesOrderById(req, res) {
  try {
    const order = await billingService.getSalesOrderByIdService(req.params.id);
    return sendSuccess(res, order, 'Sales order details retrieved.');
  } catch (error) {
    return sendError(res, error.message || 'Sales order not found.', error.status || 404);
  }
}

export async function createSalesOrder(req, res) {
  try {
    const order = await billingService.createSalesOrderService(req.body, req.user);
    return sendSuccess(res, order, 'Sales order created successfully.', 201);
  } catch (error) {
    console.error('createSalesOrder error:', error);
    return sendError(res, error.message || 'Failed to create sales order.', error.status || 400);
  }
}

export async function updateSalesOrder(req, res) {
  try {
    const order = await billingService.updateSalesOrderService(req.params.id, req.body, req.user);
    return sendSuccess(res, order, 'Sales order updated.');
  } catch (error) {
    console.error('updateSalesOrder error:', error);
    return sendError(res, error.message || 'Failed to update sales order.', error.status || 400);
  }
}

// =============================================================================
// 5. PROJECTS & MILESTONES
// =============================================================================
export async function getBillingProjects(req, res) {
  try {
    const projects = await billingService.getBillingProjectsService();
    return sendSuccess(res, projects, 'Projects and milestone billing data retrieved.');
  } catch (error) {
    console.error('getBillingProjects error:', error);
    return sendError(res, error.message || 'Failed to fetch billing projects.', error.status || 500);
  }
}

export async function getMilestones(req, res) {
  try {
    const milestones = await billingService.getMilestonesService(req.query);
    return sendSuccess(res, milestones, 'Milestones retrieved.');
  } catch (error) {
    console.error('getMilestones error:', error);
    return sendError(res, error.message || 'Failed to fetch milestones.', error.status || 500);
  }
}

export async function createMilestone(req, res) {
  try {
    const milestone = await billingService.createMilestoneService(req.body, req.user);
    return sendSuccess(res, milestone, 'Milestone created successfully.', 201);
  } catch (error) {
    console.error('createMilestone error:', error);
    return sendError(res, error.message || 'Failed to create milestone.', error.status || 400);
  }
}

export async function updateMilestone(req, res) {
  try {
    const milestone = await billingService.updateMilestoneService(req.params.id, req.body, req.user);
    return sendSuccess(res, milestone, 'Milestone updated.');
  } catch (error) {
    console.error('updateMilestone error:', error);
    return sendError(res, error.message || 'Failed to update milestone.', error.status || 400);
  }
}

export async function approveMilestone(req, res) {
  try {
    const milestone = await billingService.approveMilestoneService(req.params.id, req.user);
    return sendSuccess(res, milestone, 'Milestone approved and marked eligible for billing.');
  } catch (error) {
    console.error('approveMilestone error:', error);
    return sendError(res, error.message || 'Failed to approve milestone.', error.status || 400);
  }
}

// =============================================================================
// 6. INVOICES
// =============================================================================
export async function getInvoices(req, res) {
  try {
    const invoices = await billingService.getInvoicesService(req.query);
    return sendSuccess(res, invoices, 'Invoices retrieved successfully.');
  } catch (error) {
    console.error('getInvoices error:', error);
    return sendError(res, error.message || 'Failed to fetch invoices.', error.status || 500);
  }
}

export async function getInvoiceById(req, res) {
  try {
    const invoice = await billingService.getInvoiceByIdService(req.params.id);
    return sendSuccess(res, invoice, 'Invoice details retrieved.');
  } catch (error) {
    return sendError(res, error.message || 'Invoice not found.', error.status || 404);
  }
}

export async function createInvoice(req, res) {
  try {
    const invoice = await billingService.createInvoiceService(req.body, req.user);
    return sendSuccess(res, invoice, 'Invoice generated successfully.', 201);
  } catch (error) {
    console.error('createInvoice error:', error);
    return sendError(res, error.message || 'Failed to create invoice.', error.status || 400);
  }
}

export async function updateInvoice(req, res) {
  try {
    const invoice = await billingService.updateInvoiceService(req.params.id, req.body, req.user);
    return sendSuccess(res, invoice, 'Invoice updated successfully.');
  } catch (error) {
    console.error('updateInvoice error:', error);
    return sendError(res, error.message || 'Failed to update invoice.', error.status || 400);
  }
}

export async function cancelInvoice(req, res) {
  try {
    const invoice = await billingService.cancelInvoiceService(req.params.id, req.body.reason, req.user);
    return sendSuccess(res, invoice, 'Invoice cancelled successfully.');
  } catch (error) {
    console.error('cancelInvoice error:', error);
    return sendError(res, error.message || 'Failed to cancel invoice.', error.status || 400);
  }
}

export async function sendInvoice(req, res) {
  try {
    const invoice = await billingService.sendInvoiceService(req.params.id, req.user);
    return sendSuccess(res, invoice, 'Invoice sent successfully to customer.');
  } catch (error) {
    console.error('sendInvoice error:', error);
    return sendError(res, error.message || 'Failed to send invoice.', error.status || 400);
  }
}

// =============================================================================
// 7. PAYMENTS
// =============================================================================
export async function getPayments(req, res) {
  try {
    const payments = await billingService.getPaymentsService(req.query);
    return sendSuccess(res, payments, 'Payments retrieved successfully.');
  } catch (error) {
    console.error('getPayments error:', error);
    return sendError(res, error.message || 'Failed to fetch payments.', error.status || 500);
  }
}

export async function getPaymentById(req, res) {
  try {
    const payment = await billingService.getPaymentByIdService(req.params.id);
    return sendSuccess(res, payment, 'Payment details retrieved.');
  } catch (error) {
    return sendError(res, error.message || 'Payment not found.', error.status || 404);
  }
}

export async function recordPayment(req, res) {
  try {
    const payment = await billingService.recordPaymentService(req.body, req.user);
    return sendSuccess(res, payment, 'Payment recorded and allocated successfully.', 201);
  } catch (error) {
    console.error('recordPayment error:', error);
    return sendError(res, error.message || 'Failed to record payment.', error.status || 400);
  }
}

// =============================================================================
// 8. BILLING REPORTS
// =============================================================================
export async function getBillingReports(req, res) {
  try {
    const reports = await billingService.getBillingReportsService(req.query);
    return sendSuccess(res, reports, 'Billing reports aggregated successfully.');
  } catch (error) {
    console.error('getBillingReports error:', error);
    return sendError(res, error.message || 'Failed to aggregate billing reports.', error.status || 500);
  }
}

// =============================================================================
// 9. BILLING SETTINGS & AUDIT LOGS
// =============================================================================
export async function getBillingSettings(req, res) {
  try {
    const settings = await billingService.getBillingSettingsService();
    return sendSuccess(res, settings, 'Billing settings retrieved.');
  } catch (error) {
    console.error('getBillingSettings error:', error);
    return sendError(res, error.message || 'Failed to fetch billing settings.', error.status || 500);
  }
}

export async function updateBillingSettings(req, res) {
  try {
    const settings = await billingService.updateBillingSettingsService(req.body, req.user);
    return sendSuccess(res, settings, 'Billing settings updated successfully.');
  } catch (error) {
    console.error('updateBillingSettings error:', error);
    return sendError(res, error.message || 'Failed to update billing settings.', error.status || 400);
  }
}

export async function getBillingAuditLogs(req, res) {
  try {
    const logs = await billingService.getBillingAuditLogsService(req.query);
    return sendSuccess(res, logs, 'Audit logs retrieved.');
  } catch (error) {
    console.error('getBillingAuditLogs error:', error);
    return sendError(res, error.message || 'Failed to fetch audit logs.', error.status || 500);
  }
}
