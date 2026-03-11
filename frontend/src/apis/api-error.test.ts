import { describe, expect, it } from 'vitest'

import { ApiError } from './api-error'

describe('ApiError', () => {
  it('should construct with status, statusText, and body', () => {
    const error = new ApiError(404, 'Not Found', { message: 'Resource not found' })

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('ApiError')
    expect(error.status).toBe(404)
    expect(error.statusText).toBe('Not Found')
    expect(error.body).toEqual({ message: 'Resource not found' })
    expect(error.message).toBe('API error 404: Not Found')
  })

  it('should handle null body', () => {
    const error = new ApiError(500, 'Internal Server Error', null)
    expect(error.body).toBeNull()
  })

  describe('convenience getters', () => {
    it.each([
      [400, 'isValidationError'],
      [401, 'isUnauthorized'],
      [403, 'isForbidden'],
      [404, 'isNotFound'],
      [409, 'isConflict'],
    ] as const)('status %d → %s should be true', (status, getter) => {
      const error = new ApiError(status, 'test', null)
      expect(error[getter]).toBe(true)
    })

    it('non-matching status returns false for all convenience getters', () => {
      const error = new ApiError(500, 'test', null)
      expect(error.isValidationError).toBe(false)
      expect(error.isUnauthorized).toBe(false)
      expect(error.isForbidden).toBe(false)
      expect(error.isNotFound).toBe(false)
      expect(error.isConflict).toBe(false)
    })
  })

  describe('isRetryable', () => {
    it.each([400, 401, 403, 404, 409, 422, 429])(
      'status %d should NOT be retryable',
      (status) => {
        const error = new ApiError(status, 'test', null)
        expect(error.isRetryable).toBe(false)
      }
    )

    it.each([500, 502, 503])(
      'status %d should be retryable',
      (status) => {
        const error = new ApiError(status, 'test', null)
        expect(error.isRetryable).toBe(true)
      }
    )
  })
})
