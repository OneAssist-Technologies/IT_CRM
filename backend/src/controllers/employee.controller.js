import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { delCache } from '../config/redis.js';
import { logAuditEvent } from '../services/auditService.js';
import { io } from '../utils/socket.js';
import { formatEmployeeResponse } from '../utils/employee.util.js';
import * as employeeService from '../services/employee.service.js';

/**
 * 1. Get all employees with optional filtering, search, and Redis caching
 * GET /api/employees
 */
export async function getEmployees(req, res) {
  try {
    const result = await employeeService.getEmployeesService(req.query);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in getEmployees:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 2. Get Single Employee by ID
 * GET /api/employees/:id
 */
export async function getEmployeeById(req, res) {
  try {
    const result = await employeeService.getEmployeeByIdService(req.params.id);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 3. Get Employee Statistics & Department KPIs
 * GET /api/employees/stats
 */
export async function getEmployeeStats(_req, res) {
  try {
    const result = await employeeService.getEmployeeStatsService();
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 4. Create New Employee & User Account
 * POST /api/employees
 */
export async function createEmployee(req, res) {
  try {
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
    } = req.body;

    if (!name || String(name).trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Full Name is mandatory (minimum 3 characters).',
      });
    }

    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Email is mandatory.',
      });
    }

    const phoneDigits = String(phone || '').replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone Number must be exactly 10 digits.',
      });
    }

    const existingEmployee = await prisma.employee.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'An employee with this email address already exists.',
      });
    }

    let finalEmpCode = customEmpCode ? String(customEmpCode).trim() : '';

    // Check if the provided empCode already exists in database
    const codeInUse = finalEmpCode
      ? await prisma.employee.findUnique({ where: { empCode: finalEmpCode } })
      : null;

    if (!finalEmpCode || codeInUse) {
      const allEmployees = await prisma.employee.findMany({
        select: { empCode: true },
      });
      const numericCodes = allEmployees
        .map((e) => {
          const match = e.empCode?.match(/EMP-(\d+)/i);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n) => n !== null);
      const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 1000;
      finalEmpCode = `EMP-${maxCode + 1}`;
    }

    let newEmployee;
    try {
      newEmployee = await prisma.employee.create({
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
    } catch (createErr) {
      if (createErr.code === 'P2002' && createErr.meta?.target?.includes('empCode')) {
        const total = await prisma.employee.count();
        const fallbackCode = `EMP-${1000 + total + Math.floor(Math.random() * 800) + 1}`;
        newEmployee = await prisma.employee.create({
          data: {
            empCode: fallbackCode,
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
      } else {
        throw createErr;
      }
    }

    // Ensure user account is created/updated for login
    if (password) {
      try {
        const passwordHash = await bcrypt.hash(password, 10);
        const assignedRole = newEmployee.role || 'STAFF';

        let matchedRole = await prisma.role.findFirst({
          where: {
            OR: [
              { name: { equals: assignedRole, mode: 'insensitive' } },
              { slug: { equals: assignedRole.toLowerCase().replace(/[\s-]+/g, '_'), mode: 'insensitive' } },
            ],
          },
        });

        if (!matchedRole) {
          matchedRole = await prisma.role.findFirst({
            where: {
              OR: [
                { slug: 'employee' },
                { name: { equals: 'Employee', mode: 'insensitive' } },
              ],
            },
          });
        }

        await prisma.user.upsert({
          where: { email: cleanEmail },
          update: {
            name: newEmployee.name,
            phone: newEmployee.phone,
            passwordHash,
            role: assignedRole,
            roleId: matchedRole?.id || null,
            department: newEmployee.department,
          },
          create: {
            name: newEmployee.name,
            email: cleanEmail,
            phone: newEmployee.phone,
            passwordHash,
            role: assignedRole,
            roleId: matchedRole?.id || null,
            department: newEmployee.department,
          },
        });
      } catch (userErr) {
        console.error('User account creation/sync error:', userErr.message);
      }
    }

    await delCache('crm:employees:*');

    if (io) {
      io.emit('employee_created', newEmployee);
    }

    try {
      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name || 'Admin',
        userRole: req.user?.role || 'SUPER_ADMIN',
        action: 'CREATE',
        entity: 'EMPLOYEE',
        entityId: newEmployee.id,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        details: `Onboarded employee ${newEmployee.name} (${newEmployee.empCode}) into ${newEmployee.department}`,
      });
    } catch (_) {}

    return res.status(201).json({
      success: true,
      message: `Employee ${newEmployee.name} created successfully!`,
      data: formatEmployeeResponse(newEmployee),
    });
  } catch (error) {
    console.error('Error in createEmployee:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 5. Update Employee Details
 * PUT /api/employees/:id
 */
export async function updateEmployee(req, res) {
  try {
    const { id } = req.params;
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
      password,
    } = req.body;

    let existing = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      if (empCode || email) {
        existing = await prisma.employee.findFirst({
          where: {
            OR: [
              ...(empCode ? [{ empCode }] : []),
              ...(email ? [{ email: email.toLowerCase().trim() }] : []),
            ],
          },
        });
      }
    }

    // Gracefully create if not found in database (e.g. after database cleanup or stale edit ID)
    if (!existing) {
      return await createEmployee(req, res);
    }

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const duplicateEmail = await prisma.employee.findFirst({
        where: {
          email: cleanEmail,
          id: { not: existing.id },
        },
      });
      if (duplicateEmail) {
        return res.status(400).json({
          success: false,
          message: 'An employee with this email address already exists.',
        });
      }
    }

    const updated = await prisma.employee.update({
      where: { id: existing.id },
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

    // Synchronize user credentials if password was provided or employee was updated
    if (password) {
      try {
        const passwordHash = await bcrypt.hash(password, 10);
        const userEmail = updated.email.toLowerCase().trim();
        const assignedRole = updated.role || 'STAFF';

        let matchedRole = await prisma.role.findFirst({
          where: {
            OR: [
              { name: { equals: assignedRole, mode: 'insensitive' } },
              { slug: { equals: assignedRole.toLowerCase().replace(/[\s-]+/g, '_'), mode: 'insensitive' } },
            ],
          },
        });

        if (!matchedRole) {
          matchedRole = await prisma.role.findFirst({
            where: {
              OR: [
                { slug: 'employee' },
                { name: { equals: 'Employee', mode: 'insensitive' } },
              ],
            },
          });
        }

        await prisma.user.upsert({
          where: { email: userEmail },
          update: {
            name: updated.name,
            phone: updated.phone,
            passwordHash,
            role: assignedRole,
            roleId: matchedRole?.id || null,
            department: updated.department,
          },
          create: {
            name: updated.name,
            email: userEmail,
            phone: updated.phone,
            passwordHash,
            role: assignedRole,
            roleId: matchedRole?.id || null,
            department: updated.department,
          },
        });
      } catch (userErr) {
        console.error('User password update sync error:', userErr.message);
      }
    }

    await delCache('crm:employees:*');

    if (io) {
      io.emit('employee_updated', updated);
    }

    try {
      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name || 'Admin',
        userRole: req.user?.role || 'SUPER_ADMIN',
        action: 'UPDATE',
        entity: 'EMPLOYEE',
        entityId: updated.id,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        details: `Updated employee details for ${updated.name} (${updated.empCode})`,
      });
    } catch (_) {}

    return res.json({
      success: true,
      message: `Employee ${updated.name} updated successfully!`,
      data: formatEmployeeResponse(updated),
    });
  } catch (error) {
    console.error('Error in updateEmployee:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 6. Update Employee Status
 * PATCH /api/employees/:id/status
 */
export async function updateEmployeeStatus(req, res) {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const result = await employeeService.updateEmployeeStatusService(req.params.id, req.body?.status, req.user, ip);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 7. Delete Employee Record
 * DELETE /api/employees/:id
 */
export async function deleteEmployee(req, res) {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const result = await employeeService.deleteEmployeeService(req.params.id, req.user, ip);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in deleteEmployee:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

export default {
  getEmployees,
  getEmployeeById,
  getEmployeeStats,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
};
