/**
 * Error codes for authentication operations
 */
export type AuthErrorCode =
  // Sign-in errors
  | 'INVALID_CREDENTIALS'
  | 'INVALID_PROVIDER'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_LOCKED'
  // Token errors
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_MISSING'
  | 'TOKEN_PARSE_ERROR'
  | 'REFRESH_TOKEN_EXPIRED'
  // Session errors
  | 'SESSION_EXPIRED'
  | 'SESSION_INVALID'
  | 'SESSION_FETCH_ERROR'
  // Network errors
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  // Configuration errors
  | 'ENDPOINT_DISABLED'
  | 'MISSING_SECRET'
  | 'INVALID_CONFIG'
  // Generic
  | 'UNKNOWN_ERROR'

/**
 * Authentication error with structured information
 */
export interface AuthErrorData {
  /** Error code for programmatic handling */
  code: AuthErrorCode
  /** Human-readable error message */
  message: string
  /** HTTP status code if applicable */
  statusCode?: number
  /** Original error for debugging */
  cause?: Error | unknown
  /** Whether the error is recoverable (e.g., can retry) */
  recoverable: boolean
  /** Timestamp when error occurred */
  timestamp: Date
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode
  readonly statusCode?: number
  readonly cause?: Error | unknown
  readonly recoverable: boolean
  readonly timestamp: Date

  constructor(data: Omit<AuthErrorData, 'timestamp'>) {
    super(data.message)
    this.name = 'AuthError'
    this.code = data.code
    this.statusCode = data.statusCode
    this.cause = data.cause
    this.recoverable = data.recoverable
    this.timestamp = new Date()

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError)
    }
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): AuthErrorData {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      cause: this.cause instanceof Error ? this.cause.message : this.cause
    }
  }

  /**
   * Check if error is of a specific code
   */
  is(code: AuthErrorCode): boolean {
    return this.code === code
  }

  /**
   * Check if error is related to authentication (credentials, token, session)
   */
  isAuthRelated(): boolean {
    return [
      'INVALID_CREDENTIALS',
      'TOKEN_INVALID',
      'TOKEN_EXPIRED',
      'TOKEN_MISSING',
      'SESSION_EXPIRED',
      'SESSION_INVALID'
    ].includes(this.code)
  }

  /**
   * Check if error is a network issue
   */
  isNetworkError(): boolean {
    return ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'].includes(this.code)
  }
}

/**
 * Factory functions for common errors
 */
export const createAuthError = {
  invalidCredentials: (message = 'Invalid username or password') =>
    new AuthError({
      code: 'INVALID_CREDENTIALS',
      message,
      statusCode: 401,
      recoverable: true
    }),

  invalidProvider: (provider?: string) =>
    new AuthError({
      code: 'INVALID_PROVIDER',
      message: provider ? `Invalid provider: ${provider}` : 'No valid provider configured',
      statusCode: 400,
      recoverable: false
    }),

  tokenExpired: (message = 'Authentication token has expired') =>
    new AuthError({
      code: 'TOKEN_EXPIRED',
      message,
      statusCode: 401,
      recoverable: true
    }),

  tokenInvalid: (message = 'Invalid authentication token') =>
    new AuthError({
      code: 'TOKEN_INVALID',
      message,
      statusCode: 401,
      recoverable: true
    }),

  tokenMissing: (message = 'Authentication token is missing') =>
    new AuthError({
      code: 'TOKEN_MISSING',
      message,
      statusCode: 401,
      recoverable: true
    }),

  tokenParseError: (message = 'Failed to parse token from response', cause?: unknown) =>
    new AuthError({
      code: 'TOKEN_PARSE_ERROR',
      message,
      statusCode: 500,
      recoverable: false,
      cause
    }),

  sessionExpired: (message = 'Your session has expired') =>
    new AuthError({
      code: 'SESSION_EXPIRED',
      message,
      statusCode: 401,
      recoverable: true
    }),

  sessionFetchError: (message = 'Failed to fetch session', cause?: unknown) =>
    new AuthError({
      code: 'SESSION_FETCH_ERROR',
      message,
      statusCode: 500,
      recoverable: true,
      cause
    }),

  networkError: (message = 'Network request failed', cause?: unknown) =>
    new AuthError({
      code: 'NETWORK_ERROR',
      message,
      recoverable: true,
      cause
    }),

  serverError: (message = 'Server error occurred', statusCode = 500, cause?: unknown) =>
    new AuthError({
      code: 'SERVER_ERROR',
      message,
      statusCode,
      recoverable: true,
      cause
    }),

  endpointDisabled: (endpoint: string) =>
    new AuthError({
      code: 'ENDPOINT_DISABLED',
      message: `Endpoint '${endpoint}' is disabled`,
      statusCode: 400,
      recoverable: false
    }),

  unknown: (message = 'An unknown error occurred', cause?: unknown) =>
    new AuthError({
      code: 'UNKNOWN_ERROR',
      message,
      statusCode: 500,
      recoverable: false,
      cause
    })
}

/**
 * Convert any error to AuthError
 */
export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) {
    return error
  }

  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase()

    if (message.includes('network') || message.includes('fetch')) {
      return createAuthError.networkError(error.message, error)
    }

    if (message.includes('timeout')) {
      return new AuthError({
        code: 'TIMEOUT',
        message: error.message,
        recoverable: true,
        cause: error
      })
    }

    return createAuthError.unknown(error.message, error)
  }

  // Handle fetch response errors
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>

    if ('statusCode' in errorObj || 'status' in errorObj) {
      const statusCode = (errorObj.statusCode || errorObj.status) as number
      const message = (errorObj.message || errorObj.statusMessage || 'Request failed') as string

      if (statusCode === 401) {
        return createAuthError.tokenInvalid(message)
      }

      if (statusCode >= 500) {
        return createAuthError.serverError(message, statusCode, error)
      }

      return new AuthError({
        code: 'UNKNOWN_ERROR',
        message,
        statusCode,
        recoverable: statusCode < 500,
        cause: error
      })
    }
  }

  return createAuthError.unknown(String(error), error)
}
