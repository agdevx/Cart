import { useQuery } from '@tanstack/react-query'

import type { WeatherByDate } from './weather-types'

interface HistoricalParams {
  latitude: number | null
  longitude: number | null
  startDate: string
  endDate: string
}

export const useHistoricalWeatherQuery = ({ latitude, longitude, startDate, endDate }: HistoricalParams) => {
  return useQuery({
    queryKey: ['weather', 'historical', latitude, longitude, startDate, endDate],
    queryFn: async (): Promise<WeatherByDate> => {
      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=weather_code,temperature_2m_max&temperature_unit=fahrenheit&timezone=auto`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch historical weather')
      }

      const data = await response.json()
      const result: WeatherByDate = {}

      for (let i = 0; i < data.daily.time.length; i++) {
        result[data.daily.time[i]] = {
          date: data.daily.time[i],
          weatherCode: data.daily.weather_code[i],
          temperatureMax: Math.round(data.daily.temperature_2m_max[i]),
        }
      }

      return result
    },
    enabled: latitude !== null && longitude !== null && startDate !== '' && endDate !== '',
    staleTime: 30 * 60 * 1000,
  })
}
