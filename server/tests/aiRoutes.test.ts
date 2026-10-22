import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MockProvider, validEvent, validPlan } from './helpers.js';

function buildApp(provider = new MockProvider({ json: validPlan })) {
  return createApp({ provider });
}

describe('AI endpoints', () => {
  it('generates and normalizes an event plan', async () => {
    const res = await request(buildApp()).post('/api/ai/generate-plan').send({ event: validEvent });
    expect(res.status).toBe(200);
    expect(res.body.plan.budget.totalBudget).toBe(500000);
    expect(res.body.plan.budget.isOverBudget).toBe(false);
    expect(res.body.plan.theme.name).toBe('Royal Marigold');
    expect(res.body.plan.budget.categories[0].percentage).toBeGreaterThan(0);
  });

  it('rejects invalid event payloads with a validation error', async () => {
    const res = await request(buildApp())
      .post('/api/ai/generate-plan')
      .send({ event: { title: '', eventType: 'wedding' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('check the submitted event details');
  });

  it('falls back to the built-in local planner when no API key is set', async () => {
    const res = await request(
      buildApp(new MockProvider({ configured: false })),
    )
      .post('/api/ai/generate-plan')
      .send({ event: validEvent });
    // Keyless requests are served by the deterministic local engine, not a 503.
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('local');
    expect(res.body.plan.budget.totalBudget).toBe(500000);
    expect(res.body.plan.budget.isOverBudget).toBe(false);
    expect(res.body.plan.eventOverview.title).toBe(validEvent.title);
    expect(res.body.plan.nextActions.length).toBeGreaterThan(0);
  });

  it('tags responses with source: ai when a provider is configured', async () => {
    const res = await request(buildApp())
      .post('/api/ai/generate-plan')
      .send({ event: validEvent });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('ai');
  });

  it('rejects malformed AI output safely', async () => {
    const res = await request(
      buildApp(new MockProvider({ json: { not: 'a plan' } })),
    )
      .post('/api/ai/generate-plan')
      .send({ event: validEvent });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_INVALID_RESPONSE');
  });

  it('returns a chat reply', async () => {
    const res = await request(buildApp())
      .post('/api/ai/chat')
      .send({ event: validEvent, history: [], message: 'How can I cut 15% off the budget?' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('mock assistant reply');
  });

  it('rejects an empty chat message', async () => {
    const res = await request(buildApp())
      .post('/api/ai/chat')
      .send({ event: validEvent, history: [], message: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('generates invitation copy', async () => {
    const res = await request(buildApp())
      .post('/api/ai/generate-invitation')
      .send({
        eventTitle: 'Anaya & Rohan',
        eventType: 'wedding',
        dateLabel: '12 June 2026',
        tone: 'formal',
        language: 'english',
        channel: 'invitation',
      });
    expect(res.status).toBe(200);
    expect(res.body.invitation.text).toBe('mock assistant reply');
  });

  it('generates a menu plan', async () => {
    const res = await request(
      buildApp(
        new MockProvider({
          json: {
            summary: 'Vegetarian menu',
            segments: [{ name: 'Dinner', items: [{ name: 'Paneer', kind: 'vegetarian' }] }],
            dietaryNotes: ['Vegan options available'],
          },
        }),
      ),
    )
      .post('/api/ai/generate-menu')
      .send({ eventTitle: 'Wedding', eventType: 'wedding', guestCount: 100, segments: ['Dinner'], dietaryPreferences: ['vegetarian'] });
    expect(res.status).toBe(200);
    expect(res.body.menu.segments).toHaveLength(1);
  });

  it('suggests tasks', async () => {
    const res = await request(
      buildApp(new MockProvider({ json: { tasks: [{ title: 'Book venue', category: 'Venue', priority: 'high' }] } })),
    )
      .post('/api/ai/suggest-tasks')
      .send({ eventTitle: 'Wedding', eventType: 'wedding', guestCount: 100, startDate: '2026-06-12', timezone: 'Asia/Kolkata', categories: ['Venue'] });
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
  });

  it('returns budget advice', async () => {
    const res = await request(
      buildApp(
        new MockProvider({
          json: {
            summary: 'Save 15%',
            targetCurrency: 'INR',
            originalTotal: 500000,
            revisedTotal: 425000,
            totalSavingPercent: 15,
            recommendations: [{ category: 'Venue', currentEstimate: 150000, suggestedAmount: 130000, reasoning: 'Negotiate' }],
            caveats: ['Illustrative only'],
          },
        }),
      ),
    )
      .post('/api/ai/improve-budget')
      .send({
        eventTitle: 'Wedding',
        eventType: 'wedding',
        totalBudget: 500000,
        currency: 'INR',
        categories: [{ name: 'Venue', estimatedAmount: 150000 }],
        savingTargetPercent: 15,
      });
    expect(res.status).toBe(200);
    expect(res.body.advice.revisedTotal).toBe(425000);
  });
});
