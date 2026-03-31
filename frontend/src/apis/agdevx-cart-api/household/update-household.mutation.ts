// ABOUTME: Mutation hook for renaming a household
// ABOUTME: Sends PUT request with JSON object body

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateHouseholdRequest {
  householdId: string
  name: string
}

export const useUpdateHouseholdMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['households', 'update'],
    mutationFn: async (request: UpdateHouseholdRequest): Promise<void> => {
      await apiFetch(`/api/v1/household/${request.householdId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: request.name }),
      })
    },
    onSuccess: (_, _variables) => {
      queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}
