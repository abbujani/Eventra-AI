import type { TaskSuggestionInput } from '../../types.js';
import { AppError } from '../../utils/errors.js';
import { taskSuggestionsJsonSchema } from './jsonSchemas.js';
import { buildTaskSuggestionPrompt, PLANNER_SYSTEM_INSTRUCTION } from './prompts.js';
import { taskSuggestionsSchema, type TaskSuggestion } from './schemas.js';
import type { AiProvider } from './aiProvider.js';

const MAX_ATTEMPTS = 2;

export async function suggestTasks(
  provider: AiProvider,
  input: TaskSuggestionInput,
): Promise<TaskSuggestion[]> {
  if (!provider.configured) throw AppError.aiNotConfigured();

  const basePrompt = buildTaskSuggestionPrompt(input);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let prompt = basePrompt;
    if (attempt > 0) {
      prompt = `${basePrompt}\n\nIMPORTANT: Return ONLY valid JSON matching the schema. No prose, no markdown code fences.`;
    }

    const raw = await provider.generateJson<unknown>(prompt, {
      systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: taskSuggestionsJsonSchema,
      temperature: 0.5,
      maxOutputTokens: 6000,
    });

    const parsed = taskSuggestionsSchema.safeParse(raw);
    if (parsed.success) return parsed.data.tasks;
  }

  throw AppError.aiInvalidResponse(
    'The AI provider returned malformed task suggestions. Please try again.',
  );
}
