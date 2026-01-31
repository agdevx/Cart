// ABOUTME: Mutation hook for creating household
// ABOUTME: Creates new household and returns it with invite code

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { Household } from '../models/household'
import { useAuth } from '@/auth/use-auth'

interface CreateHouseholdRequest {
  name: string
}

export const useCreateHouseholdMutation = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateHouseholdRequest): Promise<Household> => {
      return apiFetch<Household>('/api/households', {
        method: 'POST',
        body: JSON.stringify(request),
        token,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
    },
  })
}
