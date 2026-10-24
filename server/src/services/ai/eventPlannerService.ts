import type { EventDetails } from '../../types.js';
import { eventPlanJsonSchema } from './jsonSchemas.js';
import { buildEventPrompt, PLANNER_SYSTEM_INSTRUCTION } from './prompts.js';
import {
  aiEventPlanSchema,
  normalizeEventPlan,
  type NormalizedAIEventPlan,
} from './schemas.js';
import type { AiProvider } from './aiProvider.js';
import { generateStructured } from './generateStructured.js';

/**
 * Generates a complete, structured event plan from real model output.
 * Malformed responses are retried once with a corrective instruction; they are
 * never silently accepted.
 */
export async function generateEventPlan(
  provider: AiProvider,
  event: EventDetails,
): Promise<NormalizedAIEventPlan> {
  return generateStructured({
    provider,
    basePrompt: buildEventPrompt(event),
    schema: aiEventPlanSchema,
    generate: {
      systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: eventPlanJsonSchema,
      temperature: 0.6,
      maxOutputTokens: 12000,
    },
    retryOnInvalid:
      'IMPORTANT: Your previous response was missing required fields or had the wrong types. Return ONLY valid JSON that exactly matches the schema. No prose, no markdown code fences.',
    retryOnParseError:
      'IMPORTANT: Your previous response could not be parsed as valid JSON. Return ONLY the JSON object described by the schema. No prose, no markdown code fences.',
    normalize: (plan) => normalizeEventPlan(plan, event.totalBudget, event.currency),
    invalidResponseMessage:
      'The AI provider returned a malformed event plan. Please try again.',
  });
}
