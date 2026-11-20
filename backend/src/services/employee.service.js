import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { getCache, setCache, delCache } from '../config/redis.js';
import { logAuditEvent } from './auditService.js';
import { io } from '../utils/socket.js';
import { generateEmpCode, buildEmployeeFilterQuery, formatEmployeeResponse, isEmployeeInactive } from '../utils/employee.util.js';

/**
 * 1. Get all employees with optional filtering, search, and Redis caching
 */
export async function getEmployeesService(queryParams = {}) {
  const { department, status, role, employmentType, search } = queryParams;
  const CACHE_KEY = `crm:employees:all:${department || 'all'}:${status || 'all'}:${role || 'all'}:${employmentType || 'all'}:${search || ''}`;

  const cached = await getCache(CACHE_KEY);
  if (cached) {
    return {
      source: '⚡ Redis Cache (<1ms)',
      count: cached.length,
      data: cached,
    };
  }

  const where = buildEmployeeFilterQuery(queryParams);

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const formatted = employees.map(formatEmployeeResponse);
  await setCache(CACHE_KEY, formatted, 300);

  return {
    source: '🗄️ PostgreSQL Database',
    count: formatted.length,
    data: formatted,
  };
}

/**
 * 2. Get Single Employee by ID
 */
export async function getEmployeeByIdService(id) {
  const employee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employee) {
    const error = new Error('Employee not found.');
    error.status = 404;
    throw error;
  }

  return { data: formatEmployeeResponse(employee) };
}

/**
 * 3. Get Employee Statistics & Department KPIs
 */
export async function getEmployeeStatsService() {
  const CACHE_KEY = 'crm:employees:stats';
  const cached = await getCache(CACHE_KEY);
  if (cached) {
    return { source: '⚡ Redis Cache', stats: cached };
  }

  const employees = await prisma.employee.findMany();

  const totalEmployees = employees.length;
  const activeCount = employees.filter((e) => e.status === 'ACTIVE' || e.status === 'Active').length;
  const probationCount = employees.filter((e) => e.status === 'PROBATION' || e.status === 'Probation').length;
  const onLeaveCount = employees.filter((e) => e.status === 'ON_LEAVE' || e.status === 'On Leave').length;

  const departmentBreakdown = {};
  employees.forEach((emp) => {
    departmentBreakdown[emp.department] = (departmentBreakdown[emp.department] || 0) + 1;
  });

  const avgRating = totalEmployees > 0 
    ? Number((employees.reduce((acc, e) => acc + (e.rating || 0), 0) / totalEmployees).toFixed(1))
    : 0;

  const stats = {
    totalEmployees,
    activeCount,
    probationCount,
    onLeaveCount,
    activePercentage: totalEmployees > 0 ? Math.round((activeCount / totalEmployees) * 100) : 0,
    avgRating,
    departmentBreakdown,
  };

  await setCache(CACHE_KEY, stats, 300);

  return { stats };
}

/**
 * 4. Create New Employee & User Account
 */
export async function createEmployeeService(body, user, ip = '127.0.0.1') {
  const {
    name,
    email,
    phone,
    empCode: customEmpCode,
    dob,
    gender,
    address,
    designation,
    department,
    role,
    employmentType,
    status,
    workLocation,
    joiningDate,
    reportingManager,
    password,
  } = body;

  if (!name || String(name).trim().length < 3) {
    const error = new Error('Full Name is mandatory (minimum 3 characters).');
    error.status = 400;
    throw error;
  }

  const cleanEmail = String(email || '').toLowerCase().trim();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    const error = new Error('A valid Email is mandatory.');
    error.status = 400;
    throw error;
  }

  const phoneDigits = String(phone || '').replace(/\D/g, '');
  if (!phoneDigits || phoneDigits.length !== 10) {
    const error = new Error('Phone Number must be exactly 10 digits.');
    error.status = 400;
    throw error;
  }

  const existingEmployee = await prisma.employee.findUnique({
    where: { email: cleanEmail },
  });
  if (existingEmployee) {
    const error = new Error('An employee with this email address already exists.');
    error.status = 400;
    throw error;
  }

  let finalEmpCode = customEmpCode ? String(customEmpCode).trim() : '';

  const codeInUse = finalEmpCode
    ? await prisma.employee.findUnique({ where: { empCode: finalEmpCode } })
    : null;

  if (!finalEmpCode || codeInUse) {
    const allEmployees = await prisma.employee.findMany({ select: { empCode: true } });
    const numericCodes = allEmployees
      .map((e) => {
        const match = e.empCode?.match(/EMP-(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n) => n !== null);
    const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 1000;
    finalEmpCode = `EMP-${maxCode + 1}`;
  }

  const newEmployee = await prisma.employee.create({
    data: {
      empCode: finalEmpCode,
      name: String(name).trim(),
      email: cleanEmail,
      phone: phoneDigits,
      dob: dob || null,
      gender: gender || null,
      address: address || null,
      department: department ? String(department).trim() : '',
      designation: designation ? String(designation).trim() : '',
      role: role ? String(role).trim() : '',
      employmentType: employmentType ? String(employmentType).trim() : '',
      status: status || 'Active',
      workLocation: workLocation ? String(workLocation).trim() : '',
      joiningDate: joiningDate || '',
      reportingManager: reportingManager || null,
    },
  });

  if (password) {
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      let roleId = null;
      if (newEmployee.role) {
        const matchingRole = await prisma.role.findFirst({
          where: {
            OR: [
              { name: { equals: newEmployee.role, mode: 'insensitive' } },
              { slug: { equals: newEmployee.role.toLowerCase().replace(/\s+/g, '_'), mode: 'insensitive' } },
            ],
          },
        });
        if (matchingRole) {
          roleId = matchingRole.id;
        }
      }

      await prisma.user.create({
        data: {
          name: newEmployee.name,
          email: newEmployee.email,
          phone: newEmployee.phone,
          passwordHash,
          role: newEmployee.role || 'STAFF',
          roleId,
          department: newEmployee.department,
        },
      });
    } catch (userErr) {
      console.warn('User account creation skipped or failed:', userErr.message);
    }
  }

  await delCache('crm:employees:*');

  if (io) {
    io.emit('employee_created', newEmployee);
  }

  await logAuditEvent({
    userId: user?.id,
    userName: user?.name || 'Admin',
    userRole: user?.role || 'SUPER_ADMIN',
    action: 'CREATE',
    entity: 'EMPLOYEE',
    entityId: newEmployee.id,
    ipAddress: ip,
    details: `Onboarded employee ${newEmployee.name} (${newEmployee.empCode}) into ${newEmployee.department}`,
  });

  return {
    message: `Employee ${newEmployee.name} created successfully!`,
    data: formatEmployeeResponse(newEmployee),
  };
}

/**
 * Synchronize employee Active / Inactive status with active sessions & tokens
 */
export async function syncEmployeeStatusWithSessions(employeeEmail, status) {
  if (!employeeEmail) return;
  const cleanEmail = employeeEmail.toLowerCase().trim();
  const isInactive = isEmployeeInactive(status);

  try {
    const targetUser = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      select: { id: true, email: true },
    });

    if (isInactive) {
      await setCache(`crm:inactive:email:${cleanEmail}`, true, 86400 * 30);
      if (targetUser) {
        await setCache(`crm:inactive:user:${targetUser.id}`, true, 86400 * 30);
        await delCache(`crm:session:${targetUser.id}`);
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { refreshToken: null },
        }).catch(() => {});
      }
    } else {
      await delCache(`crm:inactive:email:${cleanEmail}`);
      if (targetUser) {
        await delCache(`crm:inactive:user:${targetUser.id}`);
      }
    }
  } catch (err) {
    console.error('[Employee Status Session Sync Warning]', err.message);
  }
}

/**
 * 5. Update Employee Details
 */
export async function updateEmployeeService(id, body, user, ip = '127.0.0.1') {
  const {
    name,
    email,
    phone,
    empCode,
    dob,
    gender,
    address,
    designation,
    department,
    role,
    employmentType,
    status,
    workLocation,
    joiningDate,
    reportingManager,
  } = body;

  const existing = await prisma.employee.findUnique({
    where: { id },
  });

  if (!existing) {
    const error = new Error('Employee not found.');
    error.status = 404;
    throw error;
  }

  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    const duplicateEmail = await prisma.employee.findFirst({
      where: {
        email: cleanEmail,
        id: { not: id },
      },
    });
    if (duplicateEmail) {
      const error = new Error('An employee with this email address already exists.');
      error.status = 400;
      throw error;
    }
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      ...(name && { name: String(name).trim() }),
      ...(email && { email: String(email).toLowerCase().trim() }),
      ...(phone !== undefined && { phone: String(phone).replace(/\D/g, '') }),
      ...(empCode && { empCode }),
      ...(dob !== undefined && { dob }),
      ...(gender !== undefined && { gender }),
      ...(address !== undefined && { address }),
      ...(designation && { designation }),
      ...(department && { department }),
      ...(role && { role }),
      ...(employmentType && { employmentType }),
      ...(status && { status }),
      ...(workLocation && { workLocation }),
      ...(joiningDate !== undefined && { joiningDate }),
      ...(reportingManager !== undefined && { reportingManager }),
    },
  });

  if (status !== undefined) {
    await syncEmployeeStatusWithSessions(updated.email, updated.status);
  }

  await delCache('crm:employees:*');

  if (io) {
    io.emit('employee_updated', updated);
  }

  await logAuditEvent({
    userId: user?.id,
    userName: user?.name || 'Admin',
    userRole: user?.role || 'SUPER_ADMIN',
    action: 'UPDATE',
    entity: 'EMPLOYEE',
    entityId: updated.id,
    ipAddress: ip,
    details: `Updated employee details for ${updated.name} (${updated.empCode})`,
  });

  return {
    message: `Employee ${updated.name} updated successfully.`,
    data: formatEmployeeResponse(updated),
  };
}

/**
 * 6. Update Employee Status
 */
export async function updateEmployeeStatusService(id, status, user, ip = '127.0.0.1') {
  if (!status) {
    const error = new Error('Status is required.');
    error.status = 400;
    throw error;
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: { status },
  });

  await syncEmployeeStatusWithSessions(updated.email, updated.status);

  await delCache('crm:employees:*');

  if (io) {
    io.emit('employee_updated', updated);
    io.emit('employee_status_changed', {
      employeeId: updated.id,
      email: updated.email,
      status: updated.status,
      isInactive: isEmployeeInactive(updated.status),
    });
  }

  await logAuditEvent({
    userId: user?.id,
    userName: user?.name || 'Admin',
    userRole: user?.role || 'SUPER_ADMIN',
    action: 'STATUS_CHANGE',
    entity: 'EMPLOYEE',
    entityId: updated.id,
    ipAddress: ip,
    details: `Changed status of ${updated.name} to ${status}`,
  });

  return {
    message: `Status updated to ${status}.`,
    data: formatEmployeeResponse(updated),
  };
}

/**
 * 7. Delete Employee
 */
export async function deleteEmployeeService(id, user, ip = '127.0.0.1') {
  const existing = await prisma.employee.findUnique({
    where: { id },
  });

  if (!existing) {
    const error = new Error('Employee not found.');
    error.status = 404;
    throw error;
  }

  await prisma.employee.delete({
    where: { id },
  });

  await delCache('crm:employees:*');

  if (io) {
    io.emit('employee_deleted', { id });
  }

  await logAuditEvent({
    userId: user?.id,
    userName: user?.name || 'Admin',
    userRole: user?.role || 'SUPER_ADMIN',
    action: 'DELETE',
    entity: 'EMPLOYEE',
    entityId: id,
    ipAddress: ip,
    details: `Removed employee record for ${existing.name} (${existing.empCode})`,
  });

  return {
    message: `Employee record for ${existing.name} has been removed.`,
  };
}

export default {
  getEmployeesService,
  getEmployeeByIdService,
  getEmployeeStatsService,
  createEmployeeService,
  updateEmployeeService,
  updateEmployeeStatusService,
  syncEmployeeStatusWithSessions,
  deleteEmployeeService,
};
