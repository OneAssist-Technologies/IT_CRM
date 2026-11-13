import { ScheduledMeeting, MeetingStats, MeetingFilters } from '../types/meeting';
import { API_BASE_URL } from '../config/env';

const API_BASE = `${API_BASE_URL}/meetings`;

export async function fetchMeetingsApi(filters?: MeetingFilters): Promise<{
  meetings: ScheduledMeeting[];
  dateWise: Record<string, ScheduledMeeting[]>;
  count: number;
}> {
  const params = new URLSearchParams();
  if (filters?.leadId) params.append('leadId', filters.leadId);
  if (filters?.date && filters.date !== 'ALL') params.append('date', filters.date);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
  if (filters?.employeeId && filters.employeeId !== 'ALL') params.append('employeeId', filters.employeeId);
  if (filters?.search && filters.search.trim()) params.append('search', filters.search.trim());

  const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });

  if (!res.ok) {
    throw new Error(`Failed to fetch scheduled meetings (${res.status})`);
  }

  const json = await res.json();
  const data = json.data || {};
  return {
    meetings: data.meetings || [],
    dateWise: data.dateWise || {},
    count: data.count || 0,
  };
}

export async function fetchMeetingStatsApi(): Promise<MeetingStats> {
  const res = await fetch(`${API_BASE}/stats`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to fetch meeting stats');
  }
  const json = await res.json();
  return json.data;
}

export async function createMeetingApi(meetingData: Partial<ScheduledMeeting>): Promise<ScheduledMeeting> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(meetingData),
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'Failed to schedule meeting.');
  }
  return json.data;
}

export async function updateMeetingApi(id: string, meetingData: Partial<ScheduledMeeting>): Promise<ScheduledMeeting> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(meetingData),
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'Failed to update meeting.');
  }
  return json.data;
}

export async function deleteMeetingApi(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'Failed to delete meeting.');
  }
  return true;
}
