// ABOUTME: Tests for ScopeFilter shared component
// ABOUTME: Verifies All/Personal/Household tab rendering, sorting, and selection

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ScopeFilter } from '../scope-filter'

const mockHouseholds = [
  { id: 'h2', name: 'Beta House' },
  { id: 'h1', name: 'Alpha House' },
]

describe('ScopeFilter', () => {
  it('should render All, Personal, and household tabs', () => {
    render(<ScopeFilter value="all" onChange={vi.fn()} households={mockHouseholds} />)
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Personal' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Alpha House' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Beta House' })).toBeInTheDocument()
  })

  it('should sort households alphabetically', () => {
    render(<ScopeFilter value="all" onChange={vi.fn()} households={mockHouseholds} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[2]).toHaveTextContent('Alpha House')
    expect(tabs[3]).toHaveTextContent('Beta House')
  })

  it('should call onChange when tab is clicked', async () => {
    const onChange = vi.fn()
    render(<ScopeFilter value="all" onChange={onChange} households={mockHouseholds} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Personal' }))
    expect(onChange).toHaveBeenCalledWith('personal')
  })

  it('should call onChange with household id when household tab is clicked', async () => {
    const onChange = vi.fn()
    render(<ScopeFilter value="all" onChange={onChange} households={mockHouseholds} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Alpha House' }))
    expect(onChange).toHaveBeenCalledWith('h1')
  })

  it('should mark active tab as selected', () => {
    render(<ScopeFilter value="personal" onChange={vi.fn()} households={mockHouseholds} />)
    expect(screen.getByRole('tab', { name: 'Personal' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false')
  })
})
