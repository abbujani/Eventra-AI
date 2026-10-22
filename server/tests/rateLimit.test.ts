import { describe, expect, it } from 'vitest';

// Must be set before the app module is imported so the limiter picks them up.
process.env.AI_RATE_LIMIT_WINDOW_MS = '60000';
process.env.AI_RATE_LIMIT_MAX = '1';

const { createApp } = await import('../src/app.js');
const { MockProvider, validEvent, validPlan } = await import('./helpers.js');
const { default: request } = await import('supertest');

const app = createApp({ provider: new MockProvider({ json: validPlan }) });

describe('AI rate limiting', () => {
  it('returns 429 with the canonical error shape once the limit is exceeded', async () => {
    await request(app).post('/api/ai/generate-plan').send({ event: validEvent });
    const second = await request(app)
      .post('/api/ai/generate-plan')
      .send({ event: validEvent });
    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe('RATE_LIMITED');
  });
});
