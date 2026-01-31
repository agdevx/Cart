// ABOUTME: Mutation hook for adding items to a trip
// ABOUTME: Adds inventory item to trip with quantity and invalidates trip cache

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { TripItem } from '../models/trip-item'
import { useAuth } from '@/auth/use-auth'

interface AddTripItemRequest {
  tripId: string
  inventoryItemId: string
  quantity: number
  storeId?: string | null
  notes?: string | null
}

export const useAddTripItemMutation = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: AddTripItemRequest): Promise<TripItem> => {
      const { tripId, inventoryItemId, quantity, storeId, notes } = request
      const params = new URLSearchParams({
        tripId,
        inventoryItemId,
        quantity: quantity.toString(),
      })
      if (storeId) params.append('storeId', storeId)
      if (notes) params.append('notes', notes)

      return apiFetch<TripItem>(`/api/tripitem?${params.toString()}`, {
        method: 'POST',
        token,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId] })
    },
  })
}
