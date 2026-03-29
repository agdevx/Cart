// ABOUTME: Tests for StoreFilter shared component
// ABOUTME: Verifies All/Store tab rendering, sorting, and selection

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StoreFilter } from '../store-filter'

const mockStores = [
  { id: 's2', name: 'Walmart' },
  { id: 's1', name: 'Costco' },
]

const mockDisplayNames = new Map([
  ['s1', 'Costco'],
  ['s2', 'Walmart'],
])

describe('StoreFilter', () => {
  it('should render All tab and store tabs', () => {
    render(<StoreFilter value="all" onChange={vi.fn()} stores={mockStores} storeDisplayNames={mockDisplayNames} />)
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Costco' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Walmart' })).toBeInTheDocument()
  })

  it('should sort stores alphabetically', () => {
    render(<StoreFilter value="all" onChange={vi.fn()} stores={mockStores} storeDisplayNames={mockDisplayNames} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[1]).toHaveTextContent('Costco')
    expect(tabs[2]).toHaveTextContent('Walmart')
  })

  it('should call onChange when tab is clicked', async () => {
    const onChange = vi.fn()
    render(<StoreFilter value="all" onChange={onChange} stores={mockStores} storeDisplayNames={mockDisplayNames} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Costco' }))
    expect(onChange).toHaveBeenCalledWith('s1')
  })

  it('should mark active tab as selected', () => {
    render(<StoreFilter value="s1" onChange={vi.fn()} stores={mockStores} storeDisplayNames={mockDisplayNames} />)
    expect(screen.getByRole('tab', { name: 'Costco' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false')
  })
})
