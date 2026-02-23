// ABOUTME: Tests for useAuth hook
// ABOUTME: Verifies authentication hook behavior including setAuth, logout, and localStorage

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { Provider } from 'jotai';
import { useAuth } from './use-auth';
import { AuthProvider } from './auth-provider';
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

  it('should initialize with no user and not authenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set user when setAuth is called', () => {
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
      result.current.setAuth(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should persist user to localStorage when setAuth is called', () => {
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
      result.current.setAuth(mockUser);
    });

    expect(localStorageMock['authUser']).toBe(JSON.stringify(mockUser));
  });

  it('should clear user when logout is called', async () => {
    // Mock fetch for the logout API call
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

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
      result.current.setAuth(mockUser);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should remove user from localStorage when logout is called', async () => {
    // Mock fetch for the logout API call
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

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
      result.current.setAuth(mockUser);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(localStorageMock['authUser']).toBeUndefined();
  });

  it('should load user from localStorage on initialization', async () => {
    localStorageMock['authUser'] = JSON.stringify({
      id: '456',
      email: 'stored@example.com',
      displayName: 'Stored User',
      createdBy: null,
      createdDate: '2024-01-01T00:00:00Z',
      modifiedBy: null,
      modifiedDate: null,
    });

    // Mock fetch for the /api/auth/me validation call in AuthProvider
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: '456',
        email: 'stored@example.com',
        displayName: 'Stored User',
      }),
    }) as typeof fetch;

    // Use AuthProvider which loads from localStorage
    const wrapperWithAuthProvider = ({ children }: { children: React.ReactNode }) =>
      createElement(Provider, {},
        createElement(AuthProvider, {}, children)
      );

    const { result } = renderHook(() => useAuth(), { wrapper: wrapperWithAuthProvider });

    // Wait for useEffect in AuthProvider to run
    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    expect(result.current.user?.email).toBe('stored@example.com');
  });
});
