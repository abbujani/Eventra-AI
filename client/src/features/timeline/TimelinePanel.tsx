import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CalendarRange, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore.js';
import { useEvent, useEventTimeline } from '../../hooks/useEventData.js';
import {
  combineDateAndTime,
  dayKeyInZone,
  formatDate,
  formatDateTimeInZone,
  zonedWallClock,
} from '../../lib/dates.js';
import { overlapMessage } from '../../lib/timeline.js';
import { generateId } from '../../lib/id.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { Badge, EmptyState } from '../../components/ui/Feedback.js';
import { Modal } from '../../components/ui/Modal.js';
import type { Priority, TimelineItem } from '../../types/index.js';
import { cn } from '../../lib/cn.js';

interface DraftItem {
  id?: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  description: string;
  category: string;
  priority: Priority;
  completed: boolean;
}

const EMPTY_DRAFT: DraftItem = {
  title: '',
  date: '',
  time: '',
  endTime: '',
  description: '',
  category: 'General',
  priority: 'medium',
  completed: false,
};

export function TimelinePanel({ eventId }: { eventId: string }) {
  const { dispatch } = useAppStore();
  const event = useEvent(eventId);
  const { sorted, overlaps } = useEventTimeline(eventId);

  const [draft, setDraft] = useState<DraftItem>(EMPTY_DRAFT);
  const [editing, setEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TimelineItem | null>(null);

  const timeZone = event?.timezone ?? 'UTC';
  const overlapText = useMemo(() => overlapMessage(overlaps), [overlaps]);

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT, date: event?.startDate ?? '' });
    setEditing(false);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: TimelineItem) => {
    // Show the wall clock exactly as it reads in the event's timezone — the
    // same values the list displays — instead of a UTC/local hybrid.
    const start = zonedWallClock(item.startDateTime, timeZone);
    const end = item.endDateTime ? zonedWallClock(item.endDateTime, timeZone) : null;
    setDraft({
      id: item.id,
      title: item.title,
      date: start?.date ?? '',
      time: start?.time ?? '',
      endTime: end?.time ?? '',
      description: item.description ?? '',
      category: item.category ?? 'General',
      priority: item.priority,
      completed: item.completed,
    });
    setEditing(true);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!draft.title.trim()) {
      setFormError('Enter a title for this timeline item.');
      return;
    }
    if (!draft.time) {
      setFormError('A start time is required for every timeline item.');
      return;
    }
    const dateStr = draft.date || event?.startDate || '';
    // The entered times are wall-clock in the event's own timezone.
    const start = combineDateAndTime(dateStr, draft.time, timeZone);
    if (!start) {
      setFormError('Enter a valid date and time.');
      return;
    }
    let end = draft.endTime
      ? (combineDateAndTime(dateStr, draft.endTime, timeZone) ?? undefined)
      : undefined;

    // An end before the start means the item crosses midnight (23:00 → 01:00)
    // rather than being invalid — schedule it on the next day.
    if (end && end < start) {
      end = new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000).toISOString();
    }

    if (editing && draft.id) {
      dispatch({
        type: 'UPDATE_TIMELINE_ITEM',
        item: {
          id: draft.id,
          eventId,
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          startDateTime: start,
          endDateTime: end,
          category: draft.category,
          priority: draft.priority,
          completed: draft.completed,
          createdAt:
            sorted.find((item) => item.id === draft.id)?.createdAt ?? new Date().toISOString(),
        },
      });
    } else {
      dispatch({
        type: 'ADD_TIMELINE_ITEM',
        item: {
          id: generateId('tl'),
          eventId,
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          startDateTime: start,
          endDateTime: end,
          category: draft.category,
          priority: draft.priority,
          completed: false,
          createdAt: new Date().toISOString(),
        },
      });
    }
    setModalOpen(false);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const item of sorted) {
      // Group by the calendar day in the event's own timezone, matching the
      // dates shown on each row.
      const key = dayKeyInZone(item.startDateTime, timeZone);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [sorted, timeZone]);

  if (!event) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarRange className="h-5 w-5 text-violet" aria-hidden="true" />
          Timeline & schedule
        </h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add item
        </Button>
      </div>

      <p className="text-xs text-slate">
        Times are shown in the event timezone ({event.timezone}).
      </p>

      {overlaps.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Schedule conflict detected.</strong> {overlapText}
          </span>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="h-7 w-7" aria-hidden="true" />}
          title="No timeline items yet"
          description="Add run-of-show items, ceremonies and preparation milestones. Overlaps are flagged automatically."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add the first item
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <section key={day}>
              <h3 className="mb-2 text-sm font-semibold text-midnight">
                {formatDate(day)}
              </h3>
              <ol className="relative space-y-2 border-l-2 border-violet/20 pl-5">
                {items.map((item) => (
                  <li key={item.id} className="card relative px-4 py-3">
                    <span
                      className={cn(
                        'absolute -left-[1.6rem] top-5 h-3 w-3 rounded-full border-2 border-white',
                        item.completed ? 'bg-success' : 'bg-violet',
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-semibold text-midnight',
                              item.completed && 'line-through opacity-70',
                            )}
                          >
                            {item.title}
                          </span>
                          <Badge tone={item.priority === 'high' ? 'danger' : 'neutral'}>
                            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                          </Badge>
                          {item.category && <Badge tone="neutral">{item.category}</Badge>}
                        </div>
                        {item.description && (
                          <p className="mt-1 text-xs text-slate">{item.description}</p>
                        )}
                        <p className="mt-1 text-xs font-medium text-midnight-2">
                          {formatDateTimeInZone(item.startDateTime, timeZone)}
                          {item.endDateTime &&
                            ` – ${formatDateTimeInZone(item.endDateTime, timeZone)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            dispatch({
                              type: 'UPDATE_TIMELINE_ITEM',
                              item: { ...item, completed: !item.completed },
                            })
                          }
                          aria-label={
                            item.completed
                              ? `Mark ${item.title} as not done`
                              : `Mark ${item.title} as done`
                          }
                        >
                          <Check
                            className={cn('h-4 w-4', item.completed ? 'text-success' : 'text-slate')}
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(item)}
                          aria-label={`Edit ${item.title}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setConfirmDelete(item)}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit timeline item' : 'Add timeline item'}
        description="Times are displayed in the event timezone."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
          <Field label="Title" htmlFor="tl-title" required>
            <Input
              id="tl-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Sangeet ceremony"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" htmlFor="tl-date" required>
              <Input
                id="tl-date"
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </Field>
            <Field label="Start time" htmlFor="tl-time" required>
              <Input
                id="tl-time"
                type="time"
                value={draft.time}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              />
            </Field>
            <Field
              label="End time"
              htmlFor="tl-end"
              optional
              hint="Ends after midnight? Enter the next-day time."
            >
              <Input
                id="tl-end"
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="tl-category" optional>
              <Input
                id="tl-category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
            </Field>
            <Field label="Priority" htmlFor="tl-priority" required>
              <Select
                id="tl-priority"
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </Field>
          </div>
          <Field label="Description" htmlFor="tl-description" optional>
            <Textarea
              id="tl-description"
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Check className="h-4 w-4" aria-hidden="true" />
              {editing ? 'Save changes' : 'Add item'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete timeline item"
        size="sm"
      >
        <p className="text-sm text-midnight-2">
          Delete “{confirmDelete?.title}”? This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) {
                dispatch({ type: 'DELETE_TIMELINE_ITEM', itemId: confirmDelete.id });
              }
              setConfirmDelete(null);
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
