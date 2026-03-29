// ABOUTME: Tests for API configuration and base fetch wrapper
// ABOUTME: Verifies cookie-based auth via credentials: 'include' and proper request handling

import { beforeEach,describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api-error';

import { apiFetch } from './agdevx-cart-api-config';

describe('apiFetch', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should include credentials for cookie-based auth', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch('/test-endpoint', { method: 'GET' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({
        credentials: 'include',
      })
    );
  });

  it('should not include Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch('/test-endpoint', { method: 'GET' });

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers).not.toHaveProperty('Authorization');
  });

  it('should set Content-Type to application/json when body is present', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch('/test-endpoint', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should merge custom headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch(
      '/test-endpoint',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: 'value' }),
      }
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should construct full URL from endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch('/test-endpoint', { method: 'GET' });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/test-endpoint');
  });

  it('should abort request after 15 second timeout', async () => {
    vi.useFakeTimers();

    const mockFetch = vi.fn().mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );
    globalThis.fetch = mockFetch;

    const fetchPromise = apiFetch('/slow-endpoint', { method: 'GET' });

    vi.advanceTimersByTime(15000);

    await expect(fetchPromise).rejects.toThrow('Request timed out');

    vi.useRealTimers();
  });

  it('should clean up timeout on successful response', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch('/test-endpoint', { method: 'GET' });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it('should throw ApiError when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Resource not found' }),
    })

    await expect(apiFetch('/test-endpoint')).rejects.toThrow(ApiError)
    await expect(apiFetch('/test-endpoint')).rejects.toMatchObject({
      status: 404,
      statusText: 'Not Found',
      body: { message: 'Resource not found' },
    })
  })

  it('should handle non-JSON error responses gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new SyntaxError('Unexpected token') },
    })

    await expect(apiFetch('/test-endpoint')).rejects.toThrow(ApiError)
    await expect(apiFetch('/test-endpoint')).rejects.toMatchObject({
      status: 500,
      body: null,
    })
  })

  it('should prepend VITE_API_BASE_URL to endpoint', async () => {
    const originalEnv = import.meta.env.VITE_API_BASE_URL;
    import.meta.env.VITE_API_BASE_URL = '/cart/api';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch('/api/v1/items', { method: 'GET' });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe('/cart/api/api/v1/items');

    import.meta.env.VITE_API_BASE_URL = originalEnv;
  });

  it('should work with empty VITE_API_BASE_URL', async () => {
    const originalEnv = import.meta.env.VITE_API_BASE_URL;
    import.meta.env.VITE_API_BASE_URL = '';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch('/api/v1/items', { method: 'GET' });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe('/api/v1/items');

    import.meta.env.VITE_API_BASE_URL = originalEnv;
  });

  it('should return Response normally when response is ok', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    }
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse)

    const result = await apiFetch('/test-endpoint')
    expect(result.ok).toBe(true)
  })
});
