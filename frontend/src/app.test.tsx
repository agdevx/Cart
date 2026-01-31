import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './app'

describe('App', () => {
  it('renders login page by default (unauthenticated)', () => {
    render(<App />)
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
  })
})
