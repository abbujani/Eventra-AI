import { ZodError, type ZodType } from 'zod';
import { AppError } from './errors.js';

/**
 * Parse untrusted data with a Zod schema and turn failures into a clean
 * AppError. Never throws Zod errors to callers.
 */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown, message: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw AppError.validation(message, flattenZod(result.error));
  }
  return result.data;
}

export function flattenZod(error: ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/** A safe, bounded string used for user-supplied text fields. */
export function clampString(value: unknown, max = 2000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}
