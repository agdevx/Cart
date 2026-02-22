// ABOUTME: Mutation hook for updating inventory items
// ABOUTME: Updates existing inventory item and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'
import { useAuth } from '@/auth/use-auth'

interface UpdateInventoryItemRequest {
  id: string
  name?: string
  defaultStoreId?: string | null
  notes?: string | null
}

export const useUpdateInventoryItemMutation = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: UpdateInventoryItemRequest): Promise<InventoryItem> => {
      const { id, ...updateData } = request
      const response = await apiFetch(`/api/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        token,
      })
      if (!response.ok) {
        throw new Error('Failed to update inventory item')
      }
      return response.json() as Promise<InventoryItem>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
