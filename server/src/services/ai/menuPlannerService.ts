import type { MenuInput } from '../../types.js';
import { AppError } from '../../utils/errors.js';
import { menuPlanJsonSchema } from './jsonSchemas.js';
import { buildMenuPrompt, MENU_SYSTEM_INSTRUCTION } from './prompts.js';
import { menuPlanSchema, type MenuPlan } from './schemas.js';
import type { AiProvider } from './aiProvider.js';

const MAX_ATTEMPTS = 2;

export async function generateMenuPlan(
  provider: AiProvider,
  input: MenuInput,
): Promise<MenuPlan> {
  if (!provider.configured) throw AppError.aiNotConfigured();

  const basePrompt = buildMenuPrompt(input);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let prompt = basePrompt;
    if (attempt > 0) {
      prompt = `${basePrompt}\n\nIMPORTANT: Return ONLY valid JSON matching the schema. No prose, no markdown code fences.`;
    }

    const raw = await provider.generateJson<unknown>(prompt, {
      systemInstruction: MENU_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: menuPlanJsonSchema,
      temperature: 0.6,
      maxOutputTokens: 6000,
    });

    const parsed = menuPlanSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }

  throw AppError.aiInvalidResponse(
    'The AI provider returned a malformed menu. Please try again.',
  );
}
