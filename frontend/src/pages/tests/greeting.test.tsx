// ABOUTME: Tests for time-of-day greeting logic with boundary conditions

import { describe, expect, it } from 'vitest'

import { getGreeting } from '../shopping-page'

describe('getGreeting', () => {
  it('returns "Good morning" at 5:00 AM', () => {
    expect(getGreeting(5)).toBe('Good morning')
  })

  it('returns "Good morning" at 11:59 AM (hour 11)', () => {
    expect(getGreeting(11)).toBe('Good morning')
  })

  it('returns "Good afternoon" at 12:00 PM', () => {
    expect(getGreeting(12)).toBe('Good afternoon')
  })

  it('returns "Good afternoon" at 4:59 PM (hour 16)', () => {
    expect(getGreeting(16)).toBe('Good afternoon')
  })

  it('returns "Good evening" at 5:00 PM (hour 17)', () => {
    expect(getGreeting(17)).toBe('Good evening')
  })

  it('returns "Good evening" at 11:00 PM (hour 23)', () => {
    expect(getGreeting(23)).toBe('Good evening')
  })

  it('returns "Good evening" at midnight (hour 0)', () => {
    expect(getGreeting(0)).toBe('Good evening')
  })

  it('returns "Good evening" at 4:59 AM (hour 4)', () => {
    expect(getGreeting(4)).toBe('Good evening')
  })
})
