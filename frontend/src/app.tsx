// ABOUTME: Main app component with routing
// ABOUTME: Configures routes and navigation structure

import { BrowserRouter, Navigate,Route, Routes } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/apis/tanstack-query/query-client'
import { AuthProvider } from '@/auth/auth-provider'
import { useAuth } from '@/auth/use-auth'
import { BottomNav } from '@/features/bottom-nav/bottom-nav'
import { PwaInstallPrompt } from '@/features/pwa-install-prompt/pwa-install-prompt'
import { ActiveTripPage } from '@/pages/active-trip-page'
import { AddTripItemsPage } from '@/pages/add-trip-items-page'
import { AddPantryItemPage } from '@/pages/add-pantry-item-page'
import { CreateHouseholdPage } from '@/pages/create-household-page'
import { HouseholdDetailPage } from '@/pages/household-detail-page'
import { HouseholdPage } from '@/pages/household-page'
import { PantryPage } from '@/pages/pantry-page'
import { JoinHouseholdPage } from '@/pages/join-household-page'
import { LoginPage } from '@/pages/login-page'
import { RegisterPage } from '@/pages/register-page'
import { SettingsPage } from '@/pages/settings-page'
import { ShoppingPage } from '@/pages/shopping-page'
import { TripDetailPage } from '@/pages/trip-detail-page'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-bg min-h-screen pb-24">
    {children}
    <BottomNav />
  </div>
)

export const AppRoutes = () => (
  <>
    <PwaInstallPrompt />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pantry" element={<ProtectedRoute><AuthenticatedLayout><PantryPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/pantry/add" element={<ProtectedRoute><AuthenticatedLayout><AddPantryItemPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/shopping" element={<ProtectedRoute><AuthenticatedLayout><ShoppingPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/shopping/:tripId" element={<ProtectedRoute><AuthenticatedLayout><TripDetailPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/shopping/:tripId/add-items" element={<ProtectedRoute><AuthenticatedLayout><AddTripItemsPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/shopping/:tripId/active" element={<ProtectedRoute><AuthenticatedLayout><ActiveTripPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/household" element={<ProtectedRoute><AuthenticatedLayout><HouseholdPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/household/create" element={<ProtectedRoute><AuthenticatedLayout><CreateHouseholdPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/household/join" element={<ProtectedRoute><AuthenticatedLayout><JoinHouseholdPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/household/:id" element={<ProtectedRoute><AuthenticatedLayout><HouseholdDetailPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AuthenticatedLayout><SettingsPage /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/shopping" replace />} />
    </Routes>
  </>
)

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
