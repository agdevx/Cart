// ABOUTME: Mutation hook for deleting trip items
// ABOUTME: Sends DELETE request and invalidates trip items cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface DeleteTripItemRequest {
  tripItemId: string
  tripId: string
}

export const useDeleteTripItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: DeleteTripItemRequest): Promise<void> => {
      const { tripItemId } = request
      const response = await apiFetch(`/api/tripitem/${tripItemId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete trip item')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId, 'items'] })
    },
  })
}
