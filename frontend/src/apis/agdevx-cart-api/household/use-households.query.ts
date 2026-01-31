// ABOUTME: Query hook for fetching user's households
// ABOUTME: Returns list of households user belongs to

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { Household } from '../models/household'
import { useAuth } from '@/auth/use-auth'

export const useHouseholdsQuery = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['households'],
    queryFn: async (): Promise<Household[]> => {
      return apiFetch<Household[]>('/api/households', { token })
    },
    enabled: !!token,
  })
}
