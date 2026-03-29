import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/apis/api-error'
import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import { useUpdateInventoryItemMutation } from '../update-inventory-item.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useUpdateInventoryItemMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('updates inventory item successfully', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
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

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/v1/inventory/1', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Whole Milk',
        defaultStoreId: 'store2',
        notes: 'Updated notes',
      }),
    })
  })

  it('invalidates inventory query on success', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
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
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new ApiError(400, 'Bad Request', null)
    )

    const { result } = renderHook(() => useUpdateInventoryItemMutation(), {
      wrapper,
    })

    result.current.mutate({
      id: '1',
      name: 'Milk',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ApiError)
  })
})
