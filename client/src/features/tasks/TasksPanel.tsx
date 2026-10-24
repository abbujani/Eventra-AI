import { useMemo, useState, type FormEvent } from 'react';
import { Check, ListChecks, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore.js';
import { useEvent, useEventTasks } from '../../hooks/useEventData.js';
import { api } from '../../services/api.js';
import { formatDate, isOverdue, relativeDeadline, todayUtc } from '../../lib/dates.js';
import { generateId } from '../../lib/id.js';
import { getErrorMessage } from '../../lib/error.js';
import { Button } from '../../components/ui/Button.js';
import { ButtonSpinner, EmptyState } from '../../components/ui/Feedback.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { Modal } from '../../components/ui/Modal.js';
import { ConfirmDeleteDialog } from '../../components/ui/ConfirmDeleteDialog.js';
import { ErrorAlert } from '../../components/ui/ErrorAlert.js';
import type { Priority, Task, TaskSuggestion } from '../../types/index.js';
import { cn } from '../../lib/cn.js';

interface DraftTask {
  id?: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  dueDate: string;
}

const EMPTY_DRAFT: DraftTask = {
  title: '',
  description: '',
  category: 'General',
  priority: 'medium',
  dueDate: '',
};

type Filter = 'all' | 'pending' | 'completed';

export function TasksPanel({ eventId }: { eventId: string }) {
  const { dispatch } = useAppStore();
  const event = useEvent(eventId);
  const tasks = useEventTasks(eventId);

  const [filter, setFilter] = useState<Filter>('all');
  const [draft, setDraft] = useState<DraftTask>(EMPTY_DRAFT);
  const [editing, setEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    });
    if (filter === 'pending') return sorted.filter((task) => !task.completed);
    if (filter === 'completed') return sorted.filter((task) => task.completed);
    return sorted;
  }, [tasks, filter]);

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setEditing(false);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setDraft({
      id: task.id,
      title: task.title,
      description: task.description ?? '',
      category: task.category,
      priority: task.priority,
      dueDate: task.dueDate ?? '',
    });
    setEditing(true);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!draft.title.trim()) {
      setFormError('Enter a task title.');
      return;
    }
    const now = new Date().toISOString();
    if (editing && draft.id) {
      const existing = tasks.find((task) => task.id === draft.id);
      dispatch({
        type: 'UPDATE_TASK',
        task: {
          id: draft.id,
          eventId,
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          category: draft.category,
          priority: draft.priority,
          dueDate: draft.dueDate || undefined,
          completed: existing?.completed ?? false,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        },
      });
    } else {
      dispatch({
        type: 'ADD_TASK',
        task: {
          id: generateId('tsk'),
          eventId,
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          category: draft.category,
          priority: draft.priority,
          dueDate: draft.dueDate || undefined,
          completed: false,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
    setModalOpen(false);
  };

  const runSuggest = async () => {
    if (!event) return;
    setSuggesting(true);
    setSuggestError(null);
    setSuggestions(null);
    try {
      const response = await api.suggestTasks({
        eventTitle: event.title,
        eventType: event.eventType,
        guestCount: event.guestCount,
        startDate: event.startDate,
        timezone: event.timezone,
        categories: event.categoryPriorities,
        notes: event.notes,
      });
      setSuggestions(response.tasks);
    } catch (error) {
      setSuggestError(getErrorMessage(error, 'Could not generate task suggestions.'));
    } finally {
      setSuggesting(false);
    }
  };

  const applySuggestions = () => {
    if (!suggestions || suggestions.length === 0) return;
    const now = new Date().toISOString();
    const newTasks: Task[] = suggestions.map((suggestion) => ({
      id: generateId('tsk'),
      eventId,
      title: suggestion.title.slice(0, 200),
      description: suggestion.description?.slice(0, 1000) || undefined,
      category: suggestion.category.slice(0, 120),
      priority: suggestion.priority,
      completed: false,
      createdAt: now,
      updatedAt: now,
    }));
    dispatch({ type: 'ADD_TASKS', tasks: newTasks });
    setSuggestions(null);
  };

  if (!event) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ListChecks className="h-5 w-5 text-violet" aria-hidden="true" />
          Task checklist
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={runSuggest} disabled={suggesting}>
            {suggesting ? <ButtonSpinner /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            Suggest tasks
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add task
          </Button>
        </div>
      </div>

      {suggestError && <ErrorAlert message={suggestError} />}

      {suggestions && suggestions.length > 0 && (
        <section className="card border-violet/30 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-midnight">
              {suggestions.length} suggested task{suggestions.length === 1 ? '' : 's'}
            </h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSuggestions(null)}>
                Dismiss
              </Button>
              <Button size="sm" onClick={applySuggestions}>
                <Check className="h-4 w-4" aria-hidden="true" />
                Add to checklist
              </Button>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.title}-${index}`} className="text-sm text-midnight-2">
                <span className="font-semibold">{suggestion.title}</span>
                {suggestion.description && (
                  <span className="text-slate"> — {suggestion.description}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate">
            Suggestions are added only when you confirm. Review each task before keeping it.
          </p>
        </section>
      )}

      <div className="flex gap-1" role="group" aria-label="Filter tasks">
        {(['all', 'pending', 'completed'] as Filter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            aria-pressed={filter === option}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition-colors',
              filter === option ? 'bg-violet-soft text-violet-2' : 'text-slate hover:bg-midnight/5',
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-7 w-7" aria-hidden="true" />}
          title={filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
          description="Add tasks manually or let the AI suggest preparation tasks based on your event."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add task
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => {
            const overdue = !task.completed && isOverdue(task.dueDate);
            return (
              <li key={task.id} className={cn('card px-4 py-3', overdue && 'border-danger/25')}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onChange={() =>
                      dispatch({
                        type: 'UPDATE_TASK',
                        task: { ...task, completed: !task.completed },
                      })
                    }
                    className="mt-1 h-4 w-4 shrink-0 accent-violet"
                  />
                  <label htmlFor={`task-${task.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span
                      className={cn(
                        'block text-sm font-semibold text-midnight',
                        task.completed && 'line-through opacity-70',
                      )}
                    >
                      {task.title}
                    </span>
                    {task.description && (
                      <span className="mt-0.5 block text-xs text-slate">{task.description}</span>
                    )}
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-midnight/5 px-2 py-0.5 text-slate">
                        {task.category}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 font-medium',
                          task.priority === 'high'
                            ? 'bg-danger-soft text-danger'
                            : task.priority === 'medium'
                              ? 'bg-warning-soft text-warning'
                              : 'bg-midnight/5 text-slate',
                        )}
                      >
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className={cn(overdue ? 'font-semibold text-danger' : 'text-slate')}>
                          {formatDate(task.dueDate)} · {relativeDeadline(task.dueDate)}
                        </span>
                      )}
                    </span>
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(task)}
                      aria-label={`Edit ${task.title}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setConfirmDelete(task)}
                      aria-label={`Delete ${task.title}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit task' : 'Add task'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorAlert message={formError} className="rounded-lg px-3 py-2" />}
          <Field label="Title" htmlFor="task-title" required>
            <Input
              id="task-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Confirm guest count with caterer"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="task-category" optional>
              <Input
                id="task-category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
            </Field>
            <Field label="Priority" htmlFor="task-priority" required>
              <Select
                id="task-priority"
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </Field>
          </div>
          <Field
            label="Due date"
            htmlFor="task-due"
            optional
            hint={`Today is ${formatDate(todayUtc())}.`}
          >
            <Input
              id="task-due"
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
            />
          </Field>
          <Field label="Description" htmlFor="task-description" optional>
            <Textarea
              id="task-description"
              rows={3}
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
              {editing ? 'Save changes' : 'Add task'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteDialog
        open={confirmDelete !== null}
        title="Delete task"
        itemName={confirmDelete?.title ?? null}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) dispatch({ type: 'DELETE_TASK', taskId: confirmDelete.id });
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
