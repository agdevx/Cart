// ABOUTME: Integration test verifying the error boundary catches render errors

import { ErrorBoundary } from 'react-error-boundary'
import { MemoryRouter } from 'react-router-dom'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ErrorFallback } from '../error-fallback'

function ThrowingComponent(): never {
  throw new Error('Test render error')
}

describe('Error boundary integration', () => {
  it('renders ErrorFallback when a child component throws', () => {
    // Suppress console.error from the intentional throw
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      </MemoryRouter>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    spy.mockRestore()
  })
})
