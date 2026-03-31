import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/apis/api-error'
import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import * as apiFetchModule from '../../agdevx-cart-api-config'
import type { Household } from '../../models/household'
import { useJoinHouseholdMutation } from '../join-household.mutation'

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

    const { result } = renderHook(() => useJoinHouseholdMutation(), { wrapper })

    result.current.mutate({ inviteCode: 'ABC123' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockHousehold)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/v1/household/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'ABC123' }),
    })
  })

  it('invalidates household query on success', async () => {
    const mockHousehold: Household = {
      id: '1',
      name: 'Existing Household',
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

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useJoinHouseholdMutation(), { wrapper })

    result.current.mutate({ inviteCode: 'ABC123' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['household'] })
  })

  it('handles join error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new ApiError(400, 'Bad Request', { message: 'Invalid invite code' })
    )

    const { result } = renderHook(() => useJoinHouseholdMutation(), { wrapper })

    result.current.mutate({ inviteCode: 'INVALID' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ApiError)
  })
})
