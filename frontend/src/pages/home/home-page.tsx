// ABOUTME: Home page — placeholder for the home dashboard
// ABOUTME: Will display greeting, trip calendar, and weather summary

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useTripsQuery } from '@/apis/agdevx-cart-api/trip/use-trips.query'
import { tripDetailPath } from '@/routes'
import { PageHeader } from '@/shared/page-header'

import { CalendarDayPopover } from './components/calendar-day-popover'
import { GreetingCard } from './components/greeting-card'
import { TripCalendar } from './components/trip-calendar'

export const HomePage = () => {
  const { data: trips = [] } = useTripsQuery()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  return (
    <div className="pb-4 animate-fade-in">
      <PageHeader>Home</PageHeader>

      <div className="px-5 space-y-3">
        <GreetingCard
          locationName={null}
          currentWeatherEmoji={null}
          currentTemperature={null}
          currentCondition={null}
        />

        <TripCalendar
          trips={trips}
          weatherByDate={{}}
          onDayClick={setSelectedDate}
        />
      </div>

      {selectedDate && (
        <CalendarDayPopover
          date={selectedDate}
          trips={trips.filter(t => t.tripDate === selectedDate)}
          weather={null}
          onClose={() => setSelectedDate(null)}
          onViewTrip={(tripId) => {
            setSelectedDate(null)
            navigate(tripDetailPath(tripId))
          }}
          onPlanTrip={(_date) => {
            setSelectedDate(null)
            // TODO: navigate to create trip with pre-filled date
          }}
        />
      )}
    </div>
  )
}
