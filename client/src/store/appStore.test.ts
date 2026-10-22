import { describe, expect, it } from 'vitest';
import { reducer, type Action } from '../store/appStore.js';
import { defaultState } from '../services/storage.js';
import type { AppState, Event, Expense, Task } from '../types/index.js';

function makeEvent(overrides: Partial<Event> = {}): Event {
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

function makeExpense(overrides: Partial<Expense> = {}): Expense {
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

function makeTask(overrides: Partial<Task> = {}): Task {
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

function stateWithEvent(): AppState {
  const base = defaultState();
  return reducer(base, { type: 'ADD_EVENT', event: makeEvent() });
}

describe('reducer', () => {
  it('starts from an empty default state', () => {
    const state = defaultState();
    expect(state.events).toHaveLength(0);
    expect(state.schemaVersion).toBe(1);
    expect(state.preferences.preferredCurrency).toBe('INR');
  });

  it('adds an event and records activity', () => {
    const state = stateWithEvent();
    expect(state.events).toHaveLength(1);
    expect(state.activity[0]?.type).toBe('event-created');
    expect(state.activity[0]?.eventId).toBe('evt_1');
  });

  it('updates an event and refreshes its timestamp', () => {
    const state = stateWithEvent();
    const updated = reducer(state, {
      type: 'UPDATE_EVENT',
      event: { ...state.events[0]!, title: 'Renamed' },
    });
    expect(updated.events[0]?.title).toBe('Renamed');
    expect(updated.events[0]?.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('deletes an event and cascades to every related collection', () => {
    let state = stateWithEvent();
    state = reducer(state, { type: 'ADD_EXPENSE', expense: makeExpense() });
    state = reducer(state, { type: 'ADD_TASK', task: makeTask() });
    state = {
      ...state,
      vendors: [
        {
          id: 'vnd_1',
          eventId: 'evt_1',
          name: 'Vendor',
          category: 'Venues',
          currency: 'INR',
          status: 'researching',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      conversations: [
        { id: 'msg_1', eventId: 'evt_1', role: 'user', content: 'hi', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      activity: [{ id: 'act_1', eventId: 'evt_1', type: 'event-created', message: 'Created', createdAt: '2026-01-01T00:00:00.000Z' }],
    };

    const after = reducer(state, { type: 'DELETE_EVENT', eventId: 'evt_1' });
    expect(after.events).toHaveLength(0);
    expect(after.expenses).toHaveLength(0);
    expect(after.tasks).toHaveLength(0);
    expect(after.vendors).toHaveLength(0);
    expect(after.conversations).toHaveLength(0);
    expect(after.activity).toHaveLength(0);
  });

  it('does not touch other events when deleting', () => {
    let state = stateWithEvent();
    state = reducer(state, { type: 'ADD_EVENT', event: makeEvent({ id: 'evt_2', title: 'Other' }) });
    state = reducer(state, { type: 'ADD_EXPENSE', expense: makeExpense({ id: 'exp_2', eventId: 'evt_2' }) });

    const after = reducer(state, { type: 'DELETE_EVENT', eventId: 'evt_1' });
    expect(after.events.map((event) => event.id)).toEqual(['evt_2']);
    expect(after.expenses.map((expense) => expense.eventId)).toEqual(['evt_2']);
  });

  it('records activity once when a task is completed', () => {
    let state = stateWithEvent();
    state = reducer(state, { type: 'ADD_TASK', task: makeTask() });
    const before = state.activity.length;

    state = reducer(state, {
      type: 'UPDATE_TASK',
      task: { ...state.tasks[0]!, completed: true },
    });
    expect(state.activity).toHaveLength(before + 1);
    expect(state.activity[0]?.type).toBe('task-completed');

    // Toggling again does not add a second completion entry.
    const toggled = reducer(state, {
      type: 'UPDATE_TASK',
      task: { ...state.tasks[0]!, completed: false },
    });
    expect(toggled.activity).toHaveLength(state.activity.length);
  });

  it('adds a batch of tasks in one action', () => {
    let state = stateWithEvent();
    state = reducer(state, {
      type: 'ADD_TASKS',
      tasks: [makeTask({ id: 'a' }), makeTask({ id: 'b' })],
    });
    expect(state.tasks).toHaveLength(2);
    expect(state.activity[0]?.message).toContain('2 tasks');
  });

  it('adds a generated plan and records it', () => {
    let state = stateWithEvent();
    state = reducer(state, {
      type: 'SET_PLAN',
      eventId: 'evt_1',
      plan: {
        eventOverview: { title: 'Test', summary: 's', planningAssumptions: [] },
        theme: { name: 'Theme', description: 'd', colors: [], decorationIdeas: [] },
        budget: {
          currency: 'INR',
          totalBudget: 100000,
          categories: [],
          contingencyAmount: 0,
          savingTips: [],
          computedCategoriesTotal: 0,
          computedGrandTotal: 0,
          overrunAmount: 0,
          isOverBudget: false,
          largestCostDrivers: [],
        },
        timeline: [],
        vendorChecklist: [],
        menuIdeas: [],
        guestExperienceIdeas: [],
        entertainmentRecommendations: [],
        preparationTasks: [],
        risks: [],
        nextActions: [],
        eventId: 'evt_1',
      },
    });
    expect(state.plans).toHaveLength(1);
    expect(state.plans[0]?.eventId).toBe('evt_1');
    expect(state.activity[0]?.type).toBe('plan-generated');
  });

  it('caps stored activity so state does not grow forever', () => {
    let state = stateWithEvent();
    const actions: Action[] = Array.from({ length: 80 }, (_, index) => ({
      type: 'ADD_EXPENSE',
      expense: makeExpense({ id: `exp_${index}`, title: `Item ${index}` }),
    }));
    for (const action of actions) state = reducer(state, action);
    expect(state.activity.length).toBeLessThanOrEqual(60);
    expect(state.expenses).toHaveLength(80);
  });

  it('resets everything on RESET_ALL', () => {
    let state = stateWithEvent();
    state = reducer(state, { type: 'ADD_EXPENSE', expense: makeExpense() });
    const reset = reducer(state, { type: 'RESET_ALL' });
    expect(reset.events).toHaveLength(0);
    expect(reset.expenses).toHaveLength(0);
    expect(reset.activity).toHaveLength(0);
    expect(reset.preferences.preferredCurrency).toBe('INR');
  });
});
