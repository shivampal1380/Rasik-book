export const statusStyles = {
  OPEN: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  COMPLETED: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status] || ''}`}>
      {status}
    </span>
  );
}

export function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {message}
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
      <div className="text-3xl">🗂️</div>
      <div className="text-sm font-semibold text-slate-600">{title}</div>
      {hint && <div className="max-w-sm text-sm text-slate-500">{hint}</div>}
      {action}
    </div>
  );
}