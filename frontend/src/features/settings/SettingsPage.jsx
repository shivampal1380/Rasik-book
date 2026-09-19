import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Palette, Moon, Sun } from 'lucide-react';
import { changePassword } from './settingsApi.js';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { getErrorMessage } from '../../lib/api.js';
import { useTheme } from '../../theme/ThemeContext.jsx';
import { ACCENTS } from '../../theme/themes.js';

export default function SettingsPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [success, setSuccess] = useState('');
  const [fieldErr, setFieldErr] = useState('');
  const { mode, accent, setMode, setAccent } = useTheme();

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
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Account and security preferences</p>
      </div>

      <div className="max-w-md">
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <Palette size={20} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Appearance</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Customize the look of the app.</p>
            </div>
          </div>

          <div className="mb-5">
            <label className="label">Theme</label>
            <div className="flex gap-2">
              {(['light', 'dark']).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    mode === m
                      ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {m === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                  {m === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Accent color</label>
            <div className="flex flex-wrap gap-3">
              {ACCENTS.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccent(a.id)}
                  title={a.text}
                  aria-label={`${a.label} accent`}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors ${
                    accent === a.id
                      ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600 dark:border-brand-500 dark:bg-brand-500/15 dark:ring-brand-500'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                >
                  <span
                    className="h-8 w-8 rounded-full"
                    style={{ backgroundColor: a.swatch }}
                  />
                  <span className={`text-xs ${accent === a.id ? 'font-semibold text-brand-800 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {a.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card mt-4 p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Change password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Use at least 8 characters.</p>
            </div>
          </div>

          {success && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" role="status">
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