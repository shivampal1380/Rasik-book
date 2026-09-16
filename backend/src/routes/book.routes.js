import { Router } from 'express';
import {
  createBook,
  listBooks,
  getBook,
  completeBook,
  closeBook,
  getBookSummary,
} from '../controllers/book.controller.js';
import { createEntry, listEntries, updateEntry } from '../controllers/entry.controller.js';
import { getBookAudit, generatePdf } from '../controllers/misc.controller.js';
import { authenticate, requireRole, requireAdmin } from '../middleware/auth.js';
import {
  validate,
  createBookSchema,
  listBooksQuerySchema,
  bookParamSchema,
  createEntrySchema,
  listEntriesQuerySchema,
  entryParamSchema,
  updateEntrySchema,
} from '../validators/index.js';

const ALLOWED = ['ADMIN', 'OPERATOR'];

const router = Router();
router.use(authenticate);
router.use(requireRole(...ALLOWED));

// Apt: books
router.get('/', validate(listBooksQuerySchema, 'query'), listBooks);
router.post('/', validate(createBookSchema), createBook);

// Book-scoped routes
router.get('/:id/summary', validate(bookParamSchema, 'params'), getBookSummary);

router.get('/:id', validate(bookParamSchema, 'params'), getBook);
router.post('/:id/entries', validate(bookParamSchema, 'params'), validate(createEntrySchema), createEntry);
router.get('/:id/entries', validate(bookParamSchema, 'params'), validate(listEntriesQuerySchema, 'query'), listEntries);
router.patch(
  '/:id/entries/:entryId',
  validate(bookParamSchema, 'params'),
  validate(entryParamSchema, 'params'),
  validate(updateEntrySchema),
  requireAdmin,
  updateEntry,
);
router.post('/:id/complete', validate(bookParamSchema, 'params'), requireAdmin, completeBook);
router.post('/:id/close', validate(bookParamSchema, 'params'), requireAdmin, closeBook);
router.get('/:id/audit', validate(bookParamSchema, 'params'), requireAdmin, getBookAudit);
router.get('/:id/pdf', validate(bookParamSchema, 'params'), generatePdf);

export default router;