import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useCreateTripMutation } from '../create-trip.mutation'
import * as apiFetchModule from '../../agdevx-cart-api-config'
import * as useAuthModule from '@/auth/use-auth'
import type { Trip } from '../../models/trip'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useCreateTripMutation', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('creates trip successfully', async () => {
    const mockTrip: Trip = {
      id: '1',
      name: 'Grocery Shopping',
      householdId: 'household1',
      createdByUserId: 'user1',
      isCompleted: false,
      completedAt: null,
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
      json: async () => mockTrip,
    } as unknown as Response)

    const { result } = renderHook(() => useCreateTripMutation(), {
      wrapper,
    })

    result.current.mutate({
      name: 'Grocery Shopping',
      householdId: 'household1',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockTrip)
    expect(apiFetchModule.apiFetch).toHaveBeenCalledWith('/api/trip', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Grocery Shopping',
        householdId: 'household1',
      }),
    })
  })

  it('invalidates trips query on success', async () => {
    const mockTrip: Trip = {
      id: '1',
      name: 'Personal Trip',
      householdId: null,
      createdByUserId: 'user1',
      isCompleted: false,
      completedAt: null,
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
      json: async () => mockTrip,
    } as unknown as Response)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateTripMutation(), {
      wrapper,
    })

    result.current.mutate({
      name: 'Personal Trip',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['trips'],
    })
  })

  it('handles creation error', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(apiFetchModule, 'apiFetch').mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => useCreateTripMutation(), {
      wrapper,
    })

    result.current.mutate({
      name: 'Grocery Shopping',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
