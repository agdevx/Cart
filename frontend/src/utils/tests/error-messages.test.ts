// ABOUTME: Tests for error message utility
// ABOUTME: Verifies message extraction from ApiError, Error, and unknown values

import { describe, expect, it } from 'vitest'

import { ApiError } from '@/apis/api-error'

import { getErrorMessage } from '../error-messages'

describe('getErrorMessage', () => {
  it('should extract message from ApiError body', () => {
    const error = new ApiError(400, 'Bad Request', { message: 'Name already exists' })
    expect(getErrorMessage(error)).toBe('Name already exists')
  })

  it('should fall back to statusText when ApiError body has no message', () => {
    const error = new ApiError(500, 'Internal Server Error', null)
    expect(getErrorMessage(error)).toBe('Internal Server Error')
  })

  it('should fall back to statusText when ApiError body message is not a string', () => {
    const error = new ApiError(400, 'Bad Request', { code: 123 })
    expect(getErrorMessage(error)).toBe('Bad Request')
  })

  it('should return error message from Error objects', () => {
    expect(getErrorMessage(new Error('Something went wrong'))).toBe('Something went wrong')
  })

  it('should return fallback for null', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred. Please try again.')
  })

  it('should return fallback for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred. Please try again.')
  })

  it('should return fallback for non-string, non-Error values', () => {
    expect(getErrorMessage(42)).toBe('An unexpected error occurred. Please try again.')
    expect(getErrorMessage({})).toBe('An unexpected error occurred. Please try again.')
  })
})
