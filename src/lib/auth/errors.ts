export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('AUTH_REQUIRED', 'Sign in to continue.', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super('FORBIDDEN', 'Editing is restricted to the approved members.', 403)
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message = 'Movie discovery is temporarily unavailable. Please try again.',
  ) {
    super('EXTERNAL_SERVICE', message, 503)
  }
}

export class NotFoundError extends AppError {
  constructor() {
    super('NOT_FOUND', 'This movie or person could not be found on TMDB.', 404)
  }
}

export class ConfigurationError extends AppError {
  constructor(
    message = 'This feature needs the server connection to be configured.',
  ) {
    super('NOT_CONFIGURED', message, 503)
  }
}

export function publicError(error: unknown): {
  code: string
  message: string
  status: number
} {
  if (error instanceof AppError)
    return { code: error.code, message: error.message, status: error.status }
  return {
    code: 'UNEXPECTED_ERROR',
    message: 'Something went wrong. Please try again.',
    status: 500,
  }
}
