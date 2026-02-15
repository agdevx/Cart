import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useTripsQuery } from './use-trips.query'
import * as apiFetchModule from '../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'
import type { Trip } from '../models/trip'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useTripsQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches trips successfully', async () => {
    const mockTrips: Trip[] = [
      {
        id: '1',
        name: 'Grocery Shopping',
        householdId: 'household1',
        createdByUserId: 'user1',
        isCompleted: false,
        completedAt: null,
        createdBy: 'user1',
        createdDate: '2024-01-01',
        modifiedBy: null,
        modifiedDate: null,
      },
      {
        id: '2',
        name: 'Weekly Shop',
        householdId: 'household1',
        createdByUserId: 'user1',
        isCompleted: true,
        completedAt: '2024-01-02',
        createdBy: 'user1',
        createdDate: '2024-01-01',
        modifiedBy: 'user1',
        modifiedDate: '2024-01-02',
      },
    ]

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockTrips,
    } as Response)

    const { result } = renderHook(() => useTripsQuery(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockTrips)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/trip/user', {
      token: 'test-token',
    })
  })

  it('does not fetch when token is not available', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      token: null,
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useTripsQuery(), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(apiFetchSpy).not.toHaveBeenCalled()
  })

  it('handles fetch error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => useTripsQuery(), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
