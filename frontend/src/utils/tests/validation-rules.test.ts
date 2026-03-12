// ABOUTME: Tests for shared validation rule functions used across all forms

import { describe, expect,it } from 'vitest'

import {
  isEmail,
  isRequired,
  matchesField,
  maxLength,
  minLength,
  passwordStrength,
} from '../validation-rules'

const allValues = { password: 'Test1234', confirmPassword: 'Test1234' }

describe('isRequired', () => {
  it('returns error when empty', () => {
    expect(isRequired('Name')('', allValues)).toBe('Name is required')
  })

  it('returns error when whitespace only', () => {
    expect(isRequired('Name')('   ', allValues)).toBe('Name is required')
  })

  it('returns null when valid', () => {
    expect(isRequired('Name')('August', allValues)).toBeNull()
  })
})

describe('isEmail', () => {
  it('returns error for invalid email', () => {
    expect(isEmail()('notanemail', allValues)).toBe('Please enter a valid email address')
  })

  it('returns error for missing domain', () => {
    expect(isEmail()('user@', allValues)).toBe('Please enter a valid email address')
  })

  it('returns null for valid email', () => {
    expect(isEmail()('user@example.com', allValues)).toBeNull()
  })

  it('returns null for empty (let isRequired handle that)', () => {
    expect(isEmail()('', allValues)).toBeNull()
  })
})

describe('maxLength', () => {
  it('returns error when exceeds limit', () => {
    expect(maxLength(5)('abcdef', allValues)).toBe('Must be 5 characters or less')
  })

  it('returns null when within limit', () => {
    expect(maxLength(5)('abcde', allValues)).toBeNull()
  })
})

describe('minLength', () => {
  it('returns error when under limit', () => {
    expect(minLength(8)('abc', allValues)).toBe('Must be at least 8 characters')
  })

  it('returns null when at limit', () => {
    expect(minLength(8)('abcdefgh', allValues)).toBeNull()
  })

  it('returns null when empty (let isRequired handle that)', () => {
    expect(minLength(8)('', allValues)).toBeNull()
  })
})

describe('matchesField', () => {
  it('returns error when fields do not match', () => {
    const values = { password: 'Test1234', confirmPassword: 'Different' }
    expect(matchesField('password', 'Passwords')('Different', values)).toBe("Passwords don't match")
  })

  it('returns null when fields match', () => {
    expect(matchesField('password', 'Passwords')('Test1234', allValues)).toBeNull()
  })

  it('returns null when empty (let isRequired handle that)', () => {
    expect(matchesField('password', 'Passwords')('', allValues)).toBeNull()
  })
})

describe('passwordStrength', () => {
  it('returns error when missing uppercase', () => {
    expect(passwordStrength()('test1234', allValues)).toBe('Must contain at least one uppercase letter')
  })

  it('returns error when missing digit', () => {
    expect(passwordStrength()('Testtest', allValues)).toBe('Must contain at least one number')
  })

  it('returns null when strong enough', () => {
    expect(passwordStrength()('Test1234', allValues)).toBeNull()
  })

  it('returns null when empty (let isRequired handle that)', () => {
    expect(passwordStrength()('', allValues)).toBeNull()
  })
})
