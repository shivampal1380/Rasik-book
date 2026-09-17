import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { env } from '../config/env.js';

const COOKIE = 'token';

// Read the JWT from httpOnly cookie or Authorization header.
function extractToken(req) {
  if (req.cookies?.[COOKIE]) return req.cookies[COOKIE];
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// Authenticate: set req.user when valid token present.
export function authenticate(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError();

    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload; // { sub, email, role, name }
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError')
      return next(new UnauthorizedError('Invalid or expired token', 'TOKEN_INVALID'));
    next(err);
  }
}

// Set a signed httpOnly cookie for the client.
export function signCookie(res, payload) {
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: parseExpiryToMs(env.JWT_EXPIRES_IN),
  });
  return token;
}

// Clear the cookie on logout.
export function clearCookie(res) {
  res.clearCookie(COOKIE, { httpOnly: true, path: '/' });
}

function parseExpiryToMs(exp) {
  const match = String(exp).match(/^(\d+)([smhd])$/i);
  if (!match) return 12 * 60 * 60 * 1000; // 12h default
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * (mult[unit] || 3600000);
}

// Require at least one of the listed roles.
export function requireRole(...roles) {
  return function roleMiddleware(req, _res, next) {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}

// Require an admin-level role (SUPER_ADMIN or ADMIN).
export const requireAdmin = requireRole('SUPER_ADMIN', 'ADMIN');

// Authentication optional — does not reject unauthenticated requests.
export function optionalAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (token) req.user = jwt.verify(token, env.JWT_SECRET);
  } catch {
    // silently ignore invalid tokens on optional paths
  }
  next();
}