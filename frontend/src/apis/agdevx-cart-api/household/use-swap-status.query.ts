// ABOUTME: Query hook for fetching household swap status
// ABOUTME: Returns scenario and context for household leave/join decisions

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { SwapStatusResponse } from '../models/household'

export const useSwapStatusQuery = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['household', 'swap-status'],
    queryFn: async (): Promise<SwapStatusResponse> => {
      const response = await apiFetch('/api/v1/household/swap-status')
      return response.json()
    },
    enabled: isAuthenticated,
  })
}
