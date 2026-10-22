import { useMemo, useState } from 'react';
import { Check, Palette, Plus, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore.js';
import { useEvent } from '../../hooks/useEventData.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input } from '../../components/ui/Field.js';
import type { EventType } from '../../types/index.js';

/** Deterministic, client-side palette suggestions — no AI required. */
const PALETTE_IDEAS: Record<EventType, string[][]> = {
  wedding: [
    ['#7657E8', '#F5A7B8', '#FFFDF8'],
    ['#B08968', '#E6CCB2', '#FFFDF8'],
    ['#20876A', '#E4F4EE', '#FFFDF8'],
  ],
  engagement: [
    ['#F5A7B8', '#7657E8', '#FFFDF8'],
    ['#E8A33D', '#7657E8', '#FFFDF8'],
  ],
  birthday: [
    ['#7657E8', '#E8A33D', '#F5A7B8'],
    ['#4A7BE8', '#20876A', '#FFFDF8'],
  ],
  anniversary: [
    ['#B057E8', '#F5A7B8', '#FFFDF8'],
    ['#C0392B', '#E8A33D', '#FFFDF8'],
  ],
  'baby-shower': [
    ['#A8D8EA', '#FFFDF8', '#F5A7B8'],
    ['#EEE9FF', '#7657E8', '#FFFDF8'],
  ],
  festival: [
    ['#E86A57', '#E8A33D', '#20876A'],
    ['#F5A7B8', '#7657E8', '#20876A'],
  ],
  community: [
    ['#20876A', '#4A7BE8', '#FFFDF8'],
    ['#7657E8', '#E8A33D', '#FFFDF8'],
  ],
  corporate: [
    ['#17152B', '#7657E8', '#FFFDF8'],
    ['#4A7BE8', '#74748A', '#FFFDF8'],
  ],
  other: [
    ['#7657E8', '#F5A7B8', '#FFFDF8'],
    ['#20876A', '#E8A33D', '#FFFDF8'],
  ],
};

const DECORATION_PROMPTS: Record<EventType, string[]> = {
  wedding: [
    'Marigold floral arches with brass lanterns',
    'Draped fabric canopy with fairy lights',
    'Traditional welcome installation with the couple’s names',
  ],
  engagement: [
    'Ring-themed photo backdrop',
    'Soft floral centrepieces with candlelight',
  ],
  birthday: [
    'Balloon garland in your palette colours',
    'Photo wall with milestone memories',
  ],
  anniversary: [
    'Timeline display of your years together',
    'Candlelit table runner with fresh petals',
  ],
  'baby-shower': [
    'Soft balloon cloud in pastel palette',
    'Guest wish-card display',
  ],
  festival: [
    'Rangoli or themed floor art at the entrance',
    'Traditional lantern and light installation',
  ],
  community: [
    'Branded welcome banner in palette colours',
    'Signage wayfinding for each zone',
  ],
  corporate: [
    'Stage backdrop with logo in brand colours',
    'Registration desk with matching signage',
  ],
  other: [
    'Welcome signage in your palette colours',
    'Centrepieces using your chosen textures',
  ],
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function ThemeStudio({ eventId }: { eventId: string }) {
  const { dispatch } = useAppStore();
  const event = useEvent(eventId);

  const [style, setStyle] = useState(event?.style ?? '');
  const [palette, setPalette] = useState<string[]>(event?.colorPalette ?? []);
  const [draftColor, setDraftColor] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const ideas = useMemo(
    () => PALETTE_IDEAS[event?.eventType ?? 'other'],
    [event?.eventType],
  );
  const prompts = DECORATION_PROMPTS[event?.eventType ?? 'other'];

  if (!event) return null;

  const applyIdea = (colors: string[]) => {
    setPalette(colors);
    setSaved(false);
  };

  const addColor = () => {
    // Only well-formed hex colours enter the palette — free text would render
    // as an invisible/invalid swatch downstream.
    const value = draftColor.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(value)) {
      setDraftError('Enter a 6-digit hex colour like #7657E8.');
      return;
    }
    const normalized = value.startsWith('#') ? value : `#${value}`;
    // Dedupe case-insensitively (#ABC and #abc are the same colour).
    if (palette.some((color) => color.toLowerCase() === normalized.toLowerCase())) {
      setDraftError('That colour is already in your palette.');
      return;
    }
    if (palette.length >= 8) {
      setDraftError('A palette can hold at most 8 colours.');
      return;
    }
    setDraftError(null);
    setPalette([...palette, normalized]);
    setDraftColor('');
    setSaved(false);
  };

  const save = () => {
    dispatch({
      type: 'UPDATE_EVENT',
      event: {
        ...event,
        style: style.trim() || undefined,
        colorPalette: palette,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Palette className="h-5 w-5 text-violet" aria-hidden="true" />
        Theme studio
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4 px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate">Event style</h3>
          <Field label="Style description" htmlFor="theme-style" optional>
            <Input
              id="theme-style"
              value={style}
              onChange={(e) => {
                setStyle(e.target.value);
                setSaved(false);
              }}
              placeholder="e.g. Traditional Rajasthani with modern touches"
            />
          </Field>

          <fieldset>
            <legend className="label">Colour palette</legend>
            <div className="flex flex-wrap gap-2">
              {palette.map((color) => (
                <span
                  key={color}
                  className="flex items-center gap-2 rounded-full border border-midnight/10 px-2.5 py-1.5 text-xs"
                >
                  <span
                    className="h-5 w-5 rounded-full border border-midnight/10"
                    style={{ backgroundColor: HEX.test(color) ? color : '#EEE9FF' }}
                    aria-hidden="true"
                  />
                  <span className="text-midnight-2">{color}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPalette(palette.filter((entry) => entry !== color));
                      setSaved(false);
                    }}
                    aria-label={`Remove ${color}`}
                    className="rounded-full p-0.5 hover:bg-midnight/10"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                id="theme-color"
                type="color"
                value={HEX.test(draftColor) ? draftColor : '#7657E8'}
                onChange={(e) => setDraftColor(e.target.value)}
                aria-label="Pick a colour"
                className="h-9 w-12 cursor-pointer rounded border border-midnight/15 bg-white"
              />
              <Input
                id="theme-color-hex"
                value={draftColor}
                onChange={(e) => {
                  setDraftColor(e.target.value);
                  if (draftError) setDraftError(null);
                }}
                placeholder="#7657E8"
                className="w-36"
                aria-label="Colour hex value"
                aria-invalid={draftError ? true : undefined}
                aria-describedby={draftError ? 'theme-color-error' : undefined}
              />
              <Button variant="secondary" size="sm" onClick={addColor}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </div>
            {draftError && (
              <p id="theme-color-error" role="alert" className="mt-2 text-xs text-danger">
                {draftError}
              </p>
            )}
          </fieldset>

          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate">
              Palette ideas
            </h4>
            <div className="flex flex-wrap gap-2">
              {ideas.map((colors, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => applyIdea(colors)}
                  className="flex items-center gap-1.5 rounded-full border border-midnight/15 bg-white px-2.5 py-1.5 transition-colors hover:border-violet"
                  aria-label={`Apply palette idea ${index + 1}`}
                >
                  {colors.map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-full border border-midnight/10"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                  ))}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate">
              Suggestions are deterministic and generated on your device — no AI call needed.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={save}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Save theme
            </Button>
            {saved && (
              <span className="text-sm font-medium text-success" role="status">
                Theme saved
              </span>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate">Live preview</h3>
          <div
            className="card overflow-hidden p-0"
            style={{
              borderTop: `6px solid ${HEX.test(palette[0] ?? '') ? palette[0] : '#7657E8'}`,
            }}
          >
            <div className="px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                {event.title}
              </p>
              <p className="mt-1 font-display text-xl font-bold text-midnight">
                {style.trim() || 'Your event style'}
              </p>
              <div className="mt-3 flex gap-2">
                {(palette.length > 0 ? palette : ['#7657E8', '#F5A7B8', '#EEE9FF']).map((color) => (
                  <span
                    key={color}
                    className="h-10 w-10 rounded-xl border border-midnight/10"
                    style={{ backgroundColor: HEX.test(color) ? color : '#EEE9FF' }}
                    title={color}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm text-slate">
                {palette.length > 0
                  ? `Palette: ${palette.join(', ')}`
                  : 'Add colours to see your palette here.'}
              </p>
            </div>
          </div>

          <div className="card px-5 py-4">
            <h4 className="mb-2 text-sm font-semibold text-midnight">Decoration prompts</h4>
            <ul className="space-y-1.5 text-sm text-midnight-2">
              {prompts.map((prompt) => (
                <li key={prompt} className="flex gap-2">
                  <span className="text-violet" aria-hidden="true">•</span>
                  {prompt}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate">
              Ideas to brief a decorator with — not vendor recommendations or quotes.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
