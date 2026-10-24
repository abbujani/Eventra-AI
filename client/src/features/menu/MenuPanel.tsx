import { useState, type FormEvent } from 'react';
import { AlertTriangle, ChefHat, Sparkles } from 'lucide-react';
import { useEvent } from '../../hooks/useEventData.js';
import { useAiStatus } from '../../hooks/useAiStatus.js';
import { api } from '../../services/api.js';
import { getErrorMessage } from '../../lib/error.js';
import { Button } from '../../components/ui/Button.js';
import { Badge, ButtonSpinner, EmptyState } from '../../components/ui/Feedback.js';
import { Field, Input, Textarea } from '../../components/ui/Field.js';
import { AiStatusNotice } from '../shared/AiStatusNotice.js';
import { SourceBadge } from '../../components/ui/SourceBadge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { ErrorAlert } from '../../components/ui/ErrorAlert.js';
import type { AiSource, MenuPlan } from '../../types/index.js';

const SEGMENT_OPTIONS = ['Welcome', 'Cocktails', 'Lunch', 'High tea', 'Dinner', 'Dessert', 'Snacks'];
const KIND_TONE: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  vegetarian: 'success',
  vegan: 'success',
  'non-vegetarian': 'danger',
  beverage: 'neutral',
  dessert: 'warning',
  snack: 'neutral',
  other: 'neutral',
};

export function MenuPanel({ eventId }: { eventId: string }) {
  const event = useEvent(eventId);
  const aiStatus = useAiStatus();

  const [guestCount, setGuestCount] = useState(String(event?.guestCount ?? 100));
  const [segments, setSegments] = useState<string[]>(['Dinner']);
  const [dietary, setDietary] = useState<string[]>(event?.dietaryPreferences ?? []);
  const [regional, setRegional] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuPlan | null>(null);
  const [source, setSource] = useState<AiSource | null>(null);

  const generate = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!event) return;
    const count = Number(guestCount);
    if (!Number.isFinite(count) || count < 1) {
      setError('Enter a valid guest count.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const response = await api.generateMenu({
        eventTitle: event.title,
        eventType: event.eventType,
        guestCount: count,
        segments: segments.length > 0 ? segments : ['Dinner'],
        dietaryPreferences: dietary,
        regionalPreference: regional.trim() || undefined,
        budgetHint: event.totalBudget,
        currency: event.currency,
        notes: notes.trim() || undefined,
      });
      setMenu(response.menu);
      setSource(response.source ?? null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not generate a menu.'));
    } finally {
      setGenerating(false);
    }
  };

  const menuText = menu
    ? [
        `${event?.title} — menu plan`,
        '',
        menu.summary,
        '',
        ...menu.segments.flatMap((segment) => [
          segment.name,
          ...segment.items.map((item) => `  • ${item.name} (${item.kind})${item.notes ? ` — ${item.notes}` : ''}`),
          '',
        ]),
        ...menu.dietaryNotes.map((note) => `Dietary: ${note}`),
        ...(menu.allergyWarning ? [`Warning: ${menu.allergyWarning}`] : []),
      ].join('\n')
    : '';

  if (!event) return null;
  // Only a *resolved* failure blocks the form — during 'loading' the notice
  // already shows a spinner and the panel must not flash "unavailable".
  const aiBlocked = aiStatus.state === 'unconfigured' || aiStatus.state === 'unreachable';

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <ChefHat className="h-5 w-5 text-violet" aria-hidden="true" />
        Menu planner
      </h2>

      <AiStatusNotice status={aiStatus} />

      {aiBlocked ? (
        <EmptyState
          icon={<ChefHat className="h-7 w-7" aria-hidden="true" />}
          title={
            aiStatus.state === 'unreachable'
              ? 'Cannot reach the server'
              : 'Menu generation is unavailable'
          }
          description={
            aiStatus.state === 'unreachable'
              ? 'The Eventra API server is not responding. Retry from the banner above once it is back.'
              : 'No planning engine is configured on the server, so menus cannot be generated.'
          }
        />
      ) : (
        <form onSubmit={generate} className="card space-y-4 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Guest count" htmlFor="menu-guests" required hint="Controls portion guidance">
              <Input
                id="menu-guests"
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
            </Field>
            <Field label="Regional preference" htmlFor="menu-regional" optional>
              <Input
                id="menu-regional"
                value={regional}
                onChange={(e) => setRegional(e.target.value)}
                placeholder="e.g. North Indian, Mediterranean"
              />
            </Field>
          </div>

          <fieldset>
            <legend className="label">Meal segments</legend>
            <div className="flex flex-wrap gap-2">
              {SEGMENT_OPTIONS.map((segment) => {
                const selected = segments.includes(segment);
                return (
                  <label
                    key={segment}
                    className={
                      selected
                        ? 'cursor-pointer rounded-full border border-violet bg-violet-soft px-3 py-1.5 text-sm font-medium text-violet-2'
                        : 'cursor-pointer rounded-full border border-midnight/15 bg-white px-3 py-1.5 text-sm font-medium text-midnight-2 hover:border-violet/40 focus-within:ring-2 focus-within:ring-violet/60'
                    }
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected}
                      onChange={() =>
                        setSegments(
                          selected
                            ? segments.filter((entry) => entry !== segment)
                            : [...segments, segment],
                        )
                      }
                    />
                    {segment}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Field
            label="Dietary preferences"
            htmlFor="menu-dietary"
            optional
            hint="Comma-separated. Prefilled from your event preferences."
          >
            <Input
              id="menu-dietary"
              value={dietary.join(', ')}
              onChange={(e) =>
                setDietary(
                  e.target.value
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean),
                )
              }
            />
          </Field>

          <Field label="Notes" htmlFor="menu-notes" optional>
            <Textarea
              id="menu-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Live counters, family favourites"
            />
          </Field>

          {error && <ErrorAlert message={error} className="rounded-lg px-3 py-2" />}

          <Button type="submit" disabled={generating}>
            {generating ? <ButtonSpinner /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {generating ? 'Generating menu…' : 'Generate menu'}
          </Button>
        </form>
      )}

      {menu && (
        <div className="space-y-4">
          <section className="card px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-midnight">Menu summary</h3>
                <p className="mt-1 text-sm text-slate">{menu.summary}</p>
              </div>
              <div className="flex items-center gap-2">
                <SourceBadge source={source} />
                <CopyButton text={menuText} label="Copy" copiedLabel="Copied" />
              </div>
            </div>
          </section>

          {menu.segments.map((segment) => (
            <section key={segment.name} className="card px-5 py-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate">
                {segment.name}
              </h3>
              {segment.items.length === 0 ? (
                <p className="text-sm text-slate">No items generated for this segment.</p>
              ) : (
                <ul className="space-y-1.5">
                  {segment.items.map((item, index) => (
                    <li key={`${item.name}-${index}`} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-midnight-2">{item.name}</span>
                      <Badge tone={KIND_TONE[item.kind] ?? 'neutral'}>{item.kind}</Badge>
                      {item.notes && <span className="text-xs text-slate">{item.notes}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {menu.dietaryNotes.length > 0 && (
            <section className="card border-success/25 bg-success-soft/40 px-5 py-4">
              <h3 className="mb-2 text-sm font-semibold text-success">Dietary notes</h3>
              <ul className="space-y-1 text-sm text-midnight-2">
                {menu.dietaryNotes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="text-success" aria-hidden="true">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {menu.allergyWarning && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-semibold">Allergy information.</strong> {menu.allergyWarning}
              </span>
            </div>
          )}

          {menu.budgetNotes && (
            <p className="rounded-xl border border-midnight/10 bg-ivory px-4 py-3 text-sm text-slate">
              {menu.budgetNotes}
            </p>
          )}

          <p className="text-xs text-slate">
            {source === 'local'
              ? 'Menu suggestions come from Eventra’s built-in template engine — not an AI model. '
              : source === 'ai'
                ? 'Menu suggestions are AI-generated estimates. '
                : 'Menu suggestions are estimates. '}
            Confirm final dishes, quantities, pricing and allergen handling directly with your
            caterer.
          </p>
        </div>
      )}
    </div>
  );
}
