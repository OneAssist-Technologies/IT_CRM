import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authorizePermission } from '../middlewares/permission.middleware.js';
import {
  getActivities,
  getActivityFilterMetadata,
  createActivity,
  syncActivities,
} from '../controllers/activity.controller.js';

const router = Router();

// 1. List activities with filters, search, pagination, summary counts
router.get('/', requireAuth, getActivities);

// 2. Metadata for dropdowns
router.get('/metadata', requireAuth, getActivityFilterMetadata);

// 3. Create activity
router.post('/', requireAuth, createActivity);

// 4. Trigger sync
router.post('/sync', requireAuth, syncActivities);

export default router;
