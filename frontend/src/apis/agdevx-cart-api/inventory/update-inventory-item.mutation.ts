// ABOUTME: Mutation hook for updating inventory items
// ABOUTME: Updates existing inventory item and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'

interface UpdateInventoryItemRequest {
  id: string
  name?: string
  defaultStoreId?: string | null
  notes?: string | null
  householdId?: string | null
  ownerUserId?: string | null
}

export const useUpdateInventoryItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['inventory', 'update'],
    mutationFn: async (request: UpdateInventoryItemRequest): Promise<InventoryItem> => {
      const { id, ...updateData } = request
      const response = await apiFetch(`/api/v1/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      return response.json() as Promise<InventoryItem>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
