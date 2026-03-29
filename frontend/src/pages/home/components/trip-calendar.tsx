// ABOUTME: Monthly calendar grid component for the home page dashboard
// ABOUTME: Displays weather tints as cell backgrounds and trip indicator dots

import { useMemo, useState } from 'react'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import type { WeatherByDate } from '@/apis/open-meteo/weather-types'
import { getWeatherTintColor } from '@/utils/weather'

interface TripCalendarProps {
  readonly trips: Trip[]
  readonly weatherByDate: WeatherByDate
  readonly onDayClick: (date: string) => void
}

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const TripCalendar = ({ trips, weatherByDate, onDayClick }: TripCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const today = new Date()
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Group trips by date for efficient lookup
  const tripsByDate = useMemo(() => {
    const map = new Map<string, Trip[]>()

    for (const trip of trips) {
      if (!trip.tripDate) { continue }

      const dateKey = trip.tripDate.slice(0, 10)
      const existing = map.get(dateKey)

      if (existing) {
        existing.push(trip)
      } else {
        map.set(dateKey, [trip])
      }
    }

    return map
  }, [trips])

  // Build the grid of day cells
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days: Array<{ year: number; month: number; day: number; isCurrentMonth: boolean }> = []

    // Leading days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const prevMonth = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      days.push({ year: prevYear, month: prevMonth, day: daysInPrevMonth - i, isCurrentMonth: false })
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ year, month, day: d, isCurrentMonth: true })
    }

    // Trailing days from next month to fill the last row
    const remainder = days.length % 7
    if (remainder > 0) {
      const trailingCount = 7 - remainder
      const nextMonth = month === 11 ? 0 : month + 1
      const nextYear = month === 11 ? year + 1 : year

      for (let d = 1; d <= trailingCount; d++) {
        days.push({ year: nextYear, month: nextMonth, day: d, isCurrentMonth: false })
      }
    }

    return days
  }, [year, month])

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-gradient-to-br from-navy to-navy-soft rounded-xl px-4 py-4">
      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPrevMonth}
          className="p-1 text-navy-muted hover:text-teal-light transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>

        <h2 className="text-sm font-display font-bold text-teal-light">{monthLabel}</h2>

        <button
          onClick={goToNextMonth}
          className="p-1 text-navy-muted hover:text-teal-light transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((label, i) => (
          <div key={i} className="text-center text-xs font-body text-navy-muted py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((cell, i) => {
          const dateStr = formatDate(cell.year, cell.month, cell.day)
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr
          const weather = weatherByDate[dateStr]
          const dayTrips = cell.isCurrentMonth ? tripsByDate.get(dateStr) : undefined

          // Weather tint only for current month days with weather data
          const bgStyle: React.CSSProperties = {}
          if (cell.isCurrentMonth && weather) {
            bgStyle.backgroundColor = getWeatherTintColor(weather.weatherCode, weather.temperatureMax, isPast)
          }

          // Text styling based on date type
          let textClass = 'text-text-primary'
          if (!cell.isCurrentMonth) {
            textClass = 'text-text-tertiary'
          } else if (isPast) {
            textClass = 'text-text-secondary'
          }

          // Trip dots (max 3)
          const dots = dayTrips?.slice(0, 3) ?? []

          return (
            <button
              key={i}
              onClick={() => onDayClick(dateStr)}
              className={`
                relative flex flex-col items-center justify-start
                rounded-md py-1 min-h-[2.75rem]
                text-xs font-body transition-colors
                hover:ring-1 hover:ring-teal/30
                ${textClass}
                ${isToday ? 'font-bold ring-2 ring-inset ring-teal' : ''}
              `}
              style={bgStyle}
              aria-label={`${cell.day} ${dateStr}${isToday ? ', today' : ''}`}
            >
              <span>{cell.day}</span>

              {dots.length > 0 && (
                <div className={`flex gap-0.5 mt-0.5 ${isPast ? 'opacity-60' : ''}`}>
                  {dots.map((trip, j) => (
                    <span
                      key={j}
                      className={`w-1.5 h-1.5 rounded-full ${trip.isCompleted ? 'bg-teal' : 'bg-amber'}`}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getWeatherTintColor(0, 75, false) }}
          />
          <span className="text-[10px] text-navy-muted">Sunny</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getWeatherTintColor(3, 75, false) }}
          />
          <span className="text-[10px] text-navy-muted">Cloudy</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getWeatherTintColor(61, 75, false) }}
          />
          <span className="text-[10px] text-navy-muted">Rain</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal" />
          <span className="text-[10px] text-navy-muted">Completed</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber" />
          <span className="text-[10px] text-navy-muted">Planned</span>
        </div>

        <span className="text-[10px] text-text-tertiary italic">Stronger color = warmer</span>
      </div>
    </div>
  )
}
