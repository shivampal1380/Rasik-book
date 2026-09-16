import { api, unwrap } from '../../lib/api.js';

export const compareBooks = (bookIds = []) =>
  unwrap(api.get('/search/compare', { params: { books: bookIds } }));