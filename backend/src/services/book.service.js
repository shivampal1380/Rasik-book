import { prisma } from '../utils/prisma.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { fromPagination, paginate } from '../utils/http.js';
import { HEAD_LABEL_MAP, HEAD_DISPLAY_ORDER } from '../config/constants.js';
import { getVisibleHeadSet } from './headconfig.service.js';

export const BOOK_SELECT = {
  id: true,
  code: true,
  bookNumber: true,
  status: true,
  currentEntryNumber: true,
  maxEntries: true,
  pracharak: true,
  area: true,
  isUpi: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
};

export async function createBook({ code, bookNumber, pracharak = null, area = null, isUpi = false, createdBy, req }) {
  try {
    const book = await prisma.book.create({
      data: {
        code: code.toUpperCase(),
        bookNumber,
        pracharak: pracharak || null,
        area: area || 'MAHAKALI',
        isUpi: isUpi || false,
        createdBy,
      },
      select: BOOK_SELECT,
    });
    return {
      book,
      createdByUser: await prisma.user.findUnique({
        where: { id: createdBy },
        select: { id: true, name: true, email: true },
      }),
    };
  } catch (err) {
    if (err?.code === 'P2002') {
      throw new ConflictError(
        `A book with code "${code.toUpperCase()}" and book number "${bookNumber}" already exists`,
        'BOOK_ALREADY_EXISTS',
      );
    }
    throw err;
  }
}

export async function listBooks({ query, userId, role }) {
  const { page, pageSize, skip } = fromPagination(query, 20, 200);
  const where = {};

  if (query.search) {
    const search = query.search.trim();
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { bookNumber: { contains: search, mode: 'insensitive' } },
      { pracharak: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (query.status) where.status = query.status;

  const [total, books] = await prisma.$transaction([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: pageSize,
      select: {
        ...BOOK_SELECT,
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  const enriched = await enrichWithTotals(books);
  return {
    items: enriched,
    pagination: paginate(total, page, pageSize),
  };
}

async function enrichWithTotals(books) {
  if (books.length === 0) return [];
  const ids = books.map(b => b.id);

  const [totals, counts] = await Promise.all([
    prisma.bookEntry.groupBy({
      by: ['bookId'],
      where: { bookId: { in: ids }, cancelledAt: null },
      _sum: { amount: true },
    }),
    prisma.bookEntry.groupBy({
      by: ['bookId'],
      where: { bookId: { in: ids } },
      _count: { _all: true },
    }),
  ]);
  const sumMap = new Map(totals.map(g => [g.bookId, g._sum.amount ?? 0]));
  const countMap = new Map(counts.map(g => [g.bookId, g._count._all]));

  return books.map(book => {
    const entriesCompleted = countMap.get(book.id) ?? 0;
    const amount = sumMap.get(book.id) ?? 0;
    return {
      ...book,
      entriesCompleted,
      entriesRemaining: Math.max(0, book.maxEntries - entriesCompleted),
      totalAmount: amount,
      isFull: entriesCompleted >= book.maxEntries,
    };
  });
}

export async function getBookById(id, { includeCreatedBy = false } = {}) {
  const book = await prisma.book.findUnique({
    where: { id },
    select: {
      ...BOOK_SELECT,
      ...(includeCreatedBy
        ? { createdByUser: { select: { id: true, name: true, email: true } } }
        : {}),
    },
  });
  if (!book) throw new NotFoundError('Book not found', 'BOOK_NOT_FOUND');

  let computed = { entriesCompleted: 0, totalAmount: 0 };
  const [agg, count] = await Promise.all([
    prisma.bookEntry.aggregate({
      where: { bookId: book.id, cancelledAt: null },
      _sum: { amount: true },
    }),
    prisma.bookEntry.count({ where: { bookId: book.id } }),
  ]);
  computed = {
    entriesCompleted: count,
    entriesRemaining: Math.max(0, book.maxEntries - count),
    totalAmount: agg._sum.amount ?? 0,
  };
  return { ...book, ...computed };
}

export async function completeBook(bookId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw new NotFoundError('Book not found', 'BOOK_NOT_FOUND');
  if (book.status !== 'OPEN') {
    throw new ConflictError(`Book is already ${book.status.toLowerCase()}`, 'BOOK_NOT_OPEN');
  }

  const count = await prisma.bookEntry.count({ where: { bookId } });
  if (count < book.maxEntries) {
    throw new ConflictError(
      `Book cannot be completed: ${count} of ${book.maxEntries} entries filled`,
      'BOOK_NOT_FULL',
    );
  }

  return prisma.book.update({
    where: { id: bookId },
    data: { status: 'COMPLETED', completedAt: new Date() },
    select: BOOK_SELECT,
  });
}

export async function closeBook(bookId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw new NotFoundError('Book not found', 'BOOK_NOT_FOUND');
  if (book.status !== 'OPEN') {
    throw new ConflictError(`Book is already ${book.status.toLowerCase()}`, 'BOOK_NOT_OPEN');
  }
  return prisma.book.update({
    where: { id: bookId },
    data: { status: 'CLOSED', completedAt: new Date() },
    select: BOOK_SELECT,
  });
}

export async function getBookTotals(bookId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw new NotFoundError('Book not found', 'BOOK_NOT_FOUND');

  const entries = await prisma.bookEntry.findMany({
    where: { bookId },
    select: { head: true, amount: true, cancelledAt: true },
  });

  const active = entries.filter(e => !e.cancelledAt);

  const byHead = {};
  for (const h of HEAD_DISPLAY_ORDER) byHead[h] = 0;
  let grand = 0;
  for (const e of active) {
    byHead[e.head] = (byHead[e.head] || 0) + e.amount;
    grand += e.amount;
  }

  // Per-head totals are limited to currently-visible heads (sessional heads
  // that are switched off are omitted); the grand total is unchanged.
  const visible = await getVisibleHeadSet();

  return {
    bookId,
    grandTotal: grand,
    totalEntries: entries.length,
    cancelledEntries: entries.length - active.length,
    remainingEntries: Math.max(0, book.maxEntries - entries.length),
    maxEntries: book.maxEntries,
    byHead: HEAD_DISPLAY_ORDER.filter(h => visible.has(h)).map(h => ({
      head: h,
      label: HEAD_LABEL_MAP[h],
      total: byHead[h] || 0,
    })),
  };
}