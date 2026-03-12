// ABOUTME: Mutation hook for reopening completed trips
// ABOUTME: Sends POST request to reopen a trip and invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'

export const useReopenTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trips', 'reopen'],
    mutationFn: async (tripId: string): Promise<Trip> => {
      const response = await apiFetch(`/api/v1/trip/${tripId}/reopen`, {
        method: 'POST',
      })
      return response.json() as Promise<Trip>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
