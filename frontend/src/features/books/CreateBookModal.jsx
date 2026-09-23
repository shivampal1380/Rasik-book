import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../../components/ui/Modal.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { createBook } from './booksApi.js';
import { getErrorMessage } from '../../lib/api.js';

const schema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(8, 'Max 8 characters'),
  bookNumber: z.string().trim().min(1, 'Book number is required'),
  pracharak: z.string().trim().max(100).optional(),
  isUpi: z.boolean().optional(),
});

export default function CreateBookModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { code: 'A01', bookNumber: '', pracharak: '', isUpi: false },
  });

  const mutation = useMutation({
    mutationFn: createBook,
    onSuccess: book => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      onClose();
      reset();
      const id = book?.id || book?.book?.id;
      if (id) {
        window.location.assign(`/books/${id}`);
      }
    },
    onError: err => setError('root', { type: 'server', message: getErrorMessage(err) }),
  });

  return (
    <Modal open={open} onClose={onClose} title="Create a new book">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {errors.root && <ErrorAlert message={errors.root.message} />}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Code</label>
            <input className="input" placeholder="A01" {...register('code')} />
            {errors.code && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.code.message}</p>}
          </div>
          <div>
            <label className="label">Book number</label>
            <input className="input" placeholder="e.g. 1256" {...register('bookNumber')} />
            {errors.bookNumber && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bookNumber.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Pracharak (full name)</label>
          <input className="input" placeholder="Enter pracharak name" {...register('pracharak')} />
        </div>

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 accent-brand-700"
            {...register('isUpi')}
          />
          <span>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">UPI Book</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">This book collects payments via UPI</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 accent-brand-700"
            {...register('isUpi')}
          />
          <span>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">UPI + Cash Book</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">This book collects payments via UPI and cash</span>
          </span>
        </label>

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Area is set to <span className="font-semibold">MAHAKALI</span>. Books are created with 100 receipt numbers.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? <Spinner size="sm" className="border-white/40 border-t-white" /> : 'Create book'}
          </button>
        </div>
      </form>
    </Modal>
  );
}