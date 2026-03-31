// ABOUTME: Mutation hook for updating user preferences
// ABOUTME: Updates preferences and invalidates query cache

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { UserPreferences } from '../models/user-preferences'

interface UpdateUserPreferencesRequest {
  defaultPage?: string | null
  locationLatitude?: number | null
  locationLongitude?: number | null
  locationDisplayName?: string | null
  showWeatherIcons?: boolean
  showWeatherTemps?: boolean
  showHouseholdPage?: boolean
}

export const useUpdateUserPreferencesMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['user-preferences', 'update'],
    mutationFn: async (request: UpdateUserPreferencesRequest): Promise<UserPreferences> => {
      const response = await apiFetch('/api/v1/user/preferences', {
        method: 'PUT',
        body: JSON.stringify(request),
      })
      return response.json() as Promise<UserPreferences>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    },
  })
}
