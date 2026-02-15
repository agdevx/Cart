// ABOUTME: Query hook for fetching items for a specific trip
// ABOUTME: Returns list of trip items with their details and check status

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { TripItem } from '../models/trip-item'
import { useAuth } from '@/auth/use-auth'

export const useTripItemsQuery = (tripId: string) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['trips', tripId, 'items'],
    queryFn: async (): Promise<TripItem[]> => {
      const response = await apiFetch(`/api/tripitem/trip/${tripId}`, { token })
      if (!response.ok) {
        throw new Error('Failed to fetch trip items')
      }
      return response.json() as Promise<TripItem[]>
    },
    enabled: !!token && !!tripId,
  })
}
