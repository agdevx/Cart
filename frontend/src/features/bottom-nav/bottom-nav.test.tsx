import { BrowserRouter } from 'react-router-dom'

import { render, screen } from '@testing-library/react'
import { describe, expect,it } from 'vitest'

import { BottomNav } from './bottom-nav'

const renderWithRouter = (initialRoute = '/shopping') => {
  window.history.pushState({}, '', initialRoute)
  return render(
    <BrowserRouter>
      <BottomNav />
    </BrowserRouter>
  )
}

describe('BottomNav', () => {
  it('renders all three navigation tabs', () => {
    renderWithRouter()
    expect(screen.getByText('Inventory')).toBeInTheDocument()
    expect(screen.getByText('Shopping')).toBeInTheDocument()
    expect(screen.getByText('Household')).toBeInTheDocument()
  })

  it('highlights the active tab based on current route', () => {
    renderWithRouter('/shopping')
    const shoppingLink = screen.getByText('Shopping')
    expect(shoppingLink).toHaveClass('text-blue-600')
  })

  it('sets inactive tabs to gray', () => {
    renderWithRouter('/shopping')
    const inventoryLink = screen.getByText('Inventory')
    const householdLink = screen.getByText('Household')
    expect(inventoryLink).toHaveClass('text-gray-600')
    expect(householdLink).toHaveClass('text-gray-600')
  })
})
