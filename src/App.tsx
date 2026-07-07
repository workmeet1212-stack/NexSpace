import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import socketService from './services/socket.service';
import { Spinner } from './components/ui/Spinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Pages - lazy loaded
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const KanbanPage = lazy(() => import('./pages/project/KanbanPage'));
const ListPage = lazy(() => import('./pages/project/ListPage'));
const SprintPage = lazy(() => import('./pages/project/SprintPage'));
const AnalyticsPage = lazy(() => import('./pages/project/AnalyticsPage'));
const ProjectSettingsPage = lazy(() => import('./pages/project/ProjectSettingsPage'));
const WorkspaceMembersPage = lazy(() => import('./pages/workspace/WorkspaceMembersPage'));
const WorkspaceSettingsPage = lazy(() => import('./pages/workspace/WorkspaceSettingsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

// Route guards
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && !user?.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { isAuthenticated, accessToken, fetchUser, isLoading } = useAuthStore();

  useEffect(() => {
    // Fetch user on mount if we have a stored session
    if (!isAuthenticated && !isLoading) {
      fetchUser();
    }
  }, []);

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      socketService.connect(accessToken);
    } else {
      socketService.disconnect();
    }
    return () => socketService.disconnect();
  }, [isAuthenticated, accessToken]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            }
          >
            <Routes>
              {/* Public routes */}
              <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* Onboarding */}
              <Route
                path="/onboarding"
                element={
                  <OnboardingRoute>
                    <OnboardingPage />
                  </OnboardingRoute>
                }
              />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <MainLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="project/:projectId/board" element={<KanbanPage />} />
                <Route path="project/:projectId/list" element={<ListPage />} />
                <Route path="project/:projectId/sprint" element={<SprintPage />} />
                <Route path="project/:projectId/analytics" element={<AnalyticsPage />} />
                <Route path="project/:projectId/settings" element={<ProjectSettingsPage />} />
                <Route path="workspace/members" element={<WorkspaceMembersPage />} />
                <Route path="workspace/settings" element={<WorkspaceSettingsPage />} />
              </Route>

              {/* OAuth callback */}
              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#fff',
                border: '1px solid #e5e7eb',
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// OAuth callback handler
const AuthCallback: React.FC = () => {
  const { login } = useAuthStore();
  const [processed, setProcessed] = React.useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token && !processed) {
      // Store token and redirect
      localStorage.setItem('accessToken', token);
      login({} as any, token); // User data will be fetched in fetchUser
      setProcessed(true);
      window.location.href = '/dashboard';
    }
  }, [processed]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
};

export default App;
