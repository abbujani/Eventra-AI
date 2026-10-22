import { defaultState, saveState } from '../services/storage.js';
import type { AIEventPlan, AppState, Event, Expense, Task } from '../types/index.js';

/**
 * Shared builders for component tests. Every builder produces a fully valid
 * entity so states written through `seedState` pass the storage schema on load.
 */

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt_1',
    title: 'Test Event',
    eventType: 'birthday',
    startDate: '2026-06-12',
    timezone: 'Asia/Kolkata',
    location: 'Jaipur',
    guestCount: 50,
    venuePreference: 'indoor',
    totalBudget: 100000,
    currency: 'INR',
    budgetFlexibility: 'moderate',
    categoryPriorities: [],
    colorPalette: [],
    dietaryPreferences: [],
    mustHaveActivities: [],
    thingsToAvoid: [],
    planningPriorities: [],
    status: 'planning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp_1',
    eventId: 'evt_1',
    category: 'Venue',
    title: 'Hall booking',
    estimatedAmount: 10000,
    currency: 'INR',
    paymentStatus: 'unpaid',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tsk_1',
    eventId: 'evt_1',
    title: 'Book venue',
    category: 'Venue',
    priority: 'high',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makePlan(overrides: Partial<AIEventPlan> = {}): AIEventPlan {
  return {
    eventOverview: {
      title: 'Test Event',
      summary: 'A test plan.',
      planningAssumptions: [],
    },
    theme: {
      name: 'Royal Marigold',
      description: 'Warm and festive.',
      colors: ['#F5A7B8', '#7657E8'],
      decorationIdeas: ['Marigold arches'],
    },
    budget: {
      currency: 'INR',
      totalBudget: 100000,
      categories: [
        { name: 'Venue', estimatedAmount: 40000, percentage: 40, reasoning: 'Local rates' },
        { name: 'Catering', estimatedAmount: 30000, percentage: 30 },
      ],
      contingencyAmount: 10000,
      savingTips: [],
      computedCategoriesTotal: 70000,
      computedGrandTotal: 80000,
      overrunAmount: 0,
      isOverBudget: false,
      largestCostDrivers: ['Venue'],
    },
    timeline: [{ time: '09:00', title: 'Guest arrival', description: 'Welcome drinks' }],
    vendorChecklist: [],
    menuIdeas: [],
    guestExperienceIdeas: [],
    entertainmentRecommendations: [],
    preparationTasks: [{ title: 'Confirm guest count', priority: 'high' }],
    risks: [],
    nextActions: ['Send save-the-dates'],
    source: 'local',
    eventId: 'evt_1',
    generatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    ...overrides,
  };
}

/**
 * Builds default state, lets the caller mutate it, persists it to localStorage
 * (so AppProvider picks it up on mount) and returns the final state.
 */
export function seedState(mutate?: (state: AppState) => void): AppState {
  const state = defaultState();
  mutate?.(state);
  saveState(state);
  return state;
}
