import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { fromPagination, paginate } from '../utils/http.js';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export async function createUser({ name, email, password, role, req }) {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return await prisma.user.create({
      data: { name, email: email.toLowerCase(), passwordHash, role },
      select: USER_SELECT,
    });
  } catch (err) {
    if (err?.code === 'P2002') {
      throw new ConflictError(`A user with email "${email}" already exists`, 'USER_ALREADY_EXISTS');
    }
    throw err;
  }
}

export async function listUsers({ query }) {
  const { page, pageSize, skip } = fromPagination(query, 20, 100);
  const where = {};
  if (query.search) {
    const search = query.search.trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: USER_SELECT, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
  ]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = await Promise.all(users.map(async u => {
    const [entriesToday, booksCreated] = await Promise.all([
      prisma.bookEntry.count({ where: { createdBy: u.id, createdAt: { gte: today } } }),
      prisma.book.count({ where: { createdBy: u.id } }),
    ]);
    return { ...u, entriesToday, booksCreated };
  }));

  return { items: enriched, pagination: paginate(total, page, pageSize) };
}

export async function updateUser({ id, actorId, data }) {
  if (id === actorId && data.role && data.role !== 'ADMIN') {
    // prevent the last admin demoting/locking themselves out entirely is good hygiene,
    // but at minimum an admin cannot demote their own admin role
    const actor = await prisma.user.findUnique({ where: { id: actorId } });
    if (actor?.role === 'ADMIN' && data.isActive === false) {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (adminCount <= 1) {
        throw new ForbiddenError('You cannot deactivate the last active administrator', 'LAST_ADMIN');
      }
    }
  }

  const payload = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.role !== undefined) payload.role = data.role;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  if (data.password !== undefined) payload.passwordHash = await bcrypt.hash(data.password, 10);

  if (Object.keys(payload).length === 0) {
    return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

  // Protect the last active admin from deactivation from any admin
  if (payload.isActive === false && user.role === 'ADMIN' && user.isActive) {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
    if (adminCount <= 1) throw new ForbiddenError('You cannot deactivate the last active administrator', 'LAST_ADMIN');
  }

  return prisma.user.update({ where: { id }, data: payload, select: USER_SELECT });
}