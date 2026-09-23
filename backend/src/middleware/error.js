import pino from 'pino';
import { AppError, fromPrismaError } from '../utils/errors.js';
import { isProd } from '../config/env.js';
import { prisma } from '../utils/prisma.js';

const log = pino({ name: 'error-handler' });

export function errorHandler(err, req, res, _next) {
  // --- normalise the error ---
  if (err?.code && err?.meta) {
    const prismaMapped = fromPrismaError(err);
    if (prismaMapped) err = prismaMapped;
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || undefined,
      },
    });
  }

  // zod validation
  if (err?.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues,
      },
    });
  }

  // JWT errors
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'Invalid or expired token' },
    });
  }

  // Body-parser (malformed JSON / payload too large), CORS and any other
  // upstream 4xx. These carry a numeric statusCode and must not be reported
  // as internal errors.
  const status = err?.statusCode ?? err?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const code =
      err?.code ||
      (status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 400 ? 'BAD_REQUEST' : 'REQUEST_ERROR');
    return res.status(status).json({
      success: false,
      error: { code, message: err?.message || 'Bad request' },
    });
  }

  // --- fallback 500 ---
  log.error({ err, requestId: req.id }, 'Unhandled error');

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd
        ? 'An internal server error occurred'
        : err.message || 'Internal server error',
    },
  });
}