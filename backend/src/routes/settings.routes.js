import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authorizePermission } from '../middlewares/permission.middleware.js';
import * as settingsController from '../controllers/settings.controller.js';

const router = Router();

// Require auth for settings routes (falls back safely to super admin in local dev)
router.use(requireAuth);

// Master Projects & Module Configuration (Project Catalog)
router.get('/projects', authorizePermission(['project_catalog', 'settings'], 'view'), settingsController.getMasterProjects);
router.get('/projects/:id', authorizePermission(['project_catalog', 'settings'], 'view'), settingsController.getMasterProjectById);
router.post('/projects', authorizePermission(['project_catalog', 'settings'], 'create'), settingsController.createMasterProject);
router.put('/projects/:id', authorizePermission(['project_catalog', 'settings'], 'edit'), settingsController.updateMasterProject);
router.delete('/projects/:id', authorizePermission(['project_catalog', 'settings'], 'delete'), settingsController.deleteMasterProject);

// Realtime User Profile ("My Profile") Settings
router.get('/profile', authorizePermission(['myprofile', 'settings'], 'view'), settingsController.getUserProfile);
router.put('/profile', authorizePermission(['myprofile', 'settings'], 'edit'), settingsController.updateUserProfile);
router.post('/change-password', authorizePermission(['myprofile', 'settings'], 'edit'), settingsController.changePassword);

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

// Calendar & Confidential Reminders
router.get('/reminders', authorizePermission(['calendar', 'settings'], 'view'), settingsController.getReminders);
router.post('/reminders', authorizePermission(['calendar', 'settings'], 'create'), settingsController.createReminder);
router.put('/reminders/:id', authorizePermission(['calendar', 'settings'], 'edit'), settingsController.updateReminder);
router.delete('/reminders/:id', authorizePermission(['calendar', 'settings'], 'delete'), settingsController.deleteReminder);
router.get('/reminders/due', authorizePermission(['calendar', 'settings'], 'view'), settingsController.getDueReminders);

// Reset Settings
router.post('/reset/:key', authorizePermission(['company_profile', 'settings'], 'edit'), settingsController.resetSetting);

export default router;
