import { prisma } from '../config/prisma.js';
import { generateCallId, formatCallLogResponse } from '../utils/callLog.util.js';
import { io } from '../utils/socket.js';

/**
 * Scope call logs by user (Super Admin sees all, Employees only see their own calls)
 */
async function resolveCallLogScopeFilter(currentUser) {
  if (!currentUser) return null;
  const roleUpper = String(currentUser.role || '').toUpperCase();
  if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN') {
    return null;
  }

  if (currentUser.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { roleRelation: true },
    });
    if (dbUser?.roleRelation?.slug?.toLowerCase() === 'super_admin') {
      return null;
    }
  }

  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        ...(currentUser.email ? [{ email: { equals: currentUser.email, mode: 'insensitive' } }] : []),
        ...(currentUser.name ? [{ name: { equals: currentUser.name, mode: 'insensitive' } }] : []),
      ],
    },
  });

  const orConditions = [];
  if (currentUser.id) orConditions.push({ employeeId: currentUser.id });
  if (emp?.id) orConditions.push({ employeeId: emp.id });
  if (emp?.empCode) orConditions.push({ employeeId: emp.empCode });

  const names = [currentUser.name, currentUser.email, emp?.name].filter(Boolean);
  for (const name of names) {
    orConditions.push({ employeeName: { equals: name, mode: 'insensitive' } });
  }

  return orConditions.length > 0 ? { OR: orConditions } : { employeeId: currentUser.id };
}

/**
 * Scope section activities by user (Super Admin sees all, Employees only see activities performed by them)
 */
async function resolveActivityScopeFilter(currentUser) {
  if (!currentUser) return null;
  const roleUpper = String(currentUser.role || '').toUpperCase();
  if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN') {
    return null;
  }

  if (currentUser.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { roleRelation: true },
    });
    if (dbUser?.roleRelation?.slug?.toLowerCase() === 'super_admin') {
      return null;
    }
  }

  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        ...(currentUser.email ? [{ email: { equals: currentUser.email, mode: 'insensitive' } }] : []),
        ...(currentUser.name ? [{ name: { equals: currentUser.name, mode: 'insensitive' } }] : []),
      ],
    },
  });

  const orConditions = [];
  if (currentUser.id) orConditions.push({ performedById: currentUser.id });
  if (emp?.id) orConditions.push({ performedById: emp.id });
  const names = [currentUser.name, currentUser.email, emp?.name].filter(Boolean);
  for (const name of names) {
    orConditions.push({ performedBy: { equals: name, mode: 'insensitive' } });
  }

  return orConditions.length > 0 ? { OR: orConditions } : { performedById: currentUser.id };
}

/**
 * 1. Get Call Logs with filters and search
 */
export async function getCallLogsService(queryParams = {}, currentUser = null) {
  const {
    callType,
    status,
    search,
    date,
    startDate,
    endDate,
    employeeId,
    contactId,
    leadId,
    page,
    limit,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams;

  const where = {};

  const scopeFilter = await resolveCallLogScopeFilter(currentUser);
  if (scopeFilter) {
    where.AND = where.AND || [];
    where.AND.push(scopeFilter);
  }

  if (callType && callType !== 'ALL' && callType !== 'All') {
    where.callType = { equals: callType, mode: 'insensitive' };
  }

  if (status && status !== 'ALL' && status !== 'All') {
    const sLower = status.toLowerCase();
    if (sLower.includes('not') && (sLower.includes('interest') || sLower.includes('intrest'))) {
      where.OR = [
        ...(where.OR || []),
        { status: { equals: 'Not Interested', mode: 'insensitive' } },
        { status: { contains: 'not interest', mode: 'insensitive' } },
        { status: { contains: 'not intrest', mode: 'insensitive' } },
      ];
    } else if (sLower.includes('interest') || sLower.includes('intrest')) {
      where.OR = [
        ...(where.OR || []),
        { status: { equals: 'Interested', mode: 'insensitive' } },
        { status: { contains: 'interested', mode: 'insensitive' } },
        { status: { contains: 'intrested', mode: 'insensitive' } },
      ];
    } else if (sLower.includes('follow')) {
      where.OR = [
        ...(where.OR || []),
        { status: { equals: 'Follow-up', mode: 'insensitive' } },
        { status: { equals: 'Follow Up', mode: 'insensitive' } },
        { status: { contains: 'follow', mode: 'insensitive' } },
      ];
    } else {
      where.status = { equals: status, mode: 'insensitive' };
    }
  }

  if (employeeId && employeeId !== 'ALL') {
    where.OR = [
      ...(where.OR || []),
      { employeeId },
      { employeeName: { contains: employeeId, mode: 'insensitive' } },
    ];
  }

  if (contactId && contactId !== 'ALL') {
    where.OR = [
      ...(where.OR || []),
      { contactId },
      { contactName: { contains: contactId, mode: 'insensitive' } },
    ];
  }

  if (leadId && leadId !== 'ALL') {
    let matchedLead = null;
    try {
      matchedLead = await prisma.lead.findFirst({
        where: { OR: [{ id: leadId }, { leadId }] },
      });
    } catch (_) {}

    const leadConditions = [
      { leadId },
      { contactId: leadId },
    ];
    if (matchedLead) {
      leadConditions.push({ leadId: matchedLead.id });
      leadConditions.push({ leadId: matchedLead.leadId });
      leadConditions.push({ contactId: matchedLead.id });
      leadConditions.push({ contactId: matchedLead.leadId });
      if (matchedLead.phone) {
        leadConditions.push({ phoneNumber: matchedLead.phone });
        if (matchedLead.phone.length >= 10) {
          leadConditions.push({ phoneNumber: { contains: matchedLead.phone.slice(-10), mode: 'insensitive' } });
        }
      }
      if (matchedLead.name) {
        leadConditions.push({ contactName: { equals: matchedLead.name, mode: 'insensitive' } });
      }
    }

    where.OR = [
      ...(where.OR || []),
      ...leadConditions,
    ];
  }

  if (date && date !== 'ALL') {
    where.callDate = date;
  } else {
    if (startDate && endDate) {
      where.callDate = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.callDate = { gte: startDate };
    } else if (endDate) {
      where.callDate = { lte: endDate };
    }
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { callId: { contains: s, mode: 'insensitive' } },
      { employeeName: { contains: s, mode: 'insensitive' } },
      { contactName: { contains: s, mode: 'insensitive' } },
      { phoneNumber: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
      { status: { contains: s, mode: 'insensitive' } },
    ];
  }

  const orderBy = [];
  if (sortBy === 'callDate') {
    orderBy.push({ callDate: sortOrder === 'asc' ? 'asc' : 'desc' });
    orderBy.push({ callTime: sortOrder === 'asc' ? 'asc' : 'desc' });
  } else {
    orderBy.push({ [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' });
  }

  let calls;
  let total;

  if (page && limit) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    [total, calls] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
    ]);
  } else {
    calls = await prisma.callLog.findMany({
      where,
      orderBy,
    });
    total = calls.length;
  }

  const enrichedCalls = await enrichCallLogsWithMetadata(calls);

  return {
    count: total,
    calls: enrichedCalls,
  };
}

/**
 * 2. Get Overview KPI Statistics for Call Logs
 */
export async function getCallLogStatsService(currentUser = null) {
  const scopeFilter = await resolveCallLogScopeFilter(currentUser);
  const baseWhere = scopeFilter ? scopeFilter : {};

  const [total, incoming, outgoing, completed, missed, busy, noAnswer, notInterested, followUp, interested] = await Promise.all([
    prisma.callLog.count({ where: baseWhere }),
    prisma.callLog.count({ where: { ...baseWhere, callType: { equals: 'Incoming', mode: 'insensitive' } } }),
    prisma.callLog.count({ where: { ...baseWhere, callType: { equals: 'Outgoing', mode: 'insensitive' } } }),
    prisma.callLog.count({ where: { ...baseWhere, status: { equals: 'Completed', mode: 'insensitive' } } }),
    prisma.callLog.count({ where: { ...baseWhere, status: { equals: 'Missed', mode: 'insensitive' } } }),
    prisma.callLog.count({ where: { ...baseWhere, status: { equals: 'Busy', mode: 'insensitive' } } }),
    prisma.callLog.count({ where: { ...baseWhere, status: { equals: 'No Answer', mode: 'insensitive' } } }),
    prisma.callLog.count({
      where: {
        ...baseWhere,
        OR: [
          { status: { equals: 'Not Interested', mode: 'insensitive' } },
          { status: { contains: 'not interest', mode: 'insensitive' } },
          { status: { contains: 'not intrest', mode: 'insensitive' } },
        ],
      },
    }),
    prisma.callLog.count({
      where: {
        ...baseWhere,
        OR: [
          { status: { equals: 'Follow-up', mode: 'insensitive' } },
          { status: { equals: 'Follow Up', mode: 'insensitive' } },
          { status: { contains: 'follow', mode: 'insensitive' } },
        ],
      },
    }),
    prisma.callLog.count({
      where: {
        ...baseWhere,
        OR: [
          { status: { equals: 'Interested', mode: 'insensitive' } },
          { status: { contains: 'interested', mode: 'insensitive' } },
          { status: { contains: 'intrested', mode: 'insensitive' } },
        ],
      },
    }),
  ]);

  return {
    total,
    incoming,
    outgoing,
    completed,
    missed,
    busy,
    noAnswer,
    notInterested,
    followUp,
    interested,
  };
}

/**
 * Enrich call log objects with employee name and company name
 */
export async function enrichCallLogsWithMetadata(calls) {
  if (!calls || calls.length === 0) return [];

  const allEmployees = await prisma.employee.findMany({
    select: { id: true, name: true, empCode: true },
  });
  const empMap = new Map();
  allEmployees.forEach((e) => {
    if (e.id) empMap.set(e.id, e.name);
    if (e.empCode) empMap.set(e.empCode, e.name);
  });

  const contactIds = [...new Set(calls.map((c) => c.contactId).filter(Boolean))];
  const leadIds = [...new Set(calls.map((c) => c.leadId).filter(Boolean))];

  const [matchedContacts, matchedBulks, matchedLeads] = await Promise.all([
    contactIds.length > 0
      ? prisma.contact.findMany({
          where: { OR: [{ id: { in: contactIds } }, { contactId: { in: contactIds } }] },
          select: { id: true, contactId: true, companyName: true, name: true },
        })
      : [],
    contactIds.length > 0
      ? prisma.bulkUploadContact.findMany({
          where: { OR: [{ id: { in: contactIds } }, { bulkId: { in: contactIds } }] },
          select: { id: true, bulkId: true, companyName: true, contactPerson: true, name: true },
        })
      : [],
    leadIds.length > 0
      ? prisma.lead.findMany({
          where: { OR: [{ id: { in: leadIds } }, { leadId: { in: leadIds } }] },
          select: { id: true, leadId: true, companyName: true, name: true },
        })
      : [],
  ]);

  const companyMap = new Map();
  matchedContacts.forEach((c) => {
    if (c.companyName) {
      if (c.id) companyMap.set(c.id, c.companyName);
      if (c.contactId) companyMap.set(c.contactId, c.companyName);
      if (c.name) companyMap.set(`name_${c.name.toLowerCase()}`, c.companyName);
    }
  });
  matchedBulks.forEach((b) => {
    if (b.companyName) {
      if (b.id) companyMap.set(b.id, b.companyName);
      if (b.bulkId) companyMap.set(b.bulkId, b.companyName);
      if (b.contactPerson) companyMap.set(`name_${b.contactPerson.toLowerCase()}`, b.companyName);
      if (b.name) companyMap.set(`name_${b.name.toLowerCase()}`, b.companyName);
    }
  });
  matchedLeads.forEach((l) => {
    if (l.companyName) {
      if (l.id) companyMap.set(l.id, l.companyName);
      if (l.leadId) companyMap.set(l.leadId, l.companyName);
      if (l.name) companyMap.set(`name_${l.name.toLowerCase()}`, l.companyName);
    }
  });

  return calls.map((call) => {
    let resolvedEmpName = call.employeeName;
    if (empMap.has(call.employeeName)) {
      resolvedEmpName = empMap.get(call.employeeName);
    } else if (call.employeeId && empMap.has(call.employeeId)) {
      resolvedEmpName = empMap.get(call.employeeId);
    }

    const resolvedCompanyName =
      (call.contactId && companyMap.get(call.contactId)) ||
      (call.leadId && companyMap.get(call.leadId)) ||
      (call.contactName && companyMap.get(`name_${call.contactName.toLowerCase()}`)) ||
      null;

    const formatted = formatCallLogResponse(call);
    return {
      ...formatted,
      employeeName: resolvedEmpName,
      companyName: resolvedCompanyName,
    };
  });
}

/**
 * 3. Get Call Log by ID or Call ID
 */
export async function getCallLogByIdService(id) {
  const call = await prisma.callLog.findFirst({
    where: {
      OR: [{ id }, { callId: id }],
    },
  });

  if (!call) {
    const error = new Error('Call record not found.');
    error.status = 404;
    throw error;
  }

  const enriched = (await enrichCallLogsWithMetadata([call]))[0];
  return enriched || formatCallLogResponse(call);
}

/**
 * 4. Create New Call Log
 */
export async function createCallLogService(data) {
  // Support field mapping:
  // Caller Name -> employeeName
  // Receiver Name -> contactName
  // Receiver Number -> phoneNumber
  const callType = data.callType || data.type || 'Outgoing';
  let employeeId = data.employeeId || null;
  let employeeName = data.employeeName || data.callerName || '';
  const contactId = data.contactId || null;
  const contactName = data.contactName || data.receiverName || '';
  const phoneNumber = data.phoneNumber || data.receiverNumber || data.phone || '';
  let leadId = data.leadId || data.lead_id || null;
  const duration = data.duration || '00:00';
  const status = data.status || 'Completed';
  const callDate = data.callDate || data.date || new Date().toISOString().split('T')[0];
  const callTime = data.callTime || data.time || '10:00 AM';
  const description = data.description || data.notes || '';

  // Resolve employee name if given as ID/UUID or empty
  const isEmpNameId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeName) ||
                      /^[0-9a-f]{24}$/i.test(employeeName) ||
                      /^EMP-\d+/i.test(employeeName);
  if (isEmpNameId || !employeeName.trim()) {
    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(employeeName ? [{ id: employeeName }, { empCode: employeeName }] : []),
          ...(employeeId ? [{ id: employeeId }, { empCode: employeeId }] : []),
        ],
      },
    });
    if (emp) {
      employeeName = emp.name;
      employeeId = emp.id;
    }
  }

  // If leadId is not provided, try to find matching Lead by contactId, phone, or name:
  if (!leadId) {
    try {
      const foundLead = await prisma.lead.findFirst({
        where: {
          OR: [
            ...(contactId ? [{ id: contactId }, { leadId: contactId }] : []),
            ...(phoneNumber ? [{ phone: phoneNumber }] : []),
            ...(contactName ? [{ name: { equals: contactName, mode: 'insensitive' } }] : []),
          ],
        },
      });
      if (foundLead) {
        leadId = foundLead.id;
      }
    } catch (_) {}
  }

  // Validations
  if (!callType || !['Incoming', 'Outgoing'].includes(callType)) {
    const error = new Error('Call Type must be either "Incoming" or "Outgoing".');
    error.status = 400;
    throw error;
  }

  if (!employeeName.trim()) {
    const error = new Error('Assigned Employee Name is required.');
    error.status = 400;
    throw error;
  }

  if (!contactName.trim()) {
    const error = new Error('Contact Name is required.');
    error.status = 400;
    throw error;
  }

  if (!phoneNumber.trim()) {
    const error = new Error('Phone Number is required.');
    error.status = 400;
    throw error;
  }

  const validStatuses = ['Completed', 'Follow-up', 'Interested', 'Missed', 'Busy', 'No Answer', 'Not Interested'];
  let normalizedStatus = validStatuses.find(
    (s) => s.toLowerCase() === status.trim().toLowerCase()
  );
  if (!normalizedStatus) {
    const sLower = status.trim().toLowerCase();
    if (sLower.includes('not') && (sLower.includes('interest') || sLower.includes('intrest'))) {
      normalizedStatus = 'Not Interested';
    } else if (sLower.includes('interest') || sLower.includes('intrest')) {
      normalizedStatus = 'Interested';
    } else if (sLower.includes('follow')) {
      normalizedStatus = 'Follow-up';
    }
  }
  normalizedStatus = normalizedStatus || 'Completed';

  // Generate unique Call ID
  const callId = await generateCallId();

  const newCall = await prisma.callLog.create({
    data: {
      callId,
      callType,
      employeeId,
      employeeName: employeeName.trim(),
      contactId,
      contactName: contactName.trim(),
      phoneNumber: phoneNumber.trim(),
      leadId,
      duration: duration.trim(),
      status: normalizedStatus,
      callDate,
      callTime,
      description: description.trim() || null,
    },
  });

  const enrichedCall = (await enrichCallLogsWithMetadata([newCall]))[0] || formatCallLogResponse(newCall);

  // Socket broadcast if available
  try {
    if (io) {
      io.emit('call:created', enrichedCall);
    }
  } catch (_) {}

  return enrichedCall;
}

/**
 * 5. Update Call Log
 */
export async function updateCallLogService(id, data) {
  const existing = await prisma.callLog.findFirst({
    where: { OR: [{ id }, { callId: id }] },
  });

  if (!existing) {
    const error = new Error('Call record not found.');
    error.status = 404;
    throw error;
  }

  const updateData = {};
  if (data.callType) updateData.callType = data.callType;
  if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
  if (data.employeeName || data.callerName) {
    let empName = (data.employeeName || data.callerName).trim();
    let empId = data.employeeId !== undefined ? data.employeeId : existing.employeeId;
    const isEmpNameId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empName) ||
                        /^[0-9a-f]{24}$/i.test(empName) ||
                        /^EMP-\d+/i.test(empName);
    if (isEmpNameId) {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: empName },
            { empCode: empName },
            ...(empId ? [{ id: empId }, { empCode: empId }] : []),
          ],
        },
      });
      if (emp) {
        empName = emp.name;
        empId = emp.id;
      }
    }
    updateData.employeeName = empName;
    updateData.employeeId = empId;
  }
  if (data.contactId !== undefined) updateData.contactId = data.contactId;
  if (data.contactName || data.receiverName) updateData.contactName = (data.contactName || data.receiverName).trim();
  if (data.phoneNumber || data.receiverNumber) updateData.phoneNumber = (data.phoneNumber || data.receiverNumber).trim();
  if (data.leadId !== undefined || data.lead_id !== undefined) updateData.leadId = data.leadId || data.lead_id || null;
  if (data.duration !== undefined) updateData.duration = data.duration.trim();
  if (data.status) {
    const validStatuses = ['Completed', 'Follow-up', 'Interested', 'Missed', 'Busy', 'No Answer', 'Not Interested'];
    let matched = validStatuses.find((s) => s.toLowerCase() === data.status.trim().toLowerCase());
    if (!matched) {
      const sLower = data.status.trim().toLowerCase();
      if (sLower.includes('not') && (sLower.includes('interest') || sLower.includes('intrest'))) {
        matched = 'Not Interested';
      } else if (sLower.includes('interest') || sLower.includes('intrest')) {
        matched = 'Interested';
      } else if (sLower.includes('follow')) {
        matched = 'Follow-up';
      }
    }
    if (matched) updateData.status = matched;
  }
  if (data.callDate) updateData.callDate = data.callDate;
  if (data.callTime) updateData.callTime = data.callTime;
  if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;

  const updated = await prisma.callLog.update({
    where: { id: existing.id },
    data: updateData,
  });

  const enrichedUpdated = (await enrichCallLogsWithMetadata([updated]))[0] || formatCallLogResponse(updated);

  try {
    if (io) {
      io.emit('call:updated', enrichedUpdated);
    }
  } catch (_) {}

  return enrichedUpdated;
}

/**
 * 6. Delete Call Log
 */
export async function deleteCallLogService(id) {
  const existing = await prisma.callLog.findFirst({
    where: { OR: [{ id }, { callId: id }] },
  });

  if (!existing) {
    const error = new Error('Call record not found.');
    error.status = 404;
    throw error;
  }

  await prisma.callLog.delete({
    where: { id: existing.id },
  });

  try {
    if (io) {
      io.emit('call:deleted', { id: existing.id, callId: existing.callId });
    }
  } catch (_) {}

  return { id: existing.id, callId: existing.callId };
}

/**
 * Format Activity item for Activity Logs module
 */
export function formatSectionActivity(act) {
  if (!act) return null;
  const meta = typeof act.metadata === 'object' && act.metadata !== null ? act.metadata : {};
  return {
    id: act.id,
    activityNumber: act.activityNumber || `ACT-${act.id.slice(0, 8)}`,
    type: act.type,
    title: act.title,
    description: act.description,
    leadId: act.leadId,
    leadName: act.leadName,
    customerId: act.customerId,
    customerName: act.customerName || meta.companyName || '',
    contactId: act.contactId,
    contactName: act.contactName || '',
    phone: meta.phoneNumber || meta.phone || '',
    phoneNumber: meta.phoneNumber || meta.phone || '',
    email: meta.email || '',
    messageType: meta.messageType || (act.title?.includes('Template') ? 'Template Message' : (act.title?.includes('Direct') ? 'Direct Message' : (act.title?.includes('Incoming') ? 'Incoming' : 'Outgoing'))),
    emailType: meta.emailType || (act.title?.includes('Proposal') ? 'Proposal' : (act.title?.includes('Introduction') ? 'Introduction' : (act.title?.includes('Incoming') ? 'Incoming' : 'Outgoing'))),
    activityType: meta.activityType || (act.title?.includes('Direct Visit') ? 'Direct Visit' : (act.title?.includes('SMS') ? 'SMS' : (act.title?.includes('Social') ? 'Social Media' : (act.title?.includes('Event') ? 'Event / Exhibition' : 'Other')))),
    status: act.status || 'Completed',
    activityDate: act.activityDate,
    activityTime: act.activityTime || '10:00 AM',
    performedBy: act.performedBy || 'Staff',
    performedById: act.performedById,
    nextFollowDate: meta.nextFollowDate || null,
    metadata: meta,
    createdAt: act.createdAt,
    updatedAt: act.updatedAt,
  };
}

/**
 * 7. Get Section Activities (whatsapp, email, others, calls)
 */
export async function getSectionActivitiesService(section = 'calls', queryParams = {}, currentUser = null) {
  const sec = String(section).toLowerCase().trim();
  if (sec === 'calls' || sec === 'call') {
    return getCallLogsService(queryParams, currentUser);
  }

  const {
    status,
    search,
    date,
    startDate,
    endDate,
    contactId,
    leadId,
    page,
    limit,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams;

  const where = {};

  const actScope = await resolveActivityScopeFilter(currentUser);
  if (actScope) {
    where.AND = where.AND || [];
    where.AND.push(actScope);
  }

  if (sec === 'whatsapp') {
    where.type = 'whatsapp';
  } else if (sec === 'email') {
    where.type = 'email';
  } else {
    // others
    where.type = { in: ['other', 'others', 'task'] };
  }

  if (status && status !== 'ALL' && status !== 'All') {
    where.status = { equals: status, mode: 'insensitive' };
  }

  if (contactId && contactId !== 'ALL') {
    where.contactId = contactId;
  }

  if (leadId && leadId !== 'ALL') {
    where.leadId = leadId;
  }

  if (date && date !== 'ALL') {
    where.activityDate = date;
  } else {
    if (startDate && endDate) {
      where.activityDate = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.activityDate = { gte: startDate };
    } else if (endDate) {
      where.activityDate = { lte: endDate };
    }
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { activityNumber: { contains: s, mode: 'insensitive' } },
      { contactName: { contains: s, mode: 'insensitive' } },
      { customerName: { contains: s, mode: 'insensitive' } },
      { performedBy: { contains: s, mode: 'insensitive' } },
      { title: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
      { status: { contains: s, mode: 'insensitive' } },
    ];
  }

  const orderBy = [];
  if (sortBy === 'activityDate' || sortBy === 'callDate') {
    orderBy.push({ activityDate: sortOrder === 'asc' ? 'asc' : 'desc' });
  } else {
    orderBy.push({ [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' });
  }

  let items;
  let total;

  if (page && limit) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    [total, items] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
    ]);
  } else {
    items = await prisma.activity.findMany({
      where,
      orderBy,
    });
    total = items.length;
  }

  // Fetch employees and contacts/leads for enriching WhatsApp/Email/Others
  const allEmployees = await prisma.employee.findMany({
    select: { id: true, name: true, empCode: true },
  });
  const empMap = new Map();
  allEmployees.forEach((e) => {
    if (e.id) empMap.set(e.id, e.name);
    if (e.empCode) empMap.set(e.empCode, e.name);
  });

  const contactIds = [...new Set(items.map((i) => i.contactId).filter(Boolean))];
  const [matchedContacts, matchedBulks] = await Promise.all([
    contactIds.length > 0
      ? prisma.contact.findMany({
          where: { OR: [{ id: { in: contactIds } }, { contactId: { in: contactIds } }] },
          select: { id: true, contactId: true, companyName: true, name: true },
        })
      : [],
    contactIds.length > 0
      ? prisma.bulkUploadContact.findMany({
          where: { OR: [{ id: { in: contactIds } }, { bulkId: { in: contactIds } }] },
          select: { id: true, bulkId: true, companyName: true, contactPerson: true, name: true },
        })
      : [],
  ]);

  const companyMap = new Map();
  matchedContacts.forEach((c) => {
    if (c.companyName) {
      if (c.id) companyMap.set(c.id, c.companyName);
      if (c.contactId) companyMap.set(c.contactId, c.companyName);
      if (c.name) companyMap.set(`name_${c.name.toLowerCase()}`, c.companyName);
    }
  });
  matchedBulks.forEach((b) => {
    if (b.companyName) {
      if (b.id) companyMap.set(b.id, b.companyName);
      if (b.bulkId) companyMap.set(b.bulkId, b.companyName);
      if (b.contactPerson) companyMap.set(`name_${b.contactPerson.toLowerCase()}`, b.companyName);
      if (b.name) companyMap.set(`name_${b.name.toLowerCase()}`, b.companyName);
    }
  });

  return {
    count: total,
    items: items.map((act) => {
      const formatted = formatSectionActivity(act);
      let resolvedPerf = formatted.performedBy;
      if (empMap.has(formatted.performedBy)) {
        resolvedPerf = empMap.get(formatted.performedBy);
      } else if (formatted.performedById && empMap.has(formatted.performedById)) {
        resolvedPerf = empMap.get(formatted.performedById);
      }

      const resolvedCompany =
        formatted.customerName ||
        (formatted.contactId && companyMap.get(formatted.contactId)) ||
        (formatted.contactName && companyMap.get(`name_${formatted.contactName.toLowerCase()}`)) ||
        '';

      return {
        ...formatted,
        performedBy: resolvedPerf,
        customerName: resolvedCompany,
      };
    }),
  };
}

/**
 * 8. Get Section Statistics (calls, whatsapp, email, others)
 */
export async function getSectionStatsService(section = 'calls', currentUser = null) {
  const sec = String(section).toLowerCase().trim();
  if (sec === 'calls' || sec === 'call') {
    return getCallLogStatsService(currentUser);
  }

  const actScope = await resolveActivityScopeFilter(currentUser);
  const baseScope = actScope ? actScope : {};

  if (sec === 'whatsapp') {
    const baseWhere = { type: 'whatsapp', ...baseScope };
    const [total, sent, replied, interested, followUp, failed, notInterested] = await Promise.all([
      prisma.activity.count({ where: baseWhere }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Sent', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Replied', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Interested', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Follow', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Failed', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Not Interested', mode: 'insensitive' } } }),
    ]);
    return { total, sent, replied, interested, followUp, failed, notInterested };
  }

  if (sec === 'email') {
    const baseWhere = { type: 'email', ...baseScope };
    const [total, sent, replied, draft, interested, followUp, failed, notInterested] = await Promise.all([
      prisma.activity.count({ where: baseWhere }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Sent', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Replied', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Draft', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Interested', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Follow', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Failed', mode: 'insensitive' } } }),
      prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Not Interested', mode: 'insensitive' } } }),
    ]);
    return { total, sent, replied, draft, interested, followUp, failed, notInterested };
  }

  // others
  const baseWhere = { type: { in: ['other', 'others', 'task'] }, ...baseScope };
  const [total, interested, followUp, notInterested, directVisit, sms] = await Promise.all([
    prisma.activity.count({ where: baseWhere }),
    prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Interested', mode: 'insensitive' } } }),
    prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Follow', mode: 'insensitive' } } }),
    prisma.activity.count({ where: { ...baseWhere, status: { contains: 'Not Interested', mode: 'insensitive' } } }),
    prisma.activity.count({ where: { ...baseWhere, OR: [{ title: { contains: 'Visit', mode: 'insensitive' } }, { description: { contains: 'Visit', mode: 'insensitive' } }] } }),
    prisma.activity.count({ where: { ...baseWhere, OR: [{ title: { contains: 'SMS', mode: 'insensitive' } }, { description: { contains: 'SMS', mode: 'insensitive' } }] } }),
  ]);
  return { total, interested, followUp, notInterested, directVisit, sms };
}

/**
 * 9. Create Section Activity (whatsapp, email, others)
 */
export async function createSectionActivityService(section, data, user) {
  const sec = String(section).toLowerCase().trim();
  if (sec === 'calls' || sec === 'call') {
    return createCallLogService(data);
  }

  const now = new Date();
  const todayStr = data.activityDate || now.toISOString().slice(0, 10);
  const timeStr = data.activityTime || '10:00 AM';

  const type = sec === 'whatsapp' ? 'whatsapp' : (sec === 'email' ? 'email' : 'other');
  const count = await prisma.activity.count();
  const prefix = sec === 'whatsapp' ? 'WA' : (sec === 'email' ? 'EML' : 'ACT');
  const activityNumber = `${prefix}-2026-${1001 + count}`;

  let performedBy = data.performedBy || user?.name || 'Staff';
  let performedById = data.performedById ? String(data.performedById) : (user?.id ? String(user.id) : null);
  const isPerfId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(performedBy) ||
                   /^[0-9a-f]{24}$/i.test(performedBy) ||
                   /^EMP-\d+/i.test(performedBy);
  if (isPerfId) {
    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: performedBy },
          { empCode: performedBy },
          ...(performedById ? [{ id: performedById }, { empCode: performedById }] : []),
        ],
      },
    });
    if (emp) {
      performedBy = emp.name;
      performedById = emp.id;
    }
  }

  let customerName = data.customerName || data.companyName || null;
  if (!customerName && data.contactId) {
    const c = await prisma.contact.findFirst({
      where: { OR: [{ id: data.contactId }, { contactId: data.contactId }] },
      select: { companyName: true },
    });
    if (c?.companyName) {
      customerName = c.companyName;
    } else {
      const b = await prisma.bulkUploadContact.findFirst({
        where: { OR: [{ id: data.contactId }, { bulkId: data.contactId }] },
        select: { companyName: true },
      });
      if (b?.companyName) customerName = b.companyName;
    }
  }

  const meta = {
    ...(data.metadata || {}),
    phoneNumber: data.phoneNumber || data.phone || undefined,
    email: data.email || undefined,
    messageType: data.messageType || (sec === 'whatsapp' ? 'Outgoing' : undefined),
    emailType: data.emailType || (sec === 'email' ? 'Outgoing' : undefined),
    activityType: data.activityType || (sec === 'others' ? 'Direct Visit' : undefined),
    nextFollowDate: data.nextFollowDate || undefined,
    companyName: customerName || undefined,
  };

  const activity = await prisma.activity.create({
    data: {
      activityNumber,
      type,
      title: data.title || `${sec.toUpperCase()}: ${data.status || 'Logged'}`,
      description: data.description || '',
      contactId: data.contactId || null,
      contactName: data.contactName || 'Contact',
      customerName: customerName,
      status: data.status || (sec === 'whatsapp' ? 'Msg Sent' : (sec === 'email' ? 'Mail Sent' : 'Interested')),
      performedBy: performedBy,
      performedById: performedById,
      activityDate: todayStr,
      activityTime: timeStr,
      metadata: meta,
    },
  });

  try {
    if (io) {
      io.emit('activity:created', formatSectionActivity(activity));
      io.emit('activity:new', formatSectionActivity(activity));
    }
  } catch (_) {}

  return formatSectionActivity(activity);
}

/**
 * 10. Delete Section Activity
 */
export async function deleteSectionActivityService(section, id) {
  const sec = String(section).toLowerCase().trim();
  if (sec === 'calls' || sec === 'call') {
    return deleteCallLogService(id);
  }

  const existing = await prisma.activity.findFirst({
    where: { OR: [{ id }, { activityNumber: id }] },
  });

  if (!existing) {
    const error = new Error('Activity record not found.');
    error.status = 404;
    throw error;
  }

  await prisma.activity.delete({
    where: { id: existing.id },
  });

  try {
    if (io) {
      io.emit('activity:deleted', { id: existing.id });
    }
  } catch (_) {}

  return { id: existing.id, success: true };
}
