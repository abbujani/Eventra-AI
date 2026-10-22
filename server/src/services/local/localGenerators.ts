import type {
  BudgetAdviceInput,
  InvitationInput,
  MenuInput,
  TaskSuggestionInput,
} from '../../types.js';
import { AppError } from '../../utils/errors.js';
import type { GeneratedInvitation } from '../ai/invitationService.js';
import {
  budgetAdviceSchema,
  menuPlanSchema,
  taskSuggestionsSchema,
  type BudgetAdvice,
  type MenuPlan,
  type MenuItem,
  type TaskSuggestion,
} from '../ai/schemas.js';
import { EVENT_TEMPLATES } from './templates.js';

/**
 * Deterministic local generators for the invitation, menu, task and budget
 * endpoints, used when no Gemini API key is configured.
 *
 * Like the local planner, these never fabricate live market data. Invitations
 * are assembled from the exact fields the user supplied; menus and tasks come
 * from curated event-type templates; budget advice applies a transparent,
 * rule-based reduction to the user's own category amounts. All outputs are
 * validated against the same Zod schemas the AI path uses.
 */

/** Invitation copy assembled only from the user's supplied fields. */
export function buildLocalInvitation(input: InvitationInput): GeneratedInvitation {
  const missingFields: string[] = [];
  if (!input.dateLabel || input.dateLabel.trim().length === 0) missingFields.push('date');

  const host = input.hostName?.trim();
  const venue = input.venue?.trim();
  const rsvp = input.rsvpDetails?.trim();

  const hostLine = host ? host : 'the host';
  const whenParts = [input.dateLabel, input.timeLabel].filter(Boolean).join(' at ');

  const isHindi = input.language === 'hindi';
  const isHinglish = input.language === 'hinglish';

  let text: string;
  if (isHindi) {
    const lines = [
      input.tone === 'formal' ? 'सादर निमंत्रण' : 'दिल से निमंत्रण',
      '',
      `${hostLine} आपको ${input.eventTitle} में सादर आमंत्रित करते/करती हैं।`,
      `दिनांक: ${whenParts}`,
    ];
    if (venue) lines.push(`स्थान: ${venue}`);
    lines.push('');
    if (rsvp) lines.push(`कृपया उपस्थिति की पुष्टि करें: ${rsvp}`);
    if (input.additionalNotes) lines.push(input.additionalNotes);
    lines.push('');
    lines.push('आपकी उपस्थिति हमारे लिए विशेष होगी।');
    text = lines.join('\n');
  } else if (isHinglish) {
    const lines = [
      input.tone === 'formal' ? 'Aapka swagat hai' : 'Dil se nimantran',
      '',
      `${hostLine} aapko ${input.eventTitle} ke liye invite kar rahe/rahi hain.`,
      `Date: ${whenParts}`,
    ];
    if (venue) lines.push(`Venue: ${venue}`);
    lines.push('');
    if (rsvp) lines.push(`RSVP karein: ${rsvp}`);
    if (input.additionalNotes) lines.push(input.additionalNotes);
    lines.push('');
    lines.push('Aapki presence hamare liye special hogi.');
    text = lines.join('\n');
  } else {
    const salutation =
      input.tone === 'formal'
        ? 'You are cordially invited'
        : input.tone === 'warm'
          ? 'We would love to celebrate with you'
          : "We'd love you to join us";
    const lines = [
      input.tone === 'formal' ? 'Invitation' : "You're invited",
      '',
      `${salutation} to ${input.eventTitle}, hosted by ${hostLine}.`,
      `When: ${whenParts}`,
    ];
    if (venue) lines.push(`Where: ${venue}`);
    lines.push('');
    if (rsvp) lines.push(`Please RSVP: ${rsvp}`);
    if (input.additionalNotes) lines.push(input.additionalNotes);
    lines.push('');
    lines.push('Your presence would make the occasion memorable.');
    text = lines.join('\n');
  }

  // Channel-specific shaping keeps the copy usable where it will be posted.
  if (input.channel === 'whatsapp' || input.channel === 'social') {
    text = text.split('\n').filter((line) => line.trim().length > 0).join('\n');
  }

  return {
    text,
    language: input.language,
    tone: input.tone,
    channel: input.channel,
    eventType: input.eventType,
    missingFields,
  };
}

const MENU_LIBRARY: Array<{ match: RegExp; items: Array<{ name: string; kind: MenuItem['kind'] }> }> = [
  { match: /welcome|drink|cocktail/i, items: [{ name: 'Masala lemonade', kind: 'beverage' }, { name: 'Jaljeera', kind: 'beverage' }, { name: 'Seasonal fruit punch', kind: 'beverage' }] },
  { match: /snack|starter|chaat/i, items: [{ name: 'Paneer tikka', kind: 'vegetarian' }, { name: 'Samosa chaat', kind: 'vegetarian' }, { name: 'Chicken tikka', kind: 'non-vegetarian' }] },
  { match: /lunch|main|dinner|meal/i, items: [{ name: 'Vegetable biryani', kind: 'vegetarian' }, { name: 'Dal makhani', kind: 'vegetarian' }, { name: 'Butter chicken', kind: 'non-vegetarian' }, { name: 'Mixed vegetable curry', kind: 'vegan' }] },
  { match: /dessert|sweet|cake/i, items: [{ name: 'Gulab jamun', kind: 'dessert' }, { name: 'Rasmalai', kind: 'dessert' }, { name: 'Ice cream counter', kind: 'dessert' }] },
];

/** Build a menu plan from the event template plus the requested segments. */
export function buildLocalMenu(input: MenuInput): MenuPlan {
  const template = EVENT_TEMPLATES[input.eventType] ?? EVENT_TEMPLATES.other;
  const segmentNames =
    input.segments.length > 0 ? input.segments : ['Welcome', 'Main course', 'Dessert'];

  const segments = segmentNames.slice(0, 8).map((segmentName) => {
    const library = MENU_LIBRARY.find((entry) => entry.match.test(segmentName));
    const baseItems = library ? library.items : template.menuIdeas.slice(0, 3).map((idea) => ({ name: idea, kind: 'other' as const }));
    const items: MenuItem[] = baseItems.slice(0, 20).map((item) => ({ ...item }));
    return { name: segmentName.slice(0, 60), items };
  });

  const dietaryNotes: string[] = [];
  for (const pref of input.dietaryPreferences) {
    dietaryNotes.push(`A dedicated ${pref} spread is planned and clearly labelled at every station.`);
  }
  if (input.regionalPreference) {
    dietaryNotes.push(`Menu leans towards ${input.regionalPreference} specialities.`);
  }

  const perGuest =
    input.budgetHint && input.guestCount > 0
      ? Math.round(input.budgetHint / input.guestCount)
      : undefined;

  const raw = {
    summary:
      `A ${template.label.toLowerCase()} menu for ${input.guestCount} guests, ` +
      `structured across ${segments.length} segment${segments.length === 1 ? '' : 's'} ` +
      `( ${segmentNames.join(', ')} ). Built from a curated template — connect an AI key for a fully bespoke menu.`,
    segments,
    dietaryNotes: dietaryNotes.slice(0, 10),
    allergyWarning:
      input.dietaryPreferences.length > 0
        ? 'Confirm allergens (nuts, dairy, gluten) with your caterer and label every dish before service.'
        : undefined,
    budgetNotes:
      perGuest !== undefined
        ? `At ${input.budgetHint} ${input.currency ?? ''} across ${input.guestCount} guests, aim for roughly ${perGuest} per guest on food.`
        : undefined,
  };

  const parsed = menuPlanSchema.safeParse(raw);
  if (!parsed.success) throw AppError.aiInvalidResponse('Could not build a menu. Please try again.');
  return parsed.data;
}

/** Task suggestions from the event template, prioritised by how soon the event is. */
export function buildLocalTasks(input: TaskSuggestionInput): TaskSuggestion[] {
  const template = EVENT_TEMPLATES[input.eventType] ?? EVENT_TEMPLATES.other;
  const tasks: TaskSuggestion[] = template.preparationTasks.map((task) => ({
    title: task.title.slice(0, 160),
    category: (input.categories[0] ?? template.label).slice(0, 80),
    priority: task.priority,
    relativeDeadline: task.relativeDeadline,
    description: task.description.slice(0, 600),
  }));

  const parsed = taskSuggestionsSchema.safeParse({ tasks: tasks.slice(0, 30) });
  if (!parsed.success) throw AppError.aiInvalidResponse('Could not build tasks. Please try again.');
  return parsed.data.tasks;
}

/**
 * Rule-based budget advice: reduce the largest categories first, targeting the
 * requested saving percentage. Amounts are computed from the user's own numbers.
 */
export function buildLocalBudgetAdvice(input: BudgetAdviceInput): BudgetAdvice {
  const target = Math.min(90, Math.max(0, input.savingTargetPercent));
  const categories = input.categories.filter((c) => c.estimatedAmount > 0);
  const originalTotal = categories.reduce((sum, c) => sum + c.estimatedAmount, 0);

  if (categories.length === 0 || originalTotal === 0) {
    throw AppError.validation('Add at least one non-zero category to get budget advice.');
  }

  const targetSaving = (originalTotal * target) / 100;

  // Allocate the target saving across the largest categories proportionally,
  // so the result lands on the requested percentage rather than overshooting.
  // Larger categories absorb more of the cut; each is capped so no single line
  // item is gutted below a workable floor.
  const largest = [...categories].sort((a, b) => b.estimatedAmount - a.estimatedAmount).slice(0, 6);
  const largestTotal = largest.reduce((sum, c) => sum + c.estimatedAmount, 0);
  const weights = new Map(largest.map((c) => [c.name, c.estimatedAmount / largestTotal]));

  const capFor = (amount: number) => amount * 0.6; // never cut more than 60% of a line
  const cuts = new Map<string, number>();
  let allocated = 0;
  let activeTotal = 0;

  // First pass: propose proportional cuts, respecting caps.
  for (const category of largest) {
    const proposed = targetSaving * (weights.get(category.name) ?? 0);
    const capped = Math.min(proposed, capFor(category.estimatedAmount));
    cuts.set(category.name, capped);
    allocated += capped;
    if (capped < proposed) continue; // this category is at its cap
    activeTotal += weights.get(category.name) ?? 0;
  }

  // Second pass: if caps left the target under-allocated, distribute the
  // remainder across the categories that still have headroom.
  if (allocated < targetSaving && activeTotal > 0) {
    const shortfall = targetSaving - allocated;
    for (const category of largest) {
      const current = cuts.get(category.name) ?? 0;
      const headroom = capFor(category.estimatedAmount) - current;
      if (headroom <= 0) continue;
      const extra = Math.min(headroom, shortfall * ((weights.get(category.name) ?? 0) / activeTotal));
      cuts.set(category.name, current + extra);
      allocated += extra;
    }
  }

  const recommendations = largest.map((category) => {
    const cut = Math.round(cuts.get(category.name) ?? 0);
    const suggested = Math.max(0, category.estimatedAmount - cut);
    const weight = weights.get(category.name) ?? 0;
    return {
      category: category.name.slice(0, 120),
      currentEstimate: category.estimatedAmount,
      suggestedAmount: suggested,
      reasoning:
        cut > 0
          ? `Trim this large category (${Math.round(weight * 100)}% of spend) — comparing quotes or trimming scope here usually yields the biggest single saving.`
          : 'Already lean relative to the rest of the budget; little to cut without hurting quality.',
    };
  });

  const revisedTotal = recommendations.reduce((sum, r) => sum + r.suggestedAmount, 0) +
    categories.slice(6).reduce((sum, c) => sum + c.estimatedAmount, 0);
  const saving = originalTotal - revisedTotal;
  const savingPercent = originalTotal > 0 ? (saving / originalTotal) * 100 : 0;

  const raw = {
    summary:
      `To free up about ${Math.round(savingPercent)}% (${Math.round(saving).toLocaleString('en-IN')} ${input.currency}), ` +
      'trim the largest categories first rather than spreading small cuts everywhere. ' +
      'These are rule-of-thumb reductions from your own figures — not live vendor quotes.',
    targetCurrency: input.currency,
    originalTotal,
    revisedTotal,
    totalSavingPercent: Math.min(90, Math.max(0, savingPercent)),
    recommendations,
    caveats: [
      'These are planning heuristics, not market quotes — validate against real vendor pricing before committing.',
      'Protect the categories your guests will notice most; cut quietly instead.',
      'Hold back roughly 10% of the budget as contingency for genuine surprises.',
    ],
  };

  const parsed = budgetAdviceSchema.safeParse(raw);
  if (!parsed.success) throw AppError.aiInvalidResponse('Could not build budget advice. Please try again.');
  return parsed.data;
}
