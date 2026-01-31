// ABOUTME: Tests for authentication state atoms
// ABOUTME: Verifies currentUserAtom and authTokenAtom behavior

import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { currentUserAtom, authTokenAtom } from './auth-atoms';
import type { User } from '@/apis/agdevx-cart-api/models/user';

describe('auth-atoms', () => {
  describe('currentUserAtom', () => {
    it('should have null as initial value', () => {
      const store = createStore();
      const value = store.get(currentUserAtom);

      expect(value).toBeNull();
    });

    it('should allow setting a user', () => {
      const store = createStore();
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        createdBy: null,
        createdDate: '2024-01-01T00:00:00Z',
        modifiedBy: null,
        modifiedDate: null,
      };

      store.set(currentUserAtom, mockUser);
      const value = store.get(currentUserAtom);

      expect(value).toEqual(mockUser);
    });

    it('should allow setting back to null', () => {
      const store = createStore();
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        createdBy: null,
        createdDate: '2024-01-01T00:00:00Z',
        modifiedBy: null,
        modifiedDate: null,
      };

      store.set(currentUserAtom, mockUser);
      store.set(currentUserAtom, null);
      const value = store.get(currentUserAtom);

      expect(value).toBeNull();
    });
  });

  describe('authTokenAtom', () => {
    it('should have null as initial value', () => {
      const store = createStore();
      const value = store.get(authTokenAtom);

      expect(value).toBeNull();
    });

    it('should allow setting a token', () => {
      const store = createStore();
      const token = 'test-token-123';

      store.set(authTokenAtom, token);
      const value = store.get(authTokenAtom);

      expect(value).toBe(token);
    });

    it('should allow setting back to null', () => {
      const store = createStore();
      const token = 'test-token-123';

      store.set(authTokenAtom, token);
      store.set(authTokenAtom, null);
      const value = store.get(authTokenAtom);

      expect(value).toBeNull();
    });
  });
});
