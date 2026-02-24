// ABOUTME: Query hook for fetching all stores (personal + household)
// ABOUTME: Combines personal stores with household stores from all provided household IDs

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Store } from '../models/store'

export const useStoresQuery = (householdIds: string[]) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['stores', householdIds],
    queryFn: async (): Promise<Store[]> => {
      const responses = await Promise.all([
        apiFetch('/api/store/personal'),
        ...householdIds.map((id) => apiFetch(`/api/store/household/${id}`)),
      ])

      const allStores: Store[] = []
      for (const response of responses) {
        if (!response.ok) {
          throw new Error('Failed to fetch stores')
        }
        const stores: Store[] = await response.json()
        allStores.push(...stores)
      }
      return allStores
    },
    enabled: isAuthenticated,
  })
}
