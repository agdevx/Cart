// ABOUTME: Global authentication state atoms using Jotai
// ABOUTME: Manages current user state, initialized from localStorage by AuthProvider

import { atom } from 'jotai';

import type { User } from '@/apis/agdevx-cart-api/models/user';

const AUTH_USER_STORAGE_KEY = 'authUser';

//== Synchronously restore user from localStorage so ProtectedRoute
//== doesn't redirect to /login on the first render before useEffect fires
const getInitialUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
};

/**
 * Atom storing the currently authenticated user
 * Initialized from localStorage for fast render, validated by AuthProvider on mount
 */
export const currentUserAtom = atom<User | null>(getInitialUser());
