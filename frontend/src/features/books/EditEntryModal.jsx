import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { updateEntry } from './booksApi.js';
import { ENTRY_HEADS, headLabel, formatINR, getErrorMessage } from '../../lib/api.js';
import { useVisibleHeads } from '../config/useVisibleHeads.js';

export default function EditEntryModal({ bookId, isUpiCash = false, entry, onClose }) {
  const queryClient = useQueryClient();
  const [head, setHead] = useState('BHETA');
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const lastEntryId = useRef(null);
  const { visibleKeySet } = useVisibleHeads();

  useEffect(() => {
    if (!entry) return;
    if (lastEntryId.current !== entry.id) {
      lastEntryId.current = entry.id;
    }
    setHead(entry.head);
    setMethod(entry.paymentMethod || 'UPI');
    setAmount(String(entry.amount));
    setErr('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  const mutation = useMutation({
    mutationFn: () =>
      updateEntry(bookId, entry.id, {
        head,
        amount: parseInt(amount, 10),
        ...(isUpiCash ? { paymentMethod: method } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-entries', bookId] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({ queryKey: ['summary', bookId] });
      queryClient.invalidateQueries({ queryKey: ['book-audit', bookId] });
      onClose();
    },
    onError: e => setErr(getErrorMessage(e)),
  });

  if (!entry) return null;

  // If this entry's head has been hidden since it was recorded, show it at the
  // start so the user can still see what was selected (and keep the head value
  // on save rather than silently switching to a different head).
  const legacyHead = entry && !visibleKeySet.has(entry.head) ? [{ key: entry.head, label: headLabel(entry.head) }] : [];
  const heads = [...legacyHead, ...ENTRY_HEADS.filter(h => visibleKeySet.has(h.key))];

  return (
    <Modal open={!!entry} onClose={onClose} title={`Correct receipt #${entry.entryNumber}`}>
      <form
        onSubmit={e => {
          e.preventDefault();
          const a = parseInt(amount, 10);
          if (!a || a <= 0) {
            setErr('Enter a valid amount in whole rupees.');
            return;
          }
          setErr('');
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {err && <ErrorAlert message={err} />}

        <div>
          <label className="label">Head</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {heads.map(h => (
              <button
                key={h.key}
                type="button"
                onClick={() => {
                  setHead(h.key);
                  setErr('');
                }}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  head === h.key
                    ? 'border-brand-700 bg-brand-700 text-white dark:border-brand-500 dark:bg-brand-600'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-300'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {legacyHead.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            This head has been hidden (sessional) — it is only shown here for historical entries.
          </p>
        )}

        {isUpiCash && (
          <div>
            <span className="label">Paid via</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('UPI')}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  method === 'UPI'
                    ? 'border-yellow-400 bg-yellow-400 text-yellow-950'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-yellow-300 hover:text-yellow-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-yellow-500/60 dark:hover:text-yellow-300'
                }`}
              >
                UPI
              </button>
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  method === 'CASH'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-500/60 dark:hover:text-emerald-300'
                }`}
              >
                Cash
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="edit-amount">Amount (whole rupees)</label>
          <input id="edit-amount" type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d]/g, ''))} className="input text-lg font-semibold" />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Previous amount: {formatINR(entry.amount)}</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? <Spinner size="sm" className="border-white/40 border-t-white" /> : 'Save correction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}