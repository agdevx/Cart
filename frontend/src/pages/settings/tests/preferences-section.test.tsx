// ABOUTME: Tests for PreferencesSection component
// ABOUTME: Verifies default page selection, location display, and location input controls

import { createElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/apis/tanstack-query/query-client'
import { useUpdateUserPreferencesMutation } from '@/apis/agdevx-cart-api/user-preferences/update-user-preferences.mutation'
import { useUserPreferencesQuery } from '@/apis/agdevx-cart-api/user-preferences/use-user-preferences.query'

import { PreferencesSection } from '../preferences-section'

vi.mock('@/apis/agdevx-cart-api/user-preferences/use-user-preferences.query')
vi.mock('@/apis/agdevx-cart-api/user-preferences/update-user-preferences.mutation')

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children))

const mockMutate = vi.fn()

const setupMutation = () => {
  vi.mocked(useUpdateUserPreferencesMutation).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateUserPreferencesMutation>)
}

describe('PreferencesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    setupMutation()
  })

  it('renders all default page options', () => {
    vi.mocked(useUserPreferencesQuery).mockReturnValue({
      data: { defaultPage: '/shopping', locationLatitude: null, locationLongitude: null, locationDisplayName: null },
    } as unknown as ReturnType<typeof useUserPreferencesQuery>)

    render(createElement(PreferencesSection), { wrapper })

    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shopping' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pantry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Household' })).toBeInTheDocument()
  })

  it('highlights the current default page', () => {
    vi.mocked(useUserPreferencesQuery).mockReturnValue({
      data: { defaultPage: '/pantry', locationLatitude: null, locationLongitude: null, locationDisplayName: null },
    } as unknown as ReturnType<typeof useUserPreferencesQuery>)

    render(createElement(PreferencesSection), { wrapper })

    expect(screen.getByRole('button', { name: 'Pantry' }).className).toContain('bg-teal')
    expect(screen.getByRole('button', { name: 'Shopping' }).className).not.toContain('bg-teal')
  })

  it('shows location display name when location is set', () => {
    vi.mocked(useUserPreferencesQuery).mockReturnValue({
      data: { defaultPage: '/shopping', locationLatitude: 40.71, locationLongitude: -74.0, locationDisplayName: 'New York, NY' },
    } as unknown as ReturnType<typeof useUserPreferencesQuery>)

    render(createElement(PreferencesSection), { wrapper })

    expect(screen.getByText('New York, NY')).toBeInTheDocument()
  })

  it('shows "Use my location" button', () => {
    vi.mocked(useUserPreferencesQuery).mockReturnValue({
      data: { defaultPage: '/shopping', locationLatitude: null, locationLongitude: null, locationDisplayName: null },
    } as unknown as ReturnType<typeof useUserPreferencesQuery>)

    render(createElement(PreferencesSection), { wrapper })

    expect(screen.getByRole('button', { name: /use my location/i })).toBeInTheDocument()
  })

  it('shows manual city search input', () => {
    vi.mocked(useUserPreferencesQuery).mockReturnValue({
      data: { defaultPage: '/shopping', locationLatitude: null, locationLongitude: null, locationDisplayName: null },
    } as unknown as ReturnType<typeof useUserPreferencesQuery>)

    render(createElement(PreferencesSection), { wrapper })

    expect(screen.getByPlaceholderText('Search city...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('shows "No location set" when no location is configured', () => {
    vi.mocked(useUserPreferencesQuery).mockReturnValue({
      data: { defaultPage: '/shopping', locationLatitude: null, locationLongitude: null, locationDisplayName: null },
    } as unknown as ReturnType<typeof useUserPreferencesQuery>)

    render(createElement(PreferencesSection), { wrapper })

    expect(screen.getByText('No location set')).toBeInTheDocument()
  })

  it('shows Clear button when location is set', () => {
    vi.mocked(useUserPreferencesQuery).mockReturnValue({
      data: { defaultPage: '/shopping', locationLatitude: 40.71, locationLongitude: -74.0, locationDisplayName: 'New York, NY' },
    } as unknown as ReturnType<typeof useUserPreferencesQuery>)

    render(createElement(PreferencesSection), { wrapper })

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('defaults to /shopping as selected page when no preferences are loaded', () => {
    vi.mocked(useUserPreferencesQuery).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useUserPreferencesQuery>)

    render(createElement(PreferencesSection), { wrapper })

    expect(screen.getByRole('button', { name: 'Shopping' }).className).toContain('bg-teal')
  })
})
