// ABOUTME: Error message utility for consistent user-facing error messages
// ABOUTME: Maps error codes to human-readable messages

/**
 * Dictionary of error codes to user-friendly messages
 */
export const ERROR_MESSAGES = {
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

/**
 * Gets a user-friendly error message from an error code string, Error object, or unknown value.
 * - String: looks up as error code, returns the mapped message or UNKNOWN_ERROR
 * - Error object: extracts .message, tries it as an error code, otherwise returns .message directly
 * - Anything else: returns UNKNOWN_ERROR
 */
export function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : null;

  if (!message) {
    return ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  if (message in ERROR_MESSAGES) {
    return ERROR_MESSAGES[message as ErrorCode];
  }

  // For Error objects with non-code messages, return the message directly
  if (error instanceof Error) {
    return message;
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR;
}
