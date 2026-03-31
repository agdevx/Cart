// ABOUTME: Mutation hook for demoting a household co-owner to regular member
// ABOUTME: Removes owner2 status and invalidates household + members queries

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface DemoteOwnerRequest {
  householdId: string
  userId: string
}

export const useDemoteOwnerMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['household', 'demote-owner'],
    mutationFn: async (request: DemoteOwnerRequest): Promise<void> => {
      await apiFetch(
        `/api/v1/household/${request.householdId}/owner/demote`,
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
