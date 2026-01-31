// ABOUTME: Query hook for fetching inventory items
// ABOUTME: Returns combined list of household and personal inventory items

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { InventoryItem } from '../models/inventory-item'
import { useAuth } from '@/auth/use-auth'

export const useInventoryQuery = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['inventory'],
    queryFn: async (): Promise<InventoryItem[]> => {
      return apiFetch<InventoryItem[]>('/api/inventory', { token })
    },
    enabled: !!token,
  })
}
