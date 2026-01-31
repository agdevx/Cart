import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useDeleteInventoryItemMutation } from './delete-inventory-item.mutation'
import * as apiFetchModule from '../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useDeleteInventoryItemMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('deletes inventory item successfully', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteInventoryItemMutation(), {
      wrapper,
    })

    result.current.mutate('1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/inventory/1', {
      method: 'DELETE',
      token: 'test-token',
    })
  })

  it('invalidates inventory query on success', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(undefined)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteInventoryItemMutation(), {
      wrapper,
    })

    result.current.mutate('1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['inventory'],
    })
  })

  it('handles deletion error', async () => {
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

    const { result } = renderHook(() => useDeleteInventoryItemMutation(), {
      wrapper,
    })

    result.current.mutate('1')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
