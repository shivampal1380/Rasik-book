import { prisma } from '../utils/prisma.js';
import { fromPagination, paginate } from '../utils/http.js';
import { NotFoundError } from '../utils/errors.js';
import { HEAD_LABEL_MAP, HEAD_DISPLAY_ORDER } from '../config/constants.js';
import { getVisibleHeadSet } from './headconfig.service.js';

// Compare head-wise totals of 1-4 books side by side, optionally limited to a
// receipt-number range per book (e.g. receipts 2-30).
export async function compareBooks({ bookIds, ranges = [] }) {
  const books = await prisma.book.findMany({
    where: { id: { in: bookIds } },
    select: { id: true, code: true, bookNumber: true, maxEntries: true },
  });
  if (books.length !== bookIds.length) {
    throw new NotFoundError('One or more books not found', 'BOOK_NOT_FOUND');
  }
  const ordered = bookIds.map(id => books.find(b => b.id === id));

  const visible = await getVisibleHeadSet();
  const heads = HEAD_DISPLAY_ORDER.filter(h => visible.has(h));

  const results = await Promise.all(
    ordered.map(async (book, index) => {
      const range = ranges[index] ?? {};
      const rangeFrom = range.from ?? null;
      const rangeTo = range.to ?? null;

      const where = { bookId: book.id };
      if (rangeFrom != null || rangeTo != null) {
        where.entryNumber = {};
        if (rangeFrom != null) where.entryNumber.gte = rangeFrom;
        if (rangeTo != null) where.entryNumber.lte = rangeTo;
      }

      const groups = await prisma.bookEntry.groupBy({
        by: ['head'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      });

      const byHead = {};
      let grandTotal = 0;
      for (const g of groups) {
        byHead[g.head] = { total: g._sum.amount ?? 0, count: g._count._all };
        grandTotal += g._sum.amount ?? 0;
      }

      return {
        id: book.id,
        code: book.code,
        bookNumber: book.bookNumber,
        maxEntries: book.maxEntries,
        range: { from: rangeFrom, to: rangeTo },
        grandTotal,
        byHead: heads.map(h => byHead[h] ?? { total: 0, count: 0 }),
      };
    }),
  );

  return {
    heads: heads.map(h => ({ head: h, label: HEAD_LABEL_MAP[h] })),
    books: results,
  };
}

// Search entries across all books with combined filters.
export async function searchEntries({ query }) {
  const { page, pageSize, skip } = fromPagination(query, 20, 500);
  const conditions = [];

  // General search text: receipt number or book code/number.
  if (query.q) {
    const num = Number.parseInt(query.q.trim(), 10);
    const or = [];
    if (Number.isFinite(num)) or.push({ entryNumber: num });
    or.push(
      { book: { code: { contains: query.q, mode: 'insensitive' } } },
      { book: { bookNumber: { contains: query.q, mode: 'insensitive' } } },
    );
    conditions.push({ OR: or });
  }

  // Explicit book number/code filter.
  if (query.bookNo) {
    conditions.push({
      OR: [
        { book: { code: { contains: query.bookNo, mode: 'insensitive' } } },
        { book: { bookNumber: { contains: query.bookNo, mode: 'insensitive' } } },
      ],
    });
  }

  // Receipt number or range (e.g. "42" or "40-50").
  if (query.receipt) {
    const rangeMatch = query.receipt.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (rangeMatch) {
      conditions.push({ entryNumber: { gte: parseInt(rangeMatch[1], 10), lte: parseInt(rangeMatch[2], 10) } });
    } else {
      const num = parseInt(query.receipt, 10);
      if (Number.isFinite(num)) conditions.push({ entryNumber: num });
    }
  }

  // Head filter.
  if (query.head) conditions.push({ head: query.head });

  // Amount range.
  if (query.amountMin != null || query.amountMax != null) {
    const amt = {};
    if (query.amountMin != null) amt.gte = query.amountMin;
    if (query.amountMax != null) amt.lte = query.amountMax;
    conditions.push({ amount: amt });
  }

  // Date range.
  if (query.dateFrom || query.dateTo) {
    const dt = {};
    if (query.dateFrom) dt.gte = new Date(query.dateFrom + 'T00:00:00Z');
    if (query.dateTo) dt.lte = new Date(query.dateTo + 'T23:59:59.999Z');
    conditions.push({ createdAt: dt });
  }

  const where = conditions.length ? { AND: conditions } : {};

  // Sorting — bookNumber needs a relation sort.
  let orderBy;
  if (query.sort === 'bookNumber') {
    orderBy = { book: { bookNumber: query.order } };
  } else {
    orderBy = { [query.sort || 'createdAt']: query.order === 'desc' ? 'desc' : 'asc' };
  }

  const [total, items] = await prisma.$transaction([
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
        createdAt: true,
        book: { select: { id: true, code: true, bookNumber: true } },
      },
    }),
  ]);

  const byHeadRaw = await prisma.bookEntry.groupBy({
    by: ['head'],
    where,
    _sum: { amount: true },
    _count: { _all: true },
  });
  const grand = await prisma.bookEntry.aggregate({ where, _sum: { amount: true } });

  const visible = await getVisibleHeadSet();

  return {
    items,
    pagination: paginate(total, page, pageSize),
    totals: {
      grandTotal: grand._sum.amount ?? 0,
      totalEntries: total,
      byHead: byHeadRaw
        .filter(g => visible.has(g.head))
        .map(g => ({ head: g.head, total: g._sum.amount ?? 0, count: g._count._all })),
    },
  };
}