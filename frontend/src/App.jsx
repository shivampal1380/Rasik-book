import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserContext } from './features/auth/UserContext.js';
import { fetchMe } from './features/auth/authApi.js';
import AppLayout from './layouts/AppLayout.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import BooksPage from './features/books/BooksPage.jsx';
import BookDetailPage from './features/books/BookDetailPage.jsx';
import UsersPage from './features/users/UsersPage.jsx';
import HeadConfigPage from './features/config/HeadConfigPage.jsx';
import SearchPage from './features/search/SearchPage.jsx';
import ComparePage from './features/compare/ComparePage.jsx';
import SettingsPage from './features/settings/SettingsPage.jsx';
import { Spinner } from './components/ui/Spinner.jsx';

function RequireAuth({ children }) {
  const { pathname } = useLocation();
  const { data, isLoading, error } = useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false });
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error || !data?.user) {
    return <Navigate to="/login" replace />;
  }
  if (pathname === '/users' && data.user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  if (pathname === '/config' && data.user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <UserContext.Provider value={{ user: data.user, isAdmin: data.user.role === 'ADMIN' }}>{children}</UserContext.Provider>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/books/:id" element={<BookDetailPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/config" element={<HeadConfigPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}