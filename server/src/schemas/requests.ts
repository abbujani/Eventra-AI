import { z } from 'zod';
import type {
  BudgetAdviceInput,
  EventType,
  InvitationInput,
  MenuInput,
  TaskSuggestionInput,
} from '../types.js';

const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO 4217 code, e.g. INR.');

/** Single source of truth for event types across every request schema. */
export const eventTypeSchema = z.enum([
  'wedding',
  'engagement',
  'birthday',
  'anniversary',
  'baby-shower',
  'festival',
  'community',
  'corporate',
  'other',
]);

const dateString = z
  .string()
  .trim()
  .min(1, 'Date is required.')
  .max(40, 'Date is too long.');

const optionalDate = z
  .string()
  .trim()
  .max(40)
  .optional()
  .refine((value) => value === undefined || value.length > 0, {
    message: 'End date cannot be empty.',
  });

const stringList = (maxItems: number, maxLength: number) =>
  z.array(z.string().trim().min(1).max(maxLength)).max(maxItems).default([]);

export const eventDetailsSchema = z.object({
  title: z.string().trim().min(2, 'Event title is required.').max(160),
  eventType: eventTypeSchema,
  startDate: dateString,
  endDate: optionalDate,
  timezone: z.string().trim().min(1).max(64),
  location: z.string().trim().min(1, 'Location is required.').max(160),
  guestCount: z.coerce.number().int().min(1, 'Guest count must be at least 1.').max(100000),
  venuePreference: z.enum(['indoor', 'outdoor', 'mixed', 'unspecified']),
  totalBudget: z.coerce.number().finite().min(0, 'Budget cannot be negative.').max(1e12),
  currency: currencySchema,
  budgetFlexibility: z.enum(['strict', 'moderate', 'flexible']),
  categoryPriorities: stringList(10, 80),
  style: z.string().trim().max(120).optional(),
  colorPalette: stringList(8, 40),
  dietaryPreferences: stringList(10, 80),
  culturalPreferences: z.string().trim().max(400).optional(),
  accessibilityRequirements: z.string().trim().max(400).optional(),
  mustHaveActivities: stringList(12, 80),
  thingsToAvoid: stringList(12, 80),
  durationHours: z.coerce.number().finite().min(0.5).max(240).optional(),
  eventDays: z.coerce.number().int().min(1).max(30).optional(),
  venueStatus: z.string().trim().max(120).optional(),
  planningPriorities: stringList(10, 80),
  notes: z.string().trim().max(2000).optional(),
});

export const generatePlanSchema = z.object({
  event: eventDetailsSchema,
});

export const chatSchema = z.object({
  event: eventDetailsSchema,
  planSummary: z
    .object({
      themeName: z.string().max(160).optional(),
      budgetTotal: z.number().optional(),
      budgetCurrency: z.string().max(8).optional(),
      topCostCategories: z.array(z.string().max(80)).max(10).optional(),
      completedTasks: z.number().int().min(0).optional(),
      totalTasks: z.number().int().min(0).optional(),
      upcomingDeadlines: z.array(z.string().max(80)).max(10).optional(),
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .max(40),
  message: z.string().trim().min(1, 'Message cannot be empty.').max(2000),
});

export const invitationSchema = z.object({
  eventTitle: z.string().trim().min(2).max(160),
  eventType: eventTypeSchema satisfies z.ZodType<EventType>,
  hostName: z.string().trim().max(120).optional(),
  dateLabel: dateString,
  timeLabel: z.string().trim().max(60).optional(),
  venue: z.string().trim().max(160).optional(),
  rsvpDetails: z.string().trim().max(200).optional(),
  tone: z.enum(['formal', 'casual', 'warm']),
  language: z.enum(['english', 'hindi', 'hinglish']),
  channel: z.enum(['invitation', 'whatsapp', 'email', 'social']),
  additionalNotes: z.string().trim().max(600).optional(),
});

export const menuSchema = z.object({
  eventTitle: z.string().trim().min(2).max(160),
  eventType: eventTypeSchema,
  guestCount: z.coerce.number().int().min(1).max(100000),
  segments: z.array(z.string().trim().min(1).max(60)).min(1).max(8),
  dietaryPreferences: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  regionalPreference: z.string().trim().max(120).optional(),
  budgetHint: z.coerce.number().finite().min(0).max(1e12).optional(),
  currency: currencySchema.optional(),
  notes: z.string().trim().max(600).optional(),
});

export const suggestTasksSchema = z.object({
  eventTitle: z.string().trim().min(2).max(160),
  eventType: eventTypeSchema,
  guestCount: z.coerce.number().int().min(1).max(100000),
  startDate: dateString,
  timezone: z.string().trim().min(1).max(64),
  categories: z.array(z.string().trim().min(1).max(80)).max(15).default([]),
  notes: z.string().trim().max(600).optional(),
});

export const improveBudgetSchema = z.object({
  eventTitle: z.string().trim().min(2).max(160),
  eventType: eventTypeSchema,
  totalBudget: z.coerce.number().finite().min(0).max(1e12),
  currency: currencySchema,
  categories: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        estimatedAmount: z.number().finite().min(0),
      }),
    )
    .min(1)
    .max(20),
  savingTargetPercent: z.coerce.number().finite().min(1).max(90),
  notes: z.string().trim().max(600).optional(),
});

export type GeneratePlanRequest = z.infer<typeof generatePlanSchema>;
export type ChatRequest = z.infer<typeof chatSchema>;
export type InvitationRequest = z.infer<typeof invitationSchema>;
export type MenuRequest = z.infer<typeof menuSchema>;
export type SuggestTasksRequest = z.infer<typeof suggestTasksSchema>;
export type ImproveBudgetRequest = z.infer<typeof improveBudgetSchema>;

export type {
  BudgetAdviceInput,
  InvitationInput,
  MenuInput,
  TaskSuggestionInput,
};
