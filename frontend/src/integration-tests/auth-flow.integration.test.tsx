// ABOUTME: Integration tests for authentication flow
// ABOUTME: Tests login page rendering and error states

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../app'

describe('Authentication Flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows login page when not authenticated', () => {
    render(<App />)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
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

    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/password/i)
    const button = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument()
    })
  })

  it('disables login button when email or password is empty', () => {
    render(<App />)

    const button = screen.getByRole('button', { name: /login/i })
    expect(button).toBeDisabled()
  })

  it('enables login button when email and password are entered', async () => {
    const user = userEvent.setup()
    render(<App />)

    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/password/i)
    const button = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    expect(button).not.toBeDisabled()
  })
})
