import type { ChatMessage, EventDetails } from '../../types.js';
import { AppError } from '../../utils/errors.js';
import { BUDGET_SPLITS, SAVING_TIPS } from './data.js';
import { EVENT_TEMPLATES } from './templates.js';
import { daysUntil } from './localPlanner.js';
import type { PlanSummaryContext } from '../ai/chatService.js';

/**
 * Built-in rule-based planner responses used when no Gemini API key is
 * configured. Unlike the AI path, this does not generate free-form prose — it
 * answers a small set of common planning questions with deterministic,
 * event-grounded facts (days remaining, budget split, checklist steps) and is
 * always labeled as the local template engine rather than AI.
 */

const MAX_MESSAGE_LENGTH = 1500;

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function formatMoney(amount: number, currency: string): string {
  return `${Math.round(amount).toLocaleString('en-IN')} ${currency}`;
}

/** Answer a budget-reduction question using the actual category split. */
function budgetAnswer(event: EventDetails, targetPercent: number): string {
  const splits = BUDGET_SPLITS[event.eventType] ?? BUDGET_SPLITS.other;
  const total = event.totalBudget;
  const cut = (total * targetPercent) / 100;

  const lines: string[] = [
    `To bring ${formatMoney(total, event.currency)} down by about ${targetPercent}% ` +
      `(${formatMoney(cut, event.currency)}), trim the largest flexible categories rather than spreading small cuts everywhere.`,
    '',
    'Largest categories and a realistic trim for each:',
  ];

  for (const split of [...splits].sort((a, b) => b.share - a.share).slice(0, 4)) {
    const current = total * split.share;
    // Suggest trimming ~12% of each large category; this sums close to the target.
    const suggested = current * 0.88;
    lines.push(
      `• ${split.name}: ${formatMoney(current, event.currency)} → about ${formatMoney(suggested, event.currency)}`,
    );
  }

  lines.push('');
  lines.push('Tactics that actually move the number:');
  const tips = SAVING_TIPS[event.budgetFlexibility] ?? SAVING_TIPS.moderate;
  for (const tip of tips.slice(0, 4)) lines.push(`• ${tip}`);

  return lines.join('\n');
}

/** Answer a "what should I do next / how much time is left" question. */
function timelineAnswer(event: EventDetails): string {
  const days = daysUntil(event.startDate);
  const template = EVENT_TEMPLATES[event.eventType] ?? EVENT_TEMPLATES.other;
  const lines: string[] = [
    `${event.title} is on ${event.startDate} — about ${days} day${days === 1 ? '' : 's'} from now.`,
    '',
    'Highest-impact things to lock down next:',
  ];
  for (const task of template.preparationTasks.slice(0, 4)) {
    lines.push(`• ${task.title} (${task.relativeDeadline}) — ${task.description}`);
  }
  return lines.join('\n');
}

/** Answer a menu/dietary question from the event's stated preferences. */
function menuAnswer(event: EventDetails): string {
  const template = EVENT_TEMPLATES[event.eventType] ?? EVENT_TEMPLATES.other;
  const lines: string[] = [
    `For ${event.guestCount} guests, a proven ${template.label.toLowerCase()} menu structure is:`,
  ];
  for (const idea of template.menuIdeas.slice(0, 4)) lines.push(`• ${idea}`);
  if (event.dietaryPreferences.length > 0) {
    lines.push('');
    lines.push(
      `You noted ${event.dietaryPreferences.join(', ')} — plan a clearly labelled separate station so cross-contact is avoided.`,
    );
  }
  return lines.join('\n');
}

/** Answer a weather/backup-plan question. */
function backupAnswer(event: EventDetails): string {
  const lines = [
    `Since your venue preference is "${event.venuePreference}", build the backup plan before you need it:`,
    '• Confirm a covered or indoor fallback space and the decision deadline with the venue.',
    '• Agree in writing who pays if you switch indoors on short notice.',
    '• Keep lightweight decor secured and plan shade or heating as the season demands.',
    '• Share the wet-weather run sheet with every vendor so no one is guessing on the day.',
  ];
  return lines.join('\n');
}

/**
 * Produce a deterministic reply for a message. Returns `null` when the message
 * does not match a known intent, so the caller can fall through to a generic
 * honest response.
 */
export function buildLocalChatReply(
  event: EventDetails,
  message: string,
  plan?: PlanSummaryContext,
): string | null {
  const lower = message.toLowerCase();
  const has = (...words: string[]) => words.some((word) => lower.includes(word));

  if (has('budget', 'cost', 'expensive', 'cheap', 'save', 'reduce', 'cut', '15%', 'spend')) {
    const percentMatch = lower.match(/(\d{1,2})\s*%/);
    const percent = percentMatch ? Math.min(90, Number(percentMatch[1])) : 15;
    return budgetAnswer(event, percent);
  }

  if (has('day', 'time', 'deadline', 'when', 'countdown', 'left', 'remain', 'next', 'priorit', 'do first')) {
    return timelineAnswer(event);
  }

  if (has('menu', 'food', 'dish', 'cater', 'vegetarian', 'vegan', 'meal', 'eat')) {
    return menuAnswer(event);
  }

  if (has('weather', 'rain', 'backup', 'contingency', 'plan b', 'monsoon')) {
    return backupAnswer(event);
  }

  if (has('guest', 'attend', 'headcount', 'rsvp', 'count')) {
    const days = daysUntil(event.startDate);
    return (
      `You are planning for ${event.guestCount} guests, with about ${days} days until ${event.startDate}.\n\n` +
      'To keep the headcount accurate:\n' +
      '• Send invites early and track every response in one place.\n' +
      '• Chase pending RSVPs starting two weeks out.\n' +
      '• Confirm the final number with your caterer at least three days before, including a small buffer.'
    );
  }

  if (has('theme', 'decor', 'colour', 'color', 'palette', 'look')) {
    const themeName = plan?.themeName ?? (EVENT_TEMPLATES[event.eventType] ?? EVENT_TEMPLATES.other).theme.name;
    return (
      `Your current theme direction is "${themeName}".\n\n` +
      'To carry it through the whole event:\n' +
      '• Repeat the same 2–3 colours across invitations, signage and table decor.\n' +
      '• Let the entrance and photo backdrop be the boldest expression of the theme.\n' +
      '• Keep lighting warm and consistent — it changes how every colour photographs.'
    );
  }

  return null;
}

/**
 * Entry point mirroring `chatWithEvent` but without a provider. When the
 * message is outside the known intents it returns an honest explanation of what
 * the local engine can and cannot do — it never invents an AI-style answer.
 */
export function chatLocally(
  event: EventDetails,
  plan: PlanSummaryContext | undefined,
  _history: ChatMessage[],
  message: string,
): string {
  const safeMessage = truncate(message, MAX_MESSAGE_LENGTH);
  if (safeMessage.length === 0) throw AppError.validation('Message cannot be empty.');

  const known = buildLocalChatReply(event, safeMessage, plan);
  if (known) return known;

  const days = daysUntil(event.startDate);
  return [
    `I am Eventra's built-in planning helper, running without an AI model connected, so I answer from your event's own details and standard planning checklists.`,
    '',
    `Right now: ${event.title} is on ${event.startDate} (about ${days} days away) for ${event.guestCount} guests in ${event.location}, budgeted at ${formatMoney(event.totalBudget, event.currency)}.`,
    '',
    'I can help with these right now — just ask in plain words:',
    '• Budget: "How can I reduce this budget by 15%?"',
    '• Timeline: "What should I prioritise in the next 30 days?"',
    '• Menu: "Create a vegetarian menu for 100 guests."',
    '• Backup plan: "Make a rainy-weather backup plan."',
    '• Guests: "How should I track RSVPs?"',
    '',
    'Add a Gemini API key to the server to unlock full conversational AI answers here.',
  ].join('\n');
}
