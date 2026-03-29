// ABOUTME: Home page — placeholder for the home dashboard
// ABOUTME: Will display greeting, trip calendar, and weather summary

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useTripsQuery } from '@/apis/agdevx-cart-api/trip/use-trips.query'
import { useUserPreferencesQuery } from '@/apis/agdevx-cart-api/user-preferences/use-user-preferences.query'
import { useForecastWeatherQuery } from '@/apis/open-meteo/use-forecast-weather.query'
import { useHistoricalWeatherQuery } from '@/apis/open-meteo/use-historical-weather.query'
import { tripDetailPath } from '@/routes'
import { PageHeader } from '@/shared/page-header'
import { getWeatherEmoji, getWeatherLabel } from '@/utils/weather'

import { CalendarDayPopover } from './components/calendar-day-popover'
import { GreetingCard } from './components/greeting-card'
import { TripCalendar } from './components/trip-calendar'

export const HomePage = () => {
  const { data: trips = [] } = useTripsQuery()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  /* Date range: one month ago → yesterday for historical, today onward for forecast */
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const oneMonthAgo = new Date(today)
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  const startDate = `${oneMonthAgo.getFullYear()}-${String(oneMonthAgo.getMonth() + 1).padStart(2, '0')}-${String(oneMonthAgo.getDate()).padStart(2, '0')}`

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const endDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  /* User preferences provide the lat/long for weather queries */
  /* Falls back to Cleveland, Ohio when no location is set */
  const { data: preferences } = useUserPreferencesQuery()
  const latitude = preferences?.locationLatitude ?? 41.4993
  const longitude = preferences?.locationLongitude ?? -81.6944

  const { data: historicalWeather } = useHistoricalWeatherQuery({
    latitude, longitude, startDate, endDate,
  })

  const { data: forecastWeather } = useForecastWeatherQuery({
    latitude, longitude,
  })

  /* Merge historical and forecast into a single date-keyed map */
  const weatherByDate = useMemo(() => ({
    ...historicalWeather,
    ...forecastWeather,
  }), [historicalWeather, forecastWeather])

  const todayWeather = weatherByDate[todayStr] ?? null

  return (
    <div className="pb-4 animate-fade-in">
      <PageHeader><span className="text-teal">Home</span></PageHeader>

      <div className="px-5 space-y-3">
        <GreetingCard
          locationName={preferences?.locationDisplayName ?? 'Cleveland, Ohio'}
          currentWeatherEmoji={todayWeather ? getWeatherEmoji(todayWeather.weatherCode) : null}
          currentTemperature={todayWeather?.temperatureMax ?? null}
          currentCondition={todayWeather ? getWeatherLabel(todayWeather.weatherCode) : null}
        />

        <TripCalendar
          trips={trips}
          weatherByDate={weatherByDate}
          onDayClick={setSelectedDate}
          showWeatherIcons={preferences?.showWeatherIcons ?? true}
          showWeatherTemps={preferences?.showWeatherTemps ?? true}
        />
      </div>

      {selectedDate && (
        <CalendarDayPopover
          date={selectedDate}
          trips={trips.filter(t => t.tripDate === selectedDate)}
          weather={selectedDate ? (weatherByDate[selectedDate] ?? null) : null}
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
