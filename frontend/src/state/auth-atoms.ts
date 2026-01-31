// ABOUTME: Global authentication state atoms using Jotai
// ABOUTME: Manages current user and authentication token state

import { atom } from 'jotai';
import type { User } from '@/apis/agdevx-cart-api/models/user';

/**
 * Atom storing the currently authenticated user
 * Null when no user is logged in
 */
export const currentUserAtom = atom<User | null>(null);

/**
 * Atom storing the JWT authentication token
 * Null when no user is logged in
 */
export const authTokenAtom = atom<string | null>(null);
