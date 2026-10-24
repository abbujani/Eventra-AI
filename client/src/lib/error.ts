import { ApiError } from '../services/api.js';

/**
 * User-facing text for a failed request. Only the server's curated `ApiError`
 * message is shown — unexpected runtime errors fall back to a safe, contextual
 * message instead of leaking internals to the UI.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
