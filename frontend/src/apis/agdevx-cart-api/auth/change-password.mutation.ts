// ABOUTME: Change password mutation hook using Tanstack Query
// ABOUTME: Handles password changes with current password verification

import { useMutation } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await apiFetch('/api/auth/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

}

export function useChangePasswordMutation() {
  return useMutation({
    mutationKey: ['auth', 'change-password'],
    mutationFn: changePassword,
  })
}
