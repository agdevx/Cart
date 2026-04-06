// ABOUTME: Tests for FormField shared component
// ABOUTME: Verifies label, error display, and children rendering

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FormField } from '../form-field'

describe('FormField', () => {
  it('should render label and children', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>
    )
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render error message when provided', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Required">
        <input id="email" />
      </FormField>
    )
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('should apply error styling to label when error is present', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Required">
        <input id="email" />
      </FormField>
    )
    const label = screen.getByText('Email').closest('label')!
    expect(label.className).toContain('text-coral')
  })

  it('should apply default styling to label when no error', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>
    )
    const label = screen.getByText('Email').closest('label')!
    expect(label.className).toContain('text-navy-soft')
  })

  it('should apply required-field class when required', () => {
    render(
      <FormField label="Email" htmlFor="email" required>
        <input id="email" />
      </FormField>
    )
    expect(screen.getByText('Email').className).toContain('required-field')
  })

  it('should not apply required-field class when not required', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>
    )
    expect(screen.getByText('Email').className).not.toContain('required-field')
  })
})
