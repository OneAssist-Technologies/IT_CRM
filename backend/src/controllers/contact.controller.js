import * as contactService from '../services/contact.service.js';

/**
 * 1. List contacts with search, filters, pagination, and sorting
 * GET /api/contacts
 */
export async function getContacts(req, res) {
  try {
    const result = await contactService.getContactsService(req.query, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[getContacts Error]:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 2. Get Single Contact by ID
 * GET /api/contacts/:id
 */
export async function getContactById(req, res) {
  try {
    const result = await contactService.getContactByIdService(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 3. Get Contact KPI Stats
 * GET /api/contacts/stats
 */
export async function getContactStats(req, res) {
  try {
    const result = await contactService.getContactStatsService(req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 4. Get Contact Dropdown Metadata
 * GET /api/contacts/metadata
 */
export async function getContactMetadata(_req, res) {
  try {
    const result = await contactService.getContactMetadataService();
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 5. Create Contact
 * POST /api/contacts
 */
export async function createContact(req, res) {
  try {
    const result = await contactService.createContactService(req.body, req.user);
    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[createContact Error]:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 6. Update Contact
 * PUT /api/contacts/:id
 */
export async function updateContact(req, res) {
  try {
    const result = await contactService.updateContactService(req.params.id, req.body, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 7. Assign Contact
 * PUT /api/contacts/:id/assign
 */
export async function assignContact(req, res) {
  try {
    const result = await contactService.assignContactService(req.params.id, req.body, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 8. Delete Contact
 * DELETE /api/contacts/:id
 */
export async function deleteContact(req, res) {
  try {
    const result = await contactService.deleteContactService(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}


/**
 * 9. Bulk Import Contacts
 * POST /api/contacts/bulk-import
 */
export async function bulkImportContacts(req, res) {
  try {
    const result = await contactService.bulkImportContactsService(req.body, req.user);
    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[bulkImportContacts Error]:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 10. Get Bulk Upload Contacts
 * GET /api/contacts/bulk-data
 */
export async function getBulkUploadContacts(req, res) {
  try {
    const result = await contactService.getBulkUploadContactsService(req.query, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 11. Promote Bulk Upload Contact to Official Contact Table
 * POST /api/contacts/bulk-data/:id/promote
 */
export async function promoteBulkUploadToContact(req, res) {
  try {
    const result = await contactService.promoteBulkUploadToContactService(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 12. Delete Bulk Upload Record
 * DELETE /api/contacts/bulk-data/:id
 */
export async function deleteBulkUploadContact(req, res) {
  try {
    const result = await contactService.deleteBulkUploadContactService(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 13. Get List of Import Batches
 * GET /api/contacts/import-batches
 */
export async function getImportBatches(req, res) {
  try {
    const result = await contactService.getImportBatchesService(req.query, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 14. Get Single Import Batch Details
 * GET /api/contacts/import-batches/:batchId
 */
export async function getImportBatchDetails(req, res) {
  try {
    const result = await contactService.getImportBatchDetailsService(req.params.batchId, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 15. Get Contacts specific to an Import Batch
 * GET /api/contacts/import-batches/:batchId/contacts
 */
export async function getBatchContacts(req, res) {
  try {
    const result = await contactService.getBatchContactsService(req.params.batchId, req.query, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 16. Delete Import Batch
 * DELETE /api/contacts/import-batches/:batchId
 */
export async function deleteImportBatch(req, res) {
  try {
    const result = await contactService.deleteImportBatchService(req.params.batchId, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 17. Download Failed Rows CSV Report
 * GET /api/contacts/import-batches/:batchId/failed-report
 */
export async function downloadFailedReport(req, res) {
  try {
    const { batch } = await contactService.getImportBatchDetailsService(req.params.batchId, req.user);
    const failedRows = Array.isArray(batch.failedRows) ? batch.failedRows : [];

    const headers = ['Row Number', 'Name', 'Phone Number', 'Email', 'Failure Reason'];
    const rows = failedRows.map((r) => [
      r.row || '—',
      `"${String(r.name || '—').replace(/"/g, '""')}"`,
      `"${String(r.phone || '—').replace(/"/g, '""')}"`,
      `"${String(r.email || '—').replace(/"/g, '""')}"`,
      `"${String(r.reason || r.message || 'Validation error').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${batch.batchId}_failed_report.csv"`
    );
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

export async function assignImportBatch(req, res) {
  try {
    const result = await contactService.assignImportBatchService(req.params.batchId, req.body, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

export default {
  getContacts,
  getContactById,
  getContactStats,
  getContactMetadata,
  createContact,
  updateContact,
  assignContact,
  deleteContact,
  bulkImportContacts,
  getBulkUploadContacts,
  promoteBulkUploadToContact,
  deleteBulkUploadContact,
  getImportBatches,
  getImportBatchDetails,
  getBatchContacts,
  deleteImportBatch,
  downloadFailedReport,
  assignImportBatch,
};


