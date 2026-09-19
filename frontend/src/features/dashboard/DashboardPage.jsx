import { api, unwrap, formatINR, HEADS, headLabel, getErrorMessage } from '../../lib/api.js';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useVisibleHeads } from '../config/useVisibleHeads.js';
import { PageLoader } from '../../components/ui/Spinner.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';
import { ArrowRight, BookOpen, CheckCircle2, TrendingUp } from 'lucide-react';

const fetchDashboard = () => unwrap(api.get('/dashboard'));

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });
  const { visibleKeySet } = useVisibleHeads();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorAlert message={getErrorMessage(error)} />;
  if (!data) return null;

  const stats = [
    { label: 'Open books', value: data.openBooks, icon: BookOpen, tint: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/15' },
    { label: 'Completed books', value: data.completedBooks, icon: CheckCircle2, tint: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/15' },
    { label: "Today's entries", value: data.todayEntries, icon: TrendingUp, tint: 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-500/15' },
    { label: "Today's amount", value: formatINR(data.todayAmount), icon: null, tint: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Overview of receipts for today</p>
        </div>
        <Link to="/books" className="btn-secondary">
          All books <ArrowRight size={16} />
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="card flex items-center gap-4 p-5">
            {s.icon && (
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${s.tint}`}>
                <s.icon size={22} />
              </span>
            )}
            <div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{s.value}</div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Today's receipts by head</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-9">
          {HEADS.filter(h => visibleKeySet.has(h.key)).map(h => {
            const item = data.byHead?.find(x => x.head === h.key);
            return (
              <div key={h.key} className="border-l-2 border-brand-200 pl-3 dark:border-brand-500/40">
                <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{headLabel(h.key)}</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatINR(item?.total ?? 0)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}