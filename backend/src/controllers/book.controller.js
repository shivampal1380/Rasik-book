import { asyncHandler, ok } from '../utils/http.js';
import * as bookService from '../services/book.service.js';
import { writeAudit } from '../middleware/audit.js';

export const createBook = asyncHandler(async (req, res) => {
  const { code, bookNumber, pracharak, area, isUpi } = req.body;
  const result = await bookService.createBook({
    code,
    bookNumber,
    pracharak,
    area,
    isUpi,
    createdBy: req.user.sub,
    req,
  });
  await writeAudit({
    userId: req.user.sub,
    action: 'BOOK_CREATED',
    entity: 'Book',
    entityId: result.book.id,
    newValue: { code, bookNumber, isUpi },
    req,
  });
  return ok(res, { ...result }, 201);
});

export const listBooks = asyncHandler(async (req, res) => {
  const data = await bookService.listBooks({ query: req.query, userId: req.user.sub, role: req.user.role });
  return ok(res, data);
});

export const getBook = asyncHandler(async (req, res) => {
  const book = await bookService.getBookById(req.params.id, { includeCreatedBy: true });
  return ok(res, { book });
});

export const completeBook = asyncHandler(async (req, res) => {
  const book = await bookService.completeBook(req.params.id);
  await writeAudit({
    userId: req.user.sub,
    action: 'BOOK_COMPLETED',
    entity: 'Book',
    entityId: book.id,
    newValue: { status: book.status, completedAt: book.completedAt },
    req,
  });
  return ok(res, { book });
});

export const closeBook = asyncHandler(async (req, res) => {
  const book = await bookService.closeBook(req.params.id);
  await writeAudit({
    userId: req.user.sub,
    action: 'BOOK_CLOSED',
    entity: 'Book',
    entityId: book.id,
    newValue: { status: book.status, closedAt: book.completedAt },
    req,
  });
  return ok(res, { book });
});

export const getBookSummary = asyncHandler(async (req, res) => {
  const summary = await bookService.getBookTotals(req.params.id);
  return ok(res, { summary });
});