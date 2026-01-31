// ABOUTME: Mutation hook for creating trips
// ABOUTME: Creates household or personal trip and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'
import { useAuth } from '@/auth/use-auth'

interface CreateTripRequest {
  name: string
  householdId?: string | null
}

export const useCreateTripMutation = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateTripRequest): Promise<Trip> => {
      return apiFetch<Trip>('/api/trips', {
        method: 'POST',
        body: JSON.stringify(request),
        token,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
