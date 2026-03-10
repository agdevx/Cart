// ABOUTME: Tests for SecuritySection component
// ABOUTME: Verifies view/edit modes, password requirements, and form behavior

import { createElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'

import { SecuritySection } from '../security-section'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children))

const defaultProps = {
  isEditing: false,
  onStartEdit: vi.fn(),
  onCancel: vi.fn(),
  onSaved: vi.fn(),
}

describe('SecuritySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('renders view mode with password placeholder', () => {
    render(createElement(SecuritySection, defaultProps), { wrapper })
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByText('••••••••')).toBeInTheDocument()
    expect(screen.getByText('Change')).toBeInTheDocument()
  })

  it('renders edit form when isEditing is true', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('shows password requirements checklist', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    expect(screen.getByText(/8\+ characters/)).toBeInTheDocument()
    expect(screen.getByText(/One uppercase letter/)).toBeInTheDocument()
    expect(screen.getByText(/One number/)).toBeInTheDocument()
  })

  it('updates requirement indicators as password changes', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    const newPasswordInput = screen.getByLabelText(/^new password$/i)
    fireEvent.change(newPasswordInput, { target: { value: 'Abcdefg1' } })
    // All three requirements met — check marks should show
    expect(screen.getByText('✓ 8+ characters')).toBeInTheDocument()
    expect(screen.getByText('✓ One uppercase letter')).toBeInTheDocument()
    expect(screen.getByText('✓ One number')).toBeInTheDocument()
  })

  it('calls onStartEdit when Change is clicked', () => {
    render(createElement(SecuritySection, defaultProps), { wrapper })
    fireEvent.click(screen.getByText('Change'))
    expect(defaultProps.onStartEdit).toHaveBeenCalled()
  })

  it('calls onCancel when Cancel is clicked', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('enforces maxLength on password inputs', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    expect(screen.getByLabelText(/current password/i)).toHaveAttribute('maxLength', '128')
    expect(screen.getByLabelText(/^new password$/i)).toHaveAttribute('maxLength', '128')
    expect(screen.getByLabelText(/confirm new password/i)).toHaveAttribute('maxLength', '128')
  })

  it('disables save when confirm password does not match', () => {
    render(createElement(SecuritySection, { ...defaultProps, isEditing: true }), { wrapper })
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'OldPass123!' } })
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'NewPass456!' } })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'Mismatch789!' } })
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('shows success message after password change', () => {
    // SecuritySection accepts an optional successMessage prop for view mode display
    render(createElement(SecuritySection, { ...defaultProps, successMessage: 'Password updated' }), { wrapper })
    expect(screen.getByText('Password updated')).toBeInTheDocument()
  })
})
