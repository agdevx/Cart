// ABOUTME: Query hook for fetching a single household's inventory items
// ABOUTME: Calls GET /api/inventory/household/{id}, returns items belonging to that household

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'

export const useHouseholdInventoryQuery = (householdId: string | null) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['inventory', 'household', householdId],
    queryFn: async (): Promise<InventoryItem[]> => {
      const response = await apiFetch(`/api/inventory/household/${householdId}`);
      return response.json();
    },
    enabled: isAuthenticated && householdId !== null,
    placeholderData: keepPreviousData,
  })
}
