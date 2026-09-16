// Small helpers used across controllers/services.

export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Consistent success envelope
export function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function paginate(total, page, pageSize) {
  const size = Math.max(1, pageSize);
  const pages = Math.max(1, Math.ceil(total / size));
  return { total, page, pageSize: size, pages };
}

// Normalise a query page param into (page, skip, take)
export function fromPagination(query, defaultSize = 20, maxSize = 200) {
  const rawPage = Number.parseInt(query.page, 10);
  const rawSize = Number.parseInt(query.pageSize, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isFinite(rawSize) && rawSize > 0 ? Math.min(rawSize, maxSize) : defaultSize;
  return { page, pageSize, skip: (page - 1) * pageSize };
}