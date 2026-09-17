import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { compareBooks } from './compareApi.js';
import { fetchBooks } from '../books/booksApi.js';
import { formatINR, getErrorMessage } from '../../lib/api.js';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { ErrorAlert, EmptyState } from '../../components/ui/Feedback.jsx';

const SLOTS = [
  { key: 'b1', label: 'Book 1', required: true },
  { key: 'b2', label: 'Book 2', required: true },
  { key: 'b3', label: 'Book 3', required: false },
  { key: 'b4', label: 'Book 4', required: false },
];

const EMPTY_RANGES = {
  b1: { from: '', to: '' },
  b2: { from: '', to: '' },
  b3: { from: '', to: '' },
  b4: { from: '', to: '' },
};

const toReceiptNo = value => {
  if (value === '' || value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : undefined;
};

export default function ComparePage() {
  const [selected, setSelected] = useState({ b1: '', b2: '', b3: '', b4: '' });
  const [ranges, setRanges] = useState(EMPTY_RANGES);
  const [runToken, setRunToken] = useState(0);

  const { data: booksData } = useQuery({
    queryKey: ['books', 'all'],
    queryFn: () => fetchBooks({ pageSize: 200 }),
  });
  const books = booksData?.items ?? [];

  const slots = SLOTS.map(s => ({ ...s, bookId: selected[s.key], range: ranges[s.key] }));
  const active = slots.filter(s => s.bookId);
  const activeIds = active.map(s => s.bookId);
  const activeRanges = active.map(s => ({
    from: toReceiptNo(s.range.from),
    to: toReceiptNo(s.range.to),
  }));

  const invalidRange = activeRanges.some(r => r.from != null && r.to != null && r.from > r.to);

  const { data, isLoading, error } = useQuery({
    queryKey: ['compare', runToken, activeIds, activeRanges],
    queryFn: () => compareBooks(activeIds, activeRanges),
    enabled: runToken > 0 && activeIds.length >= 1 && !invalidRange,
  });

  const resetRun = () => setRunToken(0);

  const pick = (slot, id) => {
    setSelected(s => ({ ...s, [slot]: id }));
    resetRun();
  };
  const setRange = (slot, field, value) => {
    setRanges(r => ({ ...r, [slot]: { ...r[slot], [field]: value } }));
    resetRun();
  };
  const tally = () => setRunToken(t => t + 1);

  const rangeLabel = b => {
    const from = b.range?.from ?? null;
    const to = b.range?.to ?? null;
    if (from == null && to == null) return `${b.maxEntries} entries`;
    return `Receipts ${from ?? 1}–${to ?? b.maxEntries}`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          Compare Books
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Head-wise totals of 1–4 books side by side, optionally limited to a receipt range (e.g. 2–30)
        </p>
      </div>

      <div className="card mb-6 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map(slot => {
            const taken = activeIds.filter(id => id !== selected[slot.key]);
            const disabled = !selected[slot.key];
            const bad = !disabled && toReceiptNo(slot.range.from) > toReceiptNo(slot.range.to);
            return (
              <div key={slot.key} className="rounded-lg border border-slate-200 p-3">
                <span className="label">
                  {slot.label}
                  {!slot.required && <span className="ml-1 text-xs font-normal text-slate-400">optional</span>}
                </span>
                <select
                  value={selected[slot.key]}
                  onChange={e => pick(slot.key, e.target.value)}
                  className="input"
                >
                  <option value="">{slot.required ? 'Select a book…' : '—'}</option>
                  {books
                    .filter(b => !taken.includes(b.id))
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {b.code}/{b.bookNumber} · {b.status}
                      </option>
                    ))}
                </select>

                <div className="mt-3">
                  <span className="text-xs font-medium text-slate-500">Receipt no. range</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      placeholder="From"
                      value={slot.range.from}
                      disabled={disabled}
                      onChange={e => setRange(slot.key, 'from', e.target.value)}
                      className="input"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      placeholder="To"
                      value={slot.range.to}
                      disabled={disabled}
                      onChange={e => setRange(slot.key, 'to', e.target.value)}
                      className="input"
                    />
                  </div>
                  {bad && <p className="mt-1 text-[11px] text-red-600">“From” must be ≤ “To”.</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            Leave the range blank to include every receipt in a book.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={activeIds.length < 1 || invalidRange || isLoading}
            onClick={tally}
          >
            {isLoading ? 'Tallying…' : 'Tally'}
          </button>
        </div>
      </div>

      {isLoading && <PageLoader />}
      {error && !invalidRange && <ErrorAlert message={getErrorMessage(error)} />}

      {runToken === 0 && !isLoading && !error && (
        <EmptyState
          title={activeIds.length < 1 ? 'Select a book to compare' : 'Ready to compare'}
          hint={
            activeIds.length < 1
              ? 'Pick at least one book above, then press Tally.'
              : 'Press the Tally button to see head-wise totals.'
          }
        />
      )}

      {data && runToken > 0 && activeIds.length >= 1 && !invalidRange && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Head</th>
                  {data.books.map(b => (
                    <th key={b.id} className="px-4 py-3 text-right">
                      {b.code}/{b.bookNumber}
                      <span className="ml-1 block text-[10px] font-medium normal-case text-slate-400">
                        {rangeLabel(b)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.heads.map((h, idx) => (
                  <tr key={h.head} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{h.label}</td>
                    {data.books.map(b => {
                      const cell = b.byHead[idx];
                      const total = cell?.total ?? 0;
                      const count = cell?.count ?? 0;
                      return (
                        <td key={b.id} className="px-4 py-2.5 text-right">
                          {total > 0 ? (
                            <>
                              <div className="font-semibold text-slate-800">{formatINR(total)}</div>
                              <div className="text-[11px] text-slate-400">{count} receipt{count === 1 ? '' : 's'}</div>
                            </>
                          ) : (
                            <span className="text-slate-300">–</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-4 py-2.5 font-bold text-slate-800">TOTAL</td>
                  {data.books.map(b => (
                    <td key={b.id} className="px-4 py-2.5 text-right font-bold text-slate-800">
                      {formatINR(b.grandTotal)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
