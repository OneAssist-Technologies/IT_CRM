import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authorizePermission } from '../middlewares/permission.middleware.js';
import * as settingsController from '../controllers/settings.controller.js';

const router = Router();

// Require auth for settings routes (falls back safely to super admin in local dev)
router.use(requireAuth);

// Master Projects & Module Configuration (Project Catalog) - accessible to all authenticated users for Quotations, Invoices & Proposals
router.get('/projects', settingsController.getMasterProjects);
router.get('/projects/:id', settingsController.getMasterProjectById);
router.post('/projects', authorizePermission(['project_catalog', 'settings'], 'create'), settingsController.createMasterProject);
router.put('/projects/:id', authorizePermission(['project_catalog', 'settings'], 'edit'), settingsController.updateMasterProject);
router.delete('/projects/:id', authorizePermission(['project_catalog', 'settings'], 'delete'), settingsController.deleteMasterProject);

// Realtime User Profile ("My Profile") Settings (accessible to every authenticated user)
router.get('/profile', settingsController.getUserProfile);
router.put('/profile', settingsController.updateUserProfile);
router.post('/change-password', settingsController.changePassword);

// Company Profile Settings
router.get('/company', authorizePermission(['company_profile', 'settings'], 'view'), settingsController.getCompanyProfile);
router.put('/company', authorizePermission(['company_profile', 'settings'], 'edit'), settingsController.updateCompanyProfile);

// CRM Pipeline & Presets
router.get('/crm-pipeline', authorizePermission(['company_profile', 'settings'], 'view'), settingsController.getCrmPipelineSettings);
router.put('/crm-pipeline', authorizePermission(['company_profile', 'settings'], 'edit'), settingsController.updateCrmPipelineSettings);

// Security & System Preferences
router.get('/security', authorizePermission(['company_profile', 'settings'], 'view'), settingsController.getSecuritySettings);
router.put('/security', authorizePermission(['company_profile', 'settings'], 'edit'), settingsController.updateSecuritySettings);
router.get('/audit-logs', authorizePermission(['company_profile', 'settings'], 'view'), settingsController.getSecurityAuditLogs);

// Notification Preferences
router.get('/notifications', authorizePermission(['myprofile', 'settings'], 'view'), settingsController.getNotificationSettings);
router.put('/notifications', authorizePermission(['myprofile', 'settings'], 'edit'), settingsController.updateNotificationSettings);

// Calendar & Confidential Reminders (scoped to user's assigned/created reminders in service)
router.get('/reminders', settingsController.getReminders);
router.post('/reminders', settingsController.createReminder);
router.put('/reminders/:id', settingsController.updateReminder);
router.delete('/reminders/:id', settingsController.deleteReminder);
router.get('/reminders/due', settingsController.getDueReminders);

// Reset Settings
router.post('/reset/:key', authorizePermission(['company_profile', 'settings'], 'edit'), settingsController.resetSetting);

export default router;
