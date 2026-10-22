import { config } from '../../config.js';
import type { AiProvider, ProviderFactory } from './aiProvider.js';
import { createGeminiProvider } from './geminiProvider.js';

export * from './aiProvider.js';
export * from './schemas.js';
export { createGeminiProvider, GeminiProvider, mapProviderError } from './geminiProvider.js';

/**
 * Creates the configured provider. Only the Gemini provider ships today, but
 * the factory shape makes adding another provider a one-line change.
 */
export function createProvider(factory: ProviderFactory = createGeminiProvider): AiProvider {
  return factory({
    apiKey: config.geminiApiKey,
    model: config.geminiModel,
    timeoutMs: config.aiTimeoutMs,
    maxRetries: 1,
  });
}

/** Lazily-created singleton used by the routes. */
let cachedProvider: AiProvider | null = null;

export function getProvider(): AiProvider {
  if (!cachedProvider) {
    cachedProvider = createProvider();
  }
  return cachedProvider;
}

export function resetProvider(): void {
  cachedProvider = null;
}
