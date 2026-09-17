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

export async function createUser({ name, email, password, role = 'OPERATOR', actor = {} }) {
  const actorRole = actor.role ?? 'OPERATOR';

  if (actorRole === 'OPERATOR') {
    throw new ForbiddenError('Only admins can create users', 'ROLE_FORBIDDEN');
  }
  if (actorRole === 'ADMIN' && role !== 'OPERATOR') {
    throw new ForbiddenError('Admins can only create Operator accounts', 'ROLE_FORBIDDEN');
  }
  if (role === 'SUPER_ADMIN' && (await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })) > 0) {
    throw new ConflictError('A Super Admin already exists', 'SUPER_ADMIN_EXISTS');
  }

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

export async function updateUser({ id, actorId, data, actor = {} }) {
  const actorRole = actor.role ?? 'OPERATOR';

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

  if (actorRole === 'OPERATOR') {
    throw new ForbiddenError('Only admins can manage users', 'ROLE_FORBIDDEN');
  }

  // Admins may only manage Operators and cannot touch roles.
  if (actorRole === 'ADMIN') {
    if (user.role !== 'OPERATOR') {
      throw new ForbiddenError('Admins can only manage Operator accounts', 'ROLE_FORBIDDEN');
    }
    if (data.role !== undefined && data.role !== 'OPERATOR') {
      throw new ForbiddenError('Admins cannot change user roles', 'ROLE_FORBIDDEN');
    }
  }

  // There is exactly one Super Admin; it can never be demoted or deactivated.
  if (user.role === 'SUPER_ADMIN') {
    if (data.isActive === false) {
      throw new ForbiddenError('The Super Admin cannot be deactivated', 'SUPER_ADMIN_IMMUTABLE');
    }
    if (data.role !== undefined && data.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('The Super Admin role cannot be changed', 'SUPER_ADMIN_IMMUTABLE');
    }
  }

  // Guard against creating a second Super Admin through a role change.
  if (data.role === 'SUPER_ADMIN') {
    const other = await prisma.user.count({ where: { role: 'SUPER_ADMIN', id: { not: id } } });
    if (other > 0) {
      throw new ConflictError('A Super Admin already exists', 'SUPER_ADMIN_EXISTS');
    }
  }

  const payload = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.role !== undefined) payload.role = data.role;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  if (data.password !== undefined) payload.passwordHash = await bcrypt.hash(data.password, 10);

  if (Object.keys(payload).length === 0) return user;

  return prisma.user.update({ where: { id }, data: payload, select: USER_SELECT });
}
