import {
  getActivitiesService,
  getActivityFilterMetadataService,
  recordActivity,
  syncExistingActivities,
} from '../services/activity.service.js';

/**
 * 1. GET /api/activities
 * List activities with filters, search, and pagination
 */
export async function getActivities(req, res) {
  try {
    const result = await getActivitiesService(req.query, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch activities timeline',
    });
  }
}

/**
 * 2. GET /api/activities/metadata
 * Get metadata for filter dropdowns (leads, customers, performers)
 */
export async function getActivityFilterMetadata(req, res) {
  try {
    const metadata = await getActivityFilterMetadataService();
    return res.status(200).json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    console.error('Error fetching activity filter metadata:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch activity metadata',
    });
  }
}

/**
 * 3. POST /api/activities
 * Manually record an activity
 */
export async function createActivity(req, res) {
  try {
    const activity = await recordActivity({
      ...req.body,
      performedBy: req.body.performedBy || req.user?.name || 'Staff',
      performedById: req.body.performedById || req.user?.id || null,
    });

    if (!activity) {
      return res.status(400).json({
        success: false,
        message: 'Failed to record activity',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Activity recorded successfully',
      data: activity,
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create activity',
    });
  }
}

/**
 * 4. POST /api/activities/sync
 * Manually trigger backfill sync from CRM database records
 */
export async function syncActivities(req, res) {
  try {
    const result = await syncExistingActivities();
    return res.status(200).json({
      success: true,
      message: 'Activities synchronized successfully',
      result,
    });
  } catch (error) {
    console.error('Error syncing activities:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync activities',
    });
  }
}
