// ABOUTME: Tests for ScopeFilter shared component
// ABOUTME: Verifies All/Personal/Household tab rendering and selection

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ScopeFilter } from '../scope-filter'

const mockHousehold = { id: 'h1', name: 'Alpha House' }

describe('ScopeFilter', () => {
  it('should render All, Personal, and household tabs', () => {
    render(<ScopeFilter value="all" onChange={vi.fn()} household={mockHousehold} />)
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Personal' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Alpha House Household' })).toBeInTheDocument()
  })

  it('should return null when household is null', () => {
    const { container } = render(<ScopeFilter value="all" onChange={vi.fn()} household={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('should call onChange when tab is clicked', async () => {
    const onChange = vi.fn()
    render(<ScopeFilter value="all" onChange={onChange} household={mockHousehold} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Personal' }))
    expect(onChange).toHaveBeenCalledWith('personal')
  })

  it('should call onChange with household id when household tab is clicked', async () => {
    const onChange = vi.fn()
    render(<ScopeFilter value="all" onChange={onChange} household={mockHousehold} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Alpha House Household' }))
    expect(onChange).toHaveBeenCalledWith('h1')
  })

  it('should mark active tab as selected', () => {
    render(<ScopeFilter value="personal" onChange={vi.fn()} household={mockHousehold} />)
    expect(screen.getByRole('tab', { name: 'Personal' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false')
  })
})
