export interface ERLCApiErrorOptions {
  status: number
  code?: number
  commandId?: string
  body?: unknown
}

export class ERLCApiError extends Error {
  readonly status: number
  readonly code?: number
  readonly commandId?: string
  readonly body?: unknown

  constructor(message: string, options: ERLCApiErrorOptions) {
    super(message)
    this.name = "ERLCApiError"
    this.status = options.status
    this.code = options.code
    this.commandId = options.commandId
    this.body = options.body
  }
}

// 403 (unauthorized)
export class ERLCAuthError extends ERLCApiError {
  constructor(options: ERLCApiErrorOptions) {
    super("Unauthorized — check your server-key.", options)
    this.name = "ERLCAuthError"
  }
}

// 400 (malformed request)
export class ERLCBadRequestError extends ERLCApiError {
  constructor(message: string, options: ERLCApiErrorOptions) {
    super(message, options)
    this.name = "ERLCBadRequestError"
  }
}

// 422 (server rejected)
export class ERLCServerOfflineError extends ERLCApiError {
  constructor(message: string, options: ERLCApiErrorOptions) {
    super(message, options)
    this.name = "ERLCServerOfflineError"
  }
}

// 500 (erlc API error)
export class ERLCUpstreamError extends ERLCApiError {
  constructor(message: string, options: ERLCApiErrorOptions) {
    super(message, options)
    this.name = "ERLCUpstreamError"
  }
}

// 429 (rate limit)
export class ERLCRateLimitError extends ERLCApiError {
  readonly bucket?: string
  readonly limit?: number
  readonly remaining?: number
  readonly resetAt?: Date

  constructor(
    options: ERLCApiErrorOptions & {
      bucket?: string
      limit?: number
      remaining?: number
      resetAt?: Date
    },
  ) {
    super("Rate limited by the ER:LC API.", options)
    this.name = "ERLCRateLimitError"
    this.bucket = options.bucket
    this.limit = options.limit
    this.remaining = options.remaining
    this.resetAt = options.resetAt
  }
}