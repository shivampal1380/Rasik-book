import { asyncHandler, ok } from '../utils/http.js';
import * as authService from '../services/auth.service.js';
import { signCookie, clearCookie } from '../middleware/auth.js';
import { writeAudit } from '../middleware/audit.js';

export const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body);
  signCookie(res, { sub: user.id, name: user.name, email: user.email, role: user.role });
  await writeAudit({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    newValue: { email: user.email },
    req,
  });
  return ok(res, { user });
});

export const logout = asyncHandler(async (req, res) => {
  clearCookie(res);
  return ok(res, { success: true });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.user.sub);
  return ok(res, { user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await authService.changePassword({ userId: req.user.sub, currentPassword, newPassword });
  await writeAudit({
    userId: user.id,
    action: 'PASSWORD_CHANGED',
    entity: 'User',
    entityId: user.id,
    newValue: { email: user.email },
    req,
  });
  return ok(res, { success: true });
});