import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { UnauthorizedError } from '../utils/errors.js';

async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export async function login({ email, password }) {
  const user = await findByEmail(email.toLowerCase());
  // A uniform failure for unknown email, wrong password and deactivated
  // accounts avoids leaking which emails exist or their status.
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');

  return toSafeUser(user);
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toSafeUser(user) : null;
}

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export const safeUser = toSafeUser;

export async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError('User not found');

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new UnauthorizedError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return toSafeUser(user);
}