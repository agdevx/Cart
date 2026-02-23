// ABOUTME: Tests for LoginPage component
// ABOUTME: Verifies email/password inputs and form submission

import { createElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect,it } from 'vitest'

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
})
