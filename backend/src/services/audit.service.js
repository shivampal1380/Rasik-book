import { prisma } from '../utils/prisma.js';
import { fromPagination, paginate } from '../utils/http.js';
import { NotFoundError } from '../utils/errors.js';

export async function listAuditLogs({ query }) {
  const { page, pageSize, skip } = fromPagination(query, 20, 100);
  const where = {};
  if (query.entity) where.entity = query.entity.trim();
  if (query.entityId) where.entityId = query.entityId.trim();
  if (query.action) where.action = { contains: query.action.trim(), mode: 'insensitive' };
  if (query.userId) where.userId = query.userId.trim();

  const [total, items] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        userId: true,
        action: true,
        entity: true,
        entityId: true,
        oldValue: true,
        newValue: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return { items, pagination: paginate(total, page, pageSize) };
}

export async function getAuditForBook(bookId) {
  // Audit logs for the book itself AND all its entries.
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) throw new NotFoundError('Book not found', 'BOOK_NOT_FOUND');

  const entryIds = (
    await prisma.bookEntry.findMany({ where: { bookId }, select: { id: true } })
  ).map(e => e.id);

  const allIds = [bookId, ...entryIds];

  const items = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: 'Book', entityId: bookId },
        { entity: 'BookEntry', entityId: { in: entryIds } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      action: true,
      entity: true,
      entityId: true,
      oldValue: true,
      newValue: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return { items };
}