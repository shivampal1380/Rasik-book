import { prisma } from '../utils/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/prisma.js';
import { renderStatementHTML } from './template.js';
import { renderPDF } from './renderer.js';
import { derivePdfColumns } from '../services/pdfconfig.service.js';

// Generate + return the statement PDF for a book.
export async function generateStatement(bookId) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      code: true,
      bookNumber: true,
      status: true,
      currentEntryNumber: true,
      maxEntries: true,
      pracharak: true,
      area: true,
      createdAt: true,
      completedAt: true,
    },
  });
  if (!book) throw new NotFoundError('Book not found', 'BOOK_NOT_FOUND');

  const entries = await prisma.bookEntry.findMany({
    where: { bookId },
    orderBy: { entryNumber: 'asc' },
    select: {
      entryNumber: true,
      head: true,
      amount: true,
      createdAt: true,
    },
  });

  // Statement layout from configuration: columns 1-5 are the primary heads,
  // column 6 hosts sub-heads (names), column 7 is the Amount column.
  const { columns } = await derivePdfColumns();

  const html = renderStatementHTML({ ...book, entries, columns });
  const pdf = await renderPDF(html);

  logger.info({ bookId, entries: entries.length }, 'Statement PDF generated');
  return pdf;
}