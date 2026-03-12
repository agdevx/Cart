// ABOUTME: Mutation hook for updating store name
// ABOUTME: Updates store and invalidates stores query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateStoreRequest {
  id: string
  name: string
  householdId?: string | null
}

export const useUpdateStoreMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['stores', 'update'],
    mutationFn: async (request: UpdateStoreRequest): Promise<void> => {
      const { id, ...updateData } = request
      await apiFetch(`/api/v1/store/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
