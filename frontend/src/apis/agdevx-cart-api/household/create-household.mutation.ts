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
    mutationKey: ['households', 'create'],
    meta: { handlesErrors: true },
    mutationFn: async (request: CreateHouseholdRequest): Promise<Household> => {
      const response = await apiFetch('/api/v1/household', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response.json() as Promise<Household>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}
