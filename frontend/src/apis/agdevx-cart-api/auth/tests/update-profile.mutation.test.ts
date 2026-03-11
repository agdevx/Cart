// ABOUTME: Tests for update profile mutation hook
// ABOUTME: Verifies useUpdateProfileMutation hook behavior and API integration

import { createElement } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/apis/api-error'
import { queryClient } from '@/apis/tanstack-query/query-client'

import { useUpdateProfileMutation } from '../update-profile.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('useUpdateProfileMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('should successfully update profile', async () => {
    const mockResponse = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'updated@example.com',
      name: 'Updated Name',
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper })

    result.current.mutate({
      name: 'Updated Name',
      email: 'updated@example.com',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/profile'),
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
      })
    )
  })

  it('should handle duplicate email error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({
        errorCode: 'DUPLICATE_EMAIL',
        message: 'A user with this email already exists.',
      }),
    })

    const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper })

    result.current.mutate({
      name: 'Test',
      email: 'taken@example.com',
      currentPassword: 'Password123!',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect((result.current.error as ApiError).status).toBe(409)
  })

  it('should handle wrong password error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        errorCode: 'UNAUTHORIZED',
        message: 'Incorrect password.',
      }),
    })

    const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper })

    result.current.mutate({
      name: 'Test',
      email: 'new@example.com',
      currentPassword: 'WrongPassword!',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect((result.current.error as ApiError).status).toBe(401)
  })
})
