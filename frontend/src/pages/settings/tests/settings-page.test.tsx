// ABOUTME: Tests for SettingsPage component
// ABOUTME: Verifies grouped-list layout with profile, security, and logout sections

import { createElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'

import { SettingsPage } from '../settings-page'

// Mock useAuth to provide a user
vi.mock('@/auth/use-auth', () => ({
  useAuth: () => ({
    user: { id: '123', email: 'test@example.com', name: 'Test User', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    isAuthenticated: true,
    setAuth: vi.fn(),
    logout: vi.fn(),
  }),
}))

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children))

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('renders Settings heading', () => {
    render(createElement(SettingsPage), { wrapper })
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders profile section with user data', () => {
    render(createElement(SettingsPage), { wrapper })
    // "Test User" appears in both PageHeader and ProfileSection
    const userNames = screen.getAllByText('Test User')
    expect(userNames.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('renders security section', () => {
    render(createElement(SettingsPage), { wrapper })
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByText('Change')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    render(createElement(SettingsPage), { wrapper })
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  it('collapses profile when security edit is started', () => {
    render(createElement(SettingsPage), { wrapper })
    // Start profile edit
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    // Start security edit — profile should collapse
    fireEvent.click(screen.getByText('Change'))
    expect(screen.queryByDisplayValue('Test User')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
  })

  it('collapses security when profile edit is started', () => {
    render(createElement(SettingsPage), { wrapper })
    // Start security edit
    fireEvent.click(screen.getByText('Change'))
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    // Start profile edit — security should collapse
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
  })

  it('discards unsaved profile changes when switching to security', () => {
    render(createElement(SettingsPage), { wrapper })
    // Start profile edit and change the name
    fireEvent.click(screen.getByText('Edit'))
    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: 'Changed Name' } })
    expect(screen.getByDisplayValue('Changed Name')).toBeInTheDocument()
    // Switch to security — profile collapses
    fireEvent.click(screen.getByText('Change'))
    // Switch back to profile — name should be original, not 'Changed Name'
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Changed Name')).not.toBeInTheDocument()
  })
})
