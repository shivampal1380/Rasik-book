// Application error helpers with consistent HTTP statuses and stable error codes.

const STATUS_TEXT = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

export class AppError extends Error {
  constructor(statusCode, message, { code = null, details = null, cause = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code || STATUS_TEXT[statusCode] || 'ERROR';
    this.details = details;
    this.cause = cause;
    Error.captureStackTrace?.(this, AppError);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null, code = 'VALIDATION_ERROR') {
    super(422, message, { code, details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(401, message, { code });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    super(403, message, { code });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(404, message, { code });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = 'CONFLICT', details = null) {
    super(409, message, { code, details });
  }
}

// Map Prisma error codes to friendly application errors.
export function fromPrismaError(err, context = {}) {
  // Unique constraint violation -> the duplicates the product rules must surface
  if (err?.code === 'P2002') {
    const target = err.meta?.target;
    const field = Array.isArray(target) ? target.join(' + ') : String(target || 'unique field');
    return new ConflictError(
      `A record with the same ${field} already exists`,
      'DUPLICATE_RECORD',
      context.details ?? null,
    );
  }

  if (err?.code === 'P2003') {
    return new AppError(400, 'The referenced record does not exist', {
      code: 'FOREIGN_KEY_VIOLATION',
    });
  }

  if (err?.code === 'P2025') {
    return new NotFoundError(context.recordName ?? 'The requested record was not found');
  }

  if (err?.code === 'P2016' || err?.code === 'P2023') {
    return new NotFoundError('The requested record was not found or is no longer consistent');
  }

  return err;
}