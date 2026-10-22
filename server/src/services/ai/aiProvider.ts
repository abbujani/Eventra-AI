import { AppError } from '../../utils/errors.js';

export interface GenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'text/plain' | 'application/json';
  responseSchema?: Record<string, unknown>;
}

/**
 * Provider-agnostic AI surface. Keeping this small makes the Gemini
 * implementation replaceable with another provider later.
 */
export interface AiProvider {
  readonly model: string;
  readonly configured: boolean;
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  generateJson<T>(prompt: string, options?: GenerateOptions): Promise<T>;
}

export interface ProviderFactoryOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries?: number;
}

export type ProviderFactory = (options: ProviderFactoryOptions) => AiProvider;

export { AppError };
