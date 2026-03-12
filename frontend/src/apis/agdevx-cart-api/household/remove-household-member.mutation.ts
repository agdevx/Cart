// ABOUTME: Mutation hook for removing a household member
// ABOUTME: Allows owner to remove members or members to leave

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface RemoveMemberRequest {
  householdId: string
  userId: string
}

export const useRemoveHouseholdMemberMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['households', 'remove-member'],
    mutationFn: async (request: RemoveMemberRequest): Promise<void> => {
      await apiFetch(
        `/api/v1/household/${request.householdId}/members/${request.userId}`,
        { method: 'DELETE' }
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['household', variables.householdId, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['households'] })
    },
  })
}
