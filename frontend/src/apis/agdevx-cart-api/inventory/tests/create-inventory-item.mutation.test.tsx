import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { InventoryItem } from '../../models/inventory-item'
import { useCreateInventoryItemMutation } from '../create-inventory-item.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useCreateInventoryItemMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('creates inventory item successfully', async () => {
    const mockInventoryItem: InventoryItem = {
      id: '1',
      name: 'Milk',
      defaultStoreId: 'store1',
      notes: 'Organic',
      ownerUserId: null,
      householdId: 'household1',
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
      json: async () => mockInventoryItem,
    } as unknown as Response)

    const { result } = renderHook(() => useCreateInventoryItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      name: 'Milk',
      defaultStoreId: 'store1',
      notes: 'Organic',
      householdId: 'household1',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockInventoryItem)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/inventory', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Milk',
        defaultStoreId: 'store1',
        notes: 'Organic',
        householdId: 'household1',
      }),
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
      json: async () => mockInventoryItem,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateInventoryItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      name: 'Milk',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['inventory'],
    })
  })

  it('handles creation error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => useCreateInventoryItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      name: 'Milk',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
