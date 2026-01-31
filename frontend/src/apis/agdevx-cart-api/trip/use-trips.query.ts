// ABOUTME: Query hook for fetching all trips
// ABOUTME: Returns list of trips for the authenticated user

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'
import { useAuth } from '@/auth/use-auth'

export const useTripsQuery = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['trips'],
    queryFn: async (): Promise<Trip[]> => {
      return apiFetch<Trip[]>('/api/trip/user', { token })
    },
    enabled: !!token,
  })
}
