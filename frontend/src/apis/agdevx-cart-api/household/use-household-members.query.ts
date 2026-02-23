// ABOUTME: Query hook for fetching household members
// ABOUTME: Returns list of members with roles for a specific household

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { HouseholdMember } from '../models/household'

export const useHouseholdMembersQuery = (householdId: string) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['household', householdId, 'members'],
    queryFn: async (): Promise<HouseholdMember[]> => {
      const response = await apiFetch(`/api/household/${householdId}/members`)
      if (!response.ok) {
        throw new Error('Failed to fetch household members')
      }
      return response.json()
    },
    enabled: isAuthenticated && !!householdId,
  })
}
