import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MockProvider } from './helpers.js';

const app = createApp({ provider: new MockProvider() });

describe('health endpoint', () => {
  it('reports ok without calling the AI API', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.ai).toEqual({ configured: true, model: 'test-model' });
  });

  it('reports AI as unconfigured when no provider is configured', async () => {
    const unconfigured = createApp({ provider: new MockProvider({ configured: false }) });
    const res = await request(unconfigured).get('/api/health');
    expect(res.body.ai.configured).toBe(false);
  });

  it('does not leak API keys or secrets', async () => {
    const res = await request(app).get('/api/health');
    expect(JSON.stringify(res.body)).not.toContain('GEMINI_API_KEY');
  });

  it('sends security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('routing', () => {
  it('returns the canonical error shape for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects malformed JSON bodies', async () => {
    const res = await request(app)
      .post('/api/ai/generate-plan')
      .set('Content-Type', 'application/json')
      .send('{"event": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('CORS', () => {
  it('allows configured origins', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not allow arbitrary origins', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
