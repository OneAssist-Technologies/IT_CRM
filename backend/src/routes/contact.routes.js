import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authorizePermission } from '../middlewares/permission.middleware.js';
import {
  getContacts,
  getContactById,
  getContactStats,
  getContactMetadata,
  createContact,
  updateContact,
  deleteContact,
  assignContact,
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
} from '../controllers/contact.controller.js';

const router = Router();

// 1. Contact Statistics & KPI metrics
router.get(
  '/stats',
  requireAuth,
  authorizePermission('contacts', 'view'),
  getContactStats
);

// 2. Dropdown metadata (Companies, Employees, Pipeline Stages)
router.get(
  '/metadata',
  requireAuth,
  authorizePermission('contacts', 'view'),
  getContactMetadata
);

// 3. Bulk Import Contacts (Saves to dedicated bulk table)
router.post(
  '/bulk-import',
  requireAuth,
  authorizePermission('contacts', 'create'),
  bulkImportContacts
);

// 3b. Dedicated Bulk Upload Records Management
router.get(
  '/bulk-data',
  requireAuth,
  authorizePermission('contacts', 'view'),
  getBulkUploadContacts
);

router.post(
  '/bulk-data/:id/promote',
  requireAuth,
  authorizePermission('contacts', 'create'),
  promoteBulkUploadToContact
);

router.delete(
  '/bulk-data/:id',
  requireAuth,
  authorizePermission('contacts', 'delete'),
  deleteBulkUploadContact
);

// 3c. Bulk Import History and Batch Specific Contacts
router.get(
  '/import-batches',
  requireAuth,
  authorizePermission('contacts', 'view'),
  getImportBatches
);

router.get(
  '/import-batches/:batchId',
  requireAuth,
  authorizePermission('contacts', 'view'),
  getImportBatchDetails
);

router.get(
  '/import-batches/:batchId/contacts',
  requireAuth,
  authorizePermission('contacts', 'view'),
  getBatchContacts
);

router.delete(
  '/import-batches/:batchId',
  requireAuth,
  authorizePermission('contacts', 'delete'),
  deleteImportBatch
);

router.get(
  '/import-batches/:batchId/failed-report',
  requireAuth,
  authorizePermission('contacts', 'view'),
  downloadFailedReport
);

router.put(
  '/import-batches/:batchId/assign',
  requireAuth,
  authorizePermission('contacts', 'edit'),
  assignImportBatch
);


// 4. Contact List with Search, Filters, Sorting & Pagination
router.get(
  '/',
  requireAuth,
  authorizePermission('contacts', 'view'),
  getContacts
);

// 5. Single Contact Details by ID
router.get(
  '/:id',
  requireAuth,
  authorizePermission('contacts', 'view'),
  getContactById
);

// 6. Create Contact
router.post(
  '/',
  requireAuth,
  authorizePermission('contacts', 'create'),
  createContact
);

// 6. Assign Contact to Employee Rep
router.put(
  '/:id/assign',
  requireAuth,
  authorizePermission('contacts', 'edit'),
  assignContact
);

// 7. Update Contact Details & Pipeline Stage
router.put(
  '/:id',
  requireAuth,
  authorizePermission('contacts', 'edit'),
  updateContact
);

// 8. Delete Contact
router.delete(
  '/:id',
  requireAuth,
  authorizePermission('contacts', 'delete'),
  deleteContact
);

export default router;
