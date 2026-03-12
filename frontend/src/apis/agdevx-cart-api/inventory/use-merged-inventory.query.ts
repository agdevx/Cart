// ABOUTME: Query hook for fetching merged inventory (household + personal items)
// ABOUTME: Calls GET /api/inventory/merged/{id}, returns household items combined with user's personal items

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'

export const useMergedInventoryQuery = (householdId: string | null) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['inventory', 'merged', householdId],
    queryFn: async (): Promise<InventoryItem[]> => {
      const response = await apiFetch(`/api/v1/inventory/merged/${householdId}`);
      return response.json();
    },
    enabled: isAuthenticated && householdId !== null,
    placeholderData: keepPreviousData,
  })
}
