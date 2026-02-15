// ABOUTME: Global authentication state atoms using Jotai
// ABOUTME: Manages current user and authentication token state

import { atom } from 'jotai';
import type { User } from '@/apis/agdevx-cart-api/models/user';

const AUTH_TOKEN_STORAGE_KEY = 'authToken';
const AUTH_USER_STORAGE_KEY = 'authUser';

/**
 * Load initial auth state from localStorage
 */
function loadAuthFromStorage(): { user: User | null; token: string | null } {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }

  try {
    const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);

    if (storedToken && storedUser) {
      return {
        token: storedToken,
        user: JSON.parse(storedUser)
      };
    }
  } catch {
    // Invalid stored data, ignore
  }

  return { user: null, token: null };
}

const initialAuth = loadAuthFromStorage();

/**
 * Atom storing the currently authenticated user
 * Initialized from localStorage if available
 */
export const currentUserAtom = atom<User | null>(initialAuth.user);

/**
 * Atom storing the JWT authentication token
 * Initialized from localStorage if available
 */
export const authTokenAtom = atom<string | null>(initialAuth.token);
