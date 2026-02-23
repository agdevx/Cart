// ABOUTME: Query hook for fetching inventory items
// ABOUTME: Returns combined list of household and personal inventory items

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'

export const useInventoryQuery = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['inventory'],
    queryFn: async (): Promise<InventoryItem[]> => {
      const response = await apiFetch('/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }
      return response.json();
    },
    enabled: isAuthenticated,
  })
}
