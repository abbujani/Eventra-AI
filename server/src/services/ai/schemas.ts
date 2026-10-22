import { z } from 'zod';

/**
 * Zod schemas for every structured AI response.
 *
 * These are the *validation* layer: whatever the model returns is parsed with
 * these schemas before it is stored or shown to a user. The Gemini JSON schemas
 * in `jsonSchemas.ts` steer generation; these schemas guarantee correctness.
 */

const bounded = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().catch(undefined);

const priority = z.enum(['high', 'medium', 'low']);

export const eventOverviewSchema = z.object({
  title: bounded(160),
  summary: z.string().trim().min(1).max(2500),
  planningAssumptions: z.array(bounded(400)).max(15),
});

export const themeSchema = z.object({
  name: bounded(120),
  description: z.string().trim().min(1).max(1500),
  colors: z.array(z.string().trim().min(1).max(40)).min(2).max(8),
  decorationIdeas: z.array(bounded(400)).max(20),
});

export const budgetCategorySchema = z.object({
  name: bounded(120),
  estimatedAmount: z.number().finite().nonnegative(),
  reasoning: optionalText(500),
});

export const budgetSectionSchema = z.object({
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
  totalBudget: z.number().finite().nonnegative(),
  categories: z.array(budgetCategorySchema).min(1).max(20),
  contingencyAmount: z.number().finite().nonnegative(),
  savingTips: z.array(bounded(400)).max(15),
});

export const timelineItemSchema = z.object({
  time: bounded(40),
  title: bounded(160),
  description: optionalText(600),
  category: optionalText(60),
});

export const vendorChecklistItemSchema = z.object({
  category: bounded(80),
  priority,
  tasks: z.array(bounded(300)).max(15),
  suggestedBookingWindow: optionalText(120),
});

export const preparationTaskSchema = z.object({
  title: bounded(160),
  description: optionalText(600),
  priority,
  relativeDeadline: optionalText(120),
});

export const riskSchema = z.object({
  title: bounded(160),
  mitigation: bounded(600),
});

export const aiEventPlanSchema = z.object({
  eventOverview: eventOverviewSchema,
  theme: themeSchema,
  budget: budgetSectionSchema,
  timeline: z.array(timelineItemSchema).max(40),
  vendorChecklist: z.array(vendorChecklistItemSchema).max(20),
  menuIdeas: z.array(bounded(400)).max(20),
  guestExperienceIdeas: z.array(bounded(400)).max(15),
  entertainmentRecommendations: z.array(bounded(400)).max(15),
  preparationTasks: z.array(preparationTaskSchema).max(30),
  risks: z.array(riskSchema).max(15),
  nextActions: z.array(bounded(400)).max(15),
});

export type EventOverview = z.infer<typeof eventOverviewSchema>;
export type ThemeSection = z.infer<typeof themeSchema>;
export type BudgetCategory = z.infer<typeof budgetCategorySchema>;
export type BudgetSection = z.infer<typeof budgetSectionSchema>;
export type TimelineItem = z.infer<typeof timelineItemSchema>;
export type VendorChecklistItem = z.infer<typeof vendorChecklistItemSchema>;
export type PreparationTask = z.infer<typeof preparationTaskSchema>;
export type RiskItem = z.infer<typeof riskSchema>;
export type AIEventPlan = z.infer<typeof aiEventPlanSchema>;

/** Menu planner output. */
export const menuSegmentItemSchema = z.object({
  name: bounded(160),
  kind: z.enum(['vegetarian', 'non-vegetarian', 'vegan', 'beverage', 'dessert', 'snack', 'other']),
  notes: optionalText(300),
});

export const menuSegmentSchema = z.object({
  name: bounded(60),
  items: z.array(menuSegmentItemSchema).min(1).max(20),
});

export const menuPlanSchema = z.object({
  summary: z.string().trim().min(1).max(1500),
  segments: z.array(menuSegmentSchema).min(1).max(8),
  dietaryNotes: z.array(bounded(400)).max(10),
  allergyWarning: optionalText(600),
  budgetNotes: optionalText(600),
});

export type MenuItem = z.infer<typeof menuSegmentItemSchema>;
export type MenuSegment = z.infer<typeof menuSegmentSchema>;
export type MenuPlan = z.infer<typeof menuPlanSchema>;

/** Task suggestions returned by the AI. */
export const taskSuggestionSchema = z.object({
  title: bounded(160),
  category: bounded(80),
  priority,
  relativeDeadline: optionalText(120),
  description: optionalText(600),
});

export const taskSuggestionsSchema = z.object({
  tasks: z.array(taskSuggestionSchema).min(1).max(30),
});

export type TaskSuggestion = z.infer<typeof taskSuggestionSchema>;

/** Budget optimisation advice. */
export const budgetRecommendationSchema = z.object({
  category: bounded(120),
  currentEstimate: z.number().finite().nonnegative(),
  suggestedAmount: z.number().finite().nonnegative(),
  reasoning: bounded(500),
});

export const budgetAdviceSchema = z.object({
  summary: z.string().trim().min(1).max(1500),
  targetCurrency: z.string().trim().regex(/^[A-Z]{3}$/),
  originalTotal: z.number().finite().nonnegative(),
  revisedTotal: z.number().finite().nonnegative(),
  totalSavingPercent: z.number().finite().min(0).max(90),
  recommendations: z.array(budgetRecommendationSchema).min(1).max(20),
  caveats: z.array(bounded(400)).max(10),
});

export type BudgetRecommendation = z.infer<typeof budgetRecommendationSchema>;
export type BudgetAdvice = z.infer<typeof budgetAdviceSchema>;

/**
 * Deterministic, model-independent budget arithmetic.
 *
 * The model is asked to estimate, but totals and percentages are always
 * recomputed here. The user's requested budget is treated as authoritative.
 */
export interface NormalizedBudgetCategory extends BudgetCategory {
  percentage: number;
}

export interface NormalizedBudget {
  currency: string;
  totalBudget: number;
  categories: NormalizedBudgetCategory[];
  contingencyAmount: number;
  savingTips: string[];
  computedCategoriesTotal: number;
  computedGrandTotal: number;
  overrunAmount: number;
  isOverBudget: boolean;
  largestCostDrivers: string[];
}

export interface NormalizedAIEventPlan extends Omit<AIEventPlan, 'budget'> {
  budget: NormalizedBudget;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function normalizeEventPlan(
  raw: AIEventPlan,
  requestedBudget: number,
  requestedCurrency: string,
): NormalizedAIEventPlan {
  const categoriesTotal = round(
    raw.budget.categories.reduce((sum, category) => sum + category.estimatedAmount, 0),
  );
  const contingencyAmount = round(raw.budget.contingencyAmount);
  const computedGrandTotal = round(categoriesTotal + contingencyAmount);

  const categories: NormalizedBudgetCategory[] = raw.budget.categories.map((category) => ({
    ...category,
    percentage: requestedBudget > 0 ? round((category.estimatedAmount / requestedBudget) * 100, 1) : 0,
  }));

  const largestCostDrivers = [...categories]
    .sort((a, b) => b.estimatedAmount - a.estimatedAmount)
    .slice(0, 3)
    .map((category) => category.name);

  const budget: NormalizedBudget = {
    currency: requestedCurrency,
    totalBudget: requestedBudget,
    categories,
    contingencyAmount,
    savingTips: raw.budget.savingTips,
    computedCategoriesTotal: categoriesTotal,
    computedGrandTotal,
    overrunAmount: round(Math.max(0, computedGrandTotal - requestedBudget)),
    isOverBudget: computedGrandTotal > requestedBudget,
    largestCostDrivers,
  };

  return { ...raw, budget };
}
