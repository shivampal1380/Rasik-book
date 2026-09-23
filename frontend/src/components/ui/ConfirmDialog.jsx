import Modal from './Modal.jsx';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  pending = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} maxWidth="max-w-md">
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={pending} className="btn-secondary">
          Keep
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={
            danger
              ? 'inline-flex h-[42px] items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600'
              : 'btn-primary'
          }
        >
          {pending ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}