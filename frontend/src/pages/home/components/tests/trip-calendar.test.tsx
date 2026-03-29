// ABOUTME: Tests for the TripCalendar component
// ABOUTME: Verifies month navigation, trip dots, day click, and legend rendering

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { WeatherByDate } from '@/apis/open-meteo/weather-types'

import { TripCalendar } from '../trip-calendar'

const emptyWeather: WeatherByDate = {}

const makeTrip = (overrides: Partial<Trip>): Trip => ({
  id: 'trip-1',
  name: 'Test Trip',
  createdByUserId: 'user-1',
  isStarted: false,
  startedAt: null,
  isCompleted: false,
  completedAt: null,
  tripDate: null,
  createdBy: 'user-1',
  createdDate: '2026-01-01',
  modifiedBy: null,
  modifiedDate: null,
  ...overrides,
})

describe('TripCalendar', () => {
  const mockOnDayClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders current month and year in the header', () => {
    render(
      <TripCalendar trips={[]} weatherByDate={emptyWeather} onDayClick={mockOnDayClick} showWeatherIcons={true} showWeatherTemps={true} />
    )

    const now = new Date()
    const expectedLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })

  it('navigates to the next month on right arrow click', async () => {
    const user = userEvent.setup()

    render(
      <TripCalendar trips={[]} weatherByDate={emptyWeather} onDayClick={mockOnDayClick} showWeatherIcons={true} showWeatherTemps={true} />
    )

    await user.click(screen.getByLabelText('Next month'))

    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const expectedLabel = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })

  it('navigates to the previous month on left arrow click', async () => {
    const user = userEvent.setup()

    render(
      <TripCalendar trips={[]} weatherByDate={emptyWeather} onDayClick={mockOnDayClick} showWeatherIcons={true} showWeatherTemps={true} />
    )

    await user.click(screen.getByLabelText('Previous month'))

    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const expectedLabel = prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })

  it('shows trip dots for trips with a matching tripDate', () => {
    const today = new Date()
    const tripDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`

    const trips: Trip[] = [
      makeTrip({ id: 'trip-a', tripDate: tripDateStr, isCompleted: false }),
      makeTrip({ id: 'trip-b', tripDate: tripDateStr, isCompleted: true }),
    ]

    render(
      <TripCalendar trips={trips} weatherByDate={emptyWeather} onDayClick={mockOnDayClick} showWeatherIcons={true} showWeatherTemps={true} />
    )

    //== Two dots should appear for day 15 (one amber/planned, one teal/completed)
    const amberDots = document.querySelectorAll('.bg-amber')
    const tealDots = document.querySelectorAll('.bg-teal')

    expect(amberDots.length).toBeGreaterThan(0)
    expect(tealDots.length).toBeGreaterThan(0)
  })

  it('calls onDayClick when a day is clicked', async () => {
    const user = userEvent.setup()

    // Use today's date — it is always clickable (not a past date with no content)
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    render(
      <TripCalendar trips={[]} weatherByDate={emptyWeather} onDayClick={mockOnDayClick} showWeatherIcons={true} showWeatherTemps={true} />
    )

    const dayButton = screen.getByLabelText(new RegExp(`^${day} ${dayStr}.*today`))
    await user.click(dayButton)

    expect(mockOnDayClick).toHaveBeenCalledWith(dayStr)
  })

  it('renders legend with Completed and Planned labels', () => {
    render(
      <TripCalendar trips={[]} weatherByDate={emptyWeather} onDayClick={mockOnDayClick} showWeatherIcons={true} showWeatherTemps={true} />
    )

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Planned')).toBeInTheDocument()
  })
})
