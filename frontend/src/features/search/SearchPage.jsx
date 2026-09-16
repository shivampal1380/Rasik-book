import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, ChevronDown } from 'lucide-react';
import { searchEntries } from './searchApi.js';
import { fetchBooks } from '../books/booksApi.js';
import { HEADS, headLabel, entryHeadLabel, formatINR, getErrorMessage } from '../../lib/api.js';
import { useVisibleHeads } from '../config/useVisibleHeads.js';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { ErrorAlert, EmptyState } from '../../components/ui/Feedback.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const initial = { q: '', bookNo: '', receipt: '', head: '', amountMin: '', amountMax: '', dateFrom: '', dateTo: '' };

export default function SearchPage() {
  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const { visibleKeySet } = useVisibleHeads();
  const { data: booksData } = useQuery({
    queryKey: ['books', 'all'],
    queryFn: () => fetchBooks({ pageSize: 200 }),
  });
  const books = booksData?.items ?? [];

  const hasAny = Object.values(filters).some(v => v.trim());

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', filters, page],
    queryFn: () => {
      const p = { page, pageSize: 50 };
      if (filters.q.trim()) p.q = filters.q.trim();
      if (filters.bookNo.trim()) p.bookNo = filters.bookNo.trim();
      if (filters.receipt.trim()) p.receipt = filters.receipt.trim();
      if (filters.head) p.head = filters.head;
      if (filters.amountMin.trim()) p.amountMin = Number(filters.amountMin);
      if (filters.amountMax.trim()) p.amountMax = Number(filters.amountMax);
      if (filters.dateFrom.trim()) p.dateFrom = filters.dateFrom.trim();
      if (filters.dateTo.trim()) p.dateTo = filters.dateTo.trim();
      return searchEntries(p);
    },
    enabled: submitted,
  });

  const set = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };

  const run = (e) => { e?.preventDefault(); setPage(1); setSubmitted(true); };
  const clear = () => { setFilters(initial); setPage(1); setSubmitted(false); };

  const { items = [], pagination, totals } = data ?? {};
  const from = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const to = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Search</h1>
        <p className="mt-1 text-sm text-slate-500">Find receipts across all books</p>
      </div>

      <form onSubmit={run} className="card mb-6 space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <label className="block">
            <span className="label">Book number</span>
            <select
              value={filters.bookNo}
              onChange={e => set('bookNo', e.target.value)}
              className="input"
            >
              <option value="">All books</option>
              {books.map(b => (
                <option key={b.id} value={b.bookNumber}>{b.code}/{b.bookNumber}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Receipt</span>
            <input
              value={filters.receipt}
              onChange={e => set('receipt', e.target.value)}
              placeholder="e.g. 42 or 40-50"
              className="input"
            />
          </label>
          <label className="block">
            <span className="label">Head</span>
            <select value={filters.head} onChange={e => set('head', e.target.value)} className="input">
              <option value="">All heads</option>
              {HEADS.filter(h => visibleKeySet.has(h.key)).map(h => (
                <option key={h.key} value={h.key}>{headLabel(h.key)}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary">
              <Search size={16} /> Search
            </button>
            {hasAny && (
              <button type="button" onClick={clear} className="btn-secondary">
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdvanced(v => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ChevronDown size={16} className={`transition-transform ${advanced ? 'rotate-180' : ''}`} />
          Advanced search
        </button>

        {advanced && (
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-5">
            <label className="block">
              <span className="label">Search text</span>
              <input
                value={filters.q}
                onChange={e => set('q', e.target.value)}
                placeholder="Receipt number or book name…"
                className="input"
              />
            </label>
            <label className="block">
              <span className="label">Amount min</span>
              <input type="number" min="0" value={filters.amountMin} onChange={e => set('amountMin', e.target.value)} placeholder="₹ 0" className="input" />
            </label>
            <label className="block">
              <span className="label">Amount max</span>
              <input type="number" min="0" value={filters.amountMax} onChange={e => set('amountMax', e.target.value)} placeholder="₹ 99999" className="input" />
            </label>
            <label className="block">
              <span className="label">Date from</span>
              <input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="label">Date to</span>
              <input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className="input" />
            </label>
          </div>
        )}
      </form>

      {submitted && !isLoading && !error && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
          <span className="text-sm font-bold text-slate-800">
            {pagination?.total === 0 ? 'No results' : `${pagination?.total} result${pagination?.total === 1 ? '' : 's'}`}
          </span>
          <span className="text-sm font-bold text-slate-800">{formatINR(totals?.grandTotal ?? 0)}</span>
        </div>
      )}

      {isLoading && <PageLoader />}
      {error && <ErrorAlert message={getErrorMessage(error)} />}

      {submitted && !isLoading && data && items.length === 0 && (
        <EmptyState
          title="No receipts found"
          hint="Try adjusting your search filters or clearing them."
          action={
            <button onClick={clear} className="btn-secondary">
              <X size={14} /> Clear filters
            </button>
          }
        />
      )}

      {items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Book</th>
                  <th className="px-4 py-3 text-left">Receipt#</th>
                  <th className="px-4 py-3 text-left">Head</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {items.map(e => (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-600">{e.book.code}/{e.book.bookNumber}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{e.entryNumber}</td>
                    <td className="px-4 py-2.5 text-slate-600">{entryHeadLabel(e)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatINR(e.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-400">
                      {new Date(e.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <span className="text-xs text-slate-400">
                {from}–{to} of {pagination.total} · Page {pagination.page} of {Math.max(pagination.pages, 1)}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary px-2 py-1.5">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages} className="btn-secondary px-2 py-1.5">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}