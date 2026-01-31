// ABOUTME: Tests for AuthProvider component
// ABOUTME: Verifies token restoration and context provision

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from './auth-provider'
import { useAuth } from './use-auth'
import { createElement } from 'react'

const TestComponent = () => {
  const { isAuthenticated, user, token } = useAuth()
  return createElement('div', null,
    `Auth: ${isAuthenticated}, User: ${user?.displayName || 'none'}, Token: ${token || 'none'}`
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
    render(
      createElement(AuthProvider, null,
        createElement(TestComponent)
      )
    )
    expect(screen.getByText(/Auth: false/)).toBeInTheDocument()
  })

  it('restores token from localStorage on mount', async () => {
    localStorageMock['authToken'] = 'test-token'

    render(
      createElement(AuthProvider, null,
        createElement(TestComponent)
      )
    )

    await waitFor(() => {
      expect(screen.getByText(/Token: test-token/)).toBeInTheDocument()
    })
  })
})
