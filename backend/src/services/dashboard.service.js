import { prisma } from '../utils/prisma.js';
import { HEAD_LABEL_MAP, HEAD_DISPLAY_ORDER } from '../config/constants.js';
import { getVisibleHeadSet } from './headconfig.service.js';

// Dashboard KPIs — computed live from source data.
export async function getDashboardStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    openBooks,
    completedBooks,
    closedBooks,
    cancelledBooks,
    totalBooks,
    todayEntriesAgg,
    todayEntries,
    todayByHeadRaw,
    recentBooks,
  ] = await Promise.all([
    prisma.book.count({ where: { status: 'OPEN' } }),
    prisma.book.count({ where: { status: 'COMPLETED' } }),
    prisma.book.count({ where: { status: 'CLOSED' } }),
    prisma.book.count({ where: { status: 'CANCELLED' } }),
    prisma.book.count(),
    prisma.bookEntry.aggregate({
      where: { createdAt: { gte: startOfDay }, cancelledAt: null },
      _sum: { amount: true },
    }),
    prisma.bookEntry.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.bookEntry.groupBy({
      by: ['head'],
      where: { createdAt: { gte: startOfDay }, cancelledAt: null },
      _sum: { amount: true },
    }),
    prisma.book.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        code: true,
        bookNumber: true,
        status: true,
        currentEntryNumber: true,
        maxEntries: true,
        createdAt: true,
      },
    }),
  ]);

  // Today's per-head totals, limited to currently-visible heads
  // (sessional heads that are switched off are omitted).
  const todayHeadMap = Object.fromEntries(todayByHeadRaw.map(x => [x.head, x._sum.amount ?? 0]));
  const visible = await getVisibleHeadSet();
  const byHead = HEAD_DISPLAY_ORDER.filter(h => visible.has(h)).map(h => ({
    head: h,
    label: HEAD_LABEL_MAP[h],
    total: todayHeadMap[h] ?? 0,
  }));

  return {
    openBooks,
    completedBooks,
    closedBooks,
    cancelledBooks,
    totalBooks,
    todayEntries,
    todayAmount: todayEntriesAgg._sum.amount ?? 0,
    byHead,
    recentBooks,
  };
}