import { useMemo, useState } from 'react';
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
];

export default function ComparePage() {
  const [selected, setSelected] = useState({ b1: '', b2: '', b3: '' });

  const { data: booksData } = useQuery({
    queryKey: ['books', 'all'],
    queryFn: () => fetchBooks({ pageSize: 200 }),
  });
  const books = booksData?.items ?? [];
  const byId = useMemo(() => new Map(books.map(b => [b.id, b])), [books]);

  const activeIds = [selected.b1, selected.b2, selected.b3].filter(Boolean);

  const { data, isLoading, error } = useQuery({
    queryKey: ['compare', activeIds],
    queryFn: () => compareBooks(activeIds),
    enabled: activeIds.length >= 2,
  });

  const pick = (slot, id) => setSelected(s => ({ ...s, [slot]: id }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          Compare Books
        </h1>
        <p className="mt-1 text-sm text-slate-500">Head-wise totals of 2–3 books side by side</p>
      </div>

      <div className="card mb-6 space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SLOTS.map(slot => {
            const taken = activeIds.filter(id => id !== selected[slot.key]);
            return (
              <label key={slot.key} className="block">
                <span className="label">
                  {slot.label}
                  {!slot.required && <span className="ml-1 text-xs font-normal text-slate-400">optional</span>}
                </span>
                <select value={selected[slot.key]} onChange={e => pick(slot.key, e.target.value)} className="input">
                  <option value="">{slot.required ? 'Select a book…' : '—'}</option>
                  {books
                    .filter(b => !taken.includes(b.id))
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {b.code}/{b.bookNumber} · {b.status}
                      </option>
                    ))}
                </select>
              </label>
            );
          })}
        </div>
      </div>

      {isLoading && <PageLoader />}
      {error && <ErrorAlert message={getErrorMessage(error)} />}

      {activeIds.length < 2 && !isLoading && (
        <EmptyState
          title="Select two books to compare"
          hint="Pick at least Book 1 and Book 2 above; you can add an optional third book."
        />
      )}

      {data && (
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
                        {b.maxEntries} entries
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