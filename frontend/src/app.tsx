// ABOUTME: Main app component with routing
// ABOUTME: Configures routes and navigation structure

import { ErrorBoundary } from 'react-error-boundary'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { queryClient } from '@/apis/tanstack-query/query-client'
import { AuthProvider } from '@/auth/auth-provider'
import { useAuth } from '@/auth/use-auth'
import { CreateHouseholdPage } from '@/pages/household/create-household-page'
import { HouseholdDetailPage } from '@/pages/household/household-detail-page'
import { HouseholdPage } from '@/pages/household/household-page'
import { JoinHouseholdPage } from '@/pages/household/join-household-page'
import { LoginPage } from '@/pages/login/login-page'
import { PantryPage } from '@/pages/pantry/pantry-page'
import { RegisterPage } from '@/pages/register/register-page'
import { SettingsPage } from '@/pages/settings/settings-page'
import { ActiveTripPage } from '@/pages/shopping/active-trip-page'
import { AddTripItemsPage } from '@/pages/shopping/add-trip-items-page'
import { ShoppingPage } from '@/pages/shopping/shopping-page'
import { TripDetailPage } from '@/pages/shopping/trip-detail-page'
import { ROUTES } from '@/routes'
import { BottomNav } from '@/shared/bottom-nav/bottom-nav'
import { ErrorFallback } from '@/shared/error-fallback'
import { PwaInstallPrompt } from '@/shared/pwa-install-prompt'

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
          <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || '/'}>
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
