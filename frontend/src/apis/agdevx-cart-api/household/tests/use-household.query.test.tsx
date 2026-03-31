import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { Household } from '../../models/household'
import { useHouseholdQuery } from '../use-household.query'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useHouseholdQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches a household by id', async () => {
    const mockHousehold: Household = {
      id: 'h1',
      name: 'Test Household',
      owner1UserId: 'user1',
      owner2UserId: null,
      createdBy: 'user1',
      createdDate: '2024-01-01',
      modifiedBy: 'user1',
      modifiedDate: null,
    }

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => mockHousehold,
    } as unknown as Response)

    const { result } = renderHook(() => useHouseholdQuery(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockHousehold)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/v1/household')
  })

  it('handles fetch error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => useHouseholdQuery(), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
