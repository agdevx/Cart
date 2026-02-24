// ABOUTME: Mutation hook for creating stores
// ABOUTME: Creates household or personal store and invalidates stores query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Store } from '../models/store'

interface CreateStoreRequest {
  name: string
  householdId?: string | null
}

export const useCreateStoreMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateStoreRequest): Promise<Store> => {
      const response = await apiFetch('/api/store', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      if (!response.ok) {
        throw new Error('Failed to create store')
      }
      return response.json() as Promise<Store>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
