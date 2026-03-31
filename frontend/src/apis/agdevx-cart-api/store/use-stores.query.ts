// ABOUTME: Query hook for fetching all stores (personal + household)
// ABOUTME: Combines personal stores with household stores from the user's household

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Store } from '../models/store'

export const useStoresQuery = (householdId: string | null) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['stores', householdId],
    queryFn: async (): Promise<Store[]> => {
      const requests = [apiFetch('/api/v1/store/personal')]

      if (householdId) {
        requests.push(apiFetch(`/api/v1/store/household/${householdId}`))
      }

      const responses = await Promise.all(requests)

      const allStores: Store[] = []
      for (const response of responses) {
        const stores: Store[] = await response.json()
        allStores.push(...stores)
      }
      return allStores
    },
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  })
}
