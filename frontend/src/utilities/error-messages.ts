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
 * Gets a user-friendly error message for a given error code
 * @param code - Error code to look up
 * @returns User-friendly error message, or UNKNOWN_ERROR message if code not found
 */
export function getErrorMessage(code: string): string {
  if (!code || !(code in ERROR_MESSAGES)) {
    return ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  return ERROR_MESSAGES[code as ErrorCode];
}
