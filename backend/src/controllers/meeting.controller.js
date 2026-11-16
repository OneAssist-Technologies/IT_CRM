import * as meetingService from '../services/meeting.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * GET /api/meetings
 * Fetch date-wise scheduled meetings with filters
 */
export async function getMeetings(req, res) {
  try {
    const data = await meetingService.getMeetingsService(req.query, req.user);
    return sendSuccess(res, data, 'Scheduled meetings fetched successfully.');
  } catch (error) {
    console.error('getMeetings error:', error);
    return sendError(res, error.message || 'Failed to fetch scheduled meetings.', error.status || 500);
  }
}

/**
 * GET /api/meetings/stats
 * Overview KPI metrics
 */
export async function getMeetingStats(req, res) {
  try {
    const stats = await meetingService.getMeetingStatsService(req.user);
    return sendSuccess(res, stats, 'Meeting statistics retrieved.');
  } catch (error) {
    console.error('getMeetingStats error:', error);
    return sendError(res, error.message || 'Failed to fetch meeting statistics.', 500);
  }
}

/**
 * GET /api/meetings/:id
 */
export async function getMeetingById(req, res) {
  try {
    const meeting = await meetingService.getMeetingByIdService(req.params.id, req.user);
    return sendSuccess(res, meeting, 'Meeting details retrieved.');
  } catch (error) {
    return sendError(res, error.message || 'Meeting not found.', error.status || 404);
  }
}

/**
 * POST /api/meetings
 * Schedule a new meeting
 */
export async function createMeeting(req, res) {
  try {
    const meeting = await meetingService.createMeetingService({
      ...req.body,
      createdBy: req.body.createdBy || req.body.created_by || req.user?.name || req.user?.email || 'Host',
    });
    return sendSuccess(res, meeting, 'Meeting scheduled successfully.', 201);
  } catch (error) {
    console.error('createMeeting error:', error);
    return sendError(res, error.message || 'Failed to schedule meeting.', error.status || 400);
  }
}

/**
 * PUT /api/meetings/:id
 * Update scheduled meeting
 */
export async function updateMeeting(req, res) {
  try {
    const updated = await meetingService.updateMeetingService(req.params.id, req.body);
    return sendSuccess(res, updated, 'Meeting updated successfully.');
  } catch (error) {
    console.error('updateMeeting error:', error);
    return sendError(res, error.message || 'Failed to update meeting.', error.status || 400);
  }
}

/**
 * DELETE /api/meetings/:id
 */
export async function deleteMeeting(req, res) {
  try {
    const result = await meetingService.deleteMeetingService(req.params.id);
    return sendSuccess(res, result, 'Meeting removed successfully.');
  } catch (error) {
    console.error('deleteMeeting error:', error);
    return sendError(res, error.message || 'Failed to delete meeting.', error.status || 500);
  }
}
