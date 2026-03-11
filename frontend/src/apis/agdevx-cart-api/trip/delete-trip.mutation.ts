// ABOUTME: Mutation hook for deleting trips
// ABOUTME: Sends DELETE request and invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export const useDeleteTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trips', 'delete'],
    mutationFn: async (tripId: string): Promise<void> => {
      await apiFetch(`/api/trip/${tripId}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
