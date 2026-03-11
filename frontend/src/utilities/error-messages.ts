// ABOUTME: Error message utility for extracting user-facing messages from errors
// ABOUTME: Handles ApiError (with HTTP body), standard Error, and unknown values

import { ApiError } from '@/apis/api-error'

/**
 * Extracts a user-friendly error message from any error type.
 * - ApiError: uses body.message if available, falls back to statusText
 * - Error: returns .message
 * - Anything else: returns generic fallback
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as Record<string, unknown> | null
    if (body && typeof body.message === 'string') return body.message
    return error.statusText
  }

  if (error instanceof Error) return error.message

  return 'An unexpected error occurred. Please try again.'
}
