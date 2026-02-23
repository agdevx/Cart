// ABOUTME: Global household state atoms using Jotai with localStorage persistence
// ABOUTME: Manages selected household ID with automatic localStorage sync

import { atom } from 'jotai';

const STORAGE_KEY = 'selectedHouseholdId';

/**
 * Base atom for selected household ID with lazy initialization
 */
const baseSelectedHouseholdIdAtom = atom<string | null | undefined>(undefined);

/**
 * Atom storing the currently selected household ID with localStorage persistence
 * Automatically saves to and loads from localStorage
 */
export const selectedHouseholdIdAtom = atom(
  (get) => {
    const value = get(baseSelectedHouseholdIdAtom);

    // Lazy load from localStorage on first access
    if (value === undefined) {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(STORAGE_KEY);
    }

    return value;
  },
  (_get, set, newValue: string | null) => {
    set(baseSelectedHouseholdIdAtom, newValue);

    if (typeof window !== 'undefined') {
      if (newValue === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, newValue);
      }
    }
  }
);
