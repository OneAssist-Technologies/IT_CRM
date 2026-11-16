import { prisma } from '../config/prisma.js';
import { getCache, setCache } from '../config/redis.js';
import { env } from '../config/env.js';
import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';

/**
 * Middleware: Verify Authentication from HttpOnly Cookie (UUID Session / JWT) or Bearer Header
 */
export async function requireAuth(req, res, next) {
  let token = null;

  if (req.headers.authorization) {
    const authHeader = req.headers.authorization.trim();
    const parts = authHeader.split(/\s+/);
    if (parts.length >= 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts.slice(1).join(' ').trim();
    } else if (parts.length === 1 && !parts[0].toLowerCase().startsWith('bearer')) {
      token = parts[0].trim();
    }
  }

  if (!token && req.cookies) {
    token = req.cookies[COOKIE_NAME];
  }

  if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
    return res.status(401).json({ success: false, message: 'Authentication required. Please login.' });
  }

  token = token.trim();

  try {
    req.sessionToken = token;

    // 1. JWT verify (stateless, immediate)
    if (token.includes('.')) {
      try {
        const decoded = verifyToken(token);
        if (decoded && (decoded.id || decoded.email)) {
          req.user = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name || 'User',
            role: decoded.role || 'STAFF',
          };
          return next();
        }
      } catch (_) {}
    }

    // 2. Redis Session Cache lookup (<1ms response)
    const cachedSession = await getCache(`crm:session:${token}`);
    if (cachedSession && (cachedSession.id || cachedSession.email)) {
      req.user = {
        id: cachedSession.id,
        email: cachedSession.email,
        name: cachedSession.name,
        role: cachedSession.role || 'SUPER_ADMIN',
      };
      return next();
    }

    // 3. Direct User lookup in Database (supports direct user id or email)
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: token },
          { email: { equals: token, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true, role: true },
    });

    if (dbUser) {
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      };
      await setCache(`crm:session:${token}`, dbUser, 86400 * 7);
      return next();
    }

    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }
}

/**
 * Middleware: Role-Based Access Control (RBAC)
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const rolesList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRole = (req.user.role || '').toUpperCase();
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPER ADMIN';

    if (isSuperAdmin || rolesList.map((r) => r.toUpperCase()).includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: User role '${req.user.role}' is not authorized. Required: ${rolesList.join(', ')}`,
    });
  };
}

/**
 * Middleware: Optional Authentication (attaches user if token present)
 */
export async function optionalAuth(req, _res, next) {
  let token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (token) {
    try {
      const cached = await getCache(`crm:session:${token}`);
      if (cached?.id) {
        req.user = cached;
      } else if (token.includes('.')) {
        req.user = verifyToken(token);
      }
    } catch (_) {}
  }
  next();
}

export default {
  requireAuth,
  requireRole,
  optionalAuth,
};
