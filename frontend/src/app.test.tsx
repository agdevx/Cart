import { MemoryRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect,it } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import { AuthProvider } from '@/auth/auth-provider'

import { AppRoutes } from './app'

const createWrapper = (initialRoute: string = '/') => {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('App', () => {
  it('renders login page by default (unauthenticated)', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
  })

  it('renders registration page at /register route', () => {
    render(<AppRoutes />, { wrapper: createWrapper('/register') })
    expect(screen.getByText((_content, element) => element?.tagName === 'H1' && element?.textContent === 'AGDevX Cart')).toBeInTheDocument()
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
  })
})
