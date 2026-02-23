import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useTripQuery } from './use-trip.query'
import * as apiFetchModule from '../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'
import type { Trip } from '../models/trip'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useTripQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches trip by id successfully', async () => {
    const mockTrip: Trip = {
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
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockTrip,
    } as unknown as Response)

    const { result } = renderHook(() => useTripQuery('1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockTrip)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/trip/1')
  })

  it('does not fetch when not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useTripQuery('1'), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(apiFetchSpy).not.toHaveBeenCalled()
  })

  it('handles fetch error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => useTripQuery('1'), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
