import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { TripItem } from '../../models/trip-item'
import { useAddTripItemMutation } from '../add-trip-item.mutation'

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
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockTripItem,
    } as unknown as Response)

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
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith(
      '/api/tripitem?tripId=trip1&inventoryItemId=item1&quantity=2',
      {
        method: 'POST',
      }
    )
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
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockTripItem,
    } as unknown as Response)

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
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
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
