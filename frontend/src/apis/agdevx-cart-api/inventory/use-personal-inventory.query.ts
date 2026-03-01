// ABOUTME: Query hook for fetching personal-only inventory items
// ABOUTME: Calls GET /api/inventory/personal, returns items owned by the current user

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'

export const usePersonalInventoryQuery = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['inventory', 'personal'],
    queryFn: async (): Promise<InventoryItem[]> => {
      const response = await apiFetch('/api/inventory/personal');
      if (!response.ok) {
        throw new Error('Failed to fetch personal inventory');
      }
      return response.json();
    },
    enabled: isAuthenticated,
  })
}
