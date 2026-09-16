import { Router } from 'express';
import { login, logout, me } from '../controllers/auth.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { validate, loginSchema } from '../validators/index.js';

const router = Router();

router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, requireRole('ADMIN', 'OPERATOR'), me);

export default router;