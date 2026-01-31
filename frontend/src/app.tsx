// ABOUTME: Main app component with routing
// ABOUTME: Configures routes and navigation structure

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { AuthProvider } from '@/auth/auth-provider'
import { LoginPage } from '@/pages/login-page'
import { HouseholdPage } from '@/pages/household-page'
import { CreateHouseholdPage } from '@/pages/create-household-page'
import { JoinHouseholdPage } from '@/pages/join-household-page'
import { InventoryPage } from '@/pages/inventory-page'
import { AddInventoryItemPage } from '@/pages/add-inventory-item-page'
import { ShoppingPage } from '@/pages/shopping-page'
import { TripDetailPage } from '@/pages/trip-detail-page'
import { ActiveTripPage } from '@/pages/active-trip-page'
import { useAuth } from '@/auth/use-auth'
import { BottomNav } from '@/features/bottom-nav/bottom-nav'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

const LayoutWithNav = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen pb-16">
    {children}
    <BottomNav />
  </div>
)


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/inventory" element={<ProtectedRoute><LayoutWithNav><InventoryPage /></LayoutWithNav></ProtectedRoute>} />
            <Route path="/inventory/add" element={<ProtectedRoute><AddInventoryItemPage /></ProtectedRoute>} />
            <Route path="/shopping" element={<ProtectedRoute><LayoutWithNav><ShoppingPage /></LayoutWithNav></ProtectedRoute>} />
            <Route path="/shopping/:tripId" element={<ProtectedRoute><TripDetailPage /></ProtectedRoute>} />
            <Route path="/shopping/:tripId/active" element={<ProtectedRoute><ActiveTripPage /></ProtectedRoute>} />
            <Route path="/household" element={<ProtectedRoute><LayoutWithNav><HouseholdPage /></LayoutWithNav></ProtectedRoute>} />
            <Route path="/household/create" element={<ProtectedRoute><CreateHouseholdPage /></ProtectedRoute>} />
            <Route path="/household/join" element={<ProtectedRoute><JoinHouseholdPage /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/shopping" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
