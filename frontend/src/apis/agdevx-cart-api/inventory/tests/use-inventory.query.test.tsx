import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useInventoryQuery } from '../use-inventory.query'
import * as apiFetchModule from '../../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'
import type { InventoryItem } from '../../models/inventory-item'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useInventoryQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches inventory items successfully', async () => {
    const mockInventory: InventoryItem[] = [
      {
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
      },
      {
        id: '2',
        name: 'Personal Item',
        defaultStoreId: null,
        notes: null,
        ownerUserId: 'user1',
        householdId: null,
        createdBy: 'user1',
        createdDate: '2024-01-01',
        modifiedBy: null,
        modifiedDate: null,
      },
    ]

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockInventory,
    } as Response)

    const { result } = renderHook(() => useInventoryQuery(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockInventory)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/inventory')
  })

  it('does not fetch when not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useInventoryQuery(), { wrapper })

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

    const { result } = renderHook(() => useInventoryQuery(), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
