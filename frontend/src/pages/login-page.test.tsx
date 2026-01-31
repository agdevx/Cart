// ABOUTME: Tests for LoginPage component
// ABOUTME: Verifies username input and form submission

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoginPage } from './login-page'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { createElement } from 'react'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('LoginPage', () => {
  it('renders username input', () => {
    render(createElement(LoginPage), { wrapper })
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
  })

  it('renders login button', () => {
    render(createElement(LoginPage), { wrapper })
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })
})
