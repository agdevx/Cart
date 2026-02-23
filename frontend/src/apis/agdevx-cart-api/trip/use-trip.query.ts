// ABOUTME: Query hook for fetching a single trip by ID
// ABOUTME: Returns trip details including items for the specified trip

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'
import { useAuth } from '@/auth/use-auth'

export const useTripQuery = (tripId: string) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['trips', tripId],
    queryFn: async (): Promise<Trip> => {
      const response = await apiFetch(`/api/trip/${tripId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch trip')
      }
      return response.json() as Promise<Trip>
    },
    enabled: isAuthenticated,
  })
}
