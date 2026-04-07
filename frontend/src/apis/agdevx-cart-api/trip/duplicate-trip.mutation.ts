// ABOUTME: TanStack Query mutation hook for duplicating a trip
// ABOUTME: Sends trip creation params to POST /api/v1/trip/{id}/duplicate, invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { Trip } from '../models/trip'

interface DuplicateTripRequest {
  sourceTripId: string
  name: string
  tripDate?: string | null
  householdId?: string | null
}

export const useDuplicateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trips', 'duplicate'],
    mutationFn: async ({ sourceTripId, ...body }: DuplicateTripRequest): Promise<Trip> => {
      const response = await apiFetch(`/api/v1/trip/${sourceTripId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return response.json() as Promise<Trip>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
