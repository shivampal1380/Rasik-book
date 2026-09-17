import { api, unwrap } from '../../lib/api.js';

export const compareBooks = (bookIds = [], ranges = []) =>
  unwrap(
    api.get('/search/compare', {
      params: { books: bookIds, ranges: JSON.stringify(ranges) },
    }),
  );