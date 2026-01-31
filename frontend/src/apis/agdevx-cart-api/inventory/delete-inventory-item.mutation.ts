// ABOUTME: Mutation hook for deleting inventory items
// ABOUTME: Deletes inventory item and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import { useAuth } from '@/auth/use-auth'

export const useDeleteInventoryItemMutation = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return apiFetch<void>(`/api/inventory/${id}`, {
        method: 'DELETE',
        token,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
