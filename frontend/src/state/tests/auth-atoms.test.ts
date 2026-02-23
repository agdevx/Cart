// ABOUTME: Tests for authentication state atoms
// ABOUTME: Verifies currentUserAtom behavior

import { createStore } from 'jotai';
import { describe, expect,it } from 'vitest';

import type { User } from '@/apis/agdevx-cart-api/models/user';

import { currentUserAtom } from '../auth-atoms';

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
});
