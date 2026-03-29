// ABOUTME: Query hook for fetching user preferences
// ABOUTME: Returns preferences for the authenticated user

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { UserPreferences } from '../models/user-preferences'

export const useUserPreferencesQuery = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async (): Promise<UserPreferences> => {
      const response = await apiFetch('/api/v1/user/preferences')
      return response.json()
    },
    enabled: isAuthenticated,
  })
}
