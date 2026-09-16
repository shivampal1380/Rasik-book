import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { fetchUsers, createUser, updateUser } from './usersApi.js';
import { useUser } from '../auth/UserContext.js';
import Modal from '../../components/ui/Modal.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';
import { PageLoader, Spinner } from '../../components/ui/Spinner.jsx';
import { getErrorMessage } from '../../lib/api.js';

const ROLE_BADGE = {
  ADMIN: 'bg-brand-100 text-brand-800',
  OPERATOR: 'bg-sky-100 text-sky-800',
};

export default function UsersPage() {
  const { user: me } = useUser();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setNotice('User created.');
    },
    onError: e => setNotice(getErrorMessage(e)),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => updateUser(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: e => setNotice(getErrorMessage(e)),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <p className="mt-1 text-sm text-slate-500">Manage operators and administrators</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New user
        </button>
      </div>

      {notice && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${notice.startsWith('User created') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {notice}
        </div>
      )}
      {error && <div className="mb-4"><ErrorAlert message={getErrorMessage(error)} /></div>}

      <div className="card overflow-hidden">
        <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-left">Role</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map(u => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-semibold text-slate-800">
                  {u.name} {u.id === me?.id && <span className="text-xs font-normal text-slate-400">(you)</span>}
                </td>
                <td className="px-5 py-3 text-slate-600">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {u.id !== me?.id && (
                    <button
                      onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                      disabled={toggleActive.isPending}
                      className="text-xs font-semibold text-brand-700 hover:text-brand-900 disabled:opacity-50"
                    >
                      {toggleActive.isPending ? <Spinner size="sm" /> : u.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateUserModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'OPERATOR' });
  const [err, setErr] = useState('');
  const mutation = useMutation({
    mutationFn: () => createUser(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: e => setErr(getErrorMessage(e)),
  });

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Modal open onClose={onClose} title="Create a user">
      <form
        onSubmit={e => {
          e.preventDefault();
          setErr('');
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {err && <ErrorAlert message={err} />}
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={update('name')} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={update('email')} required />
        </div>
        <div>
          <label className="label">Temporary password</label>
          <input type="password" className="input" value={form.password} onChange={update('password')} required minLength={6} />
          <p className="mt-1 text-xs text-slate-400">User can be given a new password later if needed.</p>
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={update('role')}>
            <option value="OPERATOR">Operator — enters amounts</option>
            <option value="ADMIN">Admin — full access incl. corrections</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? <Spinner size="sm" className="border-white/40 border-t-white" /> : 'Create user'}
          </button>
        </div>
      </form>
    </Modal>
  );
}