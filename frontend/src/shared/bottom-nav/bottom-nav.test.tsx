import { BrowserRouter } from 'react-router-dom'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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
  it('renders all five navigation tabs', () => {
    renderWithRouter()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Shopping')).toBeInTheDocument()
    expect(screen.getByText('Pantry')).toBeInTheDocument()
    expect(screen.getByText('Household')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders Home tab first linking to /home', () => {
    renderWithRouter()
    const homeLink = screen.getByText('Home').closest('a')
    expect(homeLink).toHaveAttribute('href', '/home')

    const allLinks = screen.getAllByRole('link')
    expect(allLinks[0]).toBe(homeLink)
  })

  it('highlights the active tab based on current route', () => {
    renderWithRouter('/shopping')
    const shoppingLink = screen.getByText('Shopping').closest('a')
    expect(shoppingLink?.className).toContain('text-teal')
  })

  it('sets inactive tabs to muted color', () => {
    renderWithRouter('/shopping')
    const pantryLink = screen.getByText('Pantry').closest('a')
    const householdLink = screen.getByText('Household').closest('a')
    expect(pantryLink?.className).toContain('text-text-tertiary')
    expect(householdLink?.className).toContain('text-text-tertiary')
  })

  it('highlights Home tab when on /home route', () => {
    renderWithRouter('/home')
    const homeLink = screen.getByText('Home').closest('a')
    expect(homeLink?.className).toContain('text-teal')
  })
})
