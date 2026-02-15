// ABOUTME: API configuration and base fetch wrapper for AGDevX Cart API
// ABOUTME: Provides authenticated request handling with automatic token injection

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Extended RequestInit with optional token field
 */
interface ApiFetchOptions extends RequestInit {
  token?: string;
}

/**
 * Base fetch wrapper that adds authentication token to requests
 * @param endpoint - API endpoint path (e.g., '/api/users')
 * @param options - Fetch options (method, headers, body, etc.) and optional token
 * @param tokenParam - Optional JWT token for authentication (for backwards compatibility)
 * @returns Promise resolving to the fetch Response
 */
export async function apiFetch(
  endpoint: string,
  options: ApiFetchOptions = {},
  tokenParam?: string
): Promise<Response> {
  // Extract token from options or use tokenParam
  const { token: tokenInOptions, ...fetchOptions } = options;
  const token = tokenInOptions || tokenParam;

  const headers: Record<string, string> = {};

  // Copy existing headers if they exist
  if (fetchOptions.headers) {
    const existingHeaders = fetchOptions.headers;
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

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set Content-Type to application/json if body is present and Content-Type not already set
  if (fetchOptions.body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...fetchOptions,
    headers,
  });
}
