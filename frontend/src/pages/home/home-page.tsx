// ABOUTME: Home page — placeholder for the home dashboard
// ABOUTME: Will display greeting, trip calendar, and weather summary

import { useTripsQuery } from '@/apis/agdevx-cart-api/trip/use-trips.query'
import { PageHeader } from '@/shared/page-header'

import { GreetingCard } from './components/greeting-card'
import { TripCalendar } from './components/trip-calendar'

export const HomePage = () => {
  const { data: trips = [] } = useTripsQuery()

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
          onDayClick={() => {}}
        />
      </div>
    </div>
  )
}
