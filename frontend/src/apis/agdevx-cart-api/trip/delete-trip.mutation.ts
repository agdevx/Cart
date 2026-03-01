// ABOUTME: Mutation hook for deleting trips
// ABOUTME: Sends DELETE request and invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export const useDeleteTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tripId: string): Promise<void> => {
      const response = await apiFetch(`/api/trip/${tripId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete trip')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
