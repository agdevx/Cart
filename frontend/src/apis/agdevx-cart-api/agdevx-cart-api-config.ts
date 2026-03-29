// ABOUTME: API configuration and base fetch wrapper for AGDevX Cart API
// ABOUTME: Provides request handling with automatic cookie-based authentication via credentials: 'include'

import { ApiError } from '../api-error'

const REQUEST_TIMEOUT_MS = 15_000;
function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '';
}

/**
 * Base fetch wrapper that includes credentials for cookie-based auth
 * @param endpoint - API endpoint path (e.g., '/api/users')
 * @param options - Standard fetch options (method, headers, body, etc.)
 * @returns Promise resolving to the fetch Response
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {};

  // Copy existing headers if they exist
  if (options.headers) {
    const existingHeaders = options.headers;
    if (existingHeaders instanceof Headers) {
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(existingHeaders)) {
      existingHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.entries(existingHeaders).forEach(([key, value]) => {
        headers[key] = value;
      });
    }
  }

  // Set Content-Type to application/json if body is present and Content-Type not already set
  if (options.body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });

    if (!response.ok) {
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        // Response body is not JSON — leave body as null
      }
      throw new ApiError(response.status, response.statusText, body)
    }

    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
