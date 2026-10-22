import { Router } from 'express';
import { aiRateLimiter } from '../middleware/rateLimit.js';
import type { AiProvider } from '../services/ai/index.js';
import { generateEventPlan } from '../services/ai/eventPlannerService.js';
import { chatWithEvent } from '../services/ai/chatService.js';
import { generateInvitation } from '../services/ai/invitationService.js';
import { generateMenuPlan } from '../services/ai/menuPlannerService.js';
import { improveBudget } from '../services/ai/budgetAssistantService.js';
import { suggestTasks } from '../services/ai/taskSuggestionService.js';
import {
  buildLocalBudgetAdvice,
  buildLocalInvitation,
  buildLocalMenu,
  buildLocalPlan,
  buildLocalTasks,
  chatLocally,
} from '../services/local/index.js';
import {
  chatSchema,
  generatePlanSchema,
  improveBudgetSchema,
  invitationSchema,
  menuSchema,
  suggestTasksSchema,
} from '../schemas/requests.js';
import { parseOrThrow } from '../utils/validate.js';

const VALIDATION_MESSAGE = 'Please check the submitted event details.';

/**
 * Each endpoint uses the real Gemini model when a key is configured and falls
 * back to a deterministic built-in template engine when it is not, so the app
 * is fully usable without an API key. Every response carries a `source` field
 * ('ai' or 'local') and the client labels local output as templates — nothing is
 * ever presented as an AI response when no model produced it.
 */
export function createAiRouter(provider: AiProvider): Router {
  const router = Router();
  const source = provider.configured ? ('ai' as const) : ('local' as const);

  router.post('/generate-plan', aiRateLimiter, async (req, res) => {
    const { event } = parseOrThrow(generatePlanSchema, req.body, VALIDATION_MESSAGE);
    const plan = provider.configured
      ? await generateEventPlan(provider, event)
      : buildLocalPlan(event);
    res.json({ plan, source });
  });

  router.post('/chat', aiRateLimiter, async (req, res) => {
    const { event, planSummary, history, message } = parseOrThrow(
      chatSchema,
      req.body,
      VALIDATION_MESSAGE,
    );
    const reply = provider.configured
      ? await chatWithEvent(provider, event, planSummary, history, message)
      : chatLocally(event, planSummary, history, message);
    res.json({ reply, source });
  });

  router.post('/generate-invitation', aiRateLimiter, async (req, res) => {
    const input = parseOrThrow(invitationSchema, req.body, VALIDATION_MESSAGE);
    const invitation = provider.configured
      ? await generateInvitation(provider, input)
      : buildLocalInvitation(input);
    res.json({ invitation, source });
  });

  router.post('/generate-menu', aiRateLimiter, async (req, res) => {
    const input = parseOrThrow(menuSchema, req.body, VALIDATION_MESSAGE);
    const menu = provider.configured
      ? await generateMenuPlan(provider, input)
      : buildLocalMenu(input);
    res.json({ menu, source });
  });

  router.post('/suggest-tasks', aiRateLimiter, async (req, res) => {
    const input = parseOrThrow(suggestTasksSchema, req.body, VALIDATION_MESSAGE);
    const tasks = provider.configured
      ? await suggestTasks(provider, input)
      : buildLocalTasks(input);
    res.json({ tasks, source });
  });

  router.post('/improve-budget', aiRateLimiter, async (req, res) => {
    const input = parseOrThrow(improveBudgetSchema, req.body, VALIDATION_MESSAGE);
    const advice = provider.configured
      ? await improveBudget(provider, input)
      : buildLocalBudgetAdvice(input);
    res.json({ advice, source });
  });

  return router;
}
