// ABOUTME: Mutation hook for transferring household ownership
// ABOUTME: Allows current owner to transfer ownership to another member

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import { useAuth } from '@/auth/use-auth'

interface TransferOwnershipRequest {
  householdId: string
  userId: string
}

export const useTransferHouseholdOwnershipMutation = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: TransferOwnershipRequest): Promise<void> => {
      const response = await apiFetch(
        `/api/household/${request.householdId}/owner`,
        {
          method: 'PUT',
          body: JSON.stringify({ userId: request.userId }),
          token,
        }
      )
      if (!response.ok) {
        throw new Error('Failed to transfer ownership')
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['household', variables.householdId, 'members'] })
    },
  })
}
