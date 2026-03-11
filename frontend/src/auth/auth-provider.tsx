// ABOUTME: Authentication provider component
// ABOUTME: Wraps app and restores auth state from cookie session on mount

import { useEffect } from 'react'

import { useSetAtom } from 'jotai'

import { ApiError } from '@/apis/api-error'
import { apiFetch } from '@/apis/agdevx-cart-api/agdevx-cart-api-config'
import type { User } from '@/apis/agdevx-cart-api/models/user'
import { AUTH_USER_STORAGE_KEY, currentUserAtom } from '@/state/auth-atoms'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const setUser = useSetAtom(currentUserAtom)

  useEffect(() => {
    if (typeof window === 'undefined') return

    //== Validate session with backend (cookie is sent automatically)
    //== Note: initial user restore is handled synchronously by currentUserAtom
    const validateSession = async () => {
      try {
        const response = await apiFetch('/api/auth/me')
        const userData = await response.json()
        const user: User = {
          id: userData.userId,
          email: userData.email,
          name: userData.name,
          createdBy: null,
          createdDate: new Date().toISOString(),
          modifiedBy: null,
          modifiedDate: null,
        }
        setUser(user)
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
      } catch (error) {
        if (error instanceof ApiError) {
          //== HTTP error (e.g. 401 expired session) — clear local state
          setUser(null)
          localStorage.removeItem(AUTH_USER_STORAGE_KEY)
        }
        //== Network error (TypeError) — keep optimistic local state
      }
    }

    validateSession()
  }, [setUser])

  return <>{children}</>
}
