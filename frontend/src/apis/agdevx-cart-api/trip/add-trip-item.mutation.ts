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
      const { tripId, ...itemData } = request
      return apiFetch<TripItem>(`/api/trips/${tripId}/items`, {
        method: 'POST',
        body: JSON.stringify(itemData),
        token,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId] })
    },
  })
}
