import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useHouseholdMembersQuery } from './use-household-members.query'
import * as apiFetchModule from '../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'
import type { HouseholdMember } from '../models/household'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useHouseholdMembersQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches household members successfully', async () => {
    const mockMembers: HouseholdMember[] = [
      {
        id: '1',
        householdId: 'h1',
        userId: 'u1',
        joinedAt: '2024-01-01',
        role: 'owner',
        createdBy: 'u1',
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
      json: async () => mockMembers,
    } as unknown as Response)

    const { result } = renderHook(() => useHouseholdMembersQuery('h1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockMembers)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/household/h1/members')
  })

  it('does not fetch when not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useHouseholdMembersQuery('h1'), { wrapper })

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

    const { result } = renderHook(() => useHouseholdMembersQuery('h1'), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
