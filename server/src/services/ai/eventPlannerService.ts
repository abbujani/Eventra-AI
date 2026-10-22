import type { EventDetails } from '../../types.js';
import { AppError } from '../../utils/errors.js';
import { eventPlanJsonSchema } from './jsonSchemas.js';
import { buildEventPrompt, PLANNER_SYSTEM_INSTRUCTION } from './prompts.js';
import {
  aiEventPlanSchema,
  normalizeEventPlan,
  type NormalizedAIEventPlan,
} from './schemas.js';
import type { AiProvider } from './aiProvider.js';

const MAX_ATTEMPTS = 2;

/**
 * Generates a complete, structured event plan from real model output.
 * Malformed responses are retried once with a corrective instruction; they are
 * never silently accepted.
 */
export async function generateEventPlan(
  provider: AiProvider,
  event: EventDetails,
): Promise<NormalizedAIEventPlan> {
  if (!provider.configured) throw AppError.aiNotConfigured();

  const basePrompt = buildEventPrompt(event);
  let prompt = basePrompt;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let raw: unknown;
    try {
      raw = await provider.generateJson<unknown>(prompt, {
        systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: eventPlanJsonSchema,
        temperature: 0.6,
        maxOutputTokens: 12000,
      });
    } catch (err) {
      if (err instanceof AppError && err.code === 'AI_INVALID_RESPONSE' && attempt < MAX_ATTEMPTS - 1) {
        prompt = `${basePrompt}\n\nIMPORTANT: Your previous response could not be parsed as valid JSON. Return ONLY the JSON object described by the schema. No prose, no markdown code fences.`;
        continue;
      }
      throw err;
    }

    const parsed = aiEventPlanSchema.safeParse(raw);
    if (parsed.success) {
      return normalizeEventPlan(parsed.data, event.totalBudget, event.currency);
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      prompt = `${basePrompt}\n\nIMPORTANT: Your previous response was missing required fields or had the wrong types. Return ONLY valid JSON that exactly matches the schema. No prose, no markdown code fences.`;
    }
  }

  throw AppError.aiInvalidResponse(
    'The AI provider returned a malformed event plan. Please try again.',
  );
}
