import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, type FieldPath } from 'react-hook-form';
import { ArrowLeft, ArrowRight, CalendarRange, Check, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Field, Input, Select, Textarea } from '../components/ui/Field.js';
import { ErrorState } from '../components/ui/Feedback.js';
import { useAppStore } from '../store/appStore.js';
import { generateId } from '../lib/id.js';
import { formatCurrency } from '../lib/format.js';
import { DEFAULT_BUDGET_CATEGORIES, EVENT_TYPES, TIMEZONES, type Event, type EventType } from '../types/index.js';
import { StepIndicator, WIZARD_STEPS } from '../features/events/wizard/StepIndicator.js';
import { CheckboxGroup, ChipInput, ColorPaletteInput } from '../features/events/wizard/fields.js';
import { stepSchema, type WizardValues } from '../features/events/wizard/schema.js';
import { cn } from '../lib/cn.js';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'];
const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Wedding',
  engagement: 'Engagement',
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  'baby-shower': 'Baby shower',
  festival: 'Festival or cultural celebration',
  community: 'Community event',
  corporate: 'Corporate event',
  other: 'Other',
};

const DIETARY_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'jain', label: 'Jain' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'nut-free', label: 'Nut-free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

// Every budget category except Contingency — a reserve, not something
// planners rank as a priority. (Previously slice(0, 11), which dropped
// whatever happened to be last in the list.)
const PRIORITY_OPTIONS = DEFAULT_BUDGET_CATEGORIES.filter(
  (category) => category !== 'Contingency',
).map((category) => ({
  value: category,
  label: category,
}));

const PLANNING_PRIORITIES = [
  { value: 'Budget control', label: 'Budget control' },
  { value: 'Guest comfort', label: 'Guest comfort' },
  { value: 'Timing', label: 'Timing' },
  { value: 'Vendor quality', label: 'Vendor quality' },
  { value: 'Aesthetics', label: 'Aesthetics' },
  { value: 'Documentation', label: 'Documentation' },
];

function defaultValues(preferredCurrency: string): WizardValues {
  return {
    eventType: 'wedding',
    title: '',
    startDate: '',
    endDate: '',
    timezone: 'Asia/Kolkata',
    location: '',
    guestCount: 100,
    venuePreference: 'unspecified',
    totalBudget: 100000,
    currency: preferredCurrency,
    budgetFlexibility: 'moderate',
    categoryPriorities: [],
    style: '',
    colorPalette: [],
    dietaryPreferences: [],
    culturalPreferences: '',
    accessibilityRequirements: '',
    mustHaveActivities: [],
    thingsToAvoid: [],
    durationHours: undefined,
    eventDays: 1,
    venueStatus: '',
    planningPriorities: [],
    notes: '',
  };
}

function toEvent(values: WizardValues): Event {
  const now = new Date().toISOString();
  return {
    id: generateId('evt'),
    title: values.title.trim(),
    eventType: values.eventType,
    startDate: values.startDate,
    endDate: values.endDate || undefined,
    timezone: values.timezone ?? 'Asia/Kolkata',
    location: values.location.trim(),
    guestCount: values.guestCount,
    venuePreference: values.venuePreference,
    totalBudget: values.totalBudget,
    currency: values.currency,
    budgetFlexibility: values.budgetFlexibility,
    categoryPriorities: values.categoryPriorities,
    style: values.style?.trim() || undefined,
    colorPalette: values.colorPalette,
    dietaryPreferences: values.dietaryPreferences,
    culturalPreferences: values.culturalPreferences?.trim() || undefined,
    accessibilityRequirements: values.accessibilityRequirements?.trim() || undefined,
    mustHaveActivities: values.mustHaveActivities,
    thingsToAvoid: values.thingsToAvoid,
    durationHours: values.durationHours,
    eventDays: values.eventDays,
    venueStatus: values.venueStatus?.trim() || undefined,
    planningPriorities: values.planningPriorities,
    notes: values.notes?.trim() || undefined,
    status: 'planning',
    createdAt: now,
    updatedAt: now,
  };
}

export function EventWizardPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // react-hook-form reads defaultValues only on mount, so it is computed here
  // without a memo — a dependency on preferredCurrency would have no effect
  // after the first render.
  const form = useForm<WizardValues>({
    defaultValues: defaultValues(state.preferences.preferredCurrency),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  const values = watch();
  const isReview = step === WIZARD_STEPS.length - 1;

  const goToStep = (next: number) => {
    setStep(next);
    // Respect reduced-motion preferences — jump instead of animating.
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    topRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const validateStep = (index: number): boolean => {
    const current = WIZARD_STEPS[index];
    if (!current) return false;
    const fields = current.fields as FieldPath<WizardValues>[];
    fields.forEach((field) => clearErrors(field));
    const schema = stepSchema(current.fields);
    const result = schema.safeParse(values);
    if (result.success) return true;
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path) {
        setError(path as FieldPath<WizardValues>, { message: issue.message });
      }
    }
    return false;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      goToStep(Math.min(step + 1, WIZARD_STEPS.length - 1));
    }
  };

  const handleBack = () => goToStep(Math.max(step - 1, 0));

  const onSubmit = handleSubmit(
    (valuesToSubmit) => {
      setSubmitError(null);
      const event = toEvent(valuesToSubmit);
      dispatch({ type: 'ADD_EVENT', event });
      navigate(`/events/${event.id}`);
    },
    (fieldErrors) => {
      setSubmitError('Please fix the highlighted fields before creating the event.');
      const firstKey = Object.keys(fieldErrors)[0];
      const index = WIZARD_STEPS.findIndex((entry) =>
        entry.fields.includes(firstKey ?? ''),
      );
      if (index >= 0 && !isReview) goToStep(index);
    },
  );

  const stepFields = WIZARD_STEPS[step]?.fields ?? [];

  return (
    <div ref={topRef} className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-soft text-violet">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Create a new event</h1>
            <p className="text-sm text-slate">Step {step + 1} of {WIZARD_STEPS.length}</p>
          </div>
        </div>
        <StepIndicator current={step} total={WIZARD_STEPS.length} />
      </header>

      {submitError && (
        <ErrorState title="Unable to create event" message={submitError} onRetry={() => setSubmitError(null)} />
      )}

      <form onSubmit={onSubmit} noValidate className="card px-5 py-6 sm:px-6">
        {step === 0 && (
          <StepShell
            title="What kind of celebration is it?"
            description="This shapes the AI's planning, budget and cultural suggestions."
          >
            <Field label="Event type" htmlFor="eventType" required error={errors.eventType?.message}>
              <div className="grid gap-3 sm:grid-cols-2">
                {EVENT_TYPES.map((type) => (
                  <label
                    key={type}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                      values.eventType === type
                        ? 'border-violet bg-violet-soft'
                        : 'border-midnight/15 bg-white hover:border-violet/40',
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      value={type}
                      {...register('eventType')}
                    />
                    <span className="text-sm font-semibold text-midnight-2">
                      {EVENT_TYPE_LABELS[type]}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="Basic information" description="The essentials your plan will be built around.">
            <div className="space-y-5">
              <Field label="Event title" htmlFor="title" required error={errors.title?.message}>
                <Input
                  id="title"
                  placeholder="e.g. Anaya & Rohan's wedding"
                  {...register('title', { required: 'Event title is required.', maxLength: 160 })}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Start date"
                  htmlFor="startDate"
                  required
                  error={errors.startDate?.message ?? errors.endDate?.message}
                >
                  <Input id="startDate" type="date" {...register('startDate', { required: 'Start date is required.' })} />
                </Field>
                <Field
                  label="End date"
                  htmlFor="endDate"
                  optional
                  error={errors.endDate?.message}
                  hint={values.endDate ? undefined : 'Leave empty for a single-day event.'}
                >
                  <Input id="endDate" type="date" {...register('endDate')} />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Timezone" htmlFor="timezone" required error={errors.timezone?.message}>
                  <Select id="timezone" {...register('timezone')}>
                    {TIMEZONES.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="City or general location" htmlFor="location" required error={errors.location?.message}>
                  <Input
                    id="location"
                    placeholder="e.g. Jaipur, India"
                    {...register('location', { required: 'Location is required.', maxLength: 160 })}
                  />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Expected guest count" htmlFor="guestCount" required error={errors.guestCount?.message}>
                  <Input
                    id="guestCount"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    {...register('guestCount', {
                      required: 'Guest count is required.',
                      valueAsNumber: true,
                      min: { value: 1, message: 'At least 1 guest.' },
                      validate: (value) => Number.isFinite(value) || 'Enter a valid number.',
                    })}
                  />
                </Field>
                <Field label="Venue preference" htmlFor="venuePreference" required error={errors.venuePreference?.message}>
                  <Select id="venuePreference" {...register('venuePreference')}>
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="mixed">Mixed (indoor + outdoor)</option>
                    <option value="unspecified">Not sure yet</option>
                  </Select>
                </Field>
              </div>
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="Budget" description="Set a realistic total. AI estimates stay within it where possible.">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Total budget" htmlFor="totalBudget" required error={errors.totalBudget?.message}>
                  <Input
                    id="totalBudget"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    {...register('totalBudget', {
                      required: 'Total budget is required.',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Budget cannot be negative.' },
                      validate: (value) => Number.isFinite(value) || 'Enter a valid amount.',
                    })}
                  />
                </Field>
                <Field label="Currency" htmlFor="currency" required error={errors.currency?.message}>
                  <Select id="currency" {...register('currency')}>
                    {CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label="Budget flexibility" htmlFor="budgetFlexibility" required>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { value: 'strict', label: 'Strict', hint: 'Stay within budget' },
                    { value: 'moderate', label: 'Moderate', hint: 'A little room to move' },
                    { value: 'flexible', label: 'Flexible', hint: 'Priorities can shift' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'cursor-pointer rounded-xl border px-3 py-2.5',
                        values.budgetFlexibility === option.value
                          ? 'border-violet bg-violet-soft'
                          : 'border-midnight/15 hover:border-violet/40',
                      )}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        value={option.value}
                        {...register('budgetFlexibility')}
                      />
                      <span className="block text-sm font-semibold text-midnight-2">{option.label}</span>
                      <span className="block text-xs text-slate">{option.hint}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <CheckboxGroup
                id="categoryPriorities"
                label="Category priorities"
                optional
                hint="Which areas matter most to you?"
                options={PRIORITY_OPTIONS}
                value={values.categoryPriorities}
                onChange={(next) => setValue('categoryPriorities', next, { shouldDirty: true })}
              />
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell
            title="Preferences"
            description="Optional. Share only what you want the AI to consider."
          >
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Event style" htmlFor="style" optional error={errors.style?.message}>
                  <Input
                    id="style"
                    placeholder="e.g. Traditional Rajasthani, minimalist, rustic"
                    {...register('style', { maxLength: 120 })}
                  />
                </Field>
                <Field label="Venue status" htmlFor="venueStatus" optional error={errors.venueStatus?.message}>
                  <Input
                    id="venueStatus"
                    placeholder="e.g. Not booked yet, shortlisting"
                    {...register('venueStatus', { maxLength: 120 })}
                  />
                </Field>
              </div>

              <ColorPaletteInput
                id="colorPalette"
                label="Preferred colour palette"
                optional
                value={values.colorPalette}
                onChange={(next) => setValue('colorPalette', next, { shouldDirty: true })}
              />

              <CheckboxGroup
                id="dietaryPreferences"
                label="Dietary preferences"
                optional
                hint="Select all that apply."
                options={DIETARY_OPTIONS}
                value={values.dietaryPreferences}
                onChange={(next) => setValue('dietaryPreferences', next, { shouldDirty: true })}
              />

              <Field
                label="Cultural or religious preferences"
                htmlFor="culturalPreferences"
                optional
                hint="Only if you choose to share. Never assumed by the AI."
                error={errors.culturalPreferences?.message}
              >
                <Textarea
                  id="culturalPreferences"
                  rows={2}
                  placeholder="e.g. Multi-day celebration with Mehendi, Haldi and Sangeet"
                  {...register('culturalPreferences', { maxLength: 400 })}
                />
              </Field>

              <Field
                label="Accessibility requirements"
                htmlFor="accessibilityRequirements"
                optional
                error={errors.accessibilityRequirements?.message}
              >
                <Textarea
                  id="accessibilityRequirements"
                  rows={2}
                  placeholder="e.g. Wheelchair access, quiet space, sign-language support"
                  {...register('accessibilityRequirements', { maxLength: 400 })}
                />
              </Field>

              <ChipInput
                id="mustHaveActivities"
                label="Must-have activities"
                optional
                value={values.mustHaveActivities}
                onChange={(next) => setValue('mustHaveActivities', next, { shouldDirty: true })}
                placeholder="e.g. Sangeet, cake cutting"
              />

              <ChipInput
                id="thingsToAvoid"
                label="Things to avoid"
                optional
                value={values.thingsToAvoid}
                onChange={(next) => setValue('thingsToAvoid', next, { shouldDirty: true })}
                placeholder="e.g. Loud fireworks, long speeches"
              />
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="Additional details" description="Optional context that sharpens the plan.">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Event duration (hours)"
                  htmlFor="durationHours"
                  optional
                  error={errors.durationHours?.message}
                >
                  <Input
                    id="durationHours"
                    type="number"
                    min={0.5}
                    step="0.5"
                    {...register('durationHours', {
                      setValueAs: (value) => (value === '' || value === undefined ? undefined : Number(value)),
                    })}
                  />
                </Field>
                <Field label="Number of event days" htmlFor="eventDays" optional error={errors.eventDays?.message}>
                  <Input
                    id="eventDays"
                    type="number"
                    min={1}
                    max={30}
                    {...register('eventDays', {
                      setValueAs: (value) => (value === '' || value === undefined ? undefined : Number(value)),
                    })}
                  />
                </Field>
              </div>

              <CheckboxGroup
                id="planningPriorities"
                label="Planning priorities"
                optional
                options={PLANNING_PRIORITIES}
                value={values.planningPriorities}
                onChange={(next) => setValue('planningPriorities', next, { shouldDirty: true })}
              />

              <Field label="Additional notes" htmlFor="notes" optional error={errors.notes?.message}>
                <Textarea
                  id="notes"
                  rows={4}
                  placeholder="Anything else the AI should know about this celebration."
                  {...register('notes', { maxLength: 2000 })}
                />
              </Field>
            </div>
          </StepShell>
        )}

        {step === 5 && (
          <ReviewStep values={values} onEdit={goToStep} />
        )}

        <div className="mt-7 flex items-center justify-between gap-3 border-t border-midnight/8 pt-5">
          <Button variant="secondary" type="button" onClick={handleBack} disabled={step === 0 || isSubmitting}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {stepFields.length > 0 && (
              <span className="text-xs text-slate">
                {stepFields.length} field{stepFields.length === 1 ? '' : 's'} in this step
              </span>
            )}
            {isReview ? (
              <Button type="submit" disabled={isSubmitting}>
                <Check className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? 'Creating…' : 'Create event'}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </form>

      <p className="flex items-start gap-2 text-xs text-slate">
        <CalendarRange className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Your details are stored locally in this browser. Optional fields stay optional — nothing is inferred about you.
      </p>
    </div>
  );
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-midnight">{title}</h2>
        <p className="mt-0.5 text-sm text-slate">{description}</p>
      </div>
      {children}
    </section>
  );
}

interface ReviewStepProps {
  values: WizardValues;
  onEdit: (step: number) => void;
}

function ReviewStep({ values, onEdit }: ReviewStepProps) {
  const sections: Array<{ step: number; title: string; rows: Array<[string, string]> }> = [
    {
      step: 0,
      title: 'Event type',
      rows: [['Type', EVENT_TYPE_LABELS[values.eventType]]],
    },
    {
      step: 1,
      title: 'Basic information',
      rows: [
        ['Title', values.title],
        ['Start date', values.startDate],
        ['End date', values.endDate || 'Single day'],
        ['Timezone', values.timezone],
        ['Location', values.location],
        ['Guests', String(values.guestCount)],
        ['Venue preference', values.venuePreference],
      ],
    },
    {
      step: 2,
      title: 'Budget',
      rows: [
        ['Total budget', formatCurrency(values.totalBudget, values.currency)],
        ['Currency', values.currency],
        ['Flexibility', values.budgetFlexibility],
        ['Category priorities', values.categoryPriorities.join(', ') || 'None selected'],
      ],
    },
    {
      step: 3,
      title: 'Preferences',
      rows: [
        ['Style', values.style || 'Not specified'],
        ['Colour palette', values.colorPalette.join(', ') || 'Not specified'],
        ['Dietary', values.dietaryPreferences.join(', ') || 'None selected'],
        ['Cultural preferences', values.culturalPreferences || 'Not provided'],
        ['Accessibility', values.accessibilityRequirements || 'Not provided'],
        ['Must-have activities', values.mustHaveActivities.join(', ') || 'None'],
        ['Things to avoid', values.thingsToAvoid.join(', ') || 'None'],
      ],
    },
    {
      step: 4,
      title: 'Additional details',
      rows: [
        ['Duration', values.durationHours ? `${values.durationHours} hours` : 'Not specified'],
        ['Event days', values.eventDays ? String(values.eventDays) : 'Not specified'],
        ['Venue status', values.venueStatus || 'Not specified'],
        ['Planning priorities', values.planningPriorities.join(', ') || 'None selected'],
        ['Notes', values.notes || 'None'],
      ],
    },
  ];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-midnight">Review your event</h2>
        <p className="mt-0.5 text-sm text-slate">
          Check everything below. You can jump back to any step to make changes.
        </p>
      </div>
      {sections.map((section) => (
        <div key={section.title} className="rounded-xl border border-midnight/10 bg-ivory px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-midnight">{section.title}</h3>
            <Button variant="ghost" size="sm" type="button" onClick={() => onEdit(section.step)}>
              Edit
            </Button>
          </div>
          <dl className="mt-2 space-y-1.5 text-sm">
            {section.rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[10rem_1fr] gap-2">
                <dt className="text-slate">{label}</dt>
                <dd className="text-midnight-2">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}
