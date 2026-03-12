// ABOUTME: Mutation hook for adding items to a trip
// ABOUTME: Adds inventory item to trip with quantity and invalidates trip cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { TripItem } from '../models/trip-item'

interface AddTripItemRequest {
  tripId: string
  inventoryItemId: string
  quantity: number
  storeId?: string | null
  notes?: string | null
}

export const useAddTripItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trip-items', 'add'],
    mutationFn: async (request: AddTripItemRequest): Promise<TripItem> => {
      const { tripId, inventoryItemId, quantity, storeId, notes } = request
      const response = await apiFetch(`/api/v1/tripitem/trip/${tripId}`, {
        method: 'POST',
        body: JSON.stringify({ inventoryItemId, quantity, storeId, notes }),
      })
      return response.json() as Promise<TripItem>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId] })
    },
  })
}
