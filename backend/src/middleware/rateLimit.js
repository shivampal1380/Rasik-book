import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/errors.js';

export function createRateLimiter({
  windowMs = 60 * 1000,
  limit = 100,
  message = 'Too many requests, please try again later.',
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message },
      });
    },
  });
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  message: 'Too many authentication attempts, please try again later.',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 200,
  message: 'Too many requests from this client, please slow down.',
});