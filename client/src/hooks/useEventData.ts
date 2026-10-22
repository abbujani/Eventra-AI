import { useMemo } from 'react';
import { useAppStore } from '../store/appStore.js';
import { summarizeBudget } from '../lib/budget.js';
import { findOverlaps, sortTimeline, type Overlap } from '../lib/timeline.js';
import { todayUtc } from '../lib/dates.js';
import type {
  AIEventPlan,
  ConversationMessage,
  Event,
  Expense,
  Task,
  Vendor,
} from '../types/index.js';

export function useEvent(eventId: string): Event | undefined {
  const { state } = useAppStore();
  return useMemo(
    () => state.events.find((event) => event.id === eventId),
    [state.events, eventId],
  );
}

export function useEventExpenses(eventId: string): Expense[] {
  const { state } = useAppStore();
  return useMemo(
    () => state.expenses.filter((expense) => expense.eventId === eventId),
    [state.expenses, eventId],
  );
}

export function useEventBudget(eventId: string) {
  const event = useEvent(eventId);
  const expenses = useEventExpenses(eventId);
  return useMemo(() => {
    if (!event) return null;
    return summarizeBudget(event.totalBudget, event.currency, expenses);
  }, [event, expenses]);
}

export function useEventTasks(eventId: string): Task[] {
  const { state } = useAppStore();
  return useMemo(
    () => state.tasks.filter((task) => task.eventId === eventId),
    [state.tasks, eventId],
  );
}

export function useEventProgress(eventId: string) {
  const tasks = useEventTasks(eventId);
  const plan = useEventPlan(eventId);
  return useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    return {
      total,
      completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      pending: total - completed,
      overdue: tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < todayUtc()).length,
      hasPlan: Boolean(plan),
    };
  }, [tasks, plan]);
}

export function useEventTimeline(eventId: string) {
  const { state } = useAppStore();
  return useMemo(() => {
    const items = state.timelineItems.filter((item) => item.eventId === eventId);
    const sorted = sortTimeline(items);
    const overlaps: Overlap[] = findOverlaps(sorted);
    return { items, sorted, overlaps };
  }, [state.timelineItems, eventId]);
}

export function useEventVendors(eventId: string): Vendor[] {
  const { state } = useAppStore();
  return useMemo(
    () => state.vendors.filter((vendor) => vendor.eventId === eventId),
    [state.vendors, eventId],
  );
}

export function useEventConversation(eventId: string): ConversationMessage[] {
  const { state } = useAppStore();
  return useMemo(
    () => state.conversations.filter((message) => message.eventId === eventId),
    [state.conversations, eventId],
  );
}

export function useEventPlan(eventId: string): AIEventPlan | undefined {
  const { state } = useAppStore();
  return useMemo(
    () => state.plans.find((plan) => plan.eventId === eventId),
    [state.plans, eventId],
  );
}
