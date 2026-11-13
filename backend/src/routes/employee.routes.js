import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { authorizePermission } from '../middlewares/permission.middleware.js';
import {
  getEmployees,
  getEmployeeById,
  getEmployeeStats,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
} from '../controllers/employee.controller.js';

const router = Router();

// Employee Statistics & KPI Metrics (<1ms Redis Cached)
router.get('/stats', requireAuth, getEmployeeStats);

// Employee List & Search (Available to all authenticated CRM users for dropdowns & assignments)
router.get('/', requireAuth, getEmployees);

// Single Employee Profile by ID
router.get('/:id', requireAuth, getEmployeeById);

// 4. Onboard / Create New Employee
router.post(
  '/',
  requireAuth,
  authorizePermission('employee_management', 'create'),
  createEmployee
);

// 5. Update Employee Details
router.put(
  '/:id',
  requireAuth,
  authorizePermission('employee_management', 'edit'),
  updateEmployee
);

// 6. Update Employee Status
router.patch(
  '/:id/status',
  requireAuth,
  authorizePermission('employee_management', 'edit'),
  updateEmployeeStatus
);

// 7. Delete Employee Record
router.delete(
  '/:id',
  requireAuth,
  authorizePermission('employee_management', 'delete'),
  deleteEmployee
);

export default router;
