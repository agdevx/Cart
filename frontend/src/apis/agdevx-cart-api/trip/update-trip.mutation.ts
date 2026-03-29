// ABOUTME: Mutation hook for updating trip details
// ABOUTME: Sends PUT request to update trip name and date, invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateTripRequest {
  tripId: string
  name: string
  tripDate?: string | null
}

export const useUpdateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trips', 'update'],
    mutationFn: async ({ tripId, name, tripDate }: UpdateTripRequest): Promise<void> => {
      await apiFetch(`/api/v1/trip/${tripId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, tripDate }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
