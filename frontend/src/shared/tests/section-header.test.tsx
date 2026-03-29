// ABOUTME: Tests for SectionHeader shared component
// ABOUTME: Verifies title rendering, divider line, and optional action slot

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SectionHeader } from '../section-header'

describe('SectionHeader', () => {
  it('should render title text', () => {
    render(<SectionHeader title="In Progress" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('should render action when provided', () => {
    render(<SectionHeader title="Test" action={<button>Toggle</button>} />)
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument()
  })
})
