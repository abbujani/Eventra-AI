import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
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
import { defaultState, loadState, saveState } from '../services/storage.js';
import { generateId } from '../lib/id.js';

const MAX_ACTIVITY = 60;

export type Action =
  | { type: 'UPDATE_PREFERENCES'; preferences: Partial<UserPreferences> }
  | { type: 'ADD_EVENT'; event: Event }
  | { type: 'UPDATE_EVENT'; event: Event }
  | { type: 'DELETE_EVENT'; eventId: string }
  | { type: 'ADD_EXPENSE'; expense: Expense }
  | { type: 'UPDATE_EXPENSE'; expense: Expense }
  | { type: 'DELETE_EXPENSE'; expenseId: string }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'UPDATE_TASK'; task: Task }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'ADD_TASKS'; tasks: Task[] }
  | { type: 'ADD_TIMELINE_ITEM'; item: TimelineItem }
  | { type: 'UPDATE_TIMELINE_ITEM'; item: TimelineItem }
  | { type: 'DELETE_TIMELINE_ITEM'; itemId: string }
  | { type: 'ADD_TIMELINE_ITEMS'; items: TimelineItem[] }
  | { type: 'ADD_VENDOR'; vendor: Vendor }
  | { type: 'UPDATE_VENDOR'; vendor: Vendor }
  | { type: 'DELETE_VENDOR'; vendorId: string }
  | { type: 'ADD_CONVERSATION_MESSAGE'; eventId: string; message: ConversationMessage }
  | { type: 'CLEAR_CONVERSATION'; eventId: string }
  | { type: 'SET_PLAN'; eventId: string; plan: AIEventPlan }
  | { type: 'LOG_ACTIVITY'; eventId: string; activityType: ActivityEntry['type']; message: string }
  | { type: 'RESET_ALL' };

function withActivity(
  state: AppState,
  entry: Omit<ActivityEntry, 'id' | 'createdAt'>,
): AppState {
  const full: ActivityEntry = {
    ...entry,
    id: generateId('act'),
    createdAt: new Date().toISOString(),
  };
  return { ...state, activity: [full, ...state.activity].slice(0, MAX_ACTIVITY) };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_PREFERENCES': {
      const preferences: UserPreferences = {
        ...state.preferences,
        ...action.preferences,
        updatedAt: new Date().toISOString(),
      };
      return { ...state, preferences };
    }

    case 'ADD_EVENT':
      return withActivity(
        { ...state, events: [action.event, ...state.events] },
        { eventId: action.event.id, type: 'event-created', message: `Created “${action.event.title}”.` },
      );

    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.event.id ? { ...action.event, updatedAt: new Date().toISOString() } : event,
        ),
      };

    case 'DELETE_EVENT': {
      const removed = new Set([action.eventId]);
      return {
        ...state,
        events: state.events.filter((event) => !removed.has(event.id)),
        expenses: state.expenses.filter((expense) => !removed.has(expense.eventId)),
        tasks: state.tasks.filter((task) => !removed.has(task.eventId)),
        timelineItems: state.timelineItems.filter((item) => !removed.has(item.eventId)),
        vendors: state.vendors.filter((vendor) => !removed.has(vendor.eventId)),
        conversations: state.conversations.filter((message) => !removed.has(message.eventId)),
        plans: state.plans.filter((plan) => !removed.has(plan.eventId ?? '')),
        activity: state.activity.filter((entry) => entry.eventId !== action.eventId),
      };
    }

    case 'ADD_EXPENSE':
      return withActivity(
        { ...state, expenses: [action.expense, ...state.expenses] },
        { eventId: action.expense.eventId, type: 'expense-added', message: `Added expense “${action.expense.title}”.` },
      );

    case 'UPDATE_EXPENSE':
      return withActivity(
        {
          ...state,
          expenses: state.expenses.map((expense) =>
            expense.id === action.expense.id ? action.expense : expense,
          ),
        },
        { eventId: action.expense.eventId, type: 'expense-updated', message: `Updated expense “${action.expense.title}”.` },
      );

    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter((expense) => expense.id !== action.expenseId) };

    case 'ADD_TASK':
      return withActivity(
        { ...state, tasks: [action.task, ...state.tasks] },
        { eventId: action.task.eventId, type: 'task-added', message: `Added task “${action.task.title}”.` },
      );

    case 'UPDATE_TASK': {
      const wasCompleted = state.tasks.find((task) => task.id === action.task.id)?.completed ?? false;
      const next = {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.task.id ? { ...action.task, updatedAt: new Date().toISOString() } : task,
        ),
      };
      if (!wasCompleted && action.task.completed) {
        return withActivity(next, {
          eventId: action.task.eventId,
          type: 'task-completed',
          message: `Completed task “${action.task.title}”.`,
        });
      }
      return next;
    }

    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.taskId) };

    case 'ADD_TASKS': {
      const next = { ...state, tasks: [...action.tasks, ...state.tasks] };
      const firstEventId = action.tasks[0]?.eventId;
      if (!firstEventId) return next;
      return withActivity(next, {
        eventId: firstEventId,
        type: 'task-added',
        message: `Added ${action.tasks.length} tasks.`,
      });
    }

    case 'ADD_TIMELINE_ITEM':
      return { ...state, timelineItems: [...state.timelineItems, action.item] };

    case 'UPDATE_TIMELINE_ITEM':
      return {
        ...state,
        timelineItems: state.timelineItems.map((item) =>
          item.id === action.item.id ? action.item : item,
        ),
      };

    case 'DELETE_TIMELINE_ITEM':
      return {
        ...state,
        timelineItems: state.timelineItems.filter((item) => item.id !== action.itemId),
      };

    case 'ADD_TIMELINE_ITEMS':
      return { ...state, timelineItems: [...state.timelineItems, ...action.items] };

    case 'ADD_VENDOR':
      return withActivity(
        { ...state, vendors: [action.vendor, ...state.vendors] },
        { eventId: action.vendor.eventId, type: 'vendor-added', message: `Added vendor “${action.vendor.name}”.` },
      );

    case 'UPDATE_VENDOR':
      return {
        ...state,
        vendors: state.vendors.map((vendor) =>
          vendor.id === action.vendor.id ? action.vendor : vendor,
        ),
      };

    case 'DELETE_VENDOR':
      return { ...state, vendors: state.vendors.filter((vendor) => vendor.id !== action.vendorId) };

    case 'ADD_CONVERSATION_MESSAGE':
      return {
        ...state,
        conversations: [...state.conversations, action.message],
      };

    case 'CLEAR_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(
          (message) => message.eventId !== action.eventId,
        ),
      };

    case 'SET_PLAN':
      return withActivity(
        { ...state, plans: [{ ...action.plan, eventId: action.eventId }, ...state.plans] },
        {
          eventId: action.eventId,
          type: 'plan-generated',
          message:
            action.plan.source === 'local'
              ? 'Generated an event plan from built-in templates.'
              : 'Generated an AI event plan.',
        },
      );

    case 'LOG_ACTIVITY':
      return withActivity(state, {
        eventId: action.eventId,
        type: action.activityType,
        message: action.message,
      });

    case 'RESET_ALL':
      return defaultState();

    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  persistenceError: string | null;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as AppState, () => loadState());
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (saveState(state)) {
      setPersistenceError(null);
    } else {
      setPersistenceError(
        'Changes could not be saved to local storage. They will remain available for this session only.',
      );
    }
  }, [state]);

  const value = useMemo(
    () => ({ state, dispatch, persistenceError }),
    [state, persistenceError],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore(): StoreValue {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}

/** Convenience hook for the current event list. */
export function useEvents(): Event[] {
  const { state } = useAppStore();
  return state.events;
}
