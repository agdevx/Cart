// ABOUTME: Mutation hook for renaming a household
// ABOUTME: Sends PUT request with name as JSON string body

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface UpdateHouseholdRequest {
  householdId: string
  name: string
}

export const useUpdateHouseholdMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: UpdateHouseholdRequest): Promise<void> => {
      const response = await apiFetch(`/api/household/${request.householdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.name),
      })
      if (!response.ok) {
        throw new Error('Failed to update household')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
      queryClient.invalidateQueries({ queryKey: ['household', variables.householdId] })
    },
  })
}
