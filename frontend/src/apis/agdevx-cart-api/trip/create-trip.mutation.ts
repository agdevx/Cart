// ABOUTME: Mutation hook for creating trips
// ABOUTME: Creates household or personal trip and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'

interface CreateTripRequest {
  name: string
  householdId?: string | null
}

export const useCreateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateTripRequest): Promise<Trip> => {
      const response = await apiFetch('/api/trip', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      if (!response.ok) {
        throw new Error('Failed to create trip')
      }
      return response.json() as Promise<Trip>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
