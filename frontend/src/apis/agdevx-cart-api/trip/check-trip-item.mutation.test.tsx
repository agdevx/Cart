import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useCheckTripItemMutation } from './check-trip-item.mutation'
import * as apiFetchModule from '../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'
import type { TripItem } from '../models/trip-item'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useCheckTripItemMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('checks trip item successfully', async () => {
    const mockTripItem: TripItem = {
      id: '1',
      tripId: 'trip1',
      inventoryItemId: 'item1',
      quantity: 2,
      storeId: null,
      notes: null,
      isChecked: true,
      checkedAt: '2024-01-01T10:00:00Z',
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: 'user1',
      modifiedDate: '2024-01-01',
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockTripItem,
    } as unknown as Response)

    const { result } = renderHook(() => useCheckTripItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      tripId: 'trip1',
      tripItemId: '1',
      isChecked: true,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockTripItem)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/tripitem/1/check', {
      method: 'POST',
      token: 'test-token',
    })
  })

  it('unchecks trip item successfully', async () => {
    const mockTripItem: TripItem = {
      id: '1',
      tripId: 'trip1',
      inventoryItemId: 'item1',
      quantity: 2,
      storeId: null,
      notes: null,
      isChecked: false,
      checkedAt: null,
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: 'user1',
      modifiedDate: '2024-01-01',
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockTripItem,
    } as unknown as Response)

    const { result } = renderHook(() => useCheckTripItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      tripId: 'trip1',
      tripItemId: '1',
      isChecked: false,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockTripItem)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/tripitem/1/uncheck', {
      method: 'POST',
      token: 'test-token',
    })
  })

  it('invalidates trip queries on success', async () => {
    const mockTripItem: TripItem = {
      id: '1',
      tripId: 'trip1',
      inventoryItemId: 'item1',
      quantity: 1,
      storeId: null,
      notes: null,
      isChecked: true,
      checkedAt: '2024-01-01T10:00:00Z',
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: 'user1',
      modifiedDate: '2024-01-01',
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockTripItem,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCheckTripItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      tripId: 'trip1',
      tripItemId: '1',
      isChecked: true,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['trips', 'trip1'],
    })
  })

  it('handles check error', async () => {
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

    const { result } = renderHook(() => useCheckTripItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      tripId: 'trip1',
      tripItemId: '1',
      isChecked: true,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
