import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { UserPreferences } from '../../models/user-preferences'
import { useUserPreferencesQuery } from '../use-user-preferences.query'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useUserPreferencesQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches preferences successfully when authenticated', async () => {
    const mockPreferences: UserPreferences = {
      defaultPage: '/shopping',
      locationLatitude: 40.7128,
      locationLongitude: -74.006,
      locationDisplayName: 'New York, NY',
      showWeatherIcons: true,
      showWeatherTemps: true,
      showHouseholdPage: true,
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockPreferences,
    } as Response)

    const { result } = renderHook(() => useUserPreferencesQuery(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockPreferences)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/v1/user/preferences')
  })

  it('does not fetch when not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useUserPreferencesQuery(), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(apiFetchSpy).not.toHaveBeenCalled()
  })

  it('handles fetch error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => useUserPreferencesQuery(), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
