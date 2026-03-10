// ABOUTME: Update profile mutation hook using Tanstack Query
// ABOUTME: Handles name and email updates, with optional password for email changes

import { useMutation } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export interface UpdateProfileRequest {
  name: string
  email: string
  currentPassword?: string
}

export interface UpdateProfileResponse {
  userId: string
  email: string
  name: string
}

async function updateProfile(request: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  const response = await apiFetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Profile update failed')
  }

  return response.json()
}

export function useUpdateProfileMutation() {
  return useMutation({
    mutationFn: updateProfile,
  })
}
