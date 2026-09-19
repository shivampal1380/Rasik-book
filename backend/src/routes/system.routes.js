import { Router } from 'express';
import { dashboard } from '../controllers/dashboard.controller.js';
import { createUser, listUsers, updateUser } from '../controllers/user.controller.js';
import { listAuditLogs } from '../controllers/misc.controller.js';
import { getHeadConfig, updateHeadVisibility } from '../controllers/headconfig.controller.js';
import { getPdfConfig, updatePdfConfig } from '../controllers/pdfconfig.controller.js';
import { authenticate, requireRole, requireAdmin } from '../middleware/auth.js';
import {
  validate,
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userParamSchema,
  listAuditQuerySchema,
  headConfigParamSchema,
  updateHeadConfigSchema,
  updatePdfConfigSchema,
} from '../validators/index.js';

const ALLOWED = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'];

const router = Router();
router.use(authenticate);
router.use(requireRole(...ALLOWED));

router.get('/dashboard', dashboard);

router.get('/audit-logs', requireAdmin, validate(listAuditQuerySchema, 'query'), listAuditLogs);

router.get('/head-config', getHeadConfig);
router.put('/head-config/:head', requireAdmin, validate(headConfigParamSchema, 'params'), validate(updateHeadConfigSchema), updateHeadVisibility);

router.get('/pdf-config', requireAdmin, getPdfConfig);
router.put('/pdf-config', requireAdmin, validate(updatePdfConfigSchema), updatePdfConfig);

router.get('/users', requireAdmin, validate(listUsersQuerySchema, 'query'), listUsers);
router.post('/users', requireAdmin, validate(createUserSchema), createUser);
router.patch('/users/:id', requireAdmin, validate(userParamSchema, 'params'), validate(updateUserSchema), updateUser);

export default router;