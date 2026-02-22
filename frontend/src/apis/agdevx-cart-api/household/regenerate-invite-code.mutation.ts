// ABOUTME: Mutation hook for regenerating household invite code
// ABOUTME: Allows owner to generate a new invite code, invalidating the old one

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import { useAuth } from '@/auth/use-auth'

export const useRegenerateInviteCodeMutation = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string): Promise<string> => {
      const response = await apiFetch(
        `/api/household/${householdId}/invite-code`,
        { method: 'POST', token }
      )
      if (!response.ok) {
        throw new Error('Failed to regenerate invite code')
      }
      const data = await response.json()
      return data.inviteCode
    },
    onSuccess: (_data, householdId) => {
      queryClient.invalidateQueries({ queryKey: ['household', householdId, 'invite-code'] })
    },
  })
}
