// ABOUTME: Authentication provider component
// ABOUTME: Wraps app, initializes auth state from localStorage on mount

import { useAuth } from './use-auth'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Initialize auth state (useAuth automatically restores from localStorage)
  useAuth()

  return <>{children}</>
}
