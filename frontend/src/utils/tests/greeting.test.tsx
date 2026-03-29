// ABOUTME: Tests for time-of-day greeting logic with boundary conditions

import { describe, expect, it } from 'vitest'

import { getGreeting } from '@/utils/greeting'

describe('getGreeting', () => {
  it('returns "Good morning" at midnight (hour 0)', () => {
    expect(getGreeting(0)).toBe('Good morning')
  })

  it('returns "Good morning" at 5:00 AM', () => {
    expect(getGreeting(5)).toBe('Good morning')
  })

  it('returns "Good morning" at 10:59 AM (hour 10)', () => {
    expect(getGreeting(10)).toBe('Good morning')
  })

  it('returns "Good almost afternoon" at 11:00 AM (hour 11)', () => {
    expect(getGreeting(11)).toBe('Good almost afternoon')
  })

  it('returns "Good afternoon" at 12:00 PM (hour 12)', () => {
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
})
