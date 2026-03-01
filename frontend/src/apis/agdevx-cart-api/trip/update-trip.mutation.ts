// ABOUTME: Mutation hook for updating trip details
// ABOUTME: Sends PUT request to rename a trip and invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateTripRequest {
  tripId: string
  name: string
}

export const useUpdateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tripId, name }: UpdateTripRequest): Promise<void> => {
      const response = await apiFetch(`/api/trip/${tripId}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        throw new Error('Failed to update trip')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
