// ABOUTME: Mutation hook for creating trips
// ABOUTME: Creates a trip and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'

interface CreateTripRequest {
  name: string
  tripDate?: string | null
}

export const useCreateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trips', 'create'],
    mutationFn: async (request: CreateTripRequest): Promise<Trip> => {
      const response = await apiFetch('/api/v1/trip', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      return response.json() as Promise<Trip>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
