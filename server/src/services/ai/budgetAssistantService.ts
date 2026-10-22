import type { BudgetAdviceInput } from '../../types.js';
import { AppError } from '../../utils/errors.js';
import { budgetAdviceJsonSchema } from './jsonSchemas.js';
import { buildBudgetAdvicePrompt } from './prompts.js';
import { PLANNER_SYSTEM_INSTRUCTION } from './prompts.js';
import { budgetAdviceSchema, type BudgetAdvice } from './schemas.js';
import type { AiProvider } from './aiProvider.js';

const MAX_ATTEMPTS = 2;

/**
 * Budget optimisation advice. The AI proposes category-level reductions; the
 * deterministic totals are still recomputed on the client from the returned
 * amounts, so no unverified arithmetic is trusted.
 */
export async function improveBudget(
  provider: AiProvider,
  input: BudgetAdviceInput,
): Promise<BudgetAdvice> {
  if (!provider.configured) throw AppError.aiNotConfigured();

  const basePrompt = buildBudgetAdvicePrompt(input);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let prompt = basePrompt;
    if (attempt > 0) {
      prompt = `${basePrompt}\n\nIMPORTANT: Return ONLY valid JSON matching the schema. No prose, no markdown code fences.`;
    }

    const raw = await provider.generateJson<unknown>(prompt, {
      systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: budgetAdviceJsonSchema,
      temperature: 0.5,
      maxOutputTokens: 6000,
    });

    const parsed = budgetAdviceSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }

  throw AppError.aiInvalidResponse(
    'The AI provider returned malformed budget advice. Please try again.',
  );
}
