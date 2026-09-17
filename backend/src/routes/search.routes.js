import { Router } from 'express';
import { searchEntries, compareBooks } from '../controllers/search.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, searchEntriesQuerySchema, compareBooksQuerySchema } from '../validators/index.js';

const ALLOWED = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'];

const router = Router();
router.use(authenticate);
router.use(requireRole(...ALLOWED));

router.get('/entries', validate(searchEntriesQuerySchema, 'query'), searchEntries);
router.get('/compare', validate(compareBooksQuerySchema, 'query'), compareBooks);

export default router;