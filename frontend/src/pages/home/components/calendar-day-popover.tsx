// ABOUTME: Popover card shown when a user taps a calendar day on the home page
// ABOUTME: Displays weather summary and trip list for the selected date, with a "plan trip" action

import { useEffect } from 'react'

import { Plus, ShoppingCart } from 'lucide-react'

import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { DailyWeather } from '@/apis/open-meteo/weather-types'
import { getWeatherEmoji, getWeatherLabel } from '@/utils/weather'

interface CalendarDayPopoverProps {
  readonly date: string              // "YYYY-MM-DD"
  readonly trips: Trip[]             // trips for this specific day
  readonly weather: DailyWeather | null
  readonly onClose: () => void
  readonly onViewTrip: (tripId: string) => void
  readonly onPlanTrip: (date: string) => void
}

/** Parses a "YYYY-MM-DD" string into a display label like "Mon, March 30". */
function formatDisplayDate(dateStr: string): string {
  // Parse by splitting to avoid timezone offset shifting the date
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })
}

export const CalendarDayPopover = ({
  date,
  trips,
  weather,
  onClose,
  onViewTrip,
  onPlanTrip,
}: CalendarDayPopoverProps) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const displayDate = formatDisplayDate(date)

  const weatherSummary = weather
    ? `— ${getWeatherEmoji(weather.weatherCode)} ${Math.round(weather.temperatureMax)}°F ${getWeatherLabel(weather.weatherCode)}`
    : null

  const planLabel = trips.length > 0 ? 'Plan another trip' : 'Plan a trip'

  return (
    <>
      {/* Backdrop — closes the popover on click */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Trips for ${displayDate}`}
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md px-4 pb-6 animate-slide-up"
      >
        <div className="bg-surface rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <p className="text-text-secondary text-sm font-semibold">
              {displayDate}
              {weatherSummary && (
                <span className="font-normal"> {weatherSummary}</span>
              )}
            </p>
          </div>

          {/* Trip list */}
          <div className="px-5 space-y-2">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-bg rounded-lg p-3 cursor-pointer flex items-center gap-3 hover:opacity-80 transition-opacity"
                onClick={() => onViewTrip(trip.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onViewTrip(trip.id)
                  }
                }}
              >
                {/* Status icon */}
                <ShoppingCart
                  size={18}
                  className={trip.isCompleted ? 'text-teal' : 'text-amber'}
                />

                {/* Trip name */}
                <span className="flex-1 text-sm font-semibold text-text-primary">
                  {trip.name}
                </span>

                {/* Status label */}
                <span className="text-xs text-text-secondary">
                  {trip.isCompleted ? 'Completed' : 'Planned'}
                </span>
              </div>
            ))}
          </div>

          {/* Plan trip action */}
          <div className="px-5 pt-2 pb-5">
            <div
              className="bg-bg rounded-lg p-3 cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity"
              onClick={() => onPlanTrip(date)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onPlanTrip(date)
                }
              }}
            >
              <Plus size={16} className="text-teal" />
              <span className="text-sm font-semibold text-teal">{planLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
