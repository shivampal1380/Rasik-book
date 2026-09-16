import { api, unwrap } from '../../lib/api.js';

export const searchEntries = (params = {}) =>
  unwrap(api.get('/search/entries', { params }));