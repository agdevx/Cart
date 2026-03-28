// ABOUTME: Tests for LoginPage component
// ABOUTME: Verifies email/password inputs and form submission

import { createElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect,it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'

import { LoginPage } from '../login-page'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children))

describe('LoginPage', () => {
  it('renders email input', () => {
    render(createElement(LoginPage), { wrapper })
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
  })

  it('renders password input', () => {
    render(createElement(LoginPage), { wrapper })
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
  })

  it('renders login button', () => {
    render(createElement(LoginPage), { wrapper })
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('renders link to registration page', () => {
    render(createElement(LoginPage), { wrapper })
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })

  it('disables submit button when fields are empty', () => {
    render(createElement(LoginPage), { wrapper })
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled()
  })

  it('shows error on empty email blur', async () => {
    render(createElement(LoginPage), { wrapper })
    const emailInput = screen.getByPlaceholderText(/enter your email/i)

    fireEvent.focus(emailInput)
    fireEvent.blur(emailInput)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('clears email error when valid email is entered', async () => {
    const user = userEvent.setup()
    render(createElement(LoginPage), { wrapper })
    const emailInput = screen.getByPlaceholderText(/enter your email/i)

    // Trigger required error
    await user.click(emailInput)
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })

    // Fix the email — error should clear on change
    await user.type(emailInput, 'valid@example.com')

    await waitFor(() => {
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
    })
  })

  it('shows inline error on email field when login fails', async () => {
    // Mock fetch to return a failed login response
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const user = userEvent.setup()
    render(createElement(LoginPage), { wrapper })

    await user.type(screen.getByPlaceholderText(/enter your email/i), 'wrong@example.com')
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'wrongpassword')

    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })

    mockFetch.mockRestore()
  })
})
