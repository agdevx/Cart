// ABOUTME: Authentication provider component
// ABOUTME: Wraps app and restores auth state from cookie session on mount

import { useEffect } from 'react'

import { useSetAtom } from 'jotai'

import { apiFetch } from '@/apis/agdevx-cart-api/agdevx-cart-api-config'
import type { User } from '@/apis/agdevx-cart-api/models/user'
import { currentUserAtom } from '@/state/auth-atoms'

const AUTH_USER_STORAGE_KEY = 'authUser'

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
        if (response.ok) {
          const userData = await response.json()
          const user: User = {
            id: userData.userId,
            email: userData.email,
            displayName: userData.displayName,
            createdBy: null,
            createdDate: new Date().toISOString(),
            modifiedBy: null,
            modifiedDate: null,
          }
          setUser(user)
          localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
        } else {
          //== Cookie expired or invalid — clear local state
          setUser(null)
          localStorage.removeItem(AUTH_USER_STORAGE_KEY)
        }
      } catch {
        //== Network error — keep optimistic local state
      }
    }

    validateSession()
  }, [setUser])

  return <>{children}</>
}
