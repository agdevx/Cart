// ABOUTME: Tests for useFieldValidation hook — blur triggers, change-after-error, validateAll, setFieldError, isValid

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { isEmail, isRequired } from '@/utils/validation-rules'

import { useFieldValidation } from '../use-field-validation.service'

const schema = {
  name: [isRequired('Name')],
  email: [isRequired('Email'), isEmail()],
}

describe('useFieldValidation', () => {
  it('starts with no errors and isValid false (empty required fields)', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: '', email: '' })
    )
    expect(result.current.errors).toEqual({})
    expect(result.current.isValid).toBe(false)
  })

  it('validates on blur and shows error', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: '', email: '' })
    )
    act(() => result.current.handleBlur('name'))
    expect(result.current.errors.name).toBe('Name is required')
    expect(result.current.touched.name).toBe(true)
  })

  it('clears error on change after error when value is fixed', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: '', email: '' })
    )
    act(() => result.current.handleBlur('name'))
    expect(result.current.errors.name).toBe('Name is required')

    // Pass the current value directly to avoid stale closure issues
    act(() => result.current.handleChange('name', 'August'))
    expect(result.current.errors.name).toBeUndefined()
  })

  it('does not validate on change if field has no error', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: 'August', email: '' })
    )
    act(() => result.current.handleChange('name', 'August'))
    expect(result.current.errors.name).toBeUndefined()
    expect(result.current.touched.name).toBeUndefined()
  })

  it('validateAll marks all fields and returns false on errors', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: '', email: '' })
    )
    let valid: boolean
    act(() => { valid = result.current.validateAll() })
    expect(valid!).toBe(false)
    expect(result.current.errors.name).toBe('Name is required')
    expect(result.current.errors.email).toBe('Email is required')
  })

  it('validateAll returns true when all fields valid', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: 'August', email: 'a@b.com' })
    )
    let valid: boolean
    act(() => { valid = result.current.validateAll() })
    expect(valid!).toBe(true)
  })

  it('setFieldError injects a backend error', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: 'August', email: 'a@b.com' })
    )
    act(() => result.current.setFieldError('email', 'Email already registered'))
    expect(result.current.errors.email).toBe('Email already registered')
  })

  it('isValid reflects all required fields having values and passing', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useFieldValidation(schema, v),
      { initialProps: { v: { name: '', email: '' } } }
    )
    expect(result.current.isValid).toBe(false)

    rerender({ v: { name: 'August', email: 'a@b.com' } })
    expect(result.current.isValid).toBe(true)
  })

  it('runs validators in order and stops at first error', () => {
    const { result } = renderHook(() =>
      useFieldValidation(schema, { name: '', email: 'bad' })
    )
    act(() => result.current.handleBlur('email'))
    expect(result.current.errors.email).toBe('Please enter a valid email address')
  })
})
