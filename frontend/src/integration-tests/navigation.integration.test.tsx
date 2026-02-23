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

    expect(screen.getByText(/^Inventory$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Shopping$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Household$/i)).toBeInTheDocument()
  })

  it('renders navigation links with correct paths', () => {
    render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>
    )

    const inventoryLink = screen.getByText(/^Inventory$/i)
    const shoppingLink = screen.getByText(/^Shopping$/i)
    const householdLink = screen.getByText(/^Household$/i)

    expect(inventoryLink.closest('a')).toHaveAttribute('href', '/inventory')
    expect(shoppingLink.closest('a')).toHaveAttribute('href', '/shopping')
    expect(householdLink.closest('a')).toHaveAttribute('href', '/household')
  })

  it('applies correct styling to navigation items', () => {
    render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>
    )

    const inventoryLink = screen.getByText(/^Inventory$/i)

    // Should have gray text by default (not active)
    expect(inventoryLink.className).toContain('text-gray-600')
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
