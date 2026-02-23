// ABOUTME: Mutation hook for creating household
// ABOUTME: Creates new household and returns it with invite code

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Household } from '../models/household'

interface CreateHouseholdRequest {
  name: string
}

export const useCreateHouseholdMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateHouseholdRequest): Promise<Household> => {
      const response = await apiFetch('/api/household', {
        method: 'POST',
        body: JSON.stringify(request.name),
      });
      if (!response.ok) {
        throw new Error('Failed to create household');
      }
      return response.json() as Promise<Household>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
    },
  })
}
