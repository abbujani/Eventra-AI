import type { MenuInput } from '../../types.js';
import { menuPlanJsonSchema } from './jsonSchemas.js';
import { buildMenuPrompt, MENU_SYSTEM_INSTRUCTION } from './prompts.js';
import { menuPlanSchema, type MenuPlan } from './schemas.js';
import type { AiProvider } from './aiProvider.js';
import { generateStructured } from './generateStructured.js';

export async function generateMenuPlan(
  provider: AiProvider,
  input: MenuInput,
): Promise<MenuPlan> {
  return generateStructured<MenuPlan>({
    provider,
    basePrompt: buildMenuPrompt(input),
    schema: menuPlanSchema,
    generate: {
      systemInstruction: MENU_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: menuPlanJsonSchema,
      temperature: 0.6,
      maxOutputTokens: 6000,
    },
    retryOnInvalid:
      'IMPORTANT: Return ONLY valid JSON matching the schema. No prose, no markdown code fences.',
    invalidResponseMessage: 'The AI provider returned a malformed menu. Please try again.',
  });
}
