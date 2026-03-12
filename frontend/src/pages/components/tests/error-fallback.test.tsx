// ABOUTME: Tests for the error boundary fallback UI

import { MemoryRouter } from 'react-router-dom'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ErrorFallback } from '../error-fallback'

describe('ErrorFallback', () => {
  const mockError = new Error('Test error')
  const mockResetErrorBoundary = vi.fn()

  it('renders heading and subtitle', () => {
    render(
      <MemoryRouter>
        <ErrorFallback error={mockError} resetErrorBoundary={mockResetErrorBoundary} />
      </MemoryRouter>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
  })

  it('calls window.location.reload when Reload is clicked', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    })
    render(
      <MemoryRouter>
        <ErrorFallback error={mockError} resetErrorBoundary={mockResetErrorBoundary} />
      </MemoryRouter>
    )
    await user.click(screen.getByRole('button', { name: /reload/i }))
    expect(reloadMock).toHaveBeenCalled()
  })

  it('renders Go Home link that calls resetErrorBoundary', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ErrorFallback error={mockError} resetErrorBoundary={mockResetErrorBoundary} />
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: /go home/i })
    expect(link).toHaveAttribute('href', '/')
    await user.click(link)
    expect(mockResetErrorBoundary).toHaveBeenCalled()
  })
})
