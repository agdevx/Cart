// ABOUTME: Tests for the GreetingCard component
// ABOUTME: Verifies conditional rendering based on auth state and weather/location props

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as useAuthModule from '@/auth/use-auth'

import { GreetingCard } from '../greeting-card'

const mockUser = {
  id: 'user-1',
  email: 'august@example.com',
  name: 'August',
  createdBy: null,
  createdDate: '2026-01-01',
  modifiedBy: null,
  modifiedDate: null,
}

const setupAuth = (name: string | null) => {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: name !== null,
    user: name !== null ? { ...mockUser, name } : null,
    setAuth: vi.fn(),
    logout: vi.fn(),
  })
}

describe('GreetingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders greeting with user name', () => {
    setupAuth('August')

    render(
      <GreetingCard
        locationName={null}
        currentWeatherEmoji={null}
        currentTemperature={null}
        currentCondition={null}
      />
    )

    expect(screen.getByText(/August/)).toBeInTheDocument()
  })

  it('returns null when no user name', () => {
    setupAuth(null)

    const { container } = render(
      <GreetingCard
        locationName={null}
        currentWeatherEmoji={null}
        currentTemperature={null}
        currentCondition={null}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('shows location when provided', () => {
    setupAuth('August')

    render(
      <GreetingCard
        locationName="Denver, CO"
        currentWeatherEmoji={null}
        currentTemperature={null}
        currentCondition={null}
      />
    )

    expect(screen.getByText(/Denver, CO/)).toBeInTheDocument()
  })

  it('shows weather when provided', () => {
    setupAuth('August')

    render(
      <GreetingCard
        locationName={null}
        currentWeatherEmoji="☀️"
        currentTemperature={72}
        currentCondition="Clear"
      />
    )

    //== Temperature and condition should be visible
    expect(screen.getByText(/72°F/)).toBeInTheDocument()
    expect(screen.getByText(/Clear/)).toBeInTheDocument()
  })

  it('shows greeting without weather or location when those are null', () => {
    setupAuth('August')

    render(
      <GreetingCard
        locationName={null}
        currentWeatherEmoji={null}
        currentTemperature={null}
        currentCondition={null}
      />
    )

    expect(screen.getByText(/August/)).toBeInTheDocument()
    expect(screen.queryByText(/°F/)).not.toBeInTheDocument()
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument()
  })
})
