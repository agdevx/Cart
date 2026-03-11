// ABOUTME: Mutation hook for deleting stores
// ABOUTME: Deletes store and invalidates stores query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export const useDeleteStoreMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['stores', 'delete'],
    mutationFn: async (id: string): Promise<void> => {
      await apiFetch(`/api/store/${id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
