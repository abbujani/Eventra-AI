import { ApiError, GoogleGenAI } from '@google/genai';
import type { GenerateContentConfig, GenerateContentResponse } from '@google/genai';
import { AppError } from '../../utils/errors.js';
import type { AiProvider, GenerateOptions, ProviderFactoryOptions } from './aiProvider.js';

interface ProviderErrorShape {
  status?: number;
  message?: string;
}

function isTransient(err: unknown): boolean {
  if (err instanceof ApiError) {
    const status = (err as unknown as ProviderErrorShape).status ?? 0;
    if (status >= 500 && status < 600) return true;
  }
  if (err instanceof Error) {
    return /fetch failed|network|ENOTFOUND|ECONNRESET|ETIMEDOUT|socket hang up|EAI_AGAIN/i.test(err.message);
  }
  return false;
}

const CREDENTIAL_PATTERN = /api key|unauthor|permission denied|invalid.*key/i;
const QUOTA_PATTERN = /rate ?limit|quota|resource.?exhausted|too many requests/i;
const NETWORK_PATTERN = /fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|socket hang up|EAI_AGAIN/i;

/** Classifies an error by message text; used for both ApiError and plain errors. */
function mapFromMessage(message: string): AppError | null {
  if (CREDENTIAL_PATTERN.test(message)) {
    return new AppError('AI_PROVIDER_ERROR', 'The AI provider rejected the request credentials.', 502);
  }
  if (QUOTA_PATTERN.test(message)) {
    return AppError.rateLimited('The AI provider is rate limiting requests. Please try again shortly.');
  }
  return null;
}

/** Maps provider failures to safe, user-facing AppErrors. Never leaks internals. */
export function mapProviderError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof ApiError) {
    const shape = err as unknown as ProviderErrorShape;
    const status = shape.status ?? 0;
    const message = shape.message ?? '';
    if (status === 401 || status === 403) {
      return new AppError('AI_PROVIDER_ERROR', 'The AI provider rejected the request credentials.', 502);
    }
    if (status === 429) {
      return AppError.rateLimited('The AI provider is rate limiting requests. Please try again shortly.');
    }
    const fromMessage = mapFromMessage(message);
    if (fromMessage) return fromMessage;
    if (status === 400 || status === 422) {
      return AppError.aiInvalidResponse('The AI provider could not process the request.');
    }
    if (status >= 500) {
      return AppError.aiProviderError('The AI provider is temporarily unavailable. Please try again.');
    }
    return AppError.aiProviderError('The AI provider could not complete the request.');
  }

  if (err instanceof Error) {
    if (NETWORK_PATTERN.test(err.message)) {
      return AppError.aiProviderError('Could not reach the AI provider. Please try again.');
    }
    const fromMessage = mapFromMessage(err.message);
    if (fromMessage) return fromMessage;
  }

  return AppError.aiProviderError('The AI provider could not complete the request.');
}

function extractJsonCandidate(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export function parseJson<T>(text: string): T {
  const candidate = extractJsonCandidate(text);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    throw AppError.aiInvalidResponse('The AI provider returned malformed JSON.');
  }
}

/**
 * Google Gemini provider backed by the maintained official SDK (`@google/genai`).
 */
export class GeminiProvider implements AiProvider {
  readonly model: string;
  readonly configured: boolean;

  private readonly client: GoogleGenAI | null;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options: ProviderFactoryOptions) {
    const apiKey = options.apiKey.trim();
    this.model = options.model.trim() || 'gemini-flash-latest';
    this.configured = apiKey.length > 0;
    this.timeoutMs = options.timeoutMs;
    this.maxRetries = Math.max(0, options.maxRetries ?? 1);
    this.client = this.configured ? new GoogleGenAI({ apiKey }) : null;
  }

  async generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
    this.assertConfigured();
    const response = await this.request(prompt, options);
    const text = response.text;
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw AppError.aiInvalidResponse('The AI provider returned an empty response.');
    }
    return text.trim();
  }

  async generateJson<T>(prompt: string, options: GenerateOptions = {}): Promise<T> {
    const text = await this.generateText(prompt, {
      ...options,
      responseMimeType: 'application/json',
    });
    return parseJson<T>(text);
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw AppError.aiNotConfigured();
    }
  }

  private requireClient(): GoogleGenAI {
    if (!this.client) throw AppError.aiNotConfigured();
    return this.client;
  }

  private async request(prompt: string, options: GenerateOptions): Promise<GenerateContentResponse> {
    const client = this.requireClient();

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.withTimeout(
          client.models.generateContent({
            model: this.model,
            contents: prompt,
            config: this.buildConfig(options),
          }),
          'Gemini request',
        );
      } catch (err) {
        if (err instanceof AppError) throw err;
        lastError = err;
        if (!isTransient(err) || attempt === this.maxRetries) break;
        await sleep(500 * (attempt + 1));
      }
    }
    throw mapProviderError(lastError);
  }

  private buildConfig(options: GenerateOptions): GenerateContentConfig {
    const config: GenerateContentConfig = {
      temperature: options.temperature ?? 0.6,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      systemInstruction: options.systemInstruction ?? '',
      responseMimeType: options.responseMimeType ?? 'text/plain',
    };
    if (options.responseSchema) {
      config.responseSchema = options.responseSchema as GenerateContentConfig['responseSchema'];
    }
    return config;
  }

  private async withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(AppError.aiTimeout(`${label} timed out after ${this.timeoutMs}ms.`));
      }, this.timeoutMs);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createGeminiProvider(options: ProviderFactoryOptions): AiProvider {
  return new GeminiProvider(options);
}
