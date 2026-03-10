// ABOUTME: Change password mutation hook using Tanstack Query
// ABOUTME: Handles password changes with current password verification

import { useMutation } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

async function changePassword(request: ChangePasswordRequest): Promise<void> {
  const response = await apiFetch('/api/auth/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Password change failed')
  }
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: changePassword,
  })
}
