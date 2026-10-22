import { describe, expect, it } from 'vitest';
import {
  aiEventPlanSchema,
  budgetAdviceSchema,
  budgetSectionSchema,
  menuPlanSchema,
  taskSuggestionsSchema,
} from '../src/services/ai/schemas.js';
import { validPlan } from './helpers.js';

describe('aiEventPlanSchema', () => {
  it('accepts a well-formed plan', () => {
    const result = aiEventPlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it('rejects a plan missing required sections', () => {
    const { theme: _theme, ...rest } = validPlan;
    const result = aiEventPlanSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects negative budget amounts', () => {
    const bad = JSON.parse(JSON.stringify(validPlan)) as typeof validPlan;
    bad.budget.categories[0]!.estimatedAmount = -1;
    const result = aiEventPlanSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid currency code', () => {
    const bad = JSON.parse(JSON.stringify(validPlan)) as typeof validPlan;
    bad.budget.currency = 'rupees';
    const result = aiEventPlanSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects more categories than allowed', () => {
    const bad = JSON.parse(JSON.stringify(validPlan)) as typeof validPlan;
    bad.budget.categories = Array.from({ length: 25 }, (_, index) => ({
      name: `Category ${index}`,
      estimatedAmount: 100,
    }));
    const result = aiEventPlanSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

describe('budgetSectionSchema', () => {
  it('requires at least one category', () => {
    const result = budgetSectionSchema.safeParse({
      currency: 'INR',
      totalBudget: 100,
      categories: [],
      contingencyAmount: 0,
      savingTips: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('menuPlanSchema', () => {
  it('validates a menu plan', () => {
    const result = menuPlanSchema.safeParse({
      summary: 'A vegetarian menu.',
      segments: [{ name: 'Dinner', items: [{ name: 'Paneer', kind: 'vegetarian' }] }],
      dietaryNotes: ['Vegan options available'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid item kind', () => {
    const result = menuPlanSchema.safeParse({
      summary: 'Menu',
      segments: [{ name: 'Dinner', items: [{ name: 'Paneer', kind: 'meat' }] }],
      dietaryNotes: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('taskSuggestionsSchema', () => {
  it('validates task suggestions', () => {
    const result = taskSuggestionsSchema.safeParse({
      tasks: [{ title: 'Book venue', category: 'Venue', priority: 'high' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('budgetAdviceSchema', () => {
  it('validates budget advice', () => {
    const result = budgetAdviceSchema.safeParse({
      summary: 'Trim 15%',
      targetCurrency: 'INR',
      originalTotal: 500000,
      revisedTotal: 425000,
      totalSavingPercent: 15,
      recommendations: [
        { category: 'Venue', currentEstimate: 150000, suggestedAmount: 130000, reasoning: 'Negotiate' },
      ],
      caveats: ['Illustrative only'],
    });
    expect(result.success).toBe(true);
  });
});
