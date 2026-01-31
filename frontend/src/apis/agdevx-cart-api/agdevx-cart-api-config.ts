// ABOUTME: API configuration and base fetch wrapper for AGDevX Cart API
// ABOUTME: Provides authenticated request handling with automatic token injection

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Base fetch wrapper that adds authentication token to requests
 * @param endpoint - API endpoint path (e.g., '/api/users')
 * @param options - Fetch options (method, headers, body, etc.)
 * @param token - Optional JWT token for authentication
 * @returns Promise resolving to the fetch Response
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<Response> {
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}
