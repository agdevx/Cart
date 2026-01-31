import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useAddTripItemMutation } from './add-trip-item.mutation'
import * as apiFetchModule from '../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'
import type { TripItem } from '../models/trip-item'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useAddTripItemMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('adds trip item successfully', async () => {
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
      modifiedBy: null,
      modifiedDate: null,
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(mockTripItem)

    const { result } = renderHook(() => useAddTripItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      tripId: 'trip1',
      inventoryItemId: 'item1',
      quantity: 2,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockTripItem)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/trips/trip1/items', {
      method: 'POST',
      body: JSON.stringify({
        inventoryItemId: 'item1',
        quantity: 2,
      }),
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
      isChecked: false,
      checkedAt: null,
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: null,
      modifiedDate: null,
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(mockTripItem)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useAddTripItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      tripId: 'trip1',
      inventoryItemId: 'item1',
      quantity: 1,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['trips', 'trip1'],
    })
  })

  it('handles add error', async () => {
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

    const { result } = renderHook(() => useAddTripItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      tripId: 'trip1',
      inventoryItemId: 'item1',
      quantity: 1,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
