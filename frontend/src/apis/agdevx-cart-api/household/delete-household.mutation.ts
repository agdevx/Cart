// ABOUTME: Mutation hook for deleting a household
// ABOUTME: Owner-only operation that removes the household entirely

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

export const useDeleteHouseholdMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string): Promise<void> => {
      const response = await apiFetch(`/api/household/${householdId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete household')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
    },
  })
}
