import type {
  AIEventPlan,
  BudgetAdvice,
  BudgetAdviceInput,
  Event,
  GeneratedInvitation,
  InvitationInput,
  MenuPlan,
  MenuInput,
  TaskSuggestion,
  TaskSuggestionInput,
} from '../types/index.js';
import { toEventDetails } from '../types/index.js';

const DEFAULT_BASE_URL = '';

/**
 * Base URL for API requests.
 *
 * - Unset/empty → same-origin (`/api/...`). Correct for single-process
 *   deployments (SERVE_STATIC) and for development, where the Vite dev
 *   server proxies `/api` to the backend.
 * - Set `VITE_API_BASE_URL` to an absolute origin for split-origin hosting.
 */
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const base =
    typeof configured === 'string' && configured.trim().length > 0 ? configured.trim() : DEFAULT_BASE_URL;
  return base.replace(/\/+$/, '');
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError(
      'NETWORK_ERROR',
      'Could not reach the Eventra AI server. Make sure the backend is running.',
      0,
    );
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const parsed = (body ?? {}) as ErrorBody;
    const code = parsed.error?.code ?? 'REQUEST_FAILED';
    const message = parsed.error?.message ?? `Request failed with status ${response.status}.`;
    throw new ApiError(code, message, response.status, parsed.error?.details);
  }

  return body as T;
}

export interface HealthResponse {
  status: string;
  ai: { configured: boolean; model: string };
  /** Which planning backend served this: real AI or the built-in local engine. */
  planning?: { mode: 'ai' | 'local' };
}

/** Every AI endpoint tags its response so the UI can label local output honestly. */
export type AiSource = 'ai' | 'local';

export const api = {
  health: () => request<HealthResponse>('/api/health'),

  generatePlan: (event: Event) =>
    request<{ plan: AIEventPlan; source?: AiSource }>('/api/ai/generate-plan', {
      method: 'POST',
      body: JSON.stringify({ event: toEventDetails(event) }),
    }),

  chat: (event: Event, planSummary: Record<string, unknown> | undefined, history: Array<{ role: 'user' | 'assistant'; content: string }>, message: string) =>
    request<{ reply: string; source?: AiSource }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        event: toEventDetails(event),
        planSummary,
        history: history.slice(-20).map(({ role, content }) => ({ role, content })),
        message,
      }),
    }),

  generateInvitation: (input: InvitationInput) =>
    request<{ invitation: GeneratedInvitation; source?: AiSource }>('/api/ai/generate-invitation', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  generateMenu: (input: MenuInput) =>
    request<{ menu: MenuPlan; source?: AiSource }>('/api/ai/generate-menu', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  suggestTasks: (input: TaskSuggestionInput) =>
    request<{ tasks: TaskSuggestion[]; source?: AiSource }>('/api/ai/suggest-tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  improveBudget: (input: BudgetAdviceInput) =>
    request<{ advice: BudgetAdvice; source?: AiSource }>('/api/ai/improve-budget', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
