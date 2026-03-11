// ABOUTME: Mutation hook for creating inventory items
// ABOUTME: Creates household or personal inventory item and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'

interface CreateInventoryItemRequest {
  name: string
  defaultStoreId?: string | null
  notes?: string | null
  householdId?: string | null
}

export const useCreateInventoryItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['inventory', 'create'],
    mutationFn: async (request: CreateInventoryItemRequest): Promise<InventoryItem> => {
      const response = await apiFetch('/api/inventory', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      return response.json() as Promise<InventoryItem>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
