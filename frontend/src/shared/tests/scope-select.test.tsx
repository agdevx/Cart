// ABOUTME: Tests for the ScopeSelect custom dropdown component
// ABOUTME: Verifies rendering, selection behavior, muted description styling, and close-on-select

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ScopeSelect } from '../scope-select'

const mockHouseholds = [
  { id: 'hh-1', name: 'The Smiths' },
  { id: 'hh-2', name: 'Roommates' },
]

describe('ScopeSelect', () => {
  it('renders personal option and household options when open', () => {
    render(
      <ScopeSelect
        value="personal"
        onChange={vi.fn()}
        personalLabel="Personal Item"
        households={mockHouseholds}
        householdDescription="Household"
        aria-label="Type"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Type' }))

    // Personal label appears in both trigger and dropdown
    expect(screen.getAllByText('Personal Item')).toHaveLength(2)
    expect(screen.getByText('The Smiths')).toBeInTheDocument()
    expect(screen.getByText('Roommates')).toBeInTheDocument()
  })

  it('renders household description text with text-text-tertiary class', () => {
    render(
      <ScopeSelect
        value="personal"
        onChange={vi.fn()}
        personalLabel="Personal Item"
        households={mockHouseholds}
        householdDescription="Household"
        aria-label="Type"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Type' }))

    const descriptions = screen.getAllByText('(Household)')
    for (const desc of descriptions) {
      expect(desc).toHaveClass('text-text-tertiary')
    }
  })

  it('calls onChange when an option is selected', () => {
    const onChange = vi.fn()

    render(
      <ScopeSelect
        value="personal"
        onChange={onChange}
        personalLabel="Personal Item"
        households={mockHouseholds}
        householdDescription="Household"
        aria-label="Type"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Type' }))
    fireEvent.click(screen.getByText('The Smiths'))

    expect(onChange).toHaveBeenCalledWith('hh-1')
  })

  it('shows selected household label with description when closed', () => {
    render(
      <ScopeSelect
        value="hh-1"
        onChange={vi.fn()}
        personalLabel="Personal Item"
        households={mockHouseholds}
        householdDescription="Household"
        aria-label="Type"
      />
    )

    expect(screen.getByText('The Smiths')).toBeInTheDocument()
    expect(screen.getByText('(Household)')).toBeInTheDocument()
  })

  it('closes dropdown after selection', () => {
    render(
      <ScopeSelect
        value="personal"
        onChange={vi.fn()}
        personalLabel="Personal Item"
        households={mockHouseholds}
        householdDescription="Household"
        aria-label="Type"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Type' }))

    // Dropdown should be open — multiple buttons visible
    expect(screen.getAllByRole('button').length).toBeGreaterThan(1)

    fireEvent.click(screen.getByText('The Smiths'))

    // After selection, dropdown should close — only the trigger button remains
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})
