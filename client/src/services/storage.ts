import { z } from 'zod';
import type {
  ActivityEntry,
  AIEventPlan,
  AppState,
  ConversationMessage,
  Event,
  Expense,
  Task,
  TimelineItem,
  UserPreferences,
  Vendor,
} from '../types/index.js';
import { EVENT_TYPES } from '../types/index.js';

const STORAGE_KEY = 'eventra:v1:state';
const BACKUP_KEY = 'eventra:v1:backup';
const SCHEMA_VERSION = 1;

const eventType = z.enum(EVENT_TYPES);
const priority = z.enum(['high', 'medium', 'low']);
const optionalString = z.string().optional();

const preferencesSchema = z.object({
  preferredCurrency: z.string().default('INR'),
  preferredLanguage: z.enum(['english', 'hindi', 'hinglish']).default('english'),
  theme: z.enum(['light', 'dark']).default('light'),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

const eventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  eventType,
  description: optionalString,
  startDate: z.string(),
  endDate: optionalString,
  timezone: z.string().default('Asia/Kolkata'),
  location: z.string(),
  guestCount: z.number().int().min(0),
  venuePreference: z.enum(['indoor', 'outdoor', 'mixed', 'unspecified']),
  totalBudget: z.number().finite().min(0),
  currency: z.string(),
  budgetFlexibility: z.enum(['strict', 'moderate', 'flexible']),
  categoryPriorities: z.array(z.string()).default([]),
  style: optionalString,
  colorPalette: z.array(z.string()).default([]),
  dietaryPreferences: z.array(z.string()).default([]),
  culturalPreferences: optionalString,
  accessibilityRequirements: optionalString,
  mustHaveActivities: z.array(z.string()).default([]),
  thingsToAvoid: z.array(z.string()).default([]),
  durationHours: z.number().optional(),
  eventDays: z.number().int().optional(),
  venueStatus: optionalString,
  planningPriorities: z.array(z.string()).default([]),
  notes: optionalString,
  status: z.enum(['planning', 'confirmed', 'completed']).default('planning'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const expenseSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  category: z.string().default('Miscellaneous'),
  title: z.string().min(1),
  vendor: optionalString,
  estimatedAmount: z.number().finite().default(0),
  actualAmount: z.number().finite().optional(),
  currency: z.string().default('INR'),
  paymentStatus: z.enum(['unpaid', 'partial', 'paid']).default('unpaid'),
  notes: optionalString,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const taskSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().min(1),
  description: optionalString,
  category: z.string().default('General'),
  priority,
  dueDate: optionalString,
  completed: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const timelineItemSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().min(1),
  description: optionalString,
  startDateTime: z.string(),
  endDateTime: optionalString,
  category: optionalString,
  priority,
  completed: z.boolean().default(false),
  createdAt: z.string(),
});

const vendorSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().default('Other'),
  contactDetails: optionalString,
  website: optionalString,
  quotedAmount: z.number().finite().optional(),
  currency: z.string().default('INR'),
  status: z
    .enum(['researching', 'contacted', 'quote-received', 'shortlisted', 'booked', 'rejected'])
    .default('researching'),
  followUpDate: optionalString,
  notes: optionalString,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const conversationMessageSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.string(),
});

const activityEntrySchema = z.object({
  id: z.string().min(1),
  eventId: optionalString,
  type: z.enum([
    'event-created',
    'plan-generated',
    'plan-applied',
    'expense-added',
    'expense-updated',
    'task-added',
    'task-completed',
    'vendor-added',
    'invitation-generated',
  ]),
  message: z.string(),
  createdAt: z.string(),
});

const planSchema = z.object({
  eventOverview: z.object({
    title: z.string(),
    summary: z.string(),
    planningAssumptions: z.array(z.string()).default([]),
  }),
  theme: z.object({
    name: z.string(),
    description: z.string(),
    colors: z.array(z.string()).default([]),
    decorationIdeas: z.array(z.string()).default([]),
  }),
  budget: z.object({
    currency: z.string(),
    totalBudget: z.number(),
    categories: z
      .array(
        z.object({
          name: z.string(),
          estimatedAmount: z.number(),
          reasoning: z.string().optional(),
          percentage: z.number().default(0),
        }),
      )
      .default([]),
    contingencyAmount: z.number().default(0),
    savingTips: z.array(z.string()).default([]),
    computedCategoriesTotal: z.number().default(0),
    computedGrandTotal: z.number().default(0),
    overrunAmount: z.number().default(0),
    isOverBudget: z.boolean().default(false),
    largestCostDrivers: z.array(z.string()).default([]),
  }),
  timeline: z
    .array(
      z.object({
        time: z.string(),
        title: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
      }),
    )
    .default([]),
  vendorChecklist: z
    .array(
      z.object({
        category: z.string(),
        priority: z.enum(['high', 'medium', 'low']),
        tasks: z.array(z.string()).default([]),
        suggestedBookingWindow: z.string().optional(),
      }),
    )
    .default([]),
  menuIdeas: z.array(z.string()).default([]),
  guestExperienceIdeas: z.array(z.string()).default([]),
  entertainmentRecommendations: z.array(z.string()).default([]),
  preparationTasks: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(['high', 'medium', 'low']),
        relativeDeadline: z.string().optional(),
      }),
    )
    .default([]),
  risks: z
    .array(
      z.object({
        title: z.string(),
        mitigation: z.string(),
      }),
    )
    .default([]),
  nextActions: z.array(z.string()).default([]),
  source: z.enum(['ai', 'local']).optional(),
  eventId: optionalString,
  generatedAt: optionalString,
  version: z.number().optional(),
});

const appStateSchema = z.object({
  schemaVersion: z.number().default(SCHEMA_VERSION),
  preferences: preferencesSchema,
  events: z.array(eventSchema),
  expenses: z.array(expenseSchema),
  tasks: z.array(taskSchema),
  timelineItems: z.array(timelineItemSchema),
  vendors: z.array(vendorSchema),
  conversations: z.array(conversationMessageSchema),
  plans: z.array(planSchema),
  activity: z.array(activityEntrySchema),
});

export function defaultState(): AppState {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    preferences: {
      preferredCurrency: 'INR',
      preferredLanguage: 'english',
      theme: 'light',
      createdAt: now,
      updatedAt: now,
    },
    events: [],
    expenses: [],
    tasks: [],
    timelineItems: [],
    vendors: [],
    conversations: [],
    plans: [],
    activity: [],
  };
}

function readRaw(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/** Returns true when the value was persisted; false when storage is unavailable. */
function writeRaw(value: string): boolean {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    // Storage may be unavailable (private mode / quota). The app keeps working
    // in memory; the UI surfaces a persistence warning via the store.
    return false;
  }
}

function writeBackup(raw: string): void {
  try {
    globalThis.localStorage?.setItem(BACKUP_KEY, raw);
  } catch {
    /* ignore */
  }
}

/**
 * Loads persisted state safely. Malformed or unreadable data is preserved to a
 * backup key and never silently merged into valid state.
 */
export function loadState(): AppState {
  const raw = readRaw();
  if (!raw) return defaultState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    writeBackup(raw);
    return defaultState();
  }

  const result = appStateSchema.safeParse(parsed);
  if (!result.success) {
    writeBackup(raw);
    return defaultState();
  }

  return migrate(result.data);
}

/** Migration hook. v1 is the first version, so this is currently a pass-through. */
function migrate(state: AppState): AppState {
  return { ...state, schemaVersion: SCHEMA_VERSION };
}

/** Returns true when the state was persisted; false when storage rejected it. */
export function saveState(state: AppState): boolean {
  return writeRaw(JSON.stringify(state));
}

export function clearState(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    globalThis.localStorage?.removeItem(BACKUP_KEY);
  } catch {
    /* ignore */
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export type {
  ActivityEntry,
  AIEventPlan,
  AppState,
  ConversationMessage,
  Event,
  Expense,
  Task,
  TimelineItem,
  UserPreferences,
  Vendor,
};
