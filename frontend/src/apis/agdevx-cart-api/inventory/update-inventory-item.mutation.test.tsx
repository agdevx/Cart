import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useUpdateInventoryItemMutation } from './update-inventory-item.mutation'
import * as apiFetchModule from '../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'
import type { InventoryItem } from '../models/inventory-item'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useUpdateInventoryItemMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('updates inventory item successfully', async () => {
    const mockInventoryItem: InventoryItem = {
      id: '1',
      name: 'Whole Milk',
      defaultStoreId: 'store2',
      notes: 'Updated notes',
      ownerUserId: null,
      householdId: 'household1',
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: 'user1',
      modifiedDate: '2024-01-02',
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
      json: async () => mockInventoryItem,
    } as unknown as Response)

    const { result } = renderHook(() => useUpdateInventoryItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      id: '1',
      name: 'Whole Milk',
      defaultStoreId: 'store2',
      notes: 'Updated notes',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockInventoryItem)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/inventory/1', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Whole Milk',
        defaultStoreId: 'store2',
        notes: 'Updated notes',
      }),
      token: 'test-token',
    })
  })

  it('invalidates inventory query on success', async () => {
    const mockInventoryItem: InventoryItem = {
      id: '1',
      name: 'Milk',
      defaultStoreId: null,
      notes: null,
      ownerUserId: 'user1',
      householdId: null,
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: 'user1',
      modifiedDate: '2024-01-02',
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
      json: async () => mockInventoryItem,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateInventoryItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      id: '1',
      name: 'Milk',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['inventory'],
    })
  })

  it('handles update error', async () => {
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

    const { result } = renderHook(() => useUpdateInventoryItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      id: '1',
      name: 'Milk',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
