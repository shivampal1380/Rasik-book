import { asyncHandler, ok } from '../utils/http.js';
import * as searchService from '../services/search.service.js';

export const searchEntries = asyncHandler(async (req, res) => {
  const data = await searchService.searchEntries({ query: req.query });
  return ok(res, data);
});

export const compareBooks = asyncHandler(async (req, res) => {
  const data = await searchService.compareBooks({ bookIds: req.query.books });
  return ok(res, data);
});