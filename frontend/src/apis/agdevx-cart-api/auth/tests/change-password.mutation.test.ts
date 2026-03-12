// ABOUTME: Tests for change password mutation hook
// ABOUTME: Verifies useChangePasswordMutation hook behavior and API integration

import { createElement } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/apis/api-error'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { useChangePasswordMutation } from '../change-password.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('useChangePasswordMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('should successfully change password', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper })

    result.current.mutate({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/password'),
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
      })
    )
  })

  it('should handle wrong current password error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        errorCode: 'UNAUTHORIZED',
        message: 'Incorrect password.',
      }),
    })

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper })

    result.current.mutate({
      currentPassword: 'WrongPassword!',
      newPassword: 'NewPassword456!',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect((result.current.error as ApiError).status).toBe(401)
  })

  it('should handle network errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => null,
    })

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper })

    result.current.mutate({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiError)
  })
})
