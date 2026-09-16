import { api, unwrap } from '../../lib/api.js';

export const fetchBooks = ({ page = 1, pageSize = 20, status, search } = {}) =>
  unwrap(
    api.get('/books', {
      params: { page, pageSize, status: status || undefined, search: search || undefined },
    }),
  );

export const fetchBook = id => unwrap(api.get(`/books/${id}`)).then(r => r.book);

export const createBook = payload => unwrap(api.post('/books', payload));

export const completeBook = id => unwrap(api.post(`/books/${id}/complete`)).then(r => r.book);
export const closeBook = id => unwrap(api.post(`/books/${id}/close`)).then(r => r.book);

export const fetchEntries = (id, params = {}) => unwrap(api.get(`/books/${id}/entries`, { params }));
export const createEntry = (id, payload) => unwrap(api.post(`/books/${id}/entries`, payload));
export const updateEntry = (id, entryId, payload) => unwrap(api.patch(`/books/${id}/entries/${entryId}`, payload));

export const fetchSummary = id => unwrap(api.get(`/books/${id}/summary`)).then(r => r.summary);
export const fetchBookAudit = id => unwrap(api.get(`/books/${id}/audit`));

export const pdfUrl = id => `/api/books/${id}/pdf`;