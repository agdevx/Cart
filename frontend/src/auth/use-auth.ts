// ABOUTME: useAuth hook for managing authentication state
// ABOUTME: Provides methods to set/clear auth state and persist token to localStorage

import { useAtom } from 'jotai';
import { currentUserAtom, authTokenAtom } from '@/state/auth-atoms';
import type { User } from '@/apis/agdevx-cart-api/models/user';

const AUTH_TOKEN_STORAGE_KEY = 'authToken';

/**
 * Hook for managing authentication state
 * @returns Auth state and methods for login/logout
 */
export function useAuth() {
  const [user, setUser] = useAtom(currentUserAtom);
  const [token, setTokenAtom] = useAtom(authTokenAtom);

  // Initialize token from localStorage on first use
  if (token === null && typeof window !== 'undefined') {
    const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (storedToken) {
      setTokenAtom(storedToken);
    }
  }

  /**
   * Sets the authenticated user and token
   * Persists token to localStorage
   */
  const setAuth = (user: User, token: string) => {
    setUser(user);
    setTokenAtom(token);

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    }
  };

  /**
   * Clears the authenticated user and token
   * Removes token from localStorage
   */
  const logout = () => {
    setUser(null);
    setTokenAtom(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  };

  return {
    user,
    token,
    isAuthenticated: user !== null,
    setAuth,
    logout,
  };
}
