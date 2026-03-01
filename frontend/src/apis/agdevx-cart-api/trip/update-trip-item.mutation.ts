// ABOUTME: Mutation hook for updating trip item details
// ABOUTME: Sends PUT request with query params for quantity, notes, and storeId

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateTripItemRequest {
  tripItemId: string
  tripId: string
  quantity: number
  notes?: string | null
  storeId?: string | null
}

export const useUpdateTripItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: UpdateTripItemRequest): Promise<void> => {
      const { tripItemId, quantity, notes, storeId } = request
      const params = new URLSearchParams({
        quantity: quantity.toString(),
      })
      if (notes) params.append('notes', notes)
      if (storeId) params.append('storeId', storeId)

      const response = await apiFetch(`/api/tripitem/${tripItemId}?${params.toString()}`, {
        method: 'PUT',
      })
      if (!response.ok) {
        throw new Error('Failed to update trip item')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId, 'items'] })
    },
  })
}
