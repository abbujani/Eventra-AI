import type { BudgetAdviceInput } from '../../types.js';
import { budgetAdviceJsonSchema } from './jsonSchemas.js';
import { buildBudgetAdvicePrompt } from './prompts.js';
import { PLANNER_SYSTEM_INSTRUCTION } from './prompts.js';
import { budgetAdviceSchema, type BudgetAdvice } from './schemas.js';
import type { AiProvider } from './aiProvider.js';
import { generateStructured } from './generateStructured.js';

/**
 * Budget optimisation advice. The AI proposes category-level reductions; the
 * deterministic totals are still recomputed on the client from the returned
 * amounts, so no unverified arithmetic is trusted.
 */
export async function improveBudget(
  provider: AiProvider,
  input: BudgetAdviceInput,
): Promise<BudgetAdvice> {
  return generateStructured<BudgetAdvice>({
    provider,
    basePrompt: buildBudgetAdvicePrompt(input),
    schema: budgetAdviceSchema,
    generate: {
      systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: budgetAdviceJsonSchema,
      temperature: 0.5,
      maxOutputTokens: 6000,
    },
    retryOnInvalid:
      'IMPORTANT: Return ONLY valid JSON matching the schema. No prose, no markdown code fences.',
    invalidResponseMessage: 'The AI provider returned malformed budget advice. Please try again.',
  });
}
