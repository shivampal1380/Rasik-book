import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createEntry, fetchEntries } from './booksApi.js';
import { ENTRY_HEADS, entryHeadLabel, formatINR, getErrorMessage } from '../../lib/api.js';
import { useVisibleHeads } from '../config/useVisibleHeads.js';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ErrorAlert, StatusBadge } from '../../components/ui/Feedback.jsx';

export default function EntryTab({ book }) {
  const queryClient = useQueryClient();
  const [head, setHead] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const amountRef = useRef(null);

  const disabled = book.status !== 'OPEN';

  const { visibleKeySet } = useVisibleHeads();

  const { data: entries } = useQuery({
    queryKey: ['book-entries', book.id, { all: true }],
    queryFn: () => fetchEntries(book.id, { pageSize: 500, sort: 'entryNumber', order: 'desc' }),
  });

  const mutation = useMutation({
    mutationFn: () => createEntry(book.id, { head, amount: parseInt(amount, 10) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', book.id] });
      queryClient.invalidateQueries({ queryKey: ['book-entries', book.id] });
      queryClient.invalidateQueries({ queryKey: ['summary', book.id] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setAmount('');
      setHead('');
      setErr('');
      amountRef.current?.focus();
    },
    onError: e => setErr(getErrorMessage(e)),
  });

  useEffect(() => {
    if (!disabled) amountRef.current?.focus();
  }, [disabled]);

  const submit = e => {
    e.preventDefault();
    if (!head) {
      setErr('Select a head first.');
      return;
    }
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) {
      setErr('Enter a valid amount in whole rupees.');
      amountRef.current?.focus();
      return;
    }
    setErr('');
    mutation.mutate();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Record receipt</h2>
            <p className="text-sm text-slate-500">
              Next receipt number: <span className="font-bold text-brand-700">{book.currentEntryNumber}</span>
            </p>
          </div>
          <StatusBadge status={book.status} />
        </div>

        {disabled && (
          <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            This book is {book.status.toLowerCase()} and cannot accept new entries.
          </div>
        )}

        {err && <div className="mb-4"><ErrorAlert message={err} /></div>}

        <div className="mb-4">
          <label className="label">Head</label>
          <div className="grid grid-cols-3 gap-2">
            {ENTRY_HEADS.filter(h => visibleKeySet.has(h.key)).map(h => (
              <button
                key={h.key}
                type="button"
                onClick={() => {
                  setHead(h.key);
                  setErr('');
                  amountRef.current?.focus();
                }}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  head === h.key
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">Pick a head.</p>
        </div>

        <form onSubmit={submit} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label" htmlFor="amount">Amount (whole rupees)</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">₹</span>
              <input
                id="amount"
                ref={amountRef}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={amount}
                disabled={disabled || mutation.isPending}
                onChange={e => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                className="input pl-8 text-lg font-semibold"
                placeholder="0"
              />
            </div>
          </div>
          <button type="submit" disabled={disabled || mutation.isPending} className="btn-primary h-[42px] px-8 text-base">
            {mutation.isPending ? <Spinner size="sm" className="border-white/40 border-t-white" /> : 'Save'}
          </button>
        </form>

        <p className="mt-3 text-xs text-slate-400">
          Saved {book.currentEntryNumber - 1} of {book.maxEntries} receipts · {book.maxEntries - (book.currentEntryNumber - 1)} remaining
        </p>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800">All entries</h2>
        {entries?.items?.length ? (
          <>
            <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
              <span className="text-sm font-bold text-slate-800">Total</span>
              <span className="text-base font-bold text-slate-800">{formatINR(entries.totals.grandTotal)}</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto pr-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2">No.</th>
                    <th className="pb-2">Head</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.items.map(e => (
                    <tr key={e.id} className={`border-b border-slate-50 ${e.cancelledAt ? 'opacity-60' : ''}`}>
                      <td className="py-2 font-semibold text-slate-700">
                        {e.entryNumber}
                        {e.cancelledAt && (
                          <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">
                            cancelled
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-slate-600">{entryHeadLabel(e)}</td>
                      <td className={`py-2 text-right font-semibold ${e.cancelledAt ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {formatINR(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">No entries yet.</p>
        )}
      </div>
    </div>
  );
}