import { useState, type KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../../../lib/cn.js';
import { Field } from '../../../components/ui/Field.js';

interface ChipInputProps {
  id: string;
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  maxItems?: number;
}

export function ChipInput({
  id,
  label,
  value,
  onChange,
  placeholder = 'Add an item',
  hint,
  error,
  optional,
  maxItems = 12,
}: ChipInputProps) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const item = raw.trim();
    if (!item) return;
    if (value.some((entry) => entry.toLowerCase() === item.toLowerCase())) {
      setDraft('');
      return;
    }
    if (value.length >= maxItems) return;
    onChange([...value, item]);
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <Field label={label} htmlFor={id} optional={optional} hint={hint} error={error}>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((item) => (
          <span
            key={item}
            className="badge badge-neutral max-w-full items-center gap-1 py-1 pl-2.5 pr-1"
          >
            <span className="truncate">{item}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((entry) => entry !== item))}
              aria-label={`Remove ${item}`}
              className="rounded-full p-0.5 hover:bg-midnight/10"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : 'Add another'}
          aria-invalid={Boolean(error)}
          className="input min-w-[10rem] flex-1 py-2"
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => add(draft)}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add
        </button>
      </div>
    </Field>
  );
}

interface CheckboxGroupProps {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (values: string[]) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export function CheckboxGroup({
  id,
  label,
  options,
  value,
  onChange,
  hint,
  error,
  optional,
}: CheckboxGroupProps) {
  const toggle = (option: string) => {
    onChange(
      value.includes(option) ? value.filter((entry) => entry !== option) : [...value, option],
    );
  };

  return (
    <Field label={label} htmlFor={id} optional={optional} hint={hint} error={error}>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-label`}>
        {options.map((option) => {
          const checked = value.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                checked
                  ? 'border-violet bg-violet-soft text-violet-2'
                  : 'border-midnight/15 bg-white text-midnight-2 hover:border-violet/40',
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggle(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </Field>
  );
}

interface ColorPaletteInputProps {
  id: string;
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function ColorPaletteInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  optional,
}: ColorPaletteInputProps) {
  const [draft, setDraft] = useState('');

  /**
   * Commit the draft as one or more chips. Accepts comma or newline separated
   * values so pasting "#7657E8, #F5A7B8" adds both. Duplicates and invalid
   * entries are skipped; the 8-colour cap is respected.
   */
  const add = (raw: string) => {
    const items = raw
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    const next = [...value];
    let changed = false;

    for (const item of items) {
      if (!HEX.test(item) && item.length > 20) continue;
      if (next.includes(item)) continue;
      if (next.length >= 8) break;
      next.push(item);
      changed = true;
    }

    if (changed) onChange(next);
    setDraft('');
  };

  return (
    <Field
      label={label}
      htmlFor={id}
      optional={optional}
      hint={hint ?? 'Enter hex codes (e.g. #7657E8) or descriptive colour names.'}
      error={error}
    >
      <div className="flex flex-wrap items-center gap-3">
        {value.map((color) => (
          <span key={color} className="flex items-center gap-2 rounded-full border border-midnight/10 px-2.5 py-1.5">
            <span
              className="h-5 w-5 rounded-full border border-midnight/10"
              style={{ backgroundColor: HEX.test(color) ? color : 'transparent' }}
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-midnight-2">{color}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((entry) => entry !== color))}
              aria-label={`Remove ${color}`}
              className="rounded-full p-0.5 hover:bg-midnight/10"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <span className="flex items-center gap-2">
          <input
            id={id}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                // Read the live DOM value rather than the closure, so a draft
                // committed in the same tick is never missed.
                add(event.currentTarget.value);
              }
            }}
            // Commit on blur so moving to "Next" without pressing Enter (or
            // clicking Add) does not silently discard what was typed.
            onBlur={(event) => add(event.currentTarget.value)}
            placeholder="Add a colour"
            aria-invalid={Boolean(error)}
            className="input w-36 py-2"
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => add(draft)}>
            Add
          </button>
        </span>
      </div>
    </Field>
  );
}
