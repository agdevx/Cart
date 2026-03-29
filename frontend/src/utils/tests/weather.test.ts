import { describe, expect, it } from 'vitest'

import {
  getWeatherCondition,
  getWeatherEmoji,
  getWeatherLabel,
  getWeatherTintColor,
} from '../weather'

describe('getWeatherCondition', () => {
  it('returns sunny for code 0 (clear sky)', () => {
    expect(getWeatherCondition(0)).toBe('sunny')
  })

  it('returns sunny for code 1 (mainly clear)', () => {
    expect(getWeatherCondition(1)).toBe('sunny')
  })

  it('returns cloudy for code 2 (partly cloudy)', () => {
    expect(getWeatherCondition(2)).toBe('cloudy')
  })

  it('returns cloudy for code 3 (overcast)', () => {
    expect(getWeatherCondition(3)).toBe('cloudy')
  })

  it('returns rain for code 61 (slight rain)', () => {
    expect(getWeatherCondition(61)).toBe('rain')
  })

  it('returns rain for code 95 (thunderstorm)', () => {
    expect(getWeatherCondition(95)).toBe('rain')
  })
})

describe('getWeatherEmoji', () => {
  it('returns sun emoji for sunny', () => {
    expect(getWeatherEmoji(0)).toBe('☀️')
  })

  it('returns cloud emoji for cloudy', () => {
    expect(getWeatherEmoji(2)).toBe('⛅')
  })

  it('returns rain emoji for rain', () => {
    expect(getWeatherEmoji(61)).toBe('🌧️')
  })
})

describe('getWeatherLabel', () => {
  it('returns Clear for code 0', () => {
    expect(getWeatherLabel(0)).toBe('Clear')
  })

  it('returns Rain for code 63', () => {
    expect(getWeatherLabel(63)).toBe('Rain')
  })

  it('returns Thunderstorm for code 95', () => {
    expect(getWeatherLabel(95)).toBe('Thunderstorm')
  })
})

describe('getWeatherTintColor', () => {
  it('returns rgba string with yellow hue for sunny', () => {
    const result = getWeatherTintColor(0, 75, false)
    expect(result).toMatch(/^rgba\(254,220,100,/)
  })

  it('returns rgba string with blue hue for rain', () => {
    const result = getWeatherTintColor(61, 60, false)
    expect(result).toMatch(/^rgba\(150,190,250,/)
  })

  it('returns higher alpha for hotter temperatures', () => {
    const cool = getWeatherTintColor(0, 40, false)
    const hot = getWeatherTintColor(0, 95, false)
    const coolAlpha = parseFloat(cool.split(',')[3])
    const hotAlpha = parseFloat(hot.split(',')[3])
    expect(hotAlpha).toBeGreaterThan(coolAlpha)
  })

  it('returns lower alpha for past dates', () => {
    const current = getWeatherTintColor(0, 75, false)
    const past = getWeatherTintColor(0, 75, true)
    const currentAlpha = parseFloat(current.split(',')[3])
    const pastAlpha = parseFloat(past.split(',')[3])
    expect(pastAlpha).toBeLessThan(currentAlpha)
  })
})
