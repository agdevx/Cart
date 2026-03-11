// ABOUTME: Mutation hook for updating trip details
// ABOUTME: Sends PUT request to update trip name and scope, invalidates trips cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateTripRequest {
  tripId: string
  name: string
  householdId?: string | null
}

export const useUpdateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trips', 'update'],
    mutationFn: async ({ tripId, name, householdId }: UpdateTripRequest): Promise<void> => {
      await apiFetch(`/api/trip/${tripId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, householdId: householdId ?? null }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
