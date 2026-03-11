// ABOUTME: Tests for Tanstack Query client configuration
// ABOUTME: Verifies query client defaults, retry logic, and global error handlers

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../api-error'

import { handleUnauthorized, queryClient, shouldRetry } from './query-client'

describe('queryClient', () => {
  it('should be defined', () => {
    expect(queryClient).toBeDefined()
  })

  it('should be an instance of QueryClient', () => {
    expect(queryClient.constructor.name).toBe('QueryClient')
  })

  it('should have staleTime of 5 minutes', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.queries?.staleTime).toBe(1000 * 60 * 5)
  })

  it('should have gcTime of 30 minutes', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.queries?.gcTime).toBe(1000 * 60 * 30)
  })

  it('should have refetchOnWindowFocus disabled by default', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false)
  })

  it('should have retry configured for mutations', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.mutations?.retry).toBe(shouldRetry)
  })
})

describe('shouldRetry', () => {
  it('should not retry non-retryable ApiError statuses', () => {
    const nonRetryable = [400, 401, 403, 404, 409, 422, 429]
    for (const status of nonRetryable) {
      expect(shouldRetry(0, new ApiError(status, 'test', null))).toBe(false)
    }
  })

  it('should retry retryable ApiError statuses on first failure', () => {
    expect(shouldRetry(0, new ApiError(500, 'test', null))).toBe(true)
    expect(shouldRetry(0, new ApiError(502, 'test', null))).toBe(true)
  })

  it('should not retry retryable ApiError after max failures', () => {
    expect(shouldRetry(1, new ApiError(500, 'test', null))).toBe(false)
  })

  it('should retry non-ApiError errors on first failure', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true)
  })

  it('should not retry non-ApiError errors after max failures', () => {
    expect(shouldRetry(1, new TypeError('Failed to fetch'))).toBe(false)
  })
})

describe('handleUnauthorized', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: 'http://localhost/' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('should clear localStorage and redirect when session exists', () => {
    localStorage.setItem('authUser', JSON.stringify({ id: '123' }))

    handleUnauthorized()

    expect(localStorage.getItem('authUser')).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('should NOT redirect when no session exists (e.g., login page 401)', () => {
    handleUnauthorized()

    expect(window.location.href).toBe('http://localhost/')
  })
})
