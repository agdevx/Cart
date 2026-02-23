// ABOUTME: Mutation hook for completing trips
// ABOUTME: Marks trip as completed and invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'

export const useCompleteTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tripId: string): Promise<Trip> => {
      const response = await apiFetch(`/api/trip/${tripId}/complete`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to complete trip')
      }
      return response.json() as Promise<Trip>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
