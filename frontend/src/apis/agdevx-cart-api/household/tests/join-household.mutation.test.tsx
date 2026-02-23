import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useJoinHouseholdMutation } from '../join-household.mutation'
import * as apiFetchModule from '../../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'
import type { Household } from '../../models/household'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useJoinHouseholdMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('joins household successfully', async () => {
    const mockHousehold: Household = {
      id: '1',
      name: 'Existing Household',
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
      json: async () => mockHousehold,
    } as unknown as Response)

    const { result } = renderHook(() => useJoinHouseholdMutation(), { wrapper })

    result.current.mutate({ inviteCode: 'ABC123' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockHousehold)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/households/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'ABC123' }),
    })
  })

  it('invalidates households query on success', async () => {
    const mockHousehold: Household = {
      id: '1',
      name: 'Existing Household',
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
      json: async () => mockHousehold,
    } as unknown as Response)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useJoinHouseholdMutation(), { wrapper })

    result.current.mutate({ inviteCode: 'ABC123' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['households'] })
  })

  it('handles join error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new Error('Invalid invite code')
    )

    const { result } = renderHook(() => useJoinHouseholdMutation(), { wrapper })

    result.current.mutate({ inviteCode: 'INVALID' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(new Error('Invalid invite code'))
  })
})
