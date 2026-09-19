import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, title, onClose, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div className={`relative flex w-full ${maxWidth} max-h-[90vh] flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}