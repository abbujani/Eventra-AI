/**
 * Minimal error type for the in-browser engine.
 *
 * The API deployment throws `AppError` with HTTP status codes; in the browser
 * there is no transport, so only the error code and message are kept. The
 * messages are identical to the server's, so UI copy stays consistent.
 */
export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }

  static validation(message: string): AppError {
    return new AppError('VALIDATION_ERROR', message);
  }

  static aiInvalidResponse(message: string): AppError {
    return new AppError('AI_INVALID_RESPONSE', message);
  }
}
