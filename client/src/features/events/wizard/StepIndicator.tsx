import { cn } from '../../../lib/cn.js';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  fields: string[];
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'type', title: 'Event type', description: 'Choose the kind of celebration.', fields: ['eventType'] },
  {
    id: 'details',
    title: 'Basic information',
    description: 'The essentials for your plan.',
    fields: ['title', 'startDate', 'endDate', 'timezone', 'location', 'guestCount', 'venuePreference'],
  },
  {
    id: 'budget',
    title: 'Budget',
    description: 'Set a realistic budget.',
    fields: ['totalBudget', 'currency', 'budgetFlexibility', 'categoryPriorities'],
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Only what you choose to share.',
    fields: [
      'style',
      'colorPalette',
      'dietaryPreferences',
      'culturalPreferences',
      'accessibilityRequirements',
      'mustHaveActivities',
      'thingsToAvoid',
    ],
  },
  {
    id: 'additional',
    title: 'Additional details',
    description: 'Optional planning context.',
    fields: ['durationHours', 'eventDays', 'venueStatus', 'planningPriorities', 'notes'],
  },
  { id: 'review', title: 'Review', description: 'Confirm your details.', fields: [] },
];

export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
      {Array.from({ length: total }, (_, index) => {
        const step = WIZARD_STEPS[index]!;
        const state = index < current ? 'complete' : index === current ? 'current' : 'upcoming';
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                state === 'complete' && 'bg-success text-white',
                state === 'current' && 'bg-violet text-white',
                state === 'upcoming' && 'bg-midnight/8 text-slate',
              )}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {state === 'complete' ? '✓' : index + 1}
            </span>
            <span
              className={cn(
                'hidden text-xs font-semibold sm:block',
                state === 'current' ? 'text-midnight' : 'text-slate',
              )}
            >
              {step.title}
            </span>
            {index < total - 1 && (
              <span className="h-px w-4 bg-midnight/15 sm:w-6" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
