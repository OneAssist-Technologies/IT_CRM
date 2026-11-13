import { prisma } from '../config/prisma.js';

/**
 * Generate sequential unique Call ID (e.g. CAL-1001, CAL-1002)
 */
export async function generateCallId() {
  try {
    const lastCall = await prisma.callLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { callId: true },
    });

    if (!lastCall || !lastCall.callId) {
      return 'CAL-1001';
    }

    const match = lastCall.callId.match(/^CAL-(\d+)$/i);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `CAL-${nextNum}`;
    }

    const count = await prisma.callLog.count();
    return `CAL-${1001 + count}`;
  } catch (err) {
    return `CAL-${Date.now().toString().slice(-4)}`;
  }
}

/**
 * Format Call Log Response
 * Ensures strictly required field mappings:
 * Caller Name -> employeeName
 * Receiver Name -> contactName
 * Receiver Number -> phoneNumber
 * NO "callReceiver" field in response!
 */
export function formatCallLogResponse(log) {
  if (!log) return null;
  return {
    id: log.id,
    callId: log.callId,
    callType: log.callType,
    employeeId: log.employeeId || null,
    employeeName: log.employeeName,
    contactId: log.contactId || null,
    contactName: log.contactName,
    companyName: log.companyName || null,
    phoneNumber: log.phoneNumber,
    leadId: log.leadId || null,
    duration: log.duration,
    status: log.status,
    callDate: log.callDate,
    callTime: log.callTime,
    description: log.description || '',
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
}
