import { useQuery } from '@tanstack/react-query';
import { fetchEntries, fetchSummary } from './booksApi.js';
import { HEADS, headLabel, formatINR, getErrorMessage } from '../../lib/api.js';
import { useVisibleHeads } from '../config/useVisibleHeads.js';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';

export default function SummaryTab({ bookId, book }) {
  const summary = useQuery({ queryKey: ['summary', bookId], queryFn: () => fetchSummary(bookId) });
  const entriesInfo = useQuery({ queryKey: ['book-entries', bookId, { all: true }], queryFn: () => fetchEntries(bookId, { pageSize: 1 }) });
  const { visibleKeySet } = useVisibleHeads();

  if (summary.isLoading || entriesInfo.isLoading) return <PageLoader />;
  if (summary.error) return <ErrorAlert message={getErrorMessage(summary.error)} />;
  if (!summary.data) return null;

  const { grandTotal, totalEntries, maxEntries } = summary.data;
  const byHead = entriesInfo.data?.totals?.byHead ?? [];
  const entryCount = entriesInfo.data?.totals?.totalEntries ?? totalEntries ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card overflow-hidden lg:col-span-2">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-800">Head-wise summary</h2>
          <p className="text-xs text-slate-400">
            {book.code}/{book.bookNumber} · {entryCount} receipts recorded
            {summary.data.cancelledEntries > 0
              ? ` · ${summary.data.cancelledEntries} receipt${summary.data.cancelledEntries === 1 ? '' : 's'} cancelled`
              : ''}
          </p>
        </div>
        <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Head</th>
              <th className="px-5 py-3 text-right">Receipts</th>
              <th className="px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {HEADS.filter(h => visibleKeySet.has(h.key)).map(h => {
              const item = byHead.find(x => x.head === h.key);
              return (
                <tr key={h.key} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-semibold text-slate-700">{headLabel(h.key)}</td>
                  <td className="px-5 py-3 text-right text-slate-500">{item?.count ?? 0}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatINR(item?.total ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-5 py-3 font-bold text-slate-800">TOTAL Rs.</td>
              <td className="px-5 py-3 text-right font-bold text-slate-800">{entryCount}</td>
              <td className="px-5 py-3 text-right font-bold text-brand-800">{formatINR(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Book details</h2>
          <dl className="space-y-2 text-sm">
            {[
              ['Receipt book', `${book.code}/${book.bookNumber}`],
              ['Pracharak', book.pracharak || '—'],
              ['Area', book.area],
              ['Status', book.status],
              ['Receipts', `${entryCount} / ${maxEntries}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-semibold text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="card border-brand-200 bg-brand-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">Grand total</div>
          <div className="mt-1 text-2xl font-bold text-brand-800">{formatINR(grandTotal)}</div>
        </div>
      </div>
    </div>
  );
}