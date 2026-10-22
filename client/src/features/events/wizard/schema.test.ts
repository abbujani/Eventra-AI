import { describe, expect, it } from 'vitest';
import { stepSchema, wizardSchema, type WizardValues } from './schema.js';

function validValues(overrides: Partial<WizardValues> = {}): WizardValues {
  return {
    eventType: 'wedding',
    title: 'Anaya & Rohan',
    startDate: '2026-06-12',
    endDate: '2026-06-14',
    timezone: 'Asia/Kolkata',
    location: 'Jaipur',
    guestCount: 250,
    venuePreference: 'outdoor',
    totalBudget: 500000,
    currency: 'INR',
    budgetFlexibility: 'moderate',
    categoryPriorities: [],
    colorPalette: [],
    dietaryPreferences: [],
    mustHaveActivities: [],
    thingsToAvoid: [],
    planningPriorities: [],
    ...overrides,
  };
}

describe('wizardSchema', () => {
  it('accepts a complete valid submission', () => {
    expect(wizardSchema.safeParse(validValues()).success).toBe(true);
  });

  it('prevents negative budgets', () => {
    const result = wizardSchema.safeParse(validValues({ totalBudget: -1 }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('totalBudget'))).toBe(true);
    }
  });

  it('prevents a zero or negative guest count', () => {
    expect(wizardSchema.safeParse(validValues({ guestCount: 0 })).success).toBe(false);
    expect(wizardSchema.safeParse(validValues({ guestCount: -5 })).success).toBe(false);
  });

  it('prevents end dates before the start date', () => {
    const result = wizardSchema.safeParse(validValues({ endDate: '2026-06-01' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path.includes('endDate'));
      expect(issue?.message).toMatch(/on or after the start date/);
    }
  });

  it('allows a missing end date for single-day events', () => {
    expect(wizardSchema.safeParse(validValues({ endDate: undefined })).success).toBe(true);
  });

  it('prevents malformed dates', () => {
    expect(wizardSchema.safeParse(validValues({ startDate: '2026-02-30' })).success).toBe(false);
    expect(wizardSchema.safeParse(validValues({ startDate: 'not-a-date' })).success).toBe(false);
  });

  it('requires a title, location and currency', () => {
    expect(wizardSchema.safeParse(validValues({ title: '' })).success).toBe(false);
    expect(wizardSchema.safeParse(validValues({ location: '' })).success).toBe(false);
    expect(wizardSchema.safeParse(validValues({ currency: 'rupees' })).success).toBe(false);
  });

  it('caps array lengths so runaway input cannot be stored', () => {
    const tooMany = Array.from({ length: 20 }, (_, index) => `item ${index}`);
    expect(
      wizardSchema.safeParse(validValues({ mustHaveActivities: tooMany })).success,
    ).toBe(false);
  });
});

describe('stepSchema', () => {
  it('only validates the fields belonging to that step', () => {
    const typeStep = stepSchema(['eventType']);
    expect(typeStep.safeParse({ eventType: 'wedding' }).success).toBe(true);
    expect(typeStep.safeParse({ eventType: 'not-real' }).success).toBe(false);
    // Title is not part of this step, so it must not be required here.
    expect(typeStep.safeParse({ eventType: 'wedding' }).success).toBe(true);
  });

  it('flags a missing title on the details step', () => {
    const details = stepSchema(['title', 'startDate', 'timezone', 'location', 'guestCount', 'venuePreference']);
    const result = details.safeParse({
      title: '',
      startDate: '2026-06-12',
      timezone: 'Asia/Kolkata',
      location: 'Jaipur',
      guestCount: 50,
      venuePreference: 'indoor',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('title'))).toBe(true);
    }
  });

  it('enforces date ordering on the step containing both dates', () => {
    const details = stepSchema(['title', 'startDate', 'endDate', 'timezone', 'location', 'guestCount', 'venuePreference']);
    const result = details.safeParse({
      title: 'Event',
      startDate: '2026-06-12',
      endDate: '2026-06-01',
      timezone: 'Asia/Kolkata',
      location: 'Jaipur',
      guestCount: 50,
      venuePreference: 'indoor',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative budget on the budget step', () => {
    const budgetStep = stepSchema(['totalBudget', 'currency', 'budgetFlexibility', 'categoryPriorities']);
    expect(
      budgetStep.safeParse({
        totalBudget: -100,
        currency: 'INR',
        budgetFlexibility: 'strict',
        categoryPriorities: [],
      }).success,
    ).toBe(false);
  });
});
