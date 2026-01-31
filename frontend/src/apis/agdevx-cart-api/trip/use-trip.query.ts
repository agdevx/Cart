// ABOUTME: Query hook for fetching a single trip by ID
// ABOUTME: Returns trip details including items for the specified trip

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'
import { useAuth } from '@/auth/use-auth'

export const useTripQuery = (tripId: string) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['trips', tripId],
    queryFn: async (): Promise<Trip> => {
      return apiFetch<Trip>(`/api/trip/${tripId}`, { token })
    },
    enabled: !!token,
  })
}
