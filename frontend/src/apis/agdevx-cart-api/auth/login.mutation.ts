// ABOUTME: Login mutation hook using Tanstack Query
// ABOUTME: Handles user authentication via API and returns tokens and user data

import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '../agdevx-cart-api-config';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  email: string;
  displayName: string;
}

/**
 * Performs login API request
 * @param credentials - User email and password
 * @returns Promise resolving to login response with tokens and user data
 */
async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
}

/**
 * React hook for login mutation
 * @returns Mutation object for triggering login and managing its state
 */
export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
  });
}
