// ABOUTME: Mutation hook for completing trips
// ABOUTME: Marks trip as completed and invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'
import { useAuth } from '@/auth/use-auth'

export const useCompleteTripMutation = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tripId: string): Promise<Trip> => {
      return apiFetch<Trip>(`/api/trip/${tripId}/complete`, {
        method: 'POST',
        token,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
