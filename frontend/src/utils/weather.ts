export type WeatherCondition = 'sunny' | 'cloudy' | 'rain'

/**
 * Maps WMO weather codes to simplified conditions.
 * See: https://open-meteo.com/en/docs#weathervariables
 */
export function getWeatherCondition(code: number): WeatherCondition {
  if (code <= 1) return 'sunny'
  if (code <= 3) return 'cloudy'
  return 'rain'
}

/**
 * Returns a weather emoji for display in popovers.
 */
export function getWeatherEmoji(code: number): string {
  const condition = getWeatherCondition(code)

  if (condition === 'sunny') return '☀️'
  if (condition === 'cloudy') return '⛅'
  return '🌧️'
}

/**
 * Returns a human-readable condition label.
 */
export function getWeatherLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly Clear'
  if (code === 2) return 'Partly Cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 49) return 'Foggy'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 84) return 'Rain Showers'
  if (code <= 86) return 'Snow Showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Unknown'
}

const WEATHER_TINT_COLORS: Record<WeatherCondition, [number, number, number]> = {
  sunny: [254, 220, 100],
  cloudy: [180, 200, 220],
  rain: [150, 190, 250],
}

const MIN_TEMP = 30
const MAX_TEMP = 100
const MIN_ALPHA = 0.10
const MAX_ALPHA = 0.55

/**
 * Returns a CSS rgba background color for a calendar cell.
 * The alpha scales with temperature (warmer = stronger tint).
 */
export function getWeatherTintColor(code: number, temperatureF: number, isPast: boolean): string {
  const condition = getWeatherCondition(code)
  const [r, g, b] = WEATHER_TINT_COLORS[condition]

  const clamped = Math.max(MIN_TEMP, Math.min(MAX_TEMP, temperatureF))
  const ratio = (clamped - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)
  let alpha = MIN_ALPHA + ratio * (MAX_ALPHA - MIN_ALPHA)

  if (isPast) {
    alpha *= 0.5
  }

  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
}
