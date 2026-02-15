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

  const headers: HeadersInit = {
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...fetchOptions,
    headers,
  });
}
