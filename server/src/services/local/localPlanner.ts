import type { EventDetails } from '../../types.js';
import {
  aiEventPlanSchema,
  normalizeEventPlan,
  type AIEventPlan,
  type NormalizedAIEventPlan,
} from '../ai/schemas.js';
import { BUDGET_SPLITS, SAVING_TIPS } from './data.js';
import { COMMON_RISKS, EVENT_TEMPLATES, venueRisks } from './templates.js';

/**
 * Deterministic local event planner.
 *
 * Used as the honest fallback when no Gemini API key is configured. It never
 * fabricates live market prices, vendor names or availability: every monetary
 * amount is a planning-ratio split of the user's own declared budget, and the
 * checklist/timeline content comes from curated static templates. The output is
 * validated against the same `aiEventPlanSchema` the AI path uses, so the shape
 * is identical — only the `source` label on the route response differs.
 */

/** Split the budget using the per-event-type ratios; categories total 90%, contingency 10%. */
function buildBudget(event: EventDetails): AIEventPlan['budget'] {
  const splits = BUDGET_SPLITS[event.eventType] ?? BUDGET_SPLITS.other;
  const total = Number.isFinite(event.totalBudget) ? Math.max(0, event.totalBudget) : 0;

  const categories = splits.map((split) => ({
    name: split.name,
    estimatedAmount: Math.round(total * split.share),
    reasoning: split.reasoning,
  }));

  const savingTips = SAVING_TIPS[event.budgetFlexibility] ?? SAVING_TIPS.moderate;

  return {
    currency: event.currency,
    totalBudget: total,
    categories,
    contingencyAmount: Math.round(total * 0.1),
    savingTips: [...savingTips],
  };
}

/** Build the event overview, folding the user's stated priorities into the assumptions. */
function buildOverview(event: EventDetails): AIEventPlan['eventOverview'] {
  const template = EVENT_TEMPLATES[event.eventType] ?? EVENT_TEMPLATES.other;
  const assumptions: string[] = [];

  assumptions.push(`Planning for ${event.guestCount} guests in ${event.location}.`);
  assumptions.push(`Venue preference: ${event.venuePreference}.`);
  if (event.style) assumptions.push(`Style direction: ${event.style}.`);
  if (event.dietaryPreferences.length > 0) {
    assumptions.push(`Dietary focus: ${event.dietaryPreferences.join(', ')}.`);
  }
  if (event.categoryPriorities.length > 0) {
    assumptions.push(`Prioritised categories: ${event.categoryPriorities.join(', ')}.`);
  }
  if (event.mustHaveActivities.length > 0) {
    assumptions.push(`Must-have activities: ${event.mustHaveActivities.join(', ')}.`);
  }
  if (event.thingsToAvoid.length > 0) {
    assumptions.push(`Avoid: ${event.thingsToAvoid.join(', ')}.`);
  }
  assumptions.push('Budget split uses standard planning ratios, not live vendor quotes.');

  const summary =
    `A ${template.label.toLowerCase()} for ${event.guestCount} guests in ${event.location}, ` +
    `budgeted at ${event.totalBudget} ${event.currency} with a ${event.budgetFlexibility} approach ` +
    `to spend. The plan below covers a run-of-show timeline, a vendor booking checklist, ` +
    `budget allocation and preparation tasks sized to the time remaining before ${event.startDate}.`;

  return { title: event.title, summary, planningAssumptions: assumptions };
}

/** Theme from the template, preferring the user's own colour palette when supplied. */
function buildTheme(event: EventDetails): AIEventPlan['theme'] {
  const template = EVENT_TEMPLATES[event.eventType] ?? EVENT_TEMPLATES.other;
  const colors = event.colorPalette.length >= 2 ? event.colorPalette : template.theme.colors;
  const prefix = event.style ? `${event.style} ` : '';
  return {
    name: `${prefix}${template.theme.name}`.trim(),
    description: template.theme.description,
    colors: colors.slice(0, 8),
    decorationIdeas: template.theme.decorationIdeas,
  };
}

/** Menu ideas merged with the user's dietary preferences. */
function buildMenuIdeas(event: EventDetails): string[] {
  const template = EVENT_TEMPLATES[event.eventType] ?? EVENT_TEMPLATES.other;
  const ideas = [...template.menuIdeas];
  for (const pref of event.dietaryPreferences) {
    ideas.push(`Dedicated ${pref} options sized for the full guest count, clearly labelled at every station.`);
  }
  return ideas.slice(0, 20);
}

/** Compute "next actions" that reflect how much time is actually left. */
function buildNextActions(_event: EventDetails, daysRemaining: number): string[] {
  const actions: string[] = [];

  if (daysRemaining > 365) {
    actions.push('Lock the date and confirm the venue — most other deadlines depend on it.');
    actions.push('Set the guest-list range so venue and catering quotes are realistic.');
    actions.push('Shortlist vendors for your top-priority categories and request quotes.');
  } else if (daysRemaining > 180) {
    actions.push('Book the venue and caterer if not already confirmed.');
    actions.push('Send save-the-dates so guests can hold the date.');
    actions.push('Shortlist and contract your photographer and decorator.');
  } else if (daysRemaining > 60) {
    actions.push('Finalise the menu with your caterer and book a tasting.');
    actions.push('Send formal invitations and begin tracking RSVPs.');
    actions.push('Confirm attire, styling trials and any entertainment bookings.');
  } else if (daysRemaining > 14) {
    actions.push('Chase pending RSVPs and start building the seating plan.');
    actions.push('Confirm final numbers, timings and contacts with every vendor.');
    actions.push('Prepare the run-of-show and appoint a day-of coordinator.');
  } else if (daysRemaining > 0) {
    actions.push('Confirm the final guest count with your caterer.');
    actions.push('Do a final walkthrough with your coordinator and key vendors.');
    actions.push('Pack an emergency kit and confirm vendor arrival times.');
  } else {
    actions.push('The event date has passed or is today — review expenses and send thank-you notes.');
    actions.push('Settle pending vendor payments and collect any final deliverables.');
  }

  return actions.slice(0, 15);
}

/** Days between now and the event start date (returns 0 if the date is unparseable). */
export function daysUntil(startDate: string, now: Date = new Date()): number {
  const target = Date.parse(`${startDate}T00:00:00Z`);
  if (Number.isNaN(target)) return 0;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

/** Build a full, schema-valid local event plan. */
export function buildLocalPlan(event: EventDetails, now: Date = new Date()): NormalizedAIEventPlan {
  const template = EVENT_TEMPLATES[event.eventType] ?? EVENT_TEMPLATES.other;
  const daysRemaining = daysUntil(event.startDate, now);

  const raw: AIEventPlan = {
    eventOverview: buildOverview(event),
    theme: buildTheme(event),
    budget: buildBudget(event),
    timeline: template.timeline.map((item) => ({ ...item })),
    vendorChecklist: template.vendors.map((vendor) => ({
      ...vendor,
      tasks: [...vendor.tasks],
    })),
    menuIdeas: buildMenuIdeas(event),
    guestExperienceIdeas: [...template.guestExperience],
    entertainmentRecommendations: [...template.entertainment],
    preparationTasks: template.preparationTasks.map((task) => ({ ...task })),
    risks: [...COMMON_RISKS, venueRisks(event.venuePreference)].slice(0, 15),
    nextActions: buildNextActions(event, daysRemaining),
  };

  // Validate against the exact schema the AI path uses so a template bug can
  // never leak malformed data to the client.
  const parsed = aiEventPlanSchema.safeParse(raw);
  if (!parsed.success) {
    // Fall back to a minimal-but-valid plan rather than crashing a route.
    const fallback = aiEventPlanSchema.parse({
      ...raw,
      timeline: [],
      vendorChecklist: [],
      menuIdeas: [],
      guestExperienceIdeas: [],
      entertainmentRecommendations: [],
      preparationTasks: [],
      risks: [],
    });
    return normalizeEventPlan(fallback, event.totalBudget, event.currency);
  }

  return normalizeEventPlan(parsed.data, event.totalBudget, event.currency);
}
