import { prisma } from '../utils/prisma.js';
import {
  NotFoundError,
  ConflictError,
  AppError,
  ValidationError,
} from '../utils/errors.js';
import { fromPagination, paginate } from '../utils/http.js';
import { getVisibleHeadSet } from './headconfig.service.js';

// ---------------------------------------------------------------------------
// Create the NEXT entry for a book.
//
// Concurrency is handled by locking the book row with SELECT ... FOR UPDATE
// inside the same transaction as the insert. Simultaneous requests therefore
// serialize: the loser re-reads an incremented currentEntryNumber and assigns
// the next number, never a duplicate. The DB unique constraint
// (bookId, entryNumber) is the final backstop.
// ---------------------------------------------------------------------------
export async function createNextEntry({ bookId, head, amount, createdBy, req }) {
  try {
    return await prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw`
        SELECT id, status, "currentEntryNumber", "maxEntries"
        FROM books
        WHERE id::text = ${bookId}
        FOR UPDATE
      `;
      const book = rows?.[0];
      if (!book) throw new NotFoundError('Book not found', 'BOOK_NOT_FOUND');

      if (book.status !== 'OPEN') {
        throw new AppError(409, `Book is ${book.status.toLowerCase()} and cannot accept new entries`, 'BOOK_NOT_OPEN');
      }

      const entryNumber = book.currentEntryNumber;
      if (entryNumber > book.maxEntries) {
        throw new ConflictError(
          `Book has already reached its maximum of ${book.maxEntries} entries`,
          'BOOK_FULL',
        );
      }

      const entry = await tx.bookEntry.create({
        data: { bookId, entryNumber, head, amount, createdBy },
        select: {
          id: true,
          entryNumber: true,
          head: true,
          amount: true,
          createdBy: true,
          createdAt: true,
        },
      });

      const next = entryNumber + 1;
      const isLast = next > book.maxEntries;
      const updatedBook = await tx.book.update({
        where: { id: bookId },
        data: {
          currentEntryNumber: isLast ? book.maxEntries : next,
          ...(isLast ? { status: 'COMPLETED', completedAt: new Date() } : {}),
        },
        select: {
          id: true,
          status: true,
          currentEntryNumber: true,
          maxEntries: true,
          completedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: createdBy,
          action: 'ENTRY_CREATED',
          entity: 'BookEntry',
          entityId: entry.id,
          newValue: { bookId, entryNumber, head, amount },
          ipAddress: req?.ip ?? undefined,
          userAgent: req?.headers?.['user-agent'] ?? undefined,
        },
      });

      return { entry, book: updatedBook };
    });
  } catch (err) {
    if (err?.code === 'P2002') {
      throw new ConflictError('This entry number has already been submitted', 'ENTRY_ALREADY_SUBMITTED');
    }
    if (err?.code === 'P2010' || err?.code === '22P02') {
      throw new ValidationError('Invalid book identifier');
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// List entries for a book with search / head filter / sort / pagination
// and a running total map (cumulative sum by entry number).
// ---------------------------------------------------------------------------
export async function listEntries({ bookId, query }) {
  const { page, pageSize, skip } = fromPagination(query, 20, 500);
  const where = { bookId };

  if (query.head) where.head = query.head;
  if (query.search) {
    const num = Number.parseInt(query.search.trim(), 10);
    if (Number.isFinite(num)) where.entryNumber = num;
  }

  const orderBy = { [query.sort || 'entryNumber']: query.order === 'desc' ? 'desc' : 'asc' };

  const [total, entries] = await prisma.$transaction([
    prisma.bookEntry.count({ where }),
    prisma.bookEntry.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        entryNumber: true,
        head: true,
        amount: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        isCorrected: true,
        correctedAt: true,
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const running = await buildRunningTotals(bookId);

  const byHeadRaw = await prisma.bookEntry.groupBy({
    by: ['head'],
    where: { bookId },
    _sum: { amount: true },
    _count: { _all: true },
  });
  const grand = await prisma.bookEntry.aggregate({
    where: { bookId },
    _sum: { amount: true },
  });

  // Per-head totals only for currently-visible heads (sessional heads that
  // are switched off are omitted); the grand total is unchanged.
  const visible = await getVisibleHeadSet();

  return {
    items: entries,
    pagination: paginate(total, page, pageSize),
    runningTotals: running,
    totals: {
      grandTotal: grand._sum.amount ?? 0,
      totalEntries: total,
      byHead: byHeadRaw
        .filter(g => visible.has(g.head))
        .map(g => ({ head: g.head, total: g._sum.amount ?? 0, count: g._count._all })),
    },
  };
}

async function buildRunningTotals(bookId) {
  const rows = await prisma.bookEntry.findMany({
    where: { bookId },
    orderBy: { entryNumber: 'asc' },
    select: { entryNumber: true, amount: true },
  });
  let running = 0;
  const map = {};
  for (const row of rows) {
    running += row.amount;
    map[row.entryNumber] = running;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Correct (update) an entry. Marks the entry as corrected with the timestamp,
// and records the previous values in the audit log. Admin only.
// ---------------------------------------------------------------------------
export async function updateEntry({ bookId, entryId, head, amount, userId, req }) {
  return prisma.$transaction(async tx => {
    const entry = await tx.bookEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.bookId !== bookId) {
      throw new NotFoundError('Entry not found in this book', 'ENTRY_NOT_FOUND');
    }

    const oldValue = { head: entry.head, amount: entry.amount };
    const updated = await tx.bookEntry.update({
      where: { id: entryId },
      data: { head, amount, isCorrected: true, correctedAt: new Date() },
      select: {
        id: true,
        entryNumber: true,
        head: true,
        amount: true,
        isCorrected: true,
        correctedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'ENTRY_UPDATED',
        entity: 'BookEntry',
        entityId: entryId,
        oldValue,
        newValue: { head, amount },
        ipAddress: req?.ip ?? undefined,
        userAgent: req?.headers?.['user-agent'] ?? undefined,
      },
    });

    return updated;
  });
}