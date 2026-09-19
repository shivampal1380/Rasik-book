import { useQuery } from '@tanstack/react-query';
import { fetchBookAudit } from './booksApi.js';
import { getErrorMessage } from '../../lib/api.js';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { ErrorAlert, EmptyState } from '../../components/ui/Feedback.jsx';

const ACTION_LABELS = {
  ENTRY_CREATED: 'Entry created',
  ENTRY_UPDATED: 'Entry corrected',
  BOOK_COMPLETED: 'Book completed',
  BOOK_CLOSED: 'Book closed',
  PDF_GENERATED: 'Statement PDF generated',
};

export default function AuditTab({ bookId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['book-audit', bookId],
    queryFn: () => fetchBookAudit(bookId),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorAlert message={getErrorMessage(error)} />;
  if (!data?.items?.length) return <EmptyState title="No activity logged yet" />;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">When</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">By</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map(a => (
              <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(a.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })}
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{ACTION_LABELS[a.action] || a.action}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{a.user?.name || '—'}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-500 dark:text-slate-400">{prettyDetail(a)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function prettyDetail(a) {
  try {
    if (a.action === 'ENTRY_UPDATED') {
      const oldV = a.oldValue ?? {};
      const newV = a.newValue ?? {};
      return `#${newV.entryNumber ?? ''} ${oldV.head || ''}→${newV.head || ''} ₹${oldV.amount ?? ''}→₹${newV.amount ?? ''}`;
    }
    if (a.newValue) {
      if (a.action === 'ENTRY_CREATED') {
        const v = a.newValue;
        return `#${v.entryNumber} ${v.head} ₹${v.amount}`;
      }
      return JSON.stringify(a.newValue);
    }
    return '—';
  } catch {
    return JSON.stringify(a.newValue ?? a.oldValue ?? {});
  }
}