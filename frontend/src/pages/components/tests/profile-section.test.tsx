// ABOUTME: Tests for ProfileSection component
// ABOUTME: Verifies view/edit modes, conditional password field, and form behavior

import { createElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'

import { ProfileSection } from '../profile-section'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children))

const defaultProps = {
  user: { id: '123', email: 'test@example.com', name: 'Test User', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
  isEditing: false,
  onStartEdit: vi.fn(),
  onCancel: vi.fn(),
  onSaved: vi.fn(),
}

describe('ProfileSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('renders view mode with name and email', () => {
    render(createElement(ProfileSection, defaultProps), { wrapper })
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('renders labels above values in view mode', () => {
    render(createElement(ProfileSection, defaultProps), { wrapper })
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders edit form when isEditing is true', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('does not show password field when email is unchanged', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument()
  })

  it('shows password field when email is changed', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    expect(screen.getByText('Required to change your email')).toBeInTheDocument()
  })

  it('hides password field when email is reverted to original', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument()
  })

  it('calls onStartEdit when Edit is clicked', () => {
    render(createElement(ProfileSection, defaultProps), { wrapper })
    fireEvent.click(screen.getByText('Edit'))
    expect(defaultProps.onStartEdit).toHaveBeenCalled()
  })

  it('calls onCancel when Cancel is clicked', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('enforces maxLength on name input', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const nameInput = screen.getByDisplayValue('Test User')
    expect(nameInput).toHaveAttribute('maxLength', '64')
  })

  it('enforces maxLength on email input', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const emailInput = screen.getByDisplayValue('test@example.com')
    expect(emailInput).toHaveAttribute('maxLength', '254')
  })

  it('disables save when name is empty', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: '' } })
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('disables save when email is invalid', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } })
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('disables save when email changed but password empty', () => {
    render(createElement(ProfileSection, { ...defaultProps, isEditing: true }), { wrapper })
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })
})
