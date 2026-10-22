/**
 * Typed application errors and the canonical API error response shape.
 *
 * Clients always receive: { "error": { "code": "...", "message": "..." } }
 * Internal stack traces and provider details are never leaked.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'AI_NOT_CONFIGURED'
  | 'AI_RATE_LIMIT'
  | 'AI_TIMEOUT'
  | 'AI_INVALID_RESPONSE'
  | 'AI_PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL_ERROR';

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly isOperational: boolean;

  constructor(code: ErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.isOperational = true;
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError('VALIDATION_ERROR', message, 400, details);
  }

  static notFound(message = 'Resource not found.'): AppError {
    return new AppError('NOT_FOUND', message, 404);
  }

  static aiNotConfigured(): AppError {
    return new AppError(
      'AI_NOT_CONFIGURED',
      'AI generation is not configured on this server. Set the GEMINI_API_KEY environment variable to enable it.',
      503,
    );
  }

  static rateLimited(message = 'Too many AI requests. Please try again shortly.'): AppError {
    return new AppError('AI_RATE_LIMIT', message, 429);
  }

  static aiTimeout(message = 'The AI provider took too long to respond. Please try again.'): AppError {
    return new AppError('AI_TIMEOUT', message, 504);
  }

  static aiInvalidResponse(
    message = 'The AI provider returned an unexpected response. Please try again.',
  ): AppError {
    return new AppError('AI_INVALID_RESPONSE', message, 502);
  }

  static aiProviderError(message = 'The AI provider could not complete the request.'): AppError {
    return new AppError('AI_PROVIDER_ERROR', message, 502);
  }

  static internal(message = 'An unexpected error occurred. Please try again later.'): AppError {
    return new AppError('INTERNAL_ERROR', message, 500);
  }

  toBody(): { error: ErrorBody } {
    const body: ErrorBody = { code: this.code, message: this.message };
    if (this.details !== undefined) body.details = this.details;
    return { error: body };
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
