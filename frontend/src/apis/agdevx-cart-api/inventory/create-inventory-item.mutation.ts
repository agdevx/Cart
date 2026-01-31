// ABOUTME: Mutation hook for creating inventory items
// ABOUTME: Creates household or personal inventory item and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'
import { useAuth } from '@/auth/use-auth'

interface CreateInventoryItemRequest {
  name: string
  defaultStoreId?: string | null
  notes?: string | null
  householdId?: string | null
}

export const useCreateInventoryItemMutation = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateInventoryItemRequest): Promise<InventoryItem> => {
      return apiFetch<InventoryItem>('/api/inventory', {
        method: 'POST',
        body: JSON.stringify(request),
        token,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
