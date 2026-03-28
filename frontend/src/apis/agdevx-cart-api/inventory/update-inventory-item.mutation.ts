// ABOUTME: Mutation hook for updating inventory items
// ABOUTME: Updates existing inventory item and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

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
    mutationFn: async (request: UpdateInventoryItemRequest): Promise<void> => {
      const { id, ...updateData } = request
      await apiFetch(`/api/v1/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
