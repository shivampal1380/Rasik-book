import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { changePassword } from './settingsApi.js';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { getErrorMessage } from '../../lib/api.js';

export default function SettingsPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [success, setSuccess] = useState('');
  const [fieldErr, setFieldErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    onSuccess: () => {
      setSuccess('Password updated successfully.');
      setFieldErr('');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: e => setFieldErr(getErrorMessage(e)),
  });

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const onSubmit = e => {
    e.preventDefault();
    setSuccess('');
    setFieldErr('');
    if (form.newPassword.length < 8) {
      setFieldErr('New password must be at least 8 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setFieldErr('New passwords do not match');
      return;
    }
    mutation.mutate();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Account and security preferences</p>
      </div>

      <div className="max-w-md">
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Change password</h2>
              <p className="text-sm text-slate-500">Use at least 8 characters.</p>
            </div>
          </div>

          {success && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
              {success}
            </div>
          )}
          {fieldErr && <div className="mb-4"><ErrorAlert message={fieldErr} /></div>}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                className="input"
                value={form.currentPassword}
                onChange={update('currentPassword')}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                className="input"
                value={form.newPassword}
                onChange={update('newPassword')}
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="input"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                required
              />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                {mutation.isPending ? <Spinner size="sm" className="border-white/40 border-t-white" /> : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}