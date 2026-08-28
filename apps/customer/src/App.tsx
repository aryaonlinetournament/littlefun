import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PendingVerificationPage from './pages/PendingVerificationPage';
import OnboardingPage from './pages/OnboardingPage';
import DiscoveryPage from './pages/DiscoveryPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import RequestsPage from './pages/RequestsPage';
import NotificationsPage from './pages/NotificationsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,    // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isPendingApproval } = useAuth();
  if (isLoading) return <div className="app-loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isPendingApproval) return <Navigate to="/pending-verification" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isPendingApproval } = useAuth();
  if (isLoading) return <div className="app-loading"><div className="spinner" /></div>;
  if (user) {
    if (isPendingApproval) return <Navigate to="/pending-verification" replace />;
    return <Navigate to="/discover" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>}
            />
            <Route
              path="/register"
              element={<RegisterPage />}
            />
            <Route
              path="/join"
              element={<Navigate to="/register" replace />}
            />
            <Route
              path="/pending-verification"
              element={<PendingVerificationPage />}
            />
            <Route
              path="/onboarding"
              element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>}
            />
            <Route
              path="/discover"
              element={<ProtectedRoute><DiscoveryPage /></ProtectedRoute>}
            />
            <Route
              path="/matches"
              element={<Navigate to="/discover" replace />}
            />
            <Route
              path="/chat/:conversationId?"
              element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
            />
            <Route
              path="/profile"
              element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
            />
            <Route
              path="/requests"
              element={<ProtectedRoute><RequestsPage /></ProtectedRoute>}
            />
            <Route
              path="/notifications"
              element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>}
            />
            <Route path="/" element={<Navigate to="/discover" replace />} />
            <Route path="*" element={<Navigate to="/discover" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
