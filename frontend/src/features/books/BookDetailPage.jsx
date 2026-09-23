import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileDown, PlayCircle, RotateCcw, Lock } from 'lucide-react';
import { fetchBook, completeBook, closeBook, pdfUrl } from './booksApi.js';
import { useUser } from '../auth/UserContext.js';
import { StatusBadge, UpiBadge, ErrorAlert } from '../../components/ui/Feedback.jsx';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import EntryTab from './EntryTab.jsx';
import EntriesTab from './EntriesTab.jsx';
import SummaryTab from './SummaryTab.jsx';
import PdfTab from './PdfTab.jsx';
import AuditTab from './AuditTab.jsx';
import { getErrorMessage, formatINR } from '../../lib/api.js';

const TABS = [
  { key: 'entry', label: 'Entry', adminOnly: false },
  { key: 'entries', label: 'Entries', adminOnly: false },
  { key: 'summary', label: 'Summary', adminOnly: false },
  { key: 'pdf', label: 'PDF', adminOnly: false },
  { key: 'audit', label: 'Audit', adminOnly: true },
];

export default function BookDetailPage() {
  const { id } = useParams();
  const { isAdmin, isSuperAdmin } = useUser();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'entry';

  const { data, isLoading, error } = useQuery({ queryKey: ['book', id], queryFn: () => fetchBook(id) });

  const completeMutation = useMutation({
    mutationFn: () => completeBook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closeBook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorAlert message={getErrorMessage(error)} />;

  const book = data;
  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  const actions = (
    <div className="flex flex-wrap gap-2">
      <a href={pdfUrl(id)} target="_blank" rel="noreferrer" className="btn-secondary">
        <FileDown size={16} /> Print PDF
      </a>
      {isAdmin && book.status === 'OPEN' && (
        <button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending} className="btn-secondary">
          <RotateCcw size={16} /> Complete
        </button>
      )}
      {isSuperAdmin && book.status !== 'CLOSED' && (
        <button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending} className="btn-danger">
          <Lock size={16} /> Close
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link to="/books" className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200">
          <ArrowLeft size={14} /> Books
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-slate-100">
              {book.code}/{book.bookNumber}
              {book.isUpiCash ? <UpiBadge label="UPI + Cash" /> : book.isUpi ? <UpiBadge /> : null}
              <StatusBadge status={book.status} />
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {book.pracharak || '—'} · Area: {book.area} · Created {new Date(book.createdAt).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>
        {actions}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Receipts entered</div>
          <div className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">
            {book.currentEntryNumber - 1} <span className="text-sm font-medium text-slate-400 dark:text-slate-500">/ {book.maxEntries}</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Next number</div>
          <div className="mt-1 text-xl font-bold text-brand-700 dark:text-brand-300">{book.currentEntryNumber}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Total amount</div>
          <div className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{formatINR(book.totalAmount)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</div>
          <div className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
            {book.status === 'OPEN' && <PlayCircle size={20} className="text-emerald-600 dark:text-emerald-400" />}
            {book.status}
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {visibleTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setParams(t.key === 'entry' ? {} : { tab: t.key })}
            className={`px-4 py-2 text-sm font-semibold ${tab === t.key ? 'tab-active' : 'tab-inactive'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'entry' && <EntryTab book={book} />}
      {tab === 'entries' && <EntriesTab bookId={id} book={book} />}
      {tab === 'summary' && <SummaryTab bookId={id} book={book} />}
      {tab === 'pdf' && <PdfTab bookId={id} book={book} />}
      {tab === 'audit' && <AuditTab bookId={id} />}
    </div>
  );
}