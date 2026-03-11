// ABOUTME: Mutation hook for starting a trip (transitioning from planning to in-progress)
// ABOUTME: Calls start endpoint and invalidates trip query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'

export const useStartTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trips', 'start'],
    mutationFn: async (tripId: string): Promise<Trip> => {
      const response = await apiFetch(`/api/trip/${tripId}/start`, {
        method: 'POST',
      })
      return response.json() as Promise<Trip>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
