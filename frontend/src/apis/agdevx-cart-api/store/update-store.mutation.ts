// ABOUTME: Mutation hook for updating store name
// ABOUTME: Updates store and invalidates stores query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateStoreRequest {
  id: string
  name: string
}

export const useUpdateStoreMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: UpdateStoreRequest): Promise<void> => {
      const { id, ...updateData } = request
      const response = await apiFetch(`/api/store/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      if (!response.ok) {
        throw new Error('Failed to update store')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
