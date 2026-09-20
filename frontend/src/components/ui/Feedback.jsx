import { Zap } from 'lucide-react';

export const statusStyles = {
  OPEN: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20',
  COMPLETED: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/20',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-500/30',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status] || ''}`}>
      {status}
    </span>
  );
}

export function UpiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-bold text-yellow-950 shadow-[0_0_8px_rgba(250,204,21,0.7)] ring-1 ring-inset ring-yellow-500/60 dark:bg-yellow-400 dark:text-yellow-950">
      <Zap size={11} strokeWidth={3} className="text-yellow-900" fill="currentColor" />
      UPI
    </span>
  );
}

export function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
      {message}
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-800/40">
      <div className="text-3xl">🗂️</div>
      <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</div>
      {hint && <div className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{hint}</div>}
      {action}
    </div>
  );
}