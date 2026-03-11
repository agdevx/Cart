// ABOUTME: Mutation hook for checking/unchecking trip items with optimistic updates
// ABOUTME: Instantly toggles UI state, rolls back on failure, refetches on settle

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { TripItem } from '../models/trip-item'

interface CheckTripItemRequest {
  tripId: string
  tripItemId: string
  isChecked: boolean
}

export const useCheckTripItemMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['trip-items', 'check'],
    mutationFn: async (request: CheckTripItemRequest): Promise<TripItem> => {
      const { tripItemId, isChecked } = request
      const endpoint = isChecked ? 'check' : 'uncheck'
      const response = await apiFetch(`/api/tripitem/${tripItemId}/${endpoint}`, {
        method: 'POST',
      })
      return response.json() as Promise<TripItem>
    },
    onMutate: async (variables) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['trips', variables.tripId, 'items'] })

      // Snapshot current cache for rollback
      const previousItems = queryClient.getQueryData<TripItem[]>(['trips', variables.tripId, 'items'])

      // Optimistically flip the isChecked flag
      queryClient.setQueryData<TripItem[]>(
        ['trips', variables.tripId, 'items'],
        (old) =>
          old?.map((item) =>
            item.id === variables.tripItemId
              ? {
                  ...item,
                  isChecked: variables.isChecked,
                  checkedAt: variables.isChecked ? new Date().toISOString() : null,
                }
              : item
          )
      )

      return { previousItems }
    },
    onError: (_error, variables, context) => {
      // Rollback to snapshot on failure
      if (context?.previousItems) {
        queryClient.setQueryData(['trips', variables.tripId, 'items'], context.previousItems)
      }
      // Global MutationCache onError shows toast
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch to sync with server truth
      // Prefix match covers both trip detail and trip items queries
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId] })
    },
  })
}
