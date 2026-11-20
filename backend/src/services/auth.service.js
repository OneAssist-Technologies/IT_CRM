import { prisma } from '../config/prisma.js';
import { getCache, setCache, delCache } from '../config/redis.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateSessionToken, setAuthCookie, clearAuthCookie } from '../utils/jwt.js';
import { logAuditEvent } from './auditService.js';
import { isEmployeeInactive } from '../utils/employee.util.js';

/**
 * 1. User Registration / Signup
 */
export async function signupService(body, ip = '127.0.0.1', res = null) {
  const { name, email, phone, password, confirmPassword } = body;

  if (!name || !email || !password) {
    const error = new Error('Full Name, Email Address, and Password are required.');
    error.status = 400;
    throw error;
  }

  if (confirmPassword && password !== confirmPassword) {
    const error = new Error('Passwords do not match. Please re-enter your password.');
    error.status = 400;
    throw error;
  }

  const cleanEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existingUser) {
    const error = new Error('An account with this email address already exists. Please login.');
    error.status = 400;
    throw error;
  }

  const passwordHash = await hashPassword(password);

  const userCount = await prisma.user.count();
  const assignedRole = body.role || (userCount === 0 ? 'SUPER_ADMIN' : 'STAFF');
  const userDepartment = body.department || (userCount === 0 ? 'Executive Leadership' : 'General');
  const avatarUrl = body.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`;

  let roleId = body.roleId || null;
  if (!roleId && assignedRole === 'SUPER_ADMIN') {
    const saRole = await prisma.role.findFirst({
      where: { OR: [{ slug: 'super_admin' }, { name: { equals: 'Super Admin', mode: 'insensitive' } }] },
    });
    if (saRole) {
      roleId = saRole.id;
    }
  }

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? String(phone).trim() : null,
      passwordHash,
      role: assignedRole,
      roleId: roleId,
      department: userDepartment,
      avatar: avatarUrl,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      department: true,
      avatar: true,
      createdAt: true,
    },
  });

  const sessionToken = generateSessionToken();
  if (res) {
    setAuthCookie(res, sessionToken);
  }

  await setCache(`crm:session:${sessionToken}`, newUser, 86400 * 7);
  await setCache(`crm:session:${newUser.id}`, newUser, 86400 * 7);

  await logAuditEvent({
    userId: newUser.id,
    userName: newUser.name,
    userRole: newUser.role,
    action: 'CREATE',
    entity: 'USER',
    entityId: newUser.id,
    ipAddress: ip,
    details: `User account registered for ${newUser.name} (${newUser.email}).`,
  });

  return {
    message: 'Account created successfully! Session initialized.',
    user: newUser,
    token: sessionToken,
  };
}

/**
 * 2. User Login
 */
export async function loginService(body, ip = '127.0.0.1', res = null) {
  const { email, password } = body;

  if (!email || !password) {
    const error = new Error('Email and password are required.');
    error.status = 400;
    throw error;
  }

  const cleanEmail = email.toLowerCase().trim();

  // Validate Employee Active / Inactive status from database
  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        { email: { equals: cleanEmail, mode: 'insensitive' } },
        { empCode: { equals: email.trim(), mode: 'insensitive' } },
      ],
    },
  });

  if (emp && isEmployeeInactive(emp.status)) {
    const error = new Error('Your account is inactive. Please contact your administrator.');
    error.status = 403;
    throw error;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanEmail },
        ...(emp?.email ? [{ email: emp.email.toLowerCase().trim() }] : []),
      ],
    },
  });

  if (!user) {
    const error = new Error('Invalid email address or password.');
    error.status = 401;
    throw error;
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email address or password.');
    error.status = 401;
    throw error;
  }

  const userProfile = {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || null,
    role: user.role,
    department: user.department,
    avatar: user.avatar,
  };

  const sessionToken = generateSessionToken();
  if (res) {
    setAuthCookie(res, sessionToken);
  }

  await setCache(`crm:session:${sessionToken}`, userProfile, 86400 * 7);
  await setCache(`crm:session:${user.id}`, userProfile, 86400 * 7);

  await logAuditEvent({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'LOGIN',
    entity: 'AUTH',
    entityId: user.id,
    ipAddress: ip,
    details: `User ${user.name} logged in successfully. Session cached in Redis.`,
  });

  return {
    message: `Welcome back, ${user.name}!`,
    user: userProfile,
    token: sessionToken,
  };
}

/**
 * 3. User Logout
 */
export async function logoutService(user, sessionToken, ip = '127.0.0.1', res = null) {
  const userId = user?.id;

  if (userId) {
    await delCache(`crm:session:${userId}`);
  }
  if (sessionToken) {
    await delCache(`crm:session:${sessionToken}`);
  }

  if (res) {
    clearAuthCookie(res);
  }

  if (user) {
    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGOUT',
      entity: 'AUTH',
      entityId: user.id,
      ipAddress: ip,
      details: `User ${user.name} logged out. Redis session purged and cookie cleared.`,
    });
  }

  return {
    message: 'Logged out successfully! Redis session purged and cookie cleared.',
  };
}

/**
 * 4. Current User Session Verification (/me)
 */
export async function getCurrentUserService(authUser) {
  if (!authUser) {
    const error = new Error('Not authenticated.');
    error.status = 401;
    throw error;
  }

  // Verify Active / Inactive Employee Status
  if (authUser.email) {
    const emp = await prisma.employee.findFirst({
      where: { email: { equals: authUser.email.toLowerCase().trim(), mode: 'insensitive' } },
      select: { id: true, status: true },
    });
    if (emp && isEmployeeInactive(emp.status)) {
      const error = new Error('Your account is inactive. Please contact your administrator.');
      error.status = 403;
      throw error;
    }
  }

  const cachedSession = await getCache(`crm:session:${authUser.id}`);
  if (cachedSession) {
    return {
      source: '⚡ Redis Session Cache (<1ms)',
      user: cachedSession,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      department: true,
      avatar: true,
    },
  });

  if (!user) {
    const error = new Error('User not found in database.');
    error.status = 404;
    throw error;
  }

  await setCache(`crm:session:${user.id}`, user, 86400);

  return {
    source: '🗄️ PostgreSQL (Prisma)',
    user,
  };
}

export default {
  signupService,
  loginService,
  logoutService,
  getCurrentUserService,
};
