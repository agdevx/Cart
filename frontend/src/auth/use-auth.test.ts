// ABOUTME: Tests for useAuth hook
// ABOUTME: Verifies authentication hook behavior including setAuth, logout, and localStorage

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { Provider } from 'jotai';
import { useAuth } from './use-auth';
import type { User } from '@/apis/agdevx-cart-api/models/user';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(Provider, {}, children);

describe('useAuth', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock localStorage
    localStorageMock = {};

    global.localStorage = {
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

  it('should initialize with no user and no token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set user and token when setAuth is called', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdBy: null,
      createdDate: '2024-01-01T00:00:00Z',
      modifiedBy: null,
      modifiedDate: null,
    };

    act(() => {
      result.current.setAuth(mockUser, 'test-token-123');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('test-token-123');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should persist token to localStorage when setAuth is called', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdBy: null,
      createdDate: '2024-01-01T00:00:00Z',
      modifiedBy: null,
      modifiedDate: null,
    };

    act(() => {
      result.current.setAuth(mockUser, 'test-token-123');
    });

    expect(localStorageMock['authToken']).toBe('test-token-123');
  });

  it('should clear user and token when logout is called', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdBy: null,
      createdDate: '2024-01-01T00:00:00Z',
      modifiedBy: null,
      modifiedDate: null,
    };

    act(() => {
      result.current.setAuth(mockUser, 'test-token-123');
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should remove token from localStorage when logout is called', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdBy: null,
      createdDate: '2024-01-01T00:00:00Z',
      modifiedBy: null,
      modifiedDate: null,
    };

    act(() => {
      result.current.setAuth(mockUser, 'test-token-123');
    });

    act(() => {
      result.current.logout();
    });

    expect(localStorageMock['authToken']).toBeUndefined();
  });

  it('should load token from localStorage on initialization', () => {
    localStorageMock['authToken'] = 'stored-token-456';

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.token).toBe('stored-token-456');
  });
});
