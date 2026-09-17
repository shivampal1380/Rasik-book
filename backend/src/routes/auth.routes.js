import { Router } from 'express';
import { login, logout, me, changePassword } from '../controllers/auth.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { validate, loginSchema, changePasswordSchema } from '../validators/index.js';

const router = Router();

const AUTH_USERS = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'];

router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, requireRole(...AUTH_USERS), me);
router.put('/password', authenticate, requireRole(...AUTH_USERS), validate(changePasswordSchema), changePassword);

export default router;