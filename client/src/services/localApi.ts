/**
 * In-browser implementation of every AI endpoint.
 *
 * Used when the app is built for static hosting (GitHub Pages), where no Node
 * server exists. It reuses the same deterministic template engine the API
 * deployment falls back to, so behaviour and honesty labels are identical:
 * responses are always tagged `source: 'local'` and the UI never calls them
 * AI-generated.
 */
import type {
  AiSource,
  BudgetAdviceInput,
  Event,
  InvitationInput,
  MenuInput,
  TaskSuggestionInput,
} from '../types/index.js';
import { toEventDetails } from '../types/index.js';
import {
  buildLocalBudgetAdvice,
  buildLocalInvitation,
  buildLocalMenu,
  buildLocalPlan,
  buildLocalTasks,
  chatLocally,
} from '../engine/index.js';
import type { PlanSummaryContext } from '../engine/types.js';

const LOCAL: AiSource = 'local';

export const localApi = {
  async generatePlan(event: Event) {
    return { plan: buildLocalPlan(toEventDetails(event)), source: LOCAL };
  },

  async chat(
    event: Event,
    planSummary: Record<string, unknown> | undefined,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    message: string,
  ) {
    return {
      reply: chatLocally(
        toEventDetails(event),
        planSummary as PlanSummaryContext | undefined,
        history,
        message,
      ),
      source: LOCAL,
    };
  },

  async generateInvitation(input: InvitationInput) {
    return { invitation: buildLocalInvitation(input), source: LOCAL };
  },

  async generateMenu(input: MenuInput) {
    return { menu: buildLocalMenu(input), source: LOCAL };
  },

  async suggestTasks(input: TaskSuggestionInput) {
    return { tasks: buildLocalTasks(input), source: LOCAL };
  },

  async improveBudget(input: BudgetAdviceInput) {
    return { advice: buildLocalBudgetAdvice(input), source: LOCAL };
  },
};
