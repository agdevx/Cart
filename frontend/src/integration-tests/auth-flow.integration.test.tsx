// ABOUTME: Integration tests for authentication flow
// ABOUTME: Tests login page rendering and error states

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../app'

describe('Authentication Flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows login page when not authenticated', () => {
    render(<App />)
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
  })

  it('shows error message on login failure', async () => {
    const user = userEvent.setup()

    // Mock failed login
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid credentials' })
    }) as typeof fetch

    render(<App />)

    const input = screen.getByPlaceholderText(/username/i)
    const button = screen.getByRole('button', { name: /login/i })

    await user.type(input, 'wronguser')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument()
    })
  })

  it('disables login button when username is empty', () => {
    render(<App />)

    const button = screen.getByRole('button', { name: /login/i })
    expect(button).toBeDisabled()
  })

  it('enables login button when username is entered', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByPlaceholderText(/username/i)
    const button = screen.getByRole('button', { name: /login/i })

    await user.type(input, 'testuser')

    expect(button).not.toBeDisabled()
  })
})
