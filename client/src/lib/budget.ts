import type { Expense } from '../types/index.js';

/**
 * Deterministic budget arithmetic. All totals and percentages are computed
 * here from raw expense data — the AI is never trusted to total a budget.
 */

export interface CategorySummary {
  name: string;
  estimated: number;
  actual: number;
  remaining: number;
  percentOfBudget: number;
  expenseCount: number;
}

export interface BudgetSummary {
  currency: string;
  totalBudget: number;
  estimatedTotal: number;
  actualTotal: number;
  remaining: number;
  remainingVsEstimate: number;
  utilizationPercent: number;
  estimatedUtilizationPercent: number;
  isOverBudget: boolean;
  overrunAmount: number;
  categories: CategorySummary[];
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function summarizeBudget(
  totalBudget: number,
  currency: string,
  expenses: Expense[],
): BudgetSummary {
  const safeBudget = Number.isFinite(totalBudget) ? totalBudget : 0;

  const byCategory = new Map<string, { estimated: number; actual: number; count: number }>();
  let estimatedTotal = 0;
  let actualTotal = 0;

  for (const expense of expenses) {
    const estimated = typeof expense.estimatedAmount === 'number' && Number.isFinite(expense.estimatedAmount) ? expense.estimatedAmount : 0;
    const actual = typeof expense.actualAmount === 'number' && Number.isFinite(expense.actualAmount) ? expense.actualAmount : 0;
    estimatedTotal += estimated;
    actualTotal += actual;

    const bucket = byCategory.get(expense.category) ?? { estimated: 0, actual: 0, count: 0 };
    bucket.estimated += estimated;
    bucket.actual += actual;
    bucket.count += 1;
    byCategory.set(expense.category, bucket);
  }

  const categories: CategorySummary[] = [...byCategory.entries()]
    .map(([name, bucket]) => ({
      name,
      estimated: round(bucket.estimated),
      actual: round(bucket.actual),
      remaining: round(safeBudget - bucket.actual),
      percentOfBudget: safeBudget > 0 ? round((bucket.actual / safeBudget) * 100, 1) : 0,
      expenseCount: bucket.count,
    }))
    .sort((a, b) => b.actual - a.actual);

  const utilizationPercent = safeBudget > 0 ? round((actualTotal / safeBudget) * 100, 1) : 0;

  return {
    currency,
    totalBudget: round(safeBudget),
    estimatedTotal: round(estimatedTotal),
    actualTotal: round(actualTotal),
    remaining: round(safeBudget - actualTotal),
    remainingVsEstimate: round(safeBudget - estimatedTotal),
    utilizationPercent,
    estimatedUtilizationPercent:
      safeBudget > 0 ? round((estimatedTotal / safeBudget) * 100, 1) : 0,
    isOverBudget: actualTotal > safeBudget,
    overrunAmount: round(Math.max(0, actualTotal - safeBudget)),
    categories,
  };
}

/** Sorted category breakdown for charting, largest first. */
export function chartData(summary: BudgetSummary): Array<{ name: string; value: number }> {
  const source =
    summary.actualTotal > 0
      ? summary.categories.map((category) => ({
          name: category.name,
          value: category.actual,
        }))
      : summary.categories.map((category) => ({
          name: category.name,
          value: category.estimated,
        }));
  return source.filter((entry) => entry.value > 0).sort((a, b) => b.value - a.value);
}
