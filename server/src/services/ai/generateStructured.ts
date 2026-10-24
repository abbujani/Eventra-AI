import { z } from 'zod';
import { AppError } from '../../utils/errors.js';
import type { AiProvider, GenerateOptions } from './aiProvider.js';

export interface GenerateStructuredOptions<T, R = T> {
  provider: AiProvider;
  basePrompt: string;
  schema: z.ZodType<T>;
  /** Provider options shared by every attempt (system instruction, schema, tokens…). */
  generate: Omit<GenerateOptions, 'responseMimeType'> & {
    responseMimeType?: 'text/plain' | 'application/json';
  };
  maxAttempts?: number;
  /** Appended to the base prompt when the parsed JSON fails schema validation. */
  retryOnInvalid: string;
  /**
   * When set, a provider JSON-parse failure (`AI_INVALID_RESPONSE`) is retried
   * once with this instruction appended. Other provider errors always bubble up.
   */
  retryOnParseError?: string;
  /** Turns the validated payload into the public return shape. */
  normalize?: (value: T) => R;
  invalidResponseMessage: string;
}

export function isInvalidResponse(err: unknown): boolean {
  return err instanceof AppError && err.code === 'AI_INVALID_RESPONSE';
}

/**
 * Shared request/retry/validate loop for every structured AI endpoint:
 * ask for JSON, retry once with a corrective prompt when the model returns
 * malformed data, then fail with a clean, user-safe error. A response is never
 * returned to the client unless it passes the Zod schema.
 */
export async function generateStructured<T, R = T>(
  options: GenerateStructuredOptions<T, R>,
): Promise<R> {
  const {
    provider,
    basePrompt,
    schema,
    generate,
    maxAttempts = 2,
    retryOnInvalid,
    retryOnParseError,
    normalize,
    invalidResponseMessage,
  } = options;

  if (!provider.configured) throw AppError.aiNotConfigured();

  let prompt = basePrompt;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let raw: unknown;
    try {
      raw = await provider.generateJson<unknown>(prompt, generate);
    } catch (err) {
      if (retryOnParseError && attempt < maxAttempts - 1 && isInvalidResponse(err)) {
        prompt = `${basePrompt}\n\n${retryOnParseError}`;
        continue;
      }
      throw err;
    }

    const parsed = schema.safeParse(raw);
    if (parsed.success) {
      return normalize ? normalize(parsed.data) : (parsed.data as unknown as R);
    }

    prompt = `${basePrompt}\n\n${retryOnInvalid}`;
  }

  throw AppError.aiInvalidResponse(invalidResponseMessage);
}
