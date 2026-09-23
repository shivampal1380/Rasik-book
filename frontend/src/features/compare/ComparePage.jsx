import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { compareBooks } from './compareApi.js';
import { fetchBooks } from '../books/booksApi.js';
import { formatINR, getErrorMessage } from '../../lib/api.js';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { UpiBadge, ErrorAlert, EmptyState } from '../../components/ui/Feedback.jsx';

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

  const allUpiCash = (data?.books?.length ?? 0) > 0 && data.books.every(b => b.isUpiCash);

  const combinedTotals = data?.heads?.map((h, idx) => ({
    total: data.books.reduce((s, b) => s + (b.byHead[idx]?.total ?? 0), 0),
    count: data.books.reduce((s, b) => s + (b.byHead[idx]?.count ?? 0), 0),
    upi: data.books.reduce((s, b) => s + (b.byHead[idx]?.upi ?? 0), 0),
    cash: data.books.reduce((s, b) => s + (b.byHead[idx]?.cash ?? 0), 0),
  }));
  const combinedGrand = data?.books?.reduce((s, b) => s + (b.grandTotal ?? 0), 0);
  const combinedUpi = data?.books?.reduce((s, b) => s + (b.upiTotal ?? 0), 0);
  const combinedCash = data?.books?.reduce((s, b) => s + (b.cashTotal ?? 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
          Book Tally
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Head-wise totals of 1–4 books side by side, optionally limited to a receipt range (e.g. 2–30)
        </p>
      </div>

      <div className="card mb-6 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map(slot => {
            const taken = activeIds.filter(id => id !== selected[slot.key]);
            const disabled = !selected[slot.key];
            const bad = !disabled && toReceiptNo(slot.range.from) > toReceiptNo(slot.range.to);
            const chosen = books.find(b => b.id === selected[slot.key]);
            return (
              <div key={slot.key} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <span className="flex items-center justify-between gap-1">
                  <span className="label">
                    {slot.label}
                    {!slot.required && <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">optional</span>}
                  </span>
                  {chosen?.isUpiCash ? <UpiBadge label="UPI + Cash" /> : chosen?.isUpi ? <UpiBadge /> : null}
                </span>
                <BookPicker
                  value={selected[slot.key]}
                  selected={chosen}
                  options={books.filter(b => !taken.includes(b.id))}
                  placeholder={slot.required ? 'Select a book…' : '—'}
                  onPick={id => pick(slot.key, id)}
                />

                <div className="mt-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Receipt no. range</span>
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
                    <span className="text-slate-400 dark:text-slate-500">–</span>
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
                  {bad && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">“From” must be ≤ “To”.</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">
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
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Head</th>
                  {data.books.map(b => (
                    <th key={b.id} className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5">
                        {b.code}/{b.bookNumber}
                        {b.isUpiCash ? <UpiBadge label="UPI + Cash" /> : b.isUpi ? <UpiBadge /> : null}
                      </span>
                      <span className="ml-1 block text-[10px] font-medium normal-case text-slate-400 dark:text-slate-500">
                        {rangeLabel(b)}
                      </span>
                    </th>
                  ))}
                  <th className="border-l border-brand-200 bg-brand-50 px-4 py-3 text-right dark:border-brand-500/40 dark:bg-brand-500/10">
                    Total
                    <span className="ml-1 block text-[10px] font-medium normal-case text-brand-600 dark:text-brand-300">
                      all books
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.heads.map((h, idx) => (
                  <tr key={h.head} className="border-t border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{h.label}</td>
                    {data.books.map(b => {
                      const cell = b.byHead[idx];
                      const total = cell?.total ?? 0;
                      const count = cell?.count ?? 0;
                      if (total <= 0) {
                        return (
                          <td key={b.id} className="px-4 py-2.5 text-right">
                            <span className="text-slate-300 dark:text-slate-600">–</span>
                          </td>
                        );
                      }
                      return (
                        <td key={b.id} className="px-4 py-2.5 text-right">
                          {b.isUpiCash ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[11px] font-bold text-yellow-800 dark:text-yellow-200">
                                UPI {formatINR(cell?.upi ?? 0)}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                Cash {formatINR(cell?.cash ?? 0)}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">{count} receipt{count === 1 ? '' : 's'}</span>
                            </div>
                          ) : (
                            <>
                              <div className="font-semibold text-slate-800 dark:text-slate-100">{formatINR(total)}</div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500">{count} receipt{count === 1 ? '' : 's'}</div>
                            </>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-l border-brand-200 bg-brand-50 px-4 py-2.5 text-right dark:border-brand-500/40 dark:bg-brand-500/10">
                      {combinedTotals[idx].total > 0 ? (
                        allUpiCash ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[11px] font-bold text-yellow-800 dark:text-yellow-200">
                              UPI {formatINR(combinedTotals[idx].upi)}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              Cash {formatINR(combinedTotals[idx].cash)}
                            </span>
                            <div className="text-[10px] text-brand-600 dark:text-brand-300">
                              {combinedTotals[idx].count} receipt{combinedTotals[idx].count === 1 ? '' : 's'}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-bold text-brand-800 dark:text-brand-200">{formatINR(combinedTotals[idx].total)}</div>
                            <div className="text-[11px] text-brand-600 dark:text-brand-300">
                              {combinedTotals[idx].count} receipt{combinedTotals[idx].count === 1 ? '' : 's'}
                            </div>
                          </>
                        )
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">–</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                  <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-100">TOTAL</td>
                  {data.books.map(b =>
                    b.isUpiCash ? (
                      <td key={b.id} className="px-4 py-2.5 text-right">
                        <div className="flex flex-col items-end gap-0.5 font-bold">
                          <span className="text-xs text-yellow-800 dark:text-yellow-200">UPI {formatINR(b.upiTotal ?? 0)}</span>
                          <span className="text-xs text-emerald-700 dark:text-emerald-300">Cash {formatINR(b.cashTotal ?? 0)}</span>
                        </div>
                      </td>
                    ) : (
                      <td key={b.id} className="px-4 py-2.5 text-right font-bold text-slate-800 dark:text-slate-100">
                        {formatINR(b.grandTotal)}
                      </td>
                    ),
                  )}
                  <td className="border-l border-brand-200 bg-brand-100 px-4 py-2.5 text-right font-bold text-brand-900 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200">
                    {allUpiCash ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs text-yellow-800 dark:text-yellow-200">UPI {formatINR(combinedUpi)}</span>
                        <span className="text-xs text-emerald-700 dark:text-emerald-300">Cash {formatINR(combinedCash)}</span>
                        <span className="text-[10px] font-semibold text-brand-700 dark:text-brand-300">Rs. {formatINR(combinedGrand)}</span>
                      </div>
                    ) : (
                      formatINR(combinedGrand)
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function BookPicker({ value, selected, options, placeholder, onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${value ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
          {value ? `${selected?.code}/${selected?.bookNumber}` : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {selected?.isUpiCash ? <UpiBadge label="UPI + Cash" /> : selected?.isUpi ? <UpiBadge /> : null}
          <ChevronDown size={16} className={`text-slate-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              onPick('');
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-slate-700/50"
          >
            {placeholder}
          </button>
          {options.map(b => {
            const isCurrent = b.id === value;
            return (
              <button
                key={b.id}
                type="button"
                role="option"
                aria-selected={isCurrent}
                onClick={() => {
                  onPick(b.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                  isCurrent ? 'bg-brand-50 font-semibold text-brand-800 dark:bg-brand-500/10 dark:text-brand-200' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="truncate">
                  {b.code}/{b.bookNumber}
                  <span className="ml-2 text-xs font-medium text-slate-400 dark:text-slate-500">{b.status}</span>
                </span>
                {b.isUpiCash ? <UpiBadge label="UPI + Cash" /> : b.isUpi ? <UpiBadge /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
