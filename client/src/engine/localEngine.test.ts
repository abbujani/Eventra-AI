import { describe, expect, it } from 'vitest';
import type { Event } from '../types/index.js';
import { toEventDetails } from '../types/index.js';
import {
  buildLocalBudgetAdvice,
  buildLocalInvitation,
  buildLocalMenu,
  buildLocalPlan,
  buildLocalTasks,
  chatLocally,
} from './index.js';

/**
 * The in-browser engine powers the static (GitHub Pages) build. These tests
 * pin the behaviour the API deployment's local fallback has always had, so the
 * two paths cannot drift silently: no network, no API key, deterministic
 * output derived only from the user's own event details.
 */
const event: Event = {
  id: 'evt_test_1',
  title: 'Test Wedding',
  eventType: 'wedding',
  startDate: '2027-02-14',
  timezone: 'Asia/Kolkata',
  location: 'Mumbai, India',
  guestCount: 120,
  venuePreference: 'indoor',
  totalBudget: 400000,
  currency: 'INR',
  budgetFlexibility: 'moderate',
  categoryPriorities: ['Venue', 'Catering'],
  colorPalette: ['#7657E8', '#FFFDF8'],
  dietaryPreferences: ['vegetarian'],
  mustHaveActivities: ['Sangeet'],
  thingsToAvoid: ['Fireworks'],
  eventDays: 1,
  planningPriorities: ['Stay within budget'],
  status: 'planning',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const details = toEventDetails(event);

describe('in-browser planning engine', () => {
  it('builds a complete plan within the declared budget', () => {
    const plan = buildLocalPlan(details);

    expect(plan.theme.name.length).toBeGreaterThan(0);
    expect(plan.theme.colors.length).toBeGreaterThanOrEqual(2);
    expect(plan.timeline.length).toBeGreaterThan(0);
    expect(plan.vendorChecklist.length).toBeGreaterThan(0);
    expect(plan.preparationTasks.length).toBeGreaterThan(0);
    expect(plan.risks.length).toBeGreaterThan(0);
    expect(plan.budget.currency).toBe('INR');
    expect(plan.budget.totalBudget).toBe(400000);
    expect(plan.budget.categories.length).toBeGreaterThan(0);
    expect(plan.budget.computedGrandTotal).toBeLessThanOrEqual(400000);
    expect(plan.budget.isOverBudget).toBe(false);
    expect(plan.budget.categories.reduce((sum, c) => sum + c.estimatedAmount, 0)).toBeCloseTo(
      plan.budget.computedCategoriesTotal,
      2,
    );
  });

  it('builds a menu grounded in the guest count', () => {
    const menu = buildLocalMenu({
      eventTitle: 'Test Wedding',
      eventType: 'wedding',
      guestCount: 120,
      segments: ['Welcome', 'Dinner'],
      dietaryPreferences: ['vegetarian'],
      currency: 'INR',
    });

    expect(menu.segments.length).toBeGreaterThan(0);
    const items = menu.segments.flatMap((segment) => segment.items);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.name.length > 0)).toBe(true);
  });

  it('builds an invitation that echoes the requested tone and channel', () => {
    const invitation = buildLocalInvitation({
      eventTitle: 'Test Wedding',
      eventType: 'wedding',
      dateLabel: '14 Feb 2027',
      venue: 'Mumbai, India',
      tone: 'warm',
      language: 'english',
      channel: 'whatsapp',
    });

    expect(invitation.language).toBe('english');
    expect(invitation.tone).toBe('warm');
    expect(invitation.channel).toBe('whatsapp');
    expect(invitation.text).toContain('Test Wedding');
  });

  it('suggests preparation tasks with priorities', () => {
    const tasks = buildLocalTasks({
      eventTitle: 'Test Wedding',
      eventType: 'wedding',
      guestCount: 120,
      startDate: '2027-02-14',
      timezone: 'Asia/Kolkata',
      categories: ['Venue', 'Catering'],
    });

    expect(tasks.length).toBeGreaterThanOrEqual(5);
    expect(tasks.every((task) => ['high', 'medium', 'low'].includes(task.priority))).toBe(true);
    expect(tasks.every((task) => task.title.length > 0)).toBe(true);
  });

  it('suggests budget savings without inventing live quotes', () => {
    const advice = buildLocalBudgetAdvice({
      eventTitle: 'Test Wedding',
      eventType: 'wedding',
      totalBudget: 400000,
      currency: 'INR',
      categories: [
        { name: 'Venue', estimatedAmount: 120000 },
        { name: 'Catering', estimatedAmount: 140000 },
      ],
      savingTargetPercent: 15,
    });

    expect(advice.recommendations.length).toBeGreaterThan(0);
    expect(advice.summary.length).toBeGreaterThan(0);
  });

  it('answers chat questions from the event details', () => {
    const reply = chatLocally(details, undefined, [], 'How can I reduce this budget by 15%?');

    expect(reply.length).toBeGreaterThan(40);
    expect(reply.toLowerCase()).toMatch(/budget|vendor|cut|save/);
  });

  it('rejects empty chat messages', () => {
    expect(() => chatLocally(details, undefined, [], '   ')).toThrow(/empty/i);
  });
});
