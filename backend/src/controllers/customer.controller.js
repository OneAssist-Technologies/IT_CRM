import * as customerService from '../services/customer.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * 1. Get all customers
 * GET /api/customers
 */
export async function getCustomers(req, res) {
  try {
    const result = await customerService.getCustomersService(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('getCustomers error:', error);
    return sendError(res, error.message || 'Failed to fetch customers', error.status || 500);
  }
}

/**
 * 2. Get customer statistics summary
 * GET /api/customers/stats
 */
export async function getCustomerStats(req, res) {
  try {
    const stats = await customerService.getCustomerStatsService(req.user);
    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('getCustomerStats error:', error);
    return sendError(res, error.message || 'Failed to fetch customer stats', error.status || 500);
  }
}

/**
 * 3. Get single customer by ID
 * GET /api/customers/:id
 */
export async function getCustomerById(req, res) {
  try {
    const customer = await customerService.getCustomerByIdService(req.params.id);
    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('getCustomerById error:', error);
    return sendError(res, error.message || 'Customer not found', error.status || 500);
  }
}

/**
 * 4. Create new customer
 * POST /api/customers
 */
export async function createCustomer(req, res) {
  try {
    const { companyName, contactPerson, phone } = req.body;
    if (!companyName || !contactPerson || !phone) {
      return sendError(res, 'Company Name, Contact Person, and Phone Number are required.', 400);
    }

    const newCustomer = await customerService.createCustomerService(req.body);
    return res.status(201).json({
      success: true,
      message: `Customer ${newCustomer.companyName} created successfully.`,
      data: newCustomer,
    });
  } catch (error) {
    console.error('createCustomer error:', error);
    return sendError(res, error.message || 'Failed to create customer', error.status || 500);
  }
}

/**
 * 5. Update existing customer
 * PUT /api/customers/:id
 */
export async function updateCustomer(req, res) {
  try {
    const updated = await customerService.updateCustomerService(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: `Customer ${updated.companyName} updated successfully.`,
      data: updated,
    });
  } catch (error) {
    console.error('updateCustomer error:', error);
    return sendError(res, error.message || 'Failed to update customer', error.status || 500);
  }
}

/**
 * 6. Delete customer
 * DELETE /api/customers/:id
 */
export async function deleteCustomer(req, res) {
  try {
    const result = await customerService.deleteCustomerService(req.params.id);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('deleteCustomer error:', error);
    return sendError(res, error.message || 'Failed to delete customer', error.status || 500);
  }
}
