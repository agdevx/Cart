// ABOUTME: Tests for API configuration and base fetch wrapper
// ABOUTME: Verifies cookie-based auth via credentials: 'include' and proper request handling

import { beforeEach,describe, expect, it, vi } from 'vitest';

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
});
