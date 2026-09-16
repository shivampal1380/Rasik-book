import { asyncHandler, ok } from '../utils/http.js';
import * as userService from '../services/user.service.js';
import { writeAudit } from '../middleware/audit.js';

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser({ ...req.body, req });
  await writeAudit({
    userId: req.user.sub,
    action: 'USER_CREATED',
    entity: 'User',
    entityId: user.id,
    newValue: { name: user.name, email: user.email, role: user.role },
    req,
  });
  return ok(res, { user }, 201);
});

export const listUsers = asyncHandler(async (req, res) => {
  const data = await userService.listUsers({ query: req.query });
  return ok(res, data);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser({
    id: req.params.id,
    actorId: req.user.sub,
    data: req.body,
  });
  await writeAudit({
    userId: req.user.sub,
    action: 'USER_UPDATED',
    entity: 'User',
    entityId: user.id,
    newValue: req.body,
    req,
  });
  return ok(res, { user });
});