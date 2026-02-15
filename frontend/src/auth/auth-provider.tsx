// ABOUTME: Authentication provider component
// ABOUTME: Wraps app and restores auth state from localStorage on mount

import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { currentUserAtom, authTokenAtom } from '@/state/auth-atoms'
import type { User } from '@/apis/agdevx-cart-api/models/user'

const AUTH_TOKEN_STORAGE_KEY = 'authToken'
const AUTH_USER_STORAGE_KEY = 'authUser'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const setUser = useSetAtom(currentUserAtom)
  const setToken = useSetAtom(authTokenAtom)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
      const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY)

      if (storedToken) {
        setToken(storedToken)
      }

      if (storedUser) {
        setUser(JSON.parse(storedUser) as User)
      }
    } catch {
      // Invalid stored data, ignore
    }
  }, [setToken, setUser])

  return <>{children}</>
}
