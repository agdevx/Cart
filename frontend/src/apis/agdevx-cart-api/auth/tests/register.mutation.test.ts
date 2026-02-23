// ABOUTME: Tests for registration mutation hook
// ABOUTME: Verifies API integration and response handling

import { createElement } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryClient } from '@/apis/tanstack-query/query-client';

import { useRegisterMutation } from '../register.mutation';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children);

describe('useRegisterMutation', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('should successfully register a user', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          userId: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User'
        })
      } as Response)
    ) as typeof fetch;

    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    const response = await result.current.mutateAsync({
      email: 'test@example.com',
      password: 'TestPass123',
      displayName: 'Test User'
    });

    expect(response.userId).toBe('test-user-id');
    expect(response.email).toBe('test@example.com');
    expect(response.displayName).toBe('Test User');
  });

  it('should call the correct API endpoint', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          userId: 'id',
          email: 'test@example.com',
          displayName: 'Test'
        })
      } as Response)
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    await result.current.mutateAsync({
      email: 'test@example.com',
      password: 'TestPass123',
      displayName: 'Test User'
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/register'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('test@example.com'),
        credentials: 'include',
      })
    );
  });

  it('should handle registration errors', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          errorCode: 'DUPLICATE_EMAIL',
          message: 'Email already exists'
        })
      } as Response)
    ) as typeof fetch;

    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    await expect(
      result.current.mutateAsync({
        email: 'existing@example.com',
        password: 'TestPass123',
        displayName: 'Test User'
      })
    ).rejects.toThrow();
  });
});
