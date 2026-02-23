// ABOUTME: useAuth hook for managing authentication state
// ABOUTME: Provides methods to set/clear auth state and persist user to localStorage

import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/state/auth-atoms';
import type { User } from '@/apis/agdevx-cart-api/models/user';
import { apiFetch } from '@/apis/agdevx-cart-api/agdevx-cart-api-config';

const AUTH_USER_STORAGE_KEY = 'authUser';

/**
 * Hook for managing authentication state
 * @returns Auth state and methods for login/logout
 */
export function useAuth() {
  const [user, setUser] = useAtom(currentUserAtom);

  /**
   * Sets the authenticated user
   * Persists to localStorage for fast initial render
   */
  const setAuth = useCallback((user: User) => {
    setUser(user);

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    }
  }, [setUser]);

  /**
   * Clears the authenticated user and calls logout API to clear cookie
   * Removes user from localStorage
   */
  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort logout — clear local state regardless
    }

    setUser(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  }, [setUser]);

  return {
    user,
    isAuthenticated: user !== null,
    setAuth,
    logout,
  };
}
