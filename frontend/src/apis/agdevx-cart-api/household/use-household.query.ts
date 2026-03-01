// ABOUTME: Query hook for fetching a single household by ID
// ABOUTME: Returns household details including name for display and editing

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Household } from '../models/household'

export const useHouseholdQuery = (householdId: string) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['household', householdId],
    queryFn: async (): Promise<Household> => {
      const response = await apiFetch(`/api/household/${householdId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch household')
      }
      return response.json()
    },
    enabled: isAuthenticated && !!householdId,
  })
}
