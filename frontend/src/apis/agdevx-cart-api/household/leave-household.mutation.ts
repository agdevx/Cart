// ABOUTME: Mutation hook for leaving the current household
// ABOUTME: Removes the user from their household and invalidates household queries

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export const useLeaveHouseholdMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['household', 'leave'],
    mutationFn: async (): Promise<void> => {
      await apiFetch('/api/v1/household/leave', {
        method: 'POST',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}
