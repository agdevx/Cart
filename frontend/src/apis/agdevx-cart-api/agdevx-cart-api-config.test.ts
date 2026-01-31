// ABOUTME: Tests for API configuration and base fetch wrapper
// ABOUTME: Verifies auth token injection and proper request handling

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from './agdevx-cart-api-config';

describe('apiFetch', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should add Authorization header when token is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    global.fetch = mockFetch;

    const token = 'test-token-123';
    await apiFetch('/test-endpoint', { method: 'GET' }, token);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
        }),
      })
    );
  });

  it('should not add Authorization header when token is not provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    global.fetch = mockFetch;

    await apiFetch('/test-endpoint', { method: 'GET' });

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers).not.toHaveProperty('Authorization');
  });

  it('should merge custom headers with auth header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    global.fetch = mockFetch;

    const token = 'test-token-123';
    await apiFetch(
      '/test-endpoint',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      token
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should construct full URL from API base and endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    global.fetch = mockFetch;

    await apiFetch('/test-endpoint', { method: 'GET' });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/test-endpoint');
  });
});
