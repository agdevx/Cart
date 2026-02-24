import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { Store } from '../../models/store'
import { useStoresQuery } from '../use-stores.query'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const mockPersonalStore: Store = {
  id: 'ps1',
  name: 'Corner Market',
  householdId: null,
  userId: 'user1',
  createdBy: 'user1',
  createdDate: '2024-01-01',
  modifiedBy: null,
  modifiedDate: null,
}

const mockHouseholdStore: Store = {
  id: 'hs1',
  name: 'Costco',
  householdId: 'h1',
  userId: null,
  createdBy: 'user1',
  createdDate: '2024-01-01',
  modifiedBy: null,
  modifiedDate: null,
}

describe('useStoresQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches personal and household stores', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockPersonalStore],
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockHouseholdStore],
      } as unknown as Response)

    const { result } = renderHook(() => useStoresQuery(['h1']), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockPersonalStore, mockHouseholdStore])
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/store/personal')
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/store/household/h1')
  })

  it('fetches only personal stores when no household IDs provided', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPersonalStore],
    } as unknown as Response)

    const { result } = renderHook(() => useStoresQuery([]), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockPersonalStore])
    expect(apiFetchModule.apiFetch).toHaveBeenCalledTimes(1)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/store/personal')
  })

  it('does not fetch when not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useStoresQuery([]), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(apiFetchSpy).not.toHaveBeenCalled()
  })

  it('handles fetch error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: false,
    } as unknown as Response)

    const { result } = renderHook(() => useStoresQuery([]), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Failed to fetch stores'))
  })
})
