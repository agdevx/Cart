// ABOUTME: Global authentication state atoms using Jotai
// ABOUTME: Manages current user state, initialized from localStorage by AuthProvider

import { atom } from 'jotai';
import type { User } from '@/apis/agdevx-cart-api/models/user';

/**
 * Atom storing the currently authenticated user
 * Should be initialized by AuthProvider on mount
 */
export const currentUserAtom = atom<User | null>(null);
