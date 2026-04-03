// ABOUTME: Integration tests for the HomePage component
// ABOUTME: Verifies that greeting card and calendar render with mocked data hooks

import { BrowserRouter } from 'react-router-dom'

import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as tripsQueryModule from '@/apis/agdevx-cart-api/trip/use-trips.query'
import * as userPreferencesQueryModule from '@/apis/agdevx-cart-api/user-preferences/use-user-preferences.query'
import * as forecastWeatherModule from '@/apis/open-meteo/use-forecast-weather.query'
import * as historicalWeatherModule from '@/apis/open-meteo/use-historical-weather.query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import { HomePage } from '../home-page'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
)

const setupMocks = () => {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: true,
    user: {
      id: 'user-1',
      email: 'august@example.com',
      name: 'August',
      createdBy: null,
      createdDate: '2026-01-01',
      modifiedBy: null,
      modifiedDate: null,
    },
    setAuth: vi.fn(),
    logout: vi.fn(),
  })

  vi.spyOn(tripsQueryModule, 'useTripsQuery').mockReturnValue({
    data: [],
    isLoading: false,
  } as unknown as ReturnType<typeof tripsQueryModule.useTripsQuery>)

  vi.spyOn(userPreferencesQueryModule, 'useUserPreferencesQuery').mockReturnValue({
    data: undefined,
    isLoading: false,
  } as unknown as ReturnType<typeof userPreferencesQueryModule.useUserPreferencesQuery>)

  vi.spyOn(forecastWeatherModule, 'useForecastWeatherQuery').mockReturnValue({
    data: undefined,
    isLoading: false,
  } as unknown as ReturnType<typeof forecastWeatherModule.useForecastWeatherQuery>)

  vi.spyOn(historicalWeatherModule, 'useHistoricalWeatherQuery').mockReturnValue({
    data: undefined,
    isLoading: false,
  } as unknown as ReturnType<typeof historicalWeatherModule.useHistoricalWeatherQuery>)
}

describe('HomePage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the greeting card with the authenticated user name', () => {
    setupMocks()
    render(<HomePage />, { wrapper })

    expect(screen.getByText(/August/)).toBeInTheDocument()
  })

  it('renders the trip calendar with current month header', () => {
    setupMocks()
    render(<HomePage />, { wrapper })

    const now = new Date()
    const expectedLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })

  it('renders the Home page header', () => {
    setupMocks()
    render(<HomePage />, { wrapper })

    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('navigates to /shopping?planDate=YYYY-MM-DD when "Plan a trip" is clicked', async () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 15), shouldAdvanceTime: true })
    const user = userEvent.setup()

    setupMocks()

    render(<HomePage />, { wrapper })

    //== Click a future day (March 20) to open the popover
    const dayButton = screen.getByLabelText(/^20 2026-03-20/)
    await user.click(dayButton)

    //== Popover should appear with "Plan a trip" action
    const planButton = await screen.findByText('Plan a trip')
    await user.click(planButton)

    expect(mockNavigate).toHaveBeenCalledWith('/shopping?planDate=2026-03-20')
  })

  it('shows loading state by not crashing when queries are pending', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'user-1',
        email: 'august@example.com',
        name: 'August',
        createdBy: null,
        createdDate: '2026-01-01',
        modifiedBy: null,
        modifiedDate: null,
      },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(tripsQueryModule, 'useTripsQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof tripsQueryModule.useTripsQuery>)

    vi.spyOn(userPreferencesQueryModule, 'useUserPreferencesQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof userPreferencesQueryModule.useUserPreferencesQuery>)

    vi.spyOn(forecastWeatherModule, 'useForecastWeatherQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof forecastWeatherModule.useForecastWeatherQuery>)

    vi.spyOn(historicalWeatherModule, 'useHistoricalWeatherQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof historicalWeatherModule.useHistoricalWeatherQuery>)

    //== Page should still render the skeleton structure without crashing
    render(<HomePage />, { wrapper })

    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
