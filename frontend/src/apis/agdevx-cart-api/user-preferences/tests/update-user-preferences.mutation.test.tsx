import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/apis/api-error'
import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { UserPreferences } from '../../models/user-preferences'
import { useUpdateUserPreferencesMutation } from '../update-user-preferences.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useUpdateUserPreferencesMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('updates preferences successfully', async () => {
    const mockPreferences: UserPreferences = {
      defaultPage: '/pantry',
      locationLatitude: 34.0522,
      locationLongitude: -118.2437,
      locationDisplayName: 'Los Angeles, CA',
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
    } as unknown as Response)

    const { result } = renderHook(() => useUpdateUserPreferencesMutation(), {
      wrapper,
    })

    result.current.mutate({
      defaultPage: '/pantry',
      locationLatitude: 34.0522,
      locationLongitude: -118.2437,
      locationDisplayName: 'Los Angeles, CA',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockPreferences)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/v1/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        defaultPage: '/pantry',
        locationLatitude: 34.0522,
        locationLongitude: -118.2437,
        locationDisplayName: 'Los Angeles, CA',
      }),
    })
  })

  it('invalidates user-preferences query on success', async () => {
    const mockPreferences: UserPreferences = {
      defaultPage: null,
      locationLatitude: null,
      locationLongitude: null,
      locationDisplayName: null,
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
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateUserPreferencesMutation(), {
      wrapper,
    })

    result.current.mutate({ defaultPage: null })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['user-preferences'],
    })
  })

  it('handles error response', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new ApiError(400, 'Bad Request', null)
    )

    const { result } = renderHook(() => useUpdateUserPreferencesMutation(), {
      wrapper,
    })

    result.current.mutate({ defaultPage: '/shopping' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ApiError)
  })
})
