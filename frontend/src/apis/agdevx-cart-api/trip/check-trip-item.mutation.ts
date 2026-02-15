// ABOUTME: Mutation hook for checking/unchecking trip items
// ABOUTME: Updates checked status of trip item and invalidates trip cache

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { TripItem } from '../models/trip-item'
import { useAuth } from '@/auth/use-auth'

interface CheckTripItemRequest {
  tripId: string
  tripItemId: string
  isChecked: boolean
}

export const useCheckTripItemMutation = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CheckTripItemRequest): Promise<TripItem> => {
      const { tripItemId, isChecked } = request
      const endpoint = isChecked ? 'check' : 'uncheck'
      const response = await apiFetch(`/api/tripitem/${tripItemId}/${endpoint}`, {
        method: 'POST',
        token,
      })
      if (!response.ok) {
        throw new Error('Failed to check trip item')
      }
      return response.json() as Promise<TripItem>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId] })
    },
  })
}
