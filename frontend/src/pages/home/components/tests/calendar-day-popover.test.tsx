// ABOUTME: Tests for the CalendarDayPopover component
// ABOUTME: Verifies date header, weather display, trip list, plan actions, and close callbacks

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { DailyWeather } from '@/apis/open-meteo/weather-types'

import { CalendarDayPopover } from '../calendar-day-popover'

const makeTrip = (overrides: Partial<Trip>): Trip => ({
  id: 'trip-1',
  name: 'Weekly Groceries',
  createdByUserId: 'user-1',
  isStarted: false,
  startedAt: null,
  isCompleted: false,
  completedAt: null,
  tripDate: '2026-03-29',
  createdBy: 'user-1',
  createdDate: '2026-01-01',
  modifiedBy: null,
  modifiedDate: null,
  ...overrides,
})

const mockWeather: DailyWeather = {
  date: '2026-03-29',
  weatherCode: 0,
  temperatureMax: 68,
}

describe('CalendarDayPopover', () => {
  const mockOnClose = vi.fn()
  const mockOnViewTrip = vi.fn()
  const mockOnPlanTrip = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows formatted date in the header', () => {
    render(
      <CalendarDayPopover
        date="2026-03-29"
        trips={[]}
        weather={null}
        onClose={mockOnClose}
        onViewTrip={mockOnViewTrip}
        onPlanTrip={mockOnPlanTrip}
      />
    )

    //== "Sun, March 29" — weekday depends on the actual date
    expect(screen.getByText(/March 29/)).toBeInTheDocument()
  })

  it('shows weather info when weather is provided', () => {
    render(
      <CalendarDayPopover
        date="2026-03-29"
        trips={[]}
        weather={mockWeather}
        onClose={mockOnClose}
        onViewTrip={mockOnViewTrip}
        onPlanTrip={mockOnPlanTrip}
      />
    )

    //== Temperature should be visible in the header area
    expect(screen.getByText(/68°F/)).toBeInTheDocument()
  })

  it('lists trips for the selected day', () => {
    const trips = [
      makeTrip({ id: 'trip-1', name: 'Weekly Groceries' }),
      makeTrip({ id: 'trip-2', name: 'Costco Run', isCompleted: true }),
    ]

    render(
      <CalendarDayPopover
        date="2026-03-29"
        trips={trips}
        weather={null}
        onClose={mockOnClose}
        onViewTrip={mockOnViewTrip}
        onPlanTrip={mockOnPlanTrip}
      />
    )

    expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    expect(screen.getByText('Costco Run')).toBeInTheDocument()
  })

  it('shows "Plan a trip" when no trips exist', () => {
    render(
      <CalendarDayPopover
        date="2026-03-29"
        trips={[]}
        weather={null}
        onClose={mockOnClose}
        onViewTrip={mockOnViewTrip}
        onPlanTrip={mockOnPlanTrip}
      />
    )

    expect(screen.getByText('Plan a trip')).toBeInTheDocument()
  })

  it('shows "Plan another trip" when trips exist', () => {
    const trips = [makeTrip({ id: 'trip-1', name: 'Weekly Groceries' })]

    render(
      <CalendarDayPopover
        date="2026-03-29"
        trips={trips}
        weather={null}
        onClose={mockOnClose}
        onViewTrip={mockOnViewTrip}
        onPlanTrip={mockOnPlanTrip}
      />
    )

    expect(screen.getByText('Plan another trip')).toBeInTheDocument()
  })

  it('calls onViewTrip when a trip row is clicked', async () => {
    const user = userEvent.setup()
    const trips = [makeTrip({ id: 'trip-1', name: 'Weekly Groceries' })]

    render(
      <CalendarDayPopover
        date="2026-03-29"
        trips={trips}
        weather={null}
        onClose={mockOnClose}
        onViewTrip={mockOnViewTrip}
        onPlanTrip={mockOnPlanTrip}
      />
    )

    await user.click(screen.getByText('Weekly Groceries'))

    expect(mockOnViewTrip).toHaveBeenCalledWith('trip-1')
  })

  it('calls onPlanTrip when the plan button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <CalendarDayPopover
        date="2026-03-29"
        trips={[]}
        weather={null}
        onClose={mockOnClose}
        onViewTrip={mockOnViewTrip}
        onPlanTrip={mockOnPlanTrip}
      />
    )

    await user.click(screen.getByText('Plan a trip'))

    expect(mockOnPlanTrip).toHaveBeenCalledWith('2026-03-29')
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()

    render(
      <CalendarDayPopover
        date="2026-03-29"
        trips={[]}
        weather={null}
        onClose={mockOnClose}
        onViewTrip={mockOnViewTrip}
        onPlanTrip={mockOnPlanTrip}
      />
    )

    //== The backdrop is the fixed overlay div behind the popover card
    const backdrop = document.querySelector('.fixed.inset-0')
    expect(backdrop).toBeInTheDocument()

    await user.click(backdrop!)

    expect(mockOnClose).toHaveBeenCalled()
  })
})
