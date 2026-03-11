// ABOUTME: Typed API error class with HTTP status information
// ABOUTME: Enables smart retry logic and structured error handling across the app

export class ApiError extends Error {
  public readonly status: number
  public readonly statusText: string
  public readonly body: unknown

  constructor(status: number, statusText: string, body: unknown) {
    super(`API error ${status}: ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.body = body
  }

  get isUnauthorized(): boolean { return this.status === 401 }
  get isForbidden(): boolean { return this.status === 403 }
  get isNotFound(): boolean { return this.status === 404 }
  get isConflict(): boolean { return this.status === 409 }
  get isValidationError(): boolean { return this.status === 400 }

  // Non-retryable: no point retrying auth failures, client errors, or rate limits
  // 429 included because immediate retry just burns through the rate limit faster
  get isRetryable(): boolean {
    return ![400, 401, 403, 404, 409, 422, 429].includes(this.status)
  }
}
