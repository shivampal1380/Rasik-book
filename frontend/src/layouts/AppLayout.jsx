import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LayoutDashboard, BookOpen, Users, Settings2, LogOut, Menu, X, Search, Calculator, KeyRound } from 'lucide-react';
import { useUser } from '../features/auth/UserContext.js';
import { logout } from '../features/auth/authApi.js';
import { queryClient } from '../lib/queryClient.js';

export default function AppLayout() {
  const { user, isAdmin } = useUser();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  const closeSidebar = () => setSidebarOpen(false);

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-800 text-white' : 'text-slate-300 hover:bg-brand-800/60 hover:text-white'
    }`;

  const nav = (
    <nav className="flex-1 space-y-1 px-3 py-4">
      <NavLink to="/" end className={linkCls} onClick={closeSidebar}>
        <LayoutDashboard size={18} /> Dashboard
      </NavLink>
      <NavLink to="/books" className={linkCls} onClick={closeSidebar}>
        <BookOpen size={18} /> Books
      </NavLink>
      <NavLink to="/search" className={linkCls} onClick={closeSidebar}>
        <Search size={18} /> Search
      </NavLink>
      <NavLink to="/compare" className={linkCls} onClick={closeSidebar}>
        <Calculator size={18} /> Book Tally
      </NavLink>
      <NavLink to="/settings" className={linkCls} onClick={closeSidebar}>
        <KeyRound size={18} /> Settings
      </NavLink>
      {isAdmin && (
        <NavLink to="/users" className={linkCls} onClick={closeSidebar}>
          <Users size={18} /> Users
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/config" className={linkCls} onClick={closeSidebar}>
          <Settings2 size={18} /> Configuration
        </NavLink>
      )}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <img src="/favicon.svg" alt="" className="h-9 w-9 rounded-lg" />
        <div>
          <div className="text-sm font-bold leading-tight">Rasid Book</div>
          <div className="text-xs text-slate-300">Sant Nirankari Mandal</div>
        </div>
        <button
          type="button"
          onClick={closeSidebar}
          className="ml-auto rounded-lg p-1 text-slate-300 hover:bg-white/10 lg:hidden"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {nav}

      <div className="border-t border-white/10 px-5 py-4">
        <div className="mb-3 text-xs text-slate-300">
          Signed in as <span className="font-semibold text-white">{user?.name}</span>
          <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase">{user?.role}</span>
        </div>
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Mobile/tablet top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-brand-900 px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-1.5 text-slate-200 hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-lg" />
        <span className="text-sm font-bold">Rasid Book</span>
        <span className="ml-auto text-xs text-slate-300">SNM</span>
      </header>

      {/* Mobile/tablet slide-in sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-slate-900/60 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeSidebar}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-64 flex-col bg-brand-900 text-white shadow-2xl transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarInner}
        </aside>
      </div>

      {/* Desktop fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-brand-900 text-white lg:flex">
        {sidebarInner}
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}