import { asyncHandler, ok } from '../utils/http.js';
import * as entryService from '../services/entry.service.js';

export const createEntry = asyncHandler(async (req, res) => {
  const { head, amount, paymentMethod } = req.body;
  const result = await entryService.createNextEntry({
    bookId: req.params.id,
    head,
    amount,
    paymentMethod,
    createdBy: req.user.sub,
    req,
  });
  return ok(res, result, 201);
});

export const listEntries = asyncHandler(async (req, res) => {
  const data = await entryService.listEntries({ bookId: req.params.id, query: req.query });
  return ok(res, data);
});

export const updateEntry = asyncHandler(async (req, res) => {
  const { head, amount, paymentMethod, cancelled } = req.body;
  const updated = await entryService.updateEntry({
    bookId: req.params.id,
    entryId: req.params.entryId,
    head,
    amount,
    paymentMethod,
    cancelled,
    userId: req.user.sub,
    req,
  });
  return ok(res, { entry: updated });
});