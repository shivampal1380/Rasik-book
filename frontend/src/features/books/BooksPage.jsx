import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { fetchBooks } from './booksApi.js';
import CreateBookModal from './CreateBookModal.jsx';
import { StatusBadge, UpiBadge, EmptyState, ErrorAlert } from '../../components/ui/Feedback.jsx';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { formatINR, getErrorMessage } from '../../lib/api.js';
import { useUser } from '../auth/UserContext.js';

function Progress({ used, max }) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  const color = pct >= 100 ? 'bg-amber-500' : pct >= 80 ? 'bg-sky-500' : 'bg-emerald-600';
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>
          {used}/{max} receipts
        </span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BooksPage() {
  const { isAdmin } = useUser();
  const [showCreate, setShowCreate] = useState(false);
  const [status, setStatus] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['books', status],
    queryFn: () => fetchBooks({ pageSize: 100, status }),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Books</h1>
          <p className="mt-1 text-sm text-slate-500">Receipt books used for amount entry</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> New book
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'OPEN', 'COMPLETED', 'CLOSED'].map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              status === s ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === '' ? 'All' : s.toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading && <PageLoader />}
      {error && <ErrorAlert message={getErrorMessage(error)} />}

      {data && data.items.length === 0 && (
        <EmptyState
          title="No books yet"
          hint="Add your first receipt book to start entering amounts."
          action={
            isAdmin ? (
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus size={16} /> Create book
              </button>
            ) : null
          }
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.items.map(b => (
          <Link
            key={b.id}
            to={`/books/${b.id}`}
            className="card group p-5 transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="text-lg font-bold text-slate-800">
                  {b.code}/{b.bookNumber}
                </div>
                <div className="text-xs text-slate-500">{b.pracharak || '—'}</div>
                <div className="text-xs text-slate-400">Area: {b.area}</div>
              </div>
              <div className="flex items-center gap-2">
                  {b.isUpi && <UpiBadge />}
                  <StatusBadge status={b.status} />
                </div>
            </div>

            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{formatINR(b.totalAmount)}</span>
              <span className="text-xs text-slate-400">
                {b.isFull ? 'Book full' : `${b.entriesRemaining} left`}
              </span>
            </div>

            <Progress used={b.entriesCompleted} max={b.maxEntries} />
          </Link>
        ))}
      </div>

      <CreateBookModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}