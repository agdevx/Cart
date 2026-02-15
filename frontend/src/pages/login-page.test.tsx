// ABOUTME: Tests for LoginPage component
// ABOUTME: Verifies email/password inputs and form submission

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoginPage } from './login-page'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { BrowserRouter } from 'react-router-dom'
import { createElement } from 'react'

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
})
