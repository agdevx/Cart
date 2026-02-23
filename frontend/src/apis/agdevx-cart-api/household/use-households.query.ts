// ABOUTME: Query hook for fetching user's households
// ABOUTME: Returns list of households user belongs to

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Household } from '../models/household'

export const useHouseholdsQuery = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['households'],
    queryFn: async (): Promise<Household[]> => {
      const response = await apiFetch('/api/household');
      if (!response.ok) {
        throw new Error('Failed to fetch households');
      }
      return response.json();
    },
    enabled: isAuthenticated,
  })
}
