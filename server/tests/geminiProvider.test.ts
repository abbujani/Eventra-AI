import { describe, expect, it } from 'vitest';
import { ApiError } from '@google/genai';
import {
  GeminiProvider,
  mapProviderError,
  parseJson,
} from '../src/services/ai/geminiProvider.js';
import { chatWithEvent } from '../src/services/ai/chatService.js';
import type { AiProvider, GenerateOptions } from '../src/services/ai/aiProvider.js';
import { AppError } from '../src/utils/errors.js';
import { validEvent } from './helpers.js';

function apiError(status: number, message = 'provider failure'): ApiError {
  return new ApiError({ status, message });
}

function errorCode(err: unknown): string {
  return err instanceof AppError ? err.code : `not-an-app-error:${String(err)}`;
}

describe('mapProviderError', () => {
  it('maps 401/403 credential failures to a safe 502 without leaking details', () => {
    for (const status of [401, 403]) {
      const mapped = mapProviderError(apiError(status, 'API key not valid. See docs.'));
      expect(mapped.code).toBe('AI_PROVIDER_ERROR');
      expect(mapped.status).toBe(502);
      expect(mapped.message).toMatch(/credentials/i);
      expect(mapped.message).not.toMatch(/API key not valid/);
    }
  });

  it('maps provider quota exhaustion to AI_RATE_LIMIT', () => {
    const mapped = mapProviderError(apiError(429, 'Resource has been exhausted'));
    expect(mapped.code).toBe('AI_RATE_LIMIT');
  });

  it('maps message-only quota errors even without a status code', () => {
    const mapped = mapProviderError(new Error('429 Resource Exhausted: quota exceeded'));
    expect(mapped.code).toBe('AI_RATE_LIMIT');
  });

  it('maps 400/422 to AI_INVALID_RESPONSE', () => {
    expect(mapProviderError(apiError(400)).code).toBe('AI_INVALID_RESPONSE');
    expect(mapProviderError(apiError(422)).code).toBe('AI_INVALID_RESPONSE');
  });

  it('maps 5xx to a temporary-unavailability message', () => {
    const mapped = mapProviderError(apiError(503, 'backend exploded at /internal/secret'));
    expect(mapped.code).toBe('AI_PROVIDER_ERROR');
    expect(mapped.message).toMatch(/temporarily unavailable/i);
    expect(mapped.message).not.toContain('/internal/secret');
  });

  it('maps network failures to a reachability message', () => {
    const mapped = mapProviderError(new Error('fetch failed'));
    expect(mapped.code).toBe('AI_PROVIDER_ERROR');
    expect(mapped.message).toMatch(/could not reach/i);
  });

  it('passes AppErrors through unchanged', () => {
    const original = AppError.aiTimeout('timed out');
    expect(mapProviderError(original)).toBe(original);
  });

  it('falls back to a generic message for unknown errors', () => {
    const mapped = mapProviderError({ weird: true });
    expect(mapped.code).toBe('AI_PROVIDER_ERROR');
    expect(mapped.message).toMatch(/could not complete/i);
  });
});

describe('parseJson', () => {
  it('parses a plain JSON payload', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('extracts JSON from a fenced code block', () => {
    expect(parseJson('Here you go:\n```json\n{"a":1}\n```\nDone.')).toEqual({ a: 1 });
    expect(parseJson('```\n{"b":2}\n```')).toEqual({ b: 2 });
  });

  it('extracts JSON embedded in prose', () => {
    expect(parseJson('The plan is {"theme":"Marigold"} as requested.')).toEqual({
      theme: 'Marigold',
    });
  });

  it('rejects malformed output with AI_INVALID_RESPONSE instead of guessing', () => {
    try {
      parseJson('{not json');
      expect.unreachable('parseJson should have thrown');
    } catch (err) {
      expect(errorCode(err)).toBe('AI_INVALID_RESPONSE');
      expect((err as AppError).status).toBe(502);
    }
  });
});

describe('GeminiProvider configuration', () => {
  it('reports configured=false with an empty key and refuses to generate', async () => {
    const provider = new GeminiProvider({
      apiKey: '   ',
      model: 'gemini-flash-latest',
      timeoutMs: 1000,
    });
    expect(provider.configured).toBe(false);
    await expect(provider.generateText('hi')).rejects.toMatchObject({
      code: 'AI_NOT_CONFIGURED',
    });
  });

  it('reports configured=true when a key is supplied', () => {
    const provider = new GeminiProvider({
      apiKey: 'test-key',
      model: '',
      timeoutMs: 1000,
    });
    expect(provider.configured).toBe(true);
    expect(provider.model).toBe('gemini-flash-latest');
  });
});

/** Captures the prompt so tests can assert on exactly what would reach Gemini. */
class CapturingProvider implements AiProvider {
  readonly model = 'test-model';
  readonly configured = true;
  lastPrompt = '';
  lastOptions: GenerateOptions | undefined;

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    this.lastPrompt = prompt;
    this.lastOptions = options;
    return 'ok';
  }

  async generateJson<T>(): Promise<T> {
    throw new Error('not used in these tests');
  }
}

describe('chatWithEvent prompt building', () => {
  it('caps conversation history at the 20 most recent messages', async () => {
    const provider = new CapturingProvider();
    const history = Array.from({ length: 30 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `msg-${index + 1}`,
    }));

    await chatWithEvent(provider, validEvent, undefined, history, 'What is next?');

    expect(provider.lastPrompt).toContain('Assistant: msg-30');
    expect(provider.lastPrompt).toContain('User: msg-11');
    expect(provider.lastPrompt).not.toContain('msg-10');
    // Exactly 20 history lines reach the prompt (30 were supplied).
    expect((provider.lastPrompt.match(/(?:User|Assistant): msg-\d+/g) ?? []).length).toBe(20);
  });

  it('truncates over-long history entries and the current message', async () => {
    const provider = new CapturingProvider();
    const longText = 'x'.repeat(5000);

    await chatWithEvent(
      provider,
      validEvent,
      undefined,
      [{ role: 'user', content: longText }],
      longText,
    );

    // 1500-char cap plus a small envelope — nowhere near the 5000-char inputs.
    expect(provider.lastPrompt.length).toBeLessThan(4000);
    expect(provider.lastPrompt).toContain('…');
  });

  it('grounds the prompt in the actual event data', async () => {
    const provider = new CapturingProvider();
    await chatWithEvent(provider, validEvent, undefined, [], 'Any ideas?');

    expect(provider.lastPrompt).toContain(validEvent.title);
    expect(provider.lastPrompt).toContain('Asia/Kolkata');
    expect(provider.lastPrompt).toContain('250');
    expect(provider.lastOptions?.systemInstruction).toBeTruthy();
  });

  it('rejects an empty message before touching the provider', async () => {
    const provider = new CapturingProvider();
    await expect(chatWithEvent(provider, validEvent, undefined, [], '   ')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(provider.lastPrompt).toBe('');
  });
});
