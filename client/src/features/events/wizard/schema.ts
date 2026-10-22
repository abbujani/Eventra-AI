import { z } from 'zod';
import { EVENT_TYPES, type BudgetFlexibility, type EventType, type VenuePreference } from '../../../types/index.js';
import { isValidDateString } from '../../../lib/dates.js';

export interface WizardValues {
  eventType: EventType;
  title: string;
  startDate: string;
  endDate?: string;
  timezone: string;
  location: string;
  guestCount: number;
  venuePreference: VenuePreference;
  totalBudget: number;
  currency: string;
  budgetFlexibility: BudgetFlexibility;
  categoryPriorities: string[];
  style?: string;
  colorPalette: string[];
  dietaryPreferences: string[];
  culturalPreferences?: string;
  accessibilityRequirements?: string;
  mustHaveActivities: string[];
  thingsToAvoid: string[];
  durationHours?: number;
  eventDays?: number;
  venueStatus?: string;
  planningPriorities: string[];
  notes?: string;
}

const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || isValidDateString(value), 'Enter a valid date.');

const optionalNumber = (min: number, max: number, message: string) =>
  z.coerce.number().finite().min(min, message).max(max, message).optional();

const shape = {
  eventType: z.enum(EVENT_TYPES, { message: 'Choose an event type.' }),
  title: z.string().trim().min(2, 'Enter an event title (at least 2 characters).').max(160),
  startDate: z
    .string()
    .trim()
    .min(1, 'Start date is required.')
    .refine(isValidDateString, 'Enter a valid date (YYYY-MM-DD).'),
  endDate: optionalDate,
  timezone: z.string().trim().min(1).max(64),
  location: z.string().trim().min(1, 'Location is required.').max(160),
  guestCount: z.coerce
    .number()
    .int('Guest count must be a whole number.')
    .min(1, 'At least 1 guest.')
    .max(100000, 'Enter a realistic guest count.'),
  venuePreference: z.enum(['indoor', 'outdoor', 'mixed', 'unspecified'], {
    message: 'Choose a venue preference.',
  }),
  totalBudget: z.coerce
    .number()
    .finite('Enter a valid amount.')
    .min(0, 'Budget cannot be negative.')
    .max(1e12, 'Enter a realistic budget.'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Choose a currency.'),
  budgetFlexibility: z.enum(['strict', 'moderate', 'flexible']),
  categoryPriorities: z.array(z.string().max(80)).max(10),
  style: z.string().trim().max(120).optional(),
  colorPalette: z.array(z.string().max(40)).max(8),
  dietaryPreferences: z.array(z.string().max(80)).max(10),
  culturalPreferences: z.string().trim().max(400).optional(),
  accessibilityRequirements: z.string().trim().max(400).optional(),
  mustHaveActivities: z.array(z.string().max(80)).max(12),
  thingsToAvoid: z.array(z.string().max(80)).max(12),
  durationHours: optionalNumber(0.5, 240, 'Duration must be between 0.5 and 240 hours.'),
  eventDays: optionalNumber(1, 30, 'Event days must be between 1 and 30.').transform((value) =>
    value === undefined ? undefined : Math.round(value),
  ),
  venueStatus: z.string().trim().max(120).optional(),
  planningPriorities: z.array(z.string().max(80)).max(10),
  notes: z.string().trim().max(2000).optional(),
};

const END_DATE_MESSAGE = 'End date must be on or after the start date.';

function validateDateOrder(data: Record<string, unknown>, ctx: z.RefinementCtx): void {
  const endDate = data.endDate as string | undefined;
  const startDate = data.startDate as string | undefined;
  if (endDate && startDate && endDate < startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: END_DATE_MESSAGE });
  }
}

export const wizardSchema: z.ZodType<WizardValues> = z
  .object(shape)
  .superRefine((data, ctx) => validateDateOrder(data as Record<string, unknown>, ctx));

/** Builds a validator for a single wizard step from the shared field shape. */
export function stepSchema(fields: string[]): z.ZodTypeAny {
  const picked: Record<string, z.ZodTypeAny> = {};
  for (const key of fields) {
    const value = shape[key as keyof typeof shape];
    if (value) picked[key] = value;
  }
  const base = z.object(picked);
  if (fields.includes('endDate')) {
    return base.superRefine((data, ctx) => validateDateOrder(data as Record<string, unknown>, ctx));
  }
  return base;
}

export const wizardShape = shape;
