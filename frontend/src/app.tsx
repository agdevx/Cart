// ABOUTME: Main app component with routing
// ABOUTME: Configures routes and navigation structure

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { AuthProvider } from '@/auth/auth-provider'
import { LoginPage } from '@/pages/login-page'
import { useAuth } from '@/auth/use-auth'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-4"><h1 className="text-2xl">{title}</h1></div>
)

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/inventory" element={<ProtectedRoute><PlaceholderPage title="Inventory" /></ProtectedRoute>} />
            <Route path="/shopping" element={<ProtectedRoute><PlaceholderPage title="Shopping" /></ProtectedRoute>} />
            <Route path="/household" element={<ProtectedRoute><PlaceholderPage title="Household" /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/shopping" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
