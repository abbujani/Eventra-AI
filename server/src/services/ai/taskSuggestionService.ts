import type { TaskSuggestionInput } from '../../types.js';
import { taskSuggestionsJsonSchema } from './jsonSchemas.js';
import { buildTaskSuggestionPrompt, PLANNER_SYSTEM_INSTRUCTION } from './prompts.js';
import { taskSuggestionsSchema, type TaskSuggestion } from './schemas.js';
import type { AiProvider } from './aiProvider.js';
import { generateStructured } from './generateStructured.js';

export async function suggestTasks(
  provider: AiProvider,
  input: TaskSuggestionInput,
): Promise<TaskSuggestion[]> {
  return generateStructured<{ tasks: TaskSuggestion[] }, TaskSuggestion[]>({
    provider,
    basePrompt: buildTaskSuggestionPrompt(input),
    schema: taskSuggestionsSchema,
    generate: {
      systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: taskSuggestionsJsonSchema,
      temperature: 0.5,
      maxOutputTokens: 6000,
    },
    retryOnInvalid:
      'IMPORTANT: Return ONLY valid JSON matching the schema. No prose, no markdown code fences.',
    normalize: (result) => result.tasks,
    invalidResponseMessage: 'The AI provider returned malformed task suggestions. Please try again.',
  });
}
