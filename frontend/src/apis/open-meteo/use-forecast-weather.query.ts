import { useQuery } from '@tanstack/react-query'

import type { WeatherByDate } from './weather-types'

interface ForecastParams {
  latitude: number | null
  longitude: number | null
}

export const useForecastWeatherQuery = ({ latitude, longitude }: ForecastParams) => {
  return useQuery({
    queryKey: ['weather', 'forecast', latitude, longitude],
    queryFn: async (): Promise<WeatherByDate> => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=16`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch forecast weather')
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
    enabled: latitude !== null && longitude !== null,
    staleTime: 30 * 60 * 1000,
  })
}
