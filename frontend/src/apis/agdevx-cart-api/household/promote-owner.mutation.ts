// ABOUTME: Mutation hook for promoting a household member to co-owner
// ABOUTME: Sets a member as owner2 and invalidates household + members queries

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface PromoteOwnerRequest {
  householdId: string
  userId: string
}

export const usePromoteOwnerMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['household', 'promote-owner'],
    mutationFn: async (request: PromoteOwnerRequest): Promise<void> => {
      await apiFetch(
        `/api/v1/household/${request.householdId}/owner/promote`,
        {
          method: 'PUT',
          body: JSON.stringify({ userId: request.userId }),
        }
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['household'] })
      queryClient.invalidateQueries({ queryKey: ['household', variables.householdId, 'members'] })
    },
  })
}
