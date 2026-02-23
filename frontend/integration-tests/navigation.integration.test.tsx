// ABOUTME: Integration tests for navigation
// ABOUTME: Tests routing and bottom nav functionality

import { BrowserRouter } from 'react-router-dom'

import { render, screen } from '@testing-library/react'
import { describe, expect,it } from 'vitest'

import { BottomNav } from '@/features/bottom-nav/bottom-nav'

describe('Navigation', () => {
  it('renders all three navigation tabs', () => {
    render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>
    )

    expect(screen.getByText(/^Pantry$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Trips$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Household$/i)).toBeInTheDocument()
  })

  it('renders navigation links with correct paths', () => {
    render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>
    )

    const pantryLink = screen.getByText(/^Pantry$/i)
    const tripsLink = screen.getByText(/^Trips$/i)
    const householdLink = screen.getByText(/^Household$/i)

    expect(pantryLink.closest('a')).toHaveAttribute('href', '/inventory')
    expect(tripsLink.closest('a')).toHaveAttribute('href', '/shopping')
    expect(householdLink.closest('a')).toHaveAttribute('href', '/household')
  })

  it('applies correct styling to navigation items', () => {
    render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>
    )

    const pantryLink = screen.getByText(/^Pantry$/i)

    // Should have muted text by default (not active)
    expect(pantryLink.closest('a')?.className).toContain('text-text-tertiary')
  })

  it('renders in a fixed bottom position', () => {
    const { container } = render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>
    )

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0')
  })
})
