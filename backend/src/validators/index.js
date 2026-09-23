import { z } from 'zod';
import { HEAD_VALUES } from '../config/constants.js';

// --- Auth ---
export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100),
});

// --- Books ---
export const createBookSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(10, 'Code must be at most 10 characters')
    .regex(/^[A-Za-z0-9._-]+$/, 'Code may contain only letters, numbers, dot, dash, underscore'),
  bookNumber: z
    .string()
    .trim()
    .min(1, 'Book number is required')
    .max(20, 'Book number must be at most 20 characters')
    .regex(/^[A-Za-z0-9._\-/]+$/, 'Book number may contain letters, numbers, dot, dash, slash'),
  pracharak: z.string().trim().max(100).optional().nullable(),
  area: z.string().trim().max(100).optional().nullable(),
  isUpi: z.boolean().optional(),
  isUpiCash: z.boolean().optional(),
});

export const listBooksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['OPEN', 'COMPLETED', 'CLOSED', 'CANCELLED']).optional(),
});

export const bookParamSchema = z.object({
  id: z.string().uuid(),
});

// --- Entries ---
export const createEntrySchema = z.object({
  head: z.enum(HEAD_VALUES, { message: 'A valid head must be selected' }),
  amount: z
    .union([z.number(), z.string()])
    .transform((v, ctx) => {
      const str = String(v ?? '').trim();
      if (str === '') {
        ctx.addIssue({ code: 'custom', message: 'Amount is required' });
        return z.NEVER;
      }
      if (!/^\+?\d+$/.test(str)) {
        ctx.addIssue({ code: 'custom', message: 'Amount must be a whole number of rupees greater than zero' });
        return z.NEVER;
      }
      return Number(str);
    })
    .refine(n => Number.isSafeInteger(n) && n > 0, {
      message: 'Amount must be a whole number greater than zero',
    })
    .refine(n => n <= 2_000_000_000, {
      message: 'Amount is too large',
    }),
  paymentMethod: z.enum(['UPI', 'CASH']).optional().nullable(),
});

export const listEntriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
  head: z.enum(HEAD_VALUES).optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['entryNumber', 'createdAt', 'amount']).default('entryNumber'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const updateEntrySchema = z
  .object({
    head: z.enum(HEAD_VALUES, { message: 'A valid head must be selected' }).optional(),
    amount: createEntrySchema.shape.amount.optional(),
    paymentMethod: z.enum(['UPI', 'CASH']).optional().nullable(),
    cancelled: z.boolean().optional(),
  })
  .refine(d => d.cancelled != null || (d.head != null && d.amount != null), {
    message: 'Provide head and amount to correct, or cancelled to cancel/restore a receipt',
  });

export const entryParamSchema = z.object({
  entryId: z.string().uuid(),
});

// --- Users ---
export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR']).default('OPERATOR'),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
});

export const userParamSchema = z.object({
  id: z.string().uuid(),
});

// --- Head visibility (configuration) ---
export const headConfigParamSchema = z.object({
  head: z.enum(HEAD_VALUES),
});

export const updateHeadConfigSchema = z.object({
  visible: z.boolean(),
});

// --- PDF statement layout ---
export const updatePdfConfigSchema = z.object({
  mainHeads: z
    .array(z.enum(HEAD_VALUES))
    .min(6, '6 or 7 main heads are required')
    .max(7, 'At most 7 main heads are required')
    .refine(arr => new Set(arr).size === arr.length, 'Main heads must not repeat'),
  subHeadMode: z.boolean().optional(),
  summaryRow7: z.enum(HEAD_VALUES).nullable().optional(),
  summaryRow8: z.enum(HEAD_VALUES).nullable().optional(),
});

// --- Audit ---
export const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  entity: z.string().trim().max(50).optional(),
  entityId: z.string().trim().max(50).optional(),
  action: z.string().trim().max(50).optional(),
  userId: z.string().uuid().optional(),
});

// --- Compare books ---
const optionalReceiptNo = z.preprocess(
  v => (v === '' || v == null ? undefined : v),
  z.coerce.number().int().min(1).max(1000).optional(),
);

const receiptRangeSchema = z
  .object({
    from: optionalReceiptNo,
    to: optionalReceiptNo,
  })
  .refine(r => r.from == null || r.to == null || r.from <= r.to, {
    message: '"from" must be less than or equal to "to"',
  });

export const compareBooksQuerySchema = z.object({
  books: z.preprocess(
    v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]),
    z
      .array(z.string().uuid())
      .min(1, 'Select at least 1 book')
      .max(4, 'Select up to 4 books'),
  ),
  ranges: z.preprocess(v => {
    if (v == null || v === '') return [];
    if (Array.isArray(v)) return v;
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, z.array(receiptRangeSchema).max(4).default([])),
});

// --- Global search ---
export const searchEntriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
  q: z.string().trim().max(100).optional(),
  bookNo: z.string().trim().max(50).optional(),
  receipt: z.string().trim().max(50).optional(),
  head: z.enum(HEAD_VALUES).optional(),
  amountMin: z.coerce.number().min(0).optional(),
  amountMax: z.coerce.number().min(0).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional(),
  sort: z.enum(['entryNumber', 'createdAt', 'amount', 'bookNumber']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Factory to validate & attach parsed value
import 'express';

export function validate(schema, source = 'body') {
  return function validationMiddleware(req, _res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const error = new Error('Request validation failed');
      error.name = 'ZodError';
      error.issues = result.error.issues;
      return next(error);
    }
    // Only attach parsed/coerced values for body and query. Never replace
    // req.params: a route may validate the params multiple times (e.g. both a
    // book and an entry id) and zod strips unknown keys, which would drop the
    // other param and break subsequent validators/controllers.
    if (source !== 'params') req[source] = result.data;
    next();
  };
}