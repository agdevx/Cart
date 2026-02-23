import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useInviteCodeQuery } from './use-invite-code.query'
import * as apiFetchModule from '../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useInviteCodeQuery', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('fetches invite code successfully', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ inviteCode: 'ABC123' }),
    } as unknown as Response)

    const { result } = renderHook(() => useInviteCodeQuery('h1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual('ABC123')
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/household/h1/invite-code')
  })

  it('does not fetch when not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    const apiFetchSpy = vi.spyOn(apiFetchModule, 'apiFetch')

    const { result } = renderHook(() => useInviteCodeQuery('h1'), { wrapper })

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

    const { result } = renderHook(() => useInviteCodeQuery('h1'), { wrapper })

    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3000 }
    )

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
