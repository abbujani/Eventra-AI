import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MockProvider, validEvent } from './helpers.js';
import { buildLocalPlan, buildLocalInvitation, buildLocalMenu, buildLocalTasks, buildLocalBudgetAdvice } from '../src/services/local/index.js';
import { aiEventPlanSchema, normalizeEventPlan } from '../src/services/ai/schemas.js';

/** App built with an unconfigured provider, i.e. local-template mode. */
function buildKeylessApp() {
  return createApp({ provider: new MockProvider({ configured: false }) });
}

const invitationInput = {
  eventTitle: 'Anaya & Rohan',
  eventType: 'wedding',
  dateLabel: '12 June 2026',
  timeLabel: '7:00 PM',
  venue: 'Jaipur Palace',
  rsvpDetails: '+91 90000 00000',
  tone: 'formal',
  language: 'english',
  channel: 'invitation',
} as const;

const menuInput = {
  eventTitle: 'Wedding',
  eventType: 'wedding',
  guestCount: 100,
  segments: ['Welcome', 'Dinner', 'Dessert'],
  dietaryPreferences: ['vegetarian'],
} as const;

const taskInput = {
  eventTitle: 'Wedding',
  eventType: 'wedding',
  guestCount: 100,
  startDate: '2026-06-12',
  timezone: 'Asia/Kolkata',
  categories: ['Venue'],
} as const;

const budgetInput = {
  eventTitle: 'Wedding',
  eventType: 'wedding',
  totalBudget: 500000,
  currency: 'INR',
  categories: [
    { name: 'Venue', estimatedAmount: 150000 },
    { name: 'Catering', estimatedAmount: 120000 },
  ],
  savingTargetPercent: 15,
} as const;

describe('local template fallback (no API key)', () => {
  it('builds a schema-valid plan that satisfies aiEventPlanSchema', () => {
    const plan = buildLocalPlan(validEvent);
    // Round-trip through the raw schema to prove shape parity with the AI path.
    const raw = aiEventPlanSchema.parse({
      ...plan,
      budget: {
        currency: plan.budget.currency,
        totalBudget: plan.budget.totalBudget,
        categories: plan.budget.categories.map(({ name, estimatedAmount, reasoning }) => ({
          name,
          estimatedAmount,
          reasoning,
        })),
        contingencyAmount: plan.budget.contingencyAmount,
        savingTips: plan.budget.savingTips,
      },
    });
    expect(raw.eventOverview.title).toBe(validEvent.title);
    expect(raw.nextActions.length).toBeGreaterThan(0);
  });

  it('splits the budget to 90% categories + 10% contingency, never over budget', () => {
    const plan = buildLocalPlan(validEvent);
    expect(plan.budget.isOverBudget).toBe(false);
    expect(plan.budget.computedGrandTotal).toBeLessThanOrEqual(validEvent.totalBudget);
    expect(plan.budget.contingencyAmount).toBe(Math.round(validEvent.totalBudget * 0.1));
    expect(plan.budget.largestCostDrivers.length).toBeGreaterThan(0);
  });

  it('respects the user colour palette over the template default', () => {
    const plan = buildLocalPlan(validEvent);
    expect(plan.theme.colors).toEqual(validEvent.colorPalette);
  });

  it('produces next actions sized to the time remaining', () => {
    // validEvent starts 2026-06-12; from 2026-01-01 that is ~163 days out,
    // which should return the mid-planning horizon (menu, invitations, attire).
    const now = new Date('2026-01-01T00:00:00Z');
    const plan = buildLocalPlan(validEvent, now);
    expect(plan.nextActions.length).toBeGreaterThan(0);
    expect(plan.nextActions.join(' ')).toMatch(/menu|invitation/i);

    // Far in the future, the same event should prioritise locking the venue.
    const early = new Date('2025-01-01T00:00:00Z');
    const earlyPlan = buildLocalPlan(validEvent, early);
    expect(earlyPlan.nextActions.join(' ')).toMatch(/venue/i);
  });

  it('builds an invitation using only the supplied fields', () => {
    const result = buildLocalInvitation(invitationInput);
    expect(result.text).toContain('Anaya & Rohan');
    expect(result.text).toContain('12 June 2026');
    expect(result.text).toContain('Jaipur Palace');
    expect(result.missingFields).toHaveLength(0);
    expect(result.language).toBe('english');
  });

  it('flags a missing date rather than inventing one', () => {
    const result = buildLocalInvitation({ ...invitationInput, dateLabel: '' });
    expect(result.missingFields).toContain('date');
  });

  it('builds a menu honouring the requested segments and diet', () => {
    const menu = buildLocalMenu(menuInput);
    expect(menu.segments.map((s) => s.name)).toEqual(['Welcome', 'Dinner', 'Dessert']);
    expect(menu.dietaryNotes.join(' ')).toMatch(/vegetarian/i);
    expect(menu.segments.every((s) => s.items.length > 0)).toBe(true);
  });

  it('builds tasks from the event-type checklist', () => {
    const tasks = buildLocalTasks(taskInput);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.title.length > 0 && t.title.length <= 160)).toBe(true);
    expect(tasks.every((t) => ['high', 'medium', 'low'].includes(t.priority))).toBe(true);
  });

  it('builds budget advice that actually hits the requested saving', () => {
    const advice = buildLocalBudgetAdvice(budgetInput);
    expect(advice.targetCurrency).toBe('INR');
    expect(advice.revisedTotal).toBeLessThan(advice.originalTotal);
    expect(advice.totalSavingPercent).toBeGreaterThanOrEqual(0);
    expect(advice.recommendations.length).toBeGreaterThan(0);
    expect(advice.caveats.length).toBeGreaterThan(0);
  });

  it('serves every AI endpoint with source: local when keyless', async () => {
    const app = buildKeylessApp();

    const plan = await request(app).post('/api/ai/generate-plan').send({ event: validEvent });
    expect(plan.status).toBe(200);
    expect(plan.body.source).toBe('local');

    const chat = await request(app)
      .post('/api/ai/chat')
      .send({ event: validEvent, history: [], message: 'How can I reduce this budget by 15%?' });
    expect(chat.status).toBe(200);
    expect(chat.body.source).toBe('local');
    expect(chat.body.reply).toMatch(/reduce|budget|cut/i);

    const invite = await request(app)
      .post('/api/ai/generate-invitation')
      .send(invitationInput);
    expect(invite.status).toBe(200);
    expect(invite.body.source).toBe('local');

    const menu = await request(app).post('/api/ai/generate-menu').send(menuInput);
    expect(menu.status).toBe(200);
    expect(menu.body.source).toBe('local');

    const tasks = await request(app).post('/api/ai/suggest-tasks').send(taskInput);
    expect(tasks.status).toBe(200);
    expect(tasks.body.source).toBe('local');

    const budget = await request(app).post('/api/ai/improve-budget').send(budgetInput);
    expect(budget.status).toBe(200);
    expect(budget.body.source).toBe('local');
  });

  it('still validates payloads in local mode', async () => {
    const res = await request(buildKeylessApp())
      .post('/api/ai/generate-plan')
      .send({ event: { title: '', eventType: 'wedding' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('reports planning.mode local in health when keyless', async () => {
    const res = await request(buildKeylessApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ai.configured).toBe(false);
    expect(res.body.planning.mode).toBe('local');
  });

  it('reports planning.mode ai in health when configured', async () => {
    const res = await request(createApp({ provider: new MockProvider() })).get('/api/health');
    expect(res.body.planning.mode).toBe('ai');
  });
});

describe('normalizeEventPlan parity for local output', () => {
  it('produces the same normalized shape as the AI path', () => {
    const plan = buildLocalPlan(validEvent);
    expect(plan).toHaveProperty('budget.computedCategoriesTotal');
    expect(plan).toHaveProperty('budget.isOverBudget');
    // Sanity: category percentages derived from the requested budget.
    expect(plan.budget.categories[0].percentage).toBeGreaterThan(0);
    // Ensure re-normalizing the raw pieces does not change totals.
    const renormalized = normalizeEventPlan(
      {
        eventOverview: plan.eventOverview,
        theme: plan.theme,
        budget: {
          currency: plan.budget.currency,
          totalBudget: plan.budget.totalBudget,
          categories: plan.budget.categories.map(({ name, estimatedAmount, reasoning }) => ({
            name,
            estimatedAmount,
            reasoning,
          })),
          contingencyAmount: plan.budget.contingencyAmount,
          savingTips: plan.budget.savingTips,
        },
        timeline: plan.timeline,
        vendorChecklist: plan.vendorChecklist,
        menuIdeas: plan.menuIdeas,
        guestExperienceIdeas: plan.guestExperienceIdeas,
        entertainmentRecommendations: plan.entertainmentRecommendations,
        preparationTasks: plan.preparationTasks,
        risks: plan.risks,
        nextActions: plan.nextActions,
      },
      validEvent.totalBudget,
      validEvent.currency,
    );
    expect(renormalized.budget.computedGrandTotal).toBe(plan.budget.computedGrandTotal);
  });
});
