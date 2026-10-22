import type { InvitationInput } from '../../types.js';
import { AppError } from '../../utils/errors.js';
import { buildInvitationPrompt, INVITATION_SYSTEM_INSTRUCTION } from './prompts.js';
import type { AiProvider } from './aiProvider.js';

export interface GeneratedInvitation {
  text: string;
  language: string;
  tone: string;
  channel: string;
  eventType: string;
  missingFields: string[];
}

const REQUIRED_FIELDS: Array<{ key: keyof InvitationInput; label: string }> = [
  { key: 'dateLabel', label: 'date' },
];

/**
 * Generates invitation copy. Missing required details are surfaced so the UI can
 * ask the user rather than the model inventing them.
 */
export async function generateInvitation(
  provider: AiProvider,
  input: InvitationInput,
): Promise<GeneratedInvitation> {
  if (!provider.configured) throw AppError.aiNotConfigured();

  const missingFields = REQUIRED_FIELDS.filter(
    ({ key }) => !input[key] || String(input[key]).trim().length === 0,
  ).map(({ label }) => label);

  const text = await provider.generateText(buildInvitationPrompt(input), {
    systemInstruction: INVITATION_SYSTEM_INSTRUCTION,
    temperature: 0.7,
    maxOutputTokens: 1500,
  });

  return {
    text,
    language: input.language,
    tone: input.tone,
    channel: input.channel,
    eventType: input.eventType,
    missingFields,
  };
}
