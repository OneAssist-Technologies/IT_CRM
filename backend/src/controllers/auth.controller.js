import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../config/prisma.js';
import { setCache, getCache, delCache } from '../config/redis.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateSessionToken, generateToken, setAuthCookie } from '../utils/jwt.js';
import { logAuditEvent } from '../services/auditService.js';
import * as authService from '../services/auth.service.js';

/**
 * Handle User Registration / Signup
 * POST /api/auth/signup
 */
export async function signup(req, res) {
  try {
    const { organisationName, organizationName, companyName, name, email, phone, password, confirmPassword } = req.body;
    const orgName = (organisationName || organizationName || companyName || '').trim();

    if (!orgName) {
      return res.status(400).json({
        success: false,
        message: 'Organisation Name is mandatory. Registration is strictly for Organisation Super Admins.',
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Super Admin Name, Email Address, and Password are required.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please re-enter your password.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please login.',
      });
    }

    const passwordHash = await hashPassword(password);

    // Link to Admin role in RBAC
    const adminRole = await prisma.role.findFirst({
      where: {
        OR: [
          { slug: 'admin' },
          { slug: 'super_admin' },
          { name: { equals: 'Admin', mode: 'insensitive' } },
        ],
      },
    });

    // Optionally ensure Company entry exists
    try {
      await prisma.company.upsert({
        where: { name: orgName },
        update: {},
        create: {
          name: orgName,
        },
      });
    } catch (_) {}

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? String(phone).trim() : null,
        passwordHash,
        role: 'SUPER_ADMIN',
        roleId: adminRole?.id || null,
        department: orgName,
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
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

    const sessionToken = generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    });
    setAuthCookie(res, sessionToken);

    await setCache(`crm:session:${sessionToken}`, newUser, 86400 * 7);
    await setCache(`crm:session:${newUser.id}`, newUser, 86400 * 7);

    await logAuditEvent({
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: 'CREATE',
      entity: 'USER',
      entityId: newUser.id,
      ipAddress: req.ip,
      details: `User account registered for ${newUser.name} (${newUser.email}).`,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Session initialized.',
      user: newUser,
      token: sessionToken,
    });
  } catch (error) {
    console.error('[Signup Controller Error]', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error during registration.',
    });
  }
}

export const register = signup;

/**
 * Handle User Login / Sign In
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, username, id: empIdInput, password } = req.body;
    const identifier = (email || username || empIdInput || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email or Employee ID and password are required.',
      });
    }

    const cleanId = identifier.toLowerCase();
    const variations = [cleanId];
    if (cleanId.includes('neela')) variations.push(cleanId.replace('neela', 'nela'));
    if (cleanId.includes('nela')) variations.push(cleanId.replace('nela', 'neela'));

    // 1. Check if identifier matches an Employee by empCode, email, or name
    const matchedEmployee = await prisma.employee.findFirst({
      where: {
        OR: [
          { empCode: { equals: identifier, mode: 'insensitive' } },
          ...variations.map((v) => ({ email: { equals: v, mode: 'insensitive' } })),
          { name: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    const targetEmail = matchedEmployee?.email?.toLowerCase().trim();

    // 2. Find User by email, employee match, or name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(targetEmail ? [{ email: { equals: targetEmail, mode: 'insensitive' } }] : []),
          ...variations.map((v) => ({ email: { equals: v, mode: 'insensitive' } })),
          { name: { equals: identifier, mode: 'insensitive' } },
          ...(matchedEmployee ? [{ name: { equals: matchedEmployee.name, mode: 'insensitive' } }] : []),
        ],
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address/Employee ID or password.',
      });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address/Employee ID or password.',
      });
    }

    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || matchedEmployee?.phone || null,
      role: user.role,
      department: user.department || matchedEmployee?.department,
      avatar: user.avatar,
      empCode: matchedEmployee?.empCode || null,
    };

    const sessionToken = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    setAuthCookie(res, sessionToken);

    await setCache(`crm:session:${sessionToken}`, userProfile, 86400 * 7);
    await setCache(`crm:session:${user.id}`, userProfile, 86400 * 7);

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      entity: 'AUTH',
      entityId: user.id,
      ipAddress: req.ip,
      details: `User ${user.name} logged in successfully. Session cached in Redis.`,
    });

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: userProfile,
      token: sessionToken,
    });
  } catch (error) {
    console.error('[Login Controller Error]', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error during login.',
    });
  }
}

/**
 * Handle User Logout
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  try {
    const sessionToken = req.sessionToken || (req.cookies ? req.cookies['access_token'] : null);
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const result = await authService.logoutService(req.user, sessionToken, ip, res);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Logout Controller Error]', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error during logout.',
    });
  }
}

/**
 * Handle Current Session User Verification (/me)
 * GET /api/auth/me or /api/auth/session
 */
export async function getCurrentUser(req, res) {
  try {
    const result = await authService.getCurrentUserService(req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Session Controller Error]', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * Request Password Reset Link (Forgot Password)
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered work email address.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user account found with this email address.',
      });
    }

    // Generate secure 64-character random token
    const token = crypto.randomBytes(32).toString('hex');

    // Cache token in Redis/memory with 1-hour TTL (3600s)
    await setCache(`crm:reset-token:${token}`, {
      userId: user.id,
      email: cleanEmail,
      createdAt: Date.now(),
    }, 3600);

    // Keep user's active token tracked
    await setCache(`crm:user-token:${cleanEmail}`, token, 3600);

    // Also persist in PostgreSQL for 100% guarantee across process reboots
    try {
      await prisma.user.update({
        where: { email: cleanEmail },
        data: {
          refreshToken: `RESET:${token}:${Date.now() + 3600 * 1000}`,
        },
      });
    } catch (dbErr) {
      console.warn('[DB Token Persistence Warning]', dbErr.message);
    }

    // Client Reset URL
    const clientOrigin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${clientOrigin}/reset-password?token=${token}&email=${encodeURIComponent(cleanEmail)}`;

    // Audit log
    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      userRole: 'AUTH',
      action: 'PASSWORD_RESET_LINK_REQUESTED',
      entity: 'AUTH',
      entityId: user.id,
      ipAddress: req.ip,
      details: `Password reset request email generated for ${cleanEmail}.`,
    });

    // Send email via dynamic SMTP
    const rawPass = (process.env.SMTP_PASS || '').replace(/^["']|["']$/g, '').trim();
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    let emailSent = false;
    let mailError = null;

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: rawPass,
        },
      });

      await transporter.sendMail({
        from: `"OneAssist CRM" <${smtpUser}>`,
        to: cleanEmail,
        subject: 'OneAssist CRM - Reset Your Password Request',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - OneAssist CRM</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1E293B;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9; width: 100%; padding: 40px 16px;">
              <tr>
                <td align="center">
                  <!-- Main Card -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02); border: 1px solid #E2E8F0;">
                    
                    <!-- Top Accent Gradient Line -->
                    <tr>
                      <td style="height: 4px; background: linear-gradient(90deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>

                    <!-- Header / Brand -->
                    <tr>
                      <td align="center" style="padding: 32px 32px 20px; border-bottom: 1px solid #F1F5F9;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td align="center">
                              <span style="font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em;">
                                OneAssist <span style="color: #2563EB;">CRM</span>
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding-top: 4px;">
                              <span style="font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase;">
                                IT Sales & Operations Hub
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Main Content Body -->
                    <tr>
                      <td style="padding: 32px 36px 28px;">
                        <h1 style="margin: 0 0 16px; font-size: 21px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em;">
                          Password Reset Request
                        </h1>
                        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
                          Hello <strong>${user.name}</strong>,
                        </p>
                        <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.65; color: #475569;">
                          We received a request to reset the password for your OneAssist CRM account associated with <strong style="color: #0F172A;">${cleanEmail}</strong>.
                        </p>
                        <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.65; color: #475569;">
                          To choose a new password, click the button below. This password reset link is valid for <strong>1 hour</strong>.
                        </p>

                        <!-- CTA Button -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 8px 0 28px;">
                          <tr>
                            <td align="center">
                              <a href="${resetUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%); color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 38px; border-radius: 12px; box-shadow: 0 4px 14px rgba(29, 78, 216, 0.25); letter-spacing: 0.01em;">
                                Reset Password &rarr;
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Security Info Box -->
                        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 18px; margin: 24px 0 20px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td valign="top" style="width: 24px; padding-right: 10px; font-size: 16px;">&#128274;</td>
                              <td style="font-size: 13px; line-height: 1.5; color: #64748B;">
                                <strong style="color: #334155;">Didn't request this?</strong> If you didn't ask to reset your password, you can safely ignore this email. Your account remains completely secure.
                              </td>
                            </tr>
                          </table>
                        </div>

                        <!-- Fallback Link -->
                        <p style="margin: 20px 0 0; font-size: 12px; line-height: 1.6; color: #94A3B8; border-top: 1px solid #F1F5F9; padding-top: 18px;">
                          Button not working? Copy and paste this URL into your browser:<br>
                          <a href="${resetUrl}" style="color: #2563EB; word-break: break-all; text-decoration: none; font-weight: 500;">${resetUrl}</a>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="background-color: #F8FAFC; padding: 22px 32px; border-top: 1px solid #F1F5F9;">
                        <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #64748B;">
                          OneAssist CRM &bull; IT Sales &amp; Operations Hub
                        </p>
                        <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                          &copy; 2026 OneAssist CRM. All rights reserved. Automated security notification.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
      emailSent = true;
    } catch (mailErr) {
      console.error('[SMTP Mail Error]', mailErr);
      mailError = mailErr.message;
    }

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: `Failed to send password reset email: ${mailError || 'SMTP connection error'}`,
      });
    }

    return res.json({
      success: true,
      message: `Password reset request email has been sent to ${cleanEmail}. Please check your inbox and click the reset link.`,
      email: cleanEmail,
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while processing password reset request.',
    });
  }
}

/**
 * Validate Reset Token
 * GET /api/auth/validate-reset-token
 */
export async function validateResetToken(req, res) {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, valid: false, message: 'Reset token is required.' });
    }

    // 1. Check Redis cache
    let cachedData = await getCache(`crm:reset-token:${token}`);
    let targetEmail = cachedData?.email;

    // 2. Check PostgreSQL database backup if not in Redis
    if (!targetEmail) {
      const userWithToken = await prisma.user.findFirst({
        where: {
          refreshToken: {
            startsWith: `RESET:${token}:`,
          },
        },
        select: { id: true, email: true, refreshToken: true },
      });

      if (userWithToken && userWithToken.refreshToken) {
        const parts = userWithToken.refreshToken.split(':');
        const expiry = Number(parts[2]);
        if (expiry && Date.now() < expiry) {
          targetEmail = userWithToken.email;
          // Re-populate in cache
          await setCache(`crm:reset-token:${token}`, {
            userId: userWithToken.id,
            email: targetEmail,
          }, 3600);
        }
      }
    }

    if (!targetEmail) {
      return res.status(400).json({ success: false, valid: false, message: 'Invalid or expired reset token.' });
    }

    return res.json({
      success: true,
      valid: true,
      email: targetEmail,
    });
  } catch (error) {
    return res.status(500).json({ success: false, valid: false, message: error.message });
  }
}

/**
 * Confirm and Reset Password via Token
 * POST /api/auth/reset-password
 */
export async function resetPassword(req, res) {
  try {
    const { token, email, newPassword, confirmPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required.',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const cleanToken = String(token || '').trim();
    let resetData = null;

    if (cleanToken) {
      resetData = await getCache(`crm:reset-token:${cleanToken}`);
    }

    let targetEmail = resetData?.email;

    // Database backup check
    if (!targetEmail && cleanToken) {
      const userWithToken = await prisma.user.findFirst({
        where: {
          refreshToken: {
            startsWith: `RESET:${cleanToken}:`,
          },
        },
        select: { id: true, email: true, refreshToken: true },
      });

      if (userWithToken && userWithToken.refreshToken) {
        const parts = userWithToken.refreshToken.split(':');
        const expiry = Number(parts[2]);
        if (expiry && Date.now() < expiry) {
          targetEmail = userWithToken.email;
        }
      }
    }

    if (!targetEmail && email && cleanToken) {
      const savedToken = await getCache(`crm:user-token:${email.toLowerCase().trim()}`);
      if (savedToken && String(savedToken) === cleanToken) {
        targetEmail = email.toLowerCase().trim();
      }
    }

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link. Please request a new link.',
      });
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update in database and clear token
    const updatedUser = await prisma.user.update({
      where: { email: targetEmail },
      data: {
        passwordHash,
        refreshToken: null,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    // Invalidate reset tokens and user sessions
    if (cleanToken) {
      await delCache(`crm:reset-token:${cleanToken}`);
    }
    await delCache(`crm:user-token:${targetEmail}`);
    await delCache(`crm:session:${updatedUser.id}`);

    // Audit log
    await logAuditEvent({
      userId: updatedUser.id,
      userName: updatedUser.name,
      userRole: updatedUser.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'USER',
      entityId: updatedUser.id,
      ipAddress: req.ip,
      details: `Password reset successfully completed via email link for ${targetEmail}.`,
    });

    return res.json({
      success: true,
      message: 'Password has been reset successfully! You can now sign in with your new password.',
      email: targetEmail,
    });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while resetting password.',
    });
  }
}

export default {
  signup,
  register,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  validateResetToken,
  resetPassword,
};
