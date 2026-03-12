// ABOUTME: Query hook for fetching household invite code
// ABOUTME: Returns invite code for sharing with potential members

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'

export const useInviteCodeQuery = (householdId: string) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['household', householdId, 'invite-code'],
    queryFn: async (): Promise<string> => {
      const response = await apiFetch(`/api/v1/household/${householdId}/invite-code`)
      const data = await response.json()
      return data.inviteCode
    },
    enabled: isAuthenticated && !!householdId,
  })
}
