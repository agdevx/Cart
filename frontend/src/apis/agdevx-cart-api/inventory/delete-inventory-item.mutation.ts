// ABOUTME: Mutation hook for deleting inventory items
// ABOUTME: Deletes inventory item and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export const useDeleteInventoryItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['inventory', 'delete'],
    mutationFn: async (id: string): Promise<void> => {
      await apiFetch(`/api/v1/inventory/${id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
