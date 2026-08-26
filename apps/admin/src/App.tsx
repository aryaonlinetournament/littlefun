import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';

// Pages
import AdminLoginPage from './pages/AdminLoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ProfilesPage from './pages/ProfilesPage';
import RequestsPage from './pages/RequestsPage';
import VerificationPage from './pages/VerificationPage';
import ModerationPage from './pages/ModerationPage';
import ConfigPage from './pages/ConfigPage';
import AuditLogsPage from './pages/AuditLogsPage';
import CitiesPage from './pages/CitiesPage';

import AchieversPage from './pages/AchieversPage';
import AnalyticsPage from './pages/AnalyticsPage';
import BroadcastPage from './pages/BroadcastPage';
import BannersPage from './pages/BannersPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, adminUser, user, logOut } = useAdminAuth();
  if (isLoading) return <div className="admin-loading"><div className="spinner" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/analytics', label: 'Analytics', icon: '📈' },
    { to: '/users', label: 'Users', icon: '👥' },
    { to: '/profiles', label: 'Profiles', icon: '🪚' },
    { to: '/achievers', label: 'Top Achievers', icon: '🏆' },
    { to: '/requests', label: 'Requests', icon: '📋' },
    { to: '/verification', label: 'Verification', icon: '✅' },
    { to: '/moderation', label: 'Moderation', icon: '🛡️' },
    { to: '/broadcast', label: 'Broadcast', icon: '📣' },
    { to: '/banners', label: 'App Banners', icon: '🎨' },
    { to: '/cities', label: 'Cities', icon: '🏙️' },
    { to: '/config', label: 'Config', icon: '⚙️' },
    { to: '/audit', label: 'Audit Log', icon: '📜' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-icon">💛</span>
          <div>
            <div className="admin-brand-name">LittleFun</div>
            <div className="admin-brand-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-role">{adminUser?.role ?? 'SUPER_ADMIN'}</div>
            <div className="admin-user-email">{adminUser?.email || user?.email || 'aryaonlinetournament@gmail.com'}</div>
          </div>
          <button className="admin-logout-btn" onClick={logOut} title="Sign out">⏻</button>
        </div>
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <BrowserRouter basename="/admin">
          <Routes>
            <Route path="/login" element={<AdminLoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedLayout>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/profiles" element={<ProfilesPage />} />
                    <Route path="/achievers" element={<AchieversPage />} />
                    <Route path="/requests" element={<RequestsPage />} />
                    <Route path="/verification" element={<VerificationPage />} />
                    <Route path="/moderation" element={<ModerationPage />} />
                    <Route path="/broadcast" element={<BroadcastPage />} />
                    <Route path="/banners" element={<BannersPage />} />
                    <Route path="/cities" element={<CitiesPage />} />
                    <Route path="/config" element={<ConfigPage />} />
                    <Route path="/audit" element={<AuditLogsPage />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </ProtectedLayout>
              }
            />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
