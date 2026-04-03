// ABOUTME: Query hook for fetching the current user's household
// ABOUTME: Returns single household or null in the single-household model

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Household } from '../models/household'

export const useHouseholdQuery = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['household'],
    queryFn: async (): Promise<Household | null> => {
      const response = await apiFetch('/api/v1/household')
      if (response.status === 204) return null
      return response.json()
    },
    enabled: isAuthenticated,
  })
}
