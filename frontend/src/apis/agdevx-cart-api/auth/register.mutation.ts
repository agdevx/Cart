// ABOUTME: Registration mutation hook using Tanstack Query
// ABOUTME: Handles user registration via API and returns tokens and user data

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../agdevx-cart-api-config';

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  displayName: string;
}

/**
 * Performs registration API request
 * @param credentials - User email, password, and display name
 * @returns Promise resolving to registration response with tokens and user data
 */
async function register(credentials: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiFetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
}

/**
 * React hook for registration mutation
 * @returns Mutation object for triggering registration and managing its state
 */
export function useRegisterMutation() {
  return useMutation({
    mutationFn: register,
  });
}
