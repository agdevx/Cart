// ABOUTME: Mutation hook for transferring household ownership
// ABOUTME: Allows current owner to transfer ownership to another member

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface TransferOwnershipRequest {
  householdId: string
  userId: string
}

export const useTransferHouseholdOwnershipMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['households', 'transfer-ownership'],
    mutationFn: async (request: TransferOwnershipRequest): Promise<void> => {
      await apiFetch(
        `/api/household/${request.householdId}/owner`,
        {
          method: 'PUT',
          body: JSON.stringify({ userId: request.userId }),
        }
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['household', variables.householdId, 'members'] })
    },
  })
}
