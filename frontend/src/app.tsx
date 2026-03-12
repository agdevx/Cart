// ABOUTME: Main app component with routing
// ABOUTME: Configures routes and navigation structure

import { ErrorBoundary } from 'react-error-boundary'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { queryClient } from '@/apis/tanstack-query/query-client'
import { AuthProvider } from '@/auth/auth-provider'
import { useAuth } from '@/auth/use-auth'
import { BottomNav } from '@/features/bottom-nav/bottom-nav'
import { PwaInstallPrompt } from '@/features/pwa-install-prompt/pwa-install-prompt'
import { ActiveTripPage } from '@/pages/active-trip-page'
import { AddTripItemsPage } from '@/pages/add-trip-items-page'
import { ErrorFallback } from '@/pages/components/error-fallback'
import { CreateHouseholdPage } from '@/pages/create-household-page'
import { HouseholdDetailPage } from '@/pages/household-detail-page'
import { HouseholdPage } from '@/pages/household-page'
import { JoinHouseholdPage } from '@/pages/join-household-page'
import { LoginPage } from '@/pages/login-page'
import { PantryPage } from '@/pages/pantry-page'
import { RegisterPage } from '@/pages/register-page'
import { SettingsPage } from '@/pages/settings-page'
import { ShoppingPage } from '@/pages/shopping-page'
import { TripDetailPage } from '@/pages/trip-detail-page'
import { ROUTES } from '@/routes'

function ErrorBoundaryWithReset({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => console.error('Uncaught render error:', error)}
      resetKeys={[pathname]}
    >
      {children}
    </ErrorBoundary>
  )
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />
}

const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <div id="main-content" className="bg-bg min-h-screen pb-24">
    {children}
    <BottomNav />
  </div>
)

export const AppRoutes = () => (
  <>
    <PwaInstallPrompt />
    <Routes>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path={ROUTES.PANTRY} element={<ProtectedRoute><AuthenticatedLayout><PantryPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path={ROUTES.SHOPPING} element={<ProtectedRoute><AuthenticatedLayout><ShoppingPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path={ROUTES.TRIP_DETAIL} element={<ProtectedRoute><AuthenticatedLayout><TripDetailPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path={ROUTES.TRIP_ADD_ITEMS} element={<ProtectedRoute><AuthenticatedLayout><AddTripItemsPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path={ROUTES.ACTIVE_TRIP} element={<ProtectedRoute><AuthenticatedLayout><ActiveTripPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path={ROUTES.HOUSEHOLD} element={<ProtectedRoute><AuthenticatedLayout><HouseholdPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path={ROUTES.HOUSEHOLD_CREATE} element={<ProtectedRoute><AuthenticatedLayout><CreateHouseholdPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path={ROUTES.HOUSEHOLD_JOIN} element={<ProtectedRoute><AuthenticatedLayout><JoinHouseholdPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path={ROUTES.HOUSEHOLD_DETAIL} element={<ProtectedRoute><AuthenticatedLayout><HouseholdDetailPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path={ROUTES.SETTINGS} element={<ProtectedRoute><AuthenticatedLayout><SettingsPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={ROUTES.SHOPPING} replace />} />
    </Routes>
  </>
)

const App = () => {
  return (
    <>
      <Toaster position="bottom-right" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-teal focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:font-display focus:font-bold"
            >
              Skip to content
            </a>
            <ErrorBoundaryWithReset>
              <AppRoutes />
            </ErrorBoundaryWithReset>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </>
  )
}

export default App
