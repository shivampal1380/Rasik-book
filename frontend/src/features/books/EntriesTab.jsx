import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { fetchEntries, updateEntry } from './booksApi.js';
import { HEADS, headLabel, entryHeadLabel, formatINR, getErrorMessage } from '../../lib/api.js';
import { useVisibleHeads } from '../config/useVisibleHeads.js';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUser } from '../auth/UserContext.js';
import EditEntryModal from './EditEntryModal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';

export default function EntriesTab({ bookId }) {
  const { isAdmin } = useUser();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [head, setHead] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { visibleKeySet } = useVisibleHeads();

  const toggleCancel = useMutation({
    mutationFn: ({ entryId, cancelled }) => updateEntry(bookId, entryId, { cancelled }),
    onSuccess: () => {
      ['book-entries', 'book', 'summary', 'books', 'dashboard'].forEach(key =>
        queryClient.invalidateQueries({ queryKey: [key, bookId] }),
      );
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: e => window.alert(getErrorMessage(e)),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['book-entries', bookId, { page, head }],
    queryFn: () => fetchEntries(bookId, { page, pageSize: 20, head: head || undefined, sort: 'entryNumber', order: 'desc' }),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorAlert message={getErrorMessage(error)} />;
  if (!data) return null;

  const { items, pagination, totals } = data;
  const from = (pagination.page - 1) * pagination.pageSize + 1;
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total);

  const headTotals = totals.byHead.find(h => h.head === head);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setHead('')}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${!head ? 'bg-brand-700 text-white dark:bg-brand-600' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'}`}
          >
            All
          </button>
          {HEADS.filter(h => visibleKeySet.has(h.key)).map(h => (
            <button
              key={h.key}
              onClick={() => {
                setHead(h.key);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${head === h.key ? 'bg-brand-700 text-white dark:bg-brand-600' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'}`}
            >
              {headLabel(h.key)}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Entries {from}–{to} of {pagination.total} · Total <span className="font-bold text-slate-800 dark:text-slate-100">{formatINR(headTotals?.total ?? totals.grandTotal)}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">No.</th>
                <th className="px-4 py-3 text-left">Head</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Running total</th>
                <th className="px-4 py-3 text-right">Recorded</th>
                <th className="px-4 py-3 text-left">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    No entries found.
                  </td>
                </tr>
              )}
              {items.map(e => (
                <tr key={e.id} className={`border-t border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/40 ${e.cancelledAt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                    {e.entryNumber}
                    {e.cancelledAt && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-500/20 dark:text-red-300">
                        cancelled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{entryHeadLabel(e)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${e.cancelledAt ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                    {formatINR(e.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                    {e.cancelledAt ? '—' : formatINR(data.runningTotals?.[e.entryNumber] ?? '—')}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-slate-400 dark:text-slate-500">
                    {new Date(e.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-2.5">
                    {e.cancelledAt ? (
                      <div className="text-xs">
                        <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-400/20">
                          Cancelled
                        </span>
                        <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          {new Date(e.cancelledAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    ) : e.isCorrected ? (
                      <div className="text-xs">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20">
                          Corrected
                        </span>
                        <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          {new Date(e.correctedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      {e.cancelledAt ? (
                        <button
                          onClick={() => setConfirm({ entryId: e.id, entryNumber: e.entryNumber, action: 'restore' })}
                          disabled={toggleCancel.isPending}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          Restore
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setEditing(e)}
                            className="text-xs font-semibold text-brand-700 hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirm({ entryId: e.id, entryNumber: e.entryNumber, action: 'cancel' })}
                            disabled={toggleCancel.isPending}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <span className="text-xs text-slate-400 dark:text-slate-500">Page {pagination.page} of {Math.max(pagination.pages, 1)}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary px-2 py-1.5">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages} className="btn-secondary px-2 py-1.5">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <EditEntryModal bookId={bookId} entry={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'cancel' ? 'Cancel receipt' : 'Restore receipt'}
        message={
          confirm?.action === 'cancel'
            ? `Cancel receipt #${confirm.entryNumber}? Its amount will be removed from all totals.`
            : `Restore receipt #${confirm.entryNumber}? Its amount will count again.`
        }
        confirmLabel={confirm?.action === 'cancel' ? 'Cancel receipt' : 'Restore receipt'}
        danger={confirm?.action === 'cancel'}
        pending={toggleCancel.isPending}
        onConfirm={() => {
          toggleCancel.mutate({ entryId: confirm.entryId, cancelled: confirm.action === 'cancel' });
          setConfirm(null);
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}