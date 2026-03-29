export interface DailyWeather {
  date: string
  weatherCode: number
  temperatureMax: number
}

export interface WeatherByDate {
  [date: string]: DailyWeather
}
