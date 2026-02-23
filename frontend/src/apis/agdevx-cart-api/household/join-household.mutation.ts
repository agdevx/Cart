// ABOUTME: Mutation hook for joining household via invite code
// ABOUTME: Adds user to household and returns household details

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Household } from '../models/household'

interface JoinHouseholdRequest {
  inviteCode: string
}

export const useJoinHouseholdMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: JoinHouseholdRequest): Promise<Household> => {
      const response = await apiFetch('/api/households/join', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      if (!response.ok) {
        throw new Error('Failed to join household')
      }
      return response.json() as Promise<Household>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
    },
  })
}
