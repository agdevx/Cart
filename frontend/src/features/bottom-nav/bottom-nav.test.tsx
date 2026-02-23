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
    expect(screen.getByText('Pantry')).toBeInTheDocument()
    expect(screen.getByText('Trips')).toBeInTheDocument()
    expect(screen.getByText('Household')).toBeInTheDocument()
  })

  it('highlights the active tab based on current route', () => {
    renderWithRouter('/shopping')
    const tripsLink = screen.getByText('Trips').closest('a')
    expect(tripsLink?.className).toContain('text-teal')
  })

  it('sets inactive tabs to muted color', () => {
    renderWithRouter('/shopping')
    const pantryLink = screen.getByText('Pantry').closest('a')
    const householdLink = screen.getByText('Household').closest('a')
    expect(pantryLink?.className).toContain('text-text-tertiary')
    expect(householdLink?.className).toContain('text-text-tertiary')
  })
})
