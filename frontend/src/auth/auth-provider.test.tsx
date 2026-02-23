// ABOUTME: Tests for AuthProvider component
// ABOUTME: Verifies user restoration and context provision

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from './auth-provider'
import { useAuth } from './use-auth'
import { createElement } from 'react'

const TestComponent = () => {
  const { isAuthenticated, user } = useAuth()
  return createElement('div', null,
    `Auth: ${isAuthenticated}, User: ${user?.displayName || 'none'}`
  )
}

describe('AuthProvider', () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a mock localStorage
    localStorageMock = {}

    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
      clear: vi.fn(() => {
        localStorageMock = {}
      }),
      length: 0,
      key: vi.fn(),
    } as Storage
  })

  it('provides auth context to children', () => {
    // Mock fetch for /api/auth/me — no stored user, so session validation returns 401
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as typeof fetch

    render(
      createElement(AuthProvider, null,
        createElement(TestComponent)
      )
    )
    expect(screen.getByText(/Auth: false/)).toBeInTheDocument()
  })

  it('restores user from localStorage on mount', async () => {
    localStorageMock['authUser'] = JSON.stringify({
      id: '1',
      email: 'test@example.com',
      displayName: 'Test User',
      createdBy: null,
      createdDate: '2024-01-01T00:00:00Z',
      modifiedBy: null,
      modifiedDate: null,
    })

    // Mock fetch for /api/auth/me session validation
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: '1',
        email: 'test@example.com',
        displayName: 'Test User',
      }),
    }) as typeof fetch

    render(
      createElement(AuthProvider, null,
        createElement(TestComponent)
      )
    )

    await waitFor(() => {
      expect(screen.getByText(/User: Test User/)).toBeInTheDocument()
    })
  })
})
