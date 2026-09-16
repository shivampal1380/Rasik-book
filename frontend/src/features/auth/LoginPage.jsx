import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { login, fetchMe } from './authApi.js';
import { getErrorMessage } from '../../lib/api.js';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false });

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      // Drop the stale failed /me result so RequireAuth refetches fresh.
      queryClient.removeQueries({ queryKey: ['me'] });
      navigate('/', { replace: true });
    },
    onError: err => setError('root', { type: 'server', message: getErrorMessage(err) }),
  });

  if (me?.user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-white">
          <img src="/favicon.svg" alt="" className="mb-4 h-14 w-14 rounded-2xl" />
          <h1 className="text-xl font-bold tracking-tight">Rasid Book</h1>
          <p className="text-sm text-slate-300">Book Amount Entry System</p>
        </div>

        <form onSubmit={handleSubmit(d => loginMutation.mutate(d))} className="card px-6 py-6">
          <h2 className="mb-5 text-lg font-semibold text-slate-800">Sign in</h2>
          {errors.root && <div className="mb-4"><ErrorAlert message={errors.root.message} /></div>}

          <div className="mb-4">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" className="input" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="mb-6">
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" className="input pr-16" {...register('password')} />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-brand-700 hover:text-brand-800">
                {showPw ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? <Spinner size="sm" className="border-white/40 border-t-white" /> : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Sant Nirankari Mandal (Regd.), Mumbai Branch
        </p>
      </div>
    </div>
  );
}