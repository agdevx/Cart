// ABOUTME: useAuth hook for managing authentication state
// ABOUTME: Provides methods to set/clear auth state and persist token to localStorage

import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { currentUserAtom, authTokenAtom } from '@/state/auth-atoms';
import type { User } from '@/apis/agdevx-cart-api/models/user';

const AUTH_TOKEN_STORAGE_KEY = 'authToken';
const AUTH_USER_STORAGE_KEY = 'authUser';

/**
 * Hook for managing authentication state
 * @returns Auth state and methods for login/logout
 */
export function useAuth() {
  const [user, setUser] = useAtom(currentUserAtom);
  const [token, setTokenAtom] = useAtom(authTokenAtom);

  /**
   * Sets the authenticated user and token
   * Persists both to localStorage
   */
  const setAuth = useCallback((user: User, token: string) => {
    setUser(user);
    setTokenAtom(token);

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    }
  }, [setUser, setTokenAtom]);

  /**
   * Clears the authenticated user and token
   * Removes both from localStorage
   */
  const logout = useCallback(() => {
    setUser(null);
    setTokenAtom(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  }, [setUser, setTokenAtom]);

  return {
    user,
    token,
    isAuthenticated: user !== null,
    setAuth,
    logout,
  };
}
