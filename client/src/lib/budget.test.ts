import { describe, expect, it } from 'vitest';
import { chartData, summarizeBudget } from '../lib/budget.js';
import type { Expense } from '../types/index.js';

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: `exp_${Math.random().toString(36).slice(2)}`,
    eventId: 'evt_1',
    category: 'Venue',
    title: 'Item',
    estimatedAmount: 0,
    currency: 'INR',
    paymentStatus: 'unpaid',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const EXPENSES: Expense[] = [
  expense({ category: 'Venue', estimatedAmount: 100000, actualAmount: 80000 }),
  expense({ category: 'Catering', estimatedAmount: 50000, actualAmount: 60000 }),
  expense({ category: 'Venue', estimatedAmount: 30000 }),
];

describe('summarizeBudget', () => {
  it('totals estimated and actual amounts separately', () => {
    const summary = summarizeBudget(500000, 'INR', EXPENSES);
    expect(summary.estimatedTotal).toBe(180000);
    expect(summary.actualTotal).toBe(140000);
    expect(summary.remaining).toBe(360000);
    expect(summary.remainingVsEstimate).toBe(320000);
  });

  it('computes utilisation as a percentage of the budget', () => {
    const summary = summarizeBudget(500000, 'INR', EXPENSES);
    expect(summary.utilizationPercent).toBeCloseTo(28, 1);
    expect(summary.estimatedUtilizationPercent).toBeCloseTo(36, 1);
  });

  it('groups expenses by category with counts', () => {
    const summary = summarizeBudget(500000, 'INR', EXPENSES);
    const venue = summary.categories.find((category) => category.name === 'Venue');
    expect(venue?.estimated).toBe(130000);
    expect(venue?.actual).toBe(80000);
    expect(venue?.expenseCount).toBe(2);
    expect(venue?.percentOfBudget).toBeCloseTo(16, 1);
  });

  it('sorts categories by actual spend, largest first', () => {
    const summary = summarizeBudget(500000, 'INR', EXPENSES);
    expect(summary.categories.map((category) => category.name)).toEqual(['Venue', 'Catering']);
  });

  it('flags an overrun when actual spend exceeds the budget', () => {
    const summary = summarizeBudget(100000, 'INR', EXPENSES);
    expect(summary.isOverBudget).toBe(true);
    expect(summary.overrunAmount).toBe(40000);
    expect(summary.remaining).toBe(-40000);
  });

  it('does not flag an overrun when exactly at budget', () => {
    const summary = summarizeBudget(140000, 'INR', EXPENSES);
    expect(summary.isOverBudget).toBe(false);
    expect(summary.overrunAmount).toBe(0);
  });

  it('handles a zero budget without dividing by zero', () => {
    const summary = summarizeBudget(0, 'INR', EXPENSES);
    expect(summary.utilizationPercent).toBe(0);
    expect(summary.categories[0]?.percentOfBudget).toBe(0);
    expect(Number.isFinite(summary.utilizationPercent)).toBe(true);
  });

  it('handles an empty expense list', () => {
    const summary = summarizeBudget(500000, 'INR', []);
    expect(summary.actualTotal).toBe(0);
    expect(summary.categories).toHaveLength(0);
    expect(summary.isOverBudget).toBe(false);
  });

  it('ignores non-finite amounts rather than producing NaN', () => {
    const summary = summarizeBudget(500000, 'INR', [
      expense({ estimatedAmount: Number.NaN, actualAmount: Number.NaN }),
    ]);
    expect(summary.estimatedTotal).toBe(0);
    expect(summary.actualTotal).toBe(0);
    expect(Number.isNaN(summary.remaining)).toBe(false);
  });
});

describe('chartData', () => {
  it('prefers actual values when they exist', () => {
    const summary = summarizeBudget(500000, 'INR', EXPENSES);
    const data = chartData(summary);
    expect(data[0]).toEqual({ name: 'Venue', value: 80000 });
  });

  it('falls back to estimates when no actuals are recorded', () => {
    const summary = summarizeBudget(500000, 'INR', [
      expense({ category: 'Venue', estimatedAmount: 100000 }),
    ]);
    const data = chartData(summary);
    expect(data).toEqual([{ name: 'Venue', value: 100000 }]);
  });

  it('drops zero-value entries so empty charts stay clean', () => {
    const summary = summarizeBudget(500000, 'INR', [
      expense({ category: 'Venue', estimatedAmount: 0 }),
    ]);
    expect(chartData(summary)).toHaveLength(0);
  });
});
