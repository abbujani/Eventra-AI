import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isAppError } from '../utils/errors.js';
import { flattenZod } from '../utils/validate.js';

/** 404 handler for unknown API routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route matches ${req.method} ${req.path}.`,
    },
  });
}

/**
 * Centralised error handler. Always returns the canonical error shape and never
 * leaks stack traces, provider internals, or secrets.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the submitted event details.',
        details: flattenZod(err),
      },
    });
    return;
  }

  if (err instanceof SyntaxError && (err as { status?: number }).status === 400) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON.' },
    });
    return;
  }

  if (isAppError(err)) {
    res.status(err.status).json(err.toBody());
    return;
  }

  if (
    err !== null &&
    typeof err === 'object' &&
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' },
    });
    return;
  }

  // Log a compact, non-sensitive summary only.
  const summary =
    err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 200) : 'Unknown error';
  console.error('[unhandled]', summary);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
}
