import { describe, expect, it } from 'vitest';
import { normalizeEventPlan, aiEventPlanSchema } from '../src/services/ai/schemas.js';
import { validPlan } from './helpers.js';

function normalize(overrides: Record<string, unknown> = {}) {
  const parsed = aiEventPlanSchema.parse(validPlan);
  return normalizeEventPlan(parsed, overrides.totalBudget ?? 500000, overrides.currency ?? 'INR');
}

describe('normalizeEventPlan', () => {
  it('uses the requested budget as the authoritative total', () => {
    const plan = normalize({ totalBudget: 400000 });
    expect(plan.budget.totalBudget).toBe(400000);
  });

  it('computes category totals and grand totals deterministically', () => {
    const plan = normalize();
    expect(plan.budget.computedCategoriesTotal).toBe(410000);
    expect(plan.budget.computedGrandTotal).toBe(435000);
  });

  it('computes percentages against the requested budget', () => {
    const plan = normalize();
    const venue = plan.budget.categories.find((c) => c.name === 'Venue');
    expect(venue?.percentage).toBeCloseTo(30, 5);
  });

  it('does not report an overrun when within budget', () => {
    const plan = normalize();
    expect(plan.budget.isOverBudget).toBe(false);
    expect(plan.budget.overrunAmount).toBe(0);
  });

  it('reports an overrun and largest cost drivers when over budget', () => {
    const plan = normalize({ totalBudget: 200000 });
    expect(plan.budget.isOverBudget).toBe(true);
    expect(plan.budget.overrunAmount).toBe(235000);
    expect(plan.budget.largestCostDrivers).toContain('Venue');
    expect(plan.budget.largestCostDrivers).toContain('Catering');
  });

  it('caps contingency arithmetic to two decimals', () => {
    const plan = normalize();
    expect(Number.isFinite(plan.budget.contingencyAmount)).toBe(true);
  });
});
