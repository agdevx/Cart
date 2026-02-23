// ABOUTME: Tests for household state atoms with localStorage persistence
// ABOUTME: Verifies selectedHouseholdIdAtom behavior and localStorage sync

import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { selectedHouseholdIdAtom } from '../household-atoms';

describe('household-atoms', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Create a mock localStorage
    localStorageMock = {};

    globalThis.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    } as Storage;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('selectedHouseholdIdAtom', () => {
    it('should have null as initial value when localStorage is empty', () => {
      const store = createStore();
      const value = store.get(selectedHouseholdIdAtom);

      expect(value).toBeNull();
    });

    it('should load initial value from localStorage if available', () => {
      localStorageMock['selectedHouseholdId'] = 'household-123';

      const store = createStore();
      const value = store.get(selectedHouseholdIdAtom);

      expect(value).toBe('household-123');
    });

    it('should persist value to localStorage when set', () => {
      const store = createStore();
      store.set(selectedHouseholdIdAtom, 'household-456');

      expect(localStorageMock['selectedHouseholdId']).toBe('household-456');
    });

    it('should remove from localStorage when set to null', () => {
      const store = createStore();
      store.set(selectedHouseholdIdAtom, 'household-789');
      store.set(selectedHouseholdIdAtom, null);

      expect(localStorageMock['selectedHouseholdId']).toBeUndefined();
    });

    it('should update value correctly', () => {
      const store = createStore();
      store.set(selectedHouseholdIdAtom, 'household-111');

      let value = store.get(selectedHouseholdIdAtom);
      expect(value).toBe('household-111');

      store.set(selectedHouseholdIdAtom, 'household-222');
      value = store.get(selectedHouseholdIdAtom);
      expect(value).toBe('household-222');
    });
  });
});
