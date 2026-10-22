import { Router } from 'express';
import { config } from '../config.js';
import type { AiProvider } from '../services/ai/index.js';

export function createHealthRouter(provider: AiProvider): Router {
  const router = Router();

  /**
   * Health check is intentionally independent of any AI API call: it reports
   * configuration state only, so it works with or without an API key.
   */
  router.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      ai: {
        configured: provider.configured,
        model: provider.model,
      },
      // Which planning backend the AI endpoints will use for this request.
      // 'ai' when a Gemini key is configured, otherwise the deterministic
      // built-in template engine ('local') so the app still works keyless.
      planning: {
        mode: provider.configured ? 'ai' : 'local',
      },
    });
  });

  return router;
}
