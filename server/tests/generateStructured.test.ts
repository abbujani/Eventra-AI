import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError } from '../src/utils/errors.js';
import type { AiProvider, GenerateOptions } from '../src/services/ai/aiProvider.js';
import {
  generateStructured,
  isInvalidResponse,
} from '../src/services/ai/generateStructured.js';

const schema = z.object({ name: z.string() });
const parsedPrompt = 'IMPORTANT: retry with valid JSON.';

function fakeProvider(overrides: Partial<AiProvider> = {}): AiProvider {
  return {
    model: 'test-model',
    configured: true,
    generateText: vi.fn(),
    generateJson: vi.fn(),
    ...overrides,
  } as AiProvider;
}

function options(provider: AiProvider, overrides: Record<string, unknown> = {}) {
  return {
    provider,
    basePrompt: 'Plan this event.',
    schema,
    generate: { temperature: 0 },
    retryOnInvalid: parsedPrompt,
    invalidResponseMessage: 'Malformed response.',
    ...overrides,
  };
}

describe('generateStructured', () => {
  it('returns a validated payload on the first attempt', async () => {
    const generateJson = vi.fn().mockResolvedValue({ name: 'Mehendi' });
    const provider = fakeProvider({ generateJson });

    await expect(generateStructured(options(provider))).resolves.toEqual({ name: 'Mehendi' });
    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(generateJson.mock.calls[0]).toEqual(['Plan this event.', { temperature: 0 }]);
  });

  it('retries once with the corrective prompt when the payload is invalid', async () => {
    const generateJson = vi
      .fn()
      .mockResolvedValueOnce({ name: 42 })
      .mockResolvedValueOnce({ name: 'Sangeet' });
    const provider = fakeProvider({ generateJson });

    await expect(generateStructured(options(provider))).resolves.toEqual({ name: 'Sangeet' });
    expect(generateJson).toHaveBeenCalledTimes(2);
    expect(generateJson.mock.calls[1][0]).toBe(`Plan this event.\n\n${parsedPrompt}`);
  });

  it('fails cleanly after the retry budget is exhausted', async () => {
    const generateJson = vi.fn().mockResolvedValue({ name: 42 });
    const provider = fakeProvider({ generateJson });

    await expect(generateStructured(options(provider))).rejects.toMatchObject({
      code: 'AI_INVALID_RESPONSE',
      message: 'Malformed response.',
    });
    expect(generateJson).toHaveBeenCalledTimes(2);
  });

  it('retries a JSON parse error only when a parse retry prompt is provided', async () => {
    const parseError = AppError.aiInvalidResponse('Could not parse.');
    const generateJson = vi
      .fn()
      .mockRejectedValueOnce(parseError)
      .mockResolvedValueOnce({ name: 'Haldi' });
    const provider = fakeProvider({ generateJson });

    await expect(
      generateStructured(
        options(provider, { retryOnParseError: 'IMPORTANT: return only JSON.' }),
      ),
    ).resolves.toEqual({ name: 'Haldi' });
    expect(generateJson.mock.calls[1][0]).toBe(
      'Plan this event.\n\nIMPORTANT: return only JSON.',
    );
  });

  it('does not swallow provider errors unrelated to parsing', async () => {
    const timeout = new AppError('AI_TIMEOUT', 'The AI request timed out.', 504);
    const generateJson = vi.fn().mockRejectedValue(timeout);
    const provider = fakeProvider({ generateJson });

    await expect(
      generateStructured(options(provider, { retryOnParseError: 'retry' })),
    ).rejects.toBe(timeout);
    expect(generateJson).toHaveBeenCalledTimes(1);
  });

  it('rejects an unconfigured provider before calling it', async () => {
    const generateJson = vi.fn();
    const provider = fakeProvider({ configured: false, generateJson });

    await expect(generateStructured(options(provider))).rejects.toMatchObject({
      code: 'AI_NOT_CONFIGURED',
    });
    expect(generateJson).not.toHaveBeenCalled();
  });

  it('normalizes the validated payload', async () => {
    const generateJson = vi.fn().mockResolvedValue({ name: 'Reception' });
    const provider = fakeProvider({ generateJson });

    await expect(
      generateStructured(
        options(provider, { normalize: (value: { name: string }) => value.name }),
      ),
    ).resolves.toBe('Reception');
  });

  it('recognises provider parse failures by error code', () => {
    expect(isInvalidResponse(AppError.aiInvalidResponse('bad'))).toBe(true);
    expect(isInvalidResponse(new Error('bad'))).toBe(false);
  });
});

// Compile-time guard: provider options stay strongly typed.
const _typeCheck: GenerateOptions = { temperature: 0 };
void _typeCheck;
