import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarRange,
  Coins,
  ListChecks,
  Plus,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useAppStore } from '../store/appStore.js';
import { summarizeBudget } from '../lib/budget.js';
import { formatCurrency } from '../lib/format.js';
import { formatDate, relativeDeadline, todayUtc } from '../lib/dates.js';
import { ButtonLink } from '../components/ui/Button.js';
import { Badge, EmptyState, ProgressBar } from '../components/ui/Feedback.js';
import { EventCard } from '../features/events/EventCard.js';
import { cn } from '../lib/cn.js';

interface EventMetrics {
  taskPercent: number;
  taskTotal: number;
  pendingTasks: number;
  budgetSummary: ReturnType<typeof summarizeBudget> | null;
}

export function DashboardPage() {
  const { state } = useAppStore();
  const { events, tasks, expenses, activity, plans } = state;

  const metrics = useMemo(() => {
    const tasksByEvent = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const list = tasksByEvent.get(task.eventId);
      if (list) {
        list.push(task);
      } else {
        tasksByEvent.set(task.eventId, [task]);
      }
    }
    const expensesByEvent = new Map<string, typeof expenses>();
    for (const expense of expenses) {
      const list = expensesByEvent.get(expense.eventId);
      if (list) {
        list.push(expense);
      } else {
        expensesByEvent.set(expense.eventId, [expense]);
      }
    }
    const map = new Map<string, EventMetrics>();
    for (const event of events) {
      const eventTasks = tasksByEvent.get(event.id) ?? [];
      const total = eventTasks.length;
      let completed = 0;
      for (let i = 0; i < eventTasks.length; i += 1) {
        if (eventTasks[i].completed) completed += 1;
      }
      const eventExpenses = expensesByEvent.get(event.id) ?? [];
      map.set(event.id, {
        taskPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
        taskTotal: total,
        pendingTasks: total - completed,
        budgetSummary: summarizeBudget(event.totalBudget, event.currency, eventExpenses),
      });
    }
    return map;
  }, [events, tasks, expenses]);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.startDate.localeCompare(b.startDate)), [events]);

  const aggregate = useMemo(() => {
    // Never sum across currencies — a USD event plus an INR event would produce
    // a meaningless total. Group every figure by currency instead.
    const byCurrency = new Map<string, { budget: number; spent: number }>();
    for (const event of events) {
      const entry = byCurrency.get(event.currency) ?? { budget: 0, spent: 0 };
      entry.budget += event.totalBudget;
      byCurrency.set(event.currency, entry);
    }
    for (const expense of expenses) {
      if (typeof expense.actualAmount !== 'number' || !Number.isFinite(expense.actualAmount)) {
        continue;
      }
      const owner = events.find((candidate) => candidate.id === expense.eventId);
      const currency = owner?.currency ?? expense.currency;
      const entry = byCurrency.get(currency) ?? { budget: 0, spent: 0 };
      entry.spent += expense.actualAmount;
      byCurrency.set(currency, entry);
    }
    const rows = [...byCurrency.entries()].map(([currency, entry]) => ({
      currency,
      ...entry,
      remaining: entry.budget - entry.spent,
      utilization: entry.budget > 0 ? Math.round((entry.spent / entry.budget) * 100) : 0,
    }));
    return {
      eventCount: events.length,
      planCount: plans.length,
      rows,
    };
  }, [events, expenses, plans]);

  const multiCurrency = aggregate.rows.length > 1;

  const upcomingEvents = useMemo(
    () => sortedEvents.filter((event) => event.startDate >= todayUtc()).slice(0, 3),
    [sortedEvents],
  );

  const pendingTasks = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed)
        .slice()
        .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
        .slice(0, 5),
    [tasks],
  );

  const recentActivity = useMemo(() => activity.slice(0, 6), [activity]);

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Welcome to Eventra AI</h1>
            <p className="mt-1 text-slate">Your personalised planning dashboard.</p>
          </div>
          <ButtonLink to="/events/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create New Event
          </ButtonLink>
        </header>
        <EmptyState
          icon={<Sparkles className="h-8 w-8" aria-hidden="true" />}
          title="No events yet"
          description="Create your first event to unlock AI planning, budgeting, timelines, checklists, vendors and invitations."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Your events</h1>
          <p className="mt-1 text-slate">
            {aggregate.eventCount} event{aggregate.eventCount === 1 ? '' : 's'} · {aggregate.planCount}{' '}
            plan{aggregate.planCount === 1 ? '' : 's'} generated
          </p>
        </div>
        <ButtonLink to="/events/new">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create New Event
        </ButtonLink>
      </header>

      {multiCurrency && (
        <p className="text-xs text-slate">
          Totals are grouped by currency — amounts in different currencies are never added together.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Overview">
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate">
            <Wallet className="h-4 w-4" aria-hidden="true" /> Total budget
          </div>
          {aggregate.rows.length === 1 ? (
            <p className="mt-2 text-2xl font-bold text-midnight">
              {formatCurrency(aggregate.rows[0]!.budget, aggregate.rows[0]!.currency)}
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {aggregate.rows.map((row) => (
                <li key={row.currency} className="text-lg font-bold text-midnight">
                  {formatCurrency(row.budget, row.currency)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate">
            <Coins className="h-4 w-4" aria-hidden="true" /> Paid
          </div>
          {aggregate.rows.length === 1 ? (
            <>
              <p className="mt-2 text-2xl font-bold text-midnight">
                {formatCurrency(aggregate.rows[0]!.spent, aggregate.rows[0]!.currency)}
              </p>
              <p className="mt-1 text-xs text-slate">
                {formatCurrency(aggregate.rows[0]!.remaining, aggregate.rows[0]!.currency)} remaining
              </p>
            </>
          ) : (
            <ul className="mt-2 space-y-1">
              {aggregate.rows.map((row) => (
                <li key={row.currency} className="text-sm text-midnight-2">
                  <span className="font-bold text-midnight">
                    {formatCurrency(row.spent, row.currency)}
                  </span>{' '}
                  paid of {formatCurrency(row.budget, row.currency)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate">
            <ListChecks className="h-4 w-4" aria-hidden="true" /> Overall budget use
          </div>
          {aggregate.rows.map((row) => (
            <ProgressBar
              key={row.currency}
              className="mt-3"
              value={row.utilization}
              label={multiCurrency ? `Used (${row.currency})` : 'Budget used'}
              tone={row.utilization > 100 ? 'danger' : row.utilization > 85 ? 'warning' : 'default'}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Active events</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[...events]
              .sort((a, b) => a.startDate.localeCompare(b.startDate))
              .map((event) => {
                const eventMetrics = metrics.get(event.id);
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    taskPercent={eventMetrics?.taskPercent ?? 0}
                    taskTotal={eventMetrics?.taskTotal ?? 0}
                    budgetSummary={eventMetrics?.budgetSummary ?? null}
                  />
                );
              })}
          </div>

          <h2 className="pt-2 text-lg font-semibold">Quick AI tools</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <QuickTool
              title="AI event plan"
              body="Generate a full plan for any event."
              to="/events/new"
            />
            <QuickTool
              title="AI assistant"
              body="Ask questions inside an event workspace."
              to={`/events/${upcomingEvents[0]?.id ?? ''}`}
              disabled={!upcomingEvents[0]}
            />
            <QuickTool
              title="New event"
              body="Start a wedding, birthday or community event."
              to="/events/new"
            />
          </div>
        </div>

        <aside className="space-y-6">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarRange className="h-4 w-4 text-violet" aria-hidden="true" />
              Upcoming events
            </h2>
            <ul className="mt-3 space-y-2">
              {upcomingEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    to={`/events/${event.id}`}
                    className="card flex items-center justify-between gap-3 px-4 py-3 no-underline"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-midnight">
                        {event.title}
                      </span>
                      <span className="block text-xs text-slate">{formatDate(event.startDate)}</span>
                    </span>
                    <Badge>{event.eventType}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ListChecks className="h-4 w-4 text-violet" aria-hidden="true" />
              Pending tasks
            </h2>
            {pendingTasks.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-midnight/15 px-4 py-4 text-sm text-slate">
                Nothing pending. Great work.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pendingTasks.map((task) => {
                  const event = events.find((candidate) => candidate.id === task.eventId);
                  return (
                    <li
                      key={task.id}
                      className={cn(
                        'card px-4 py-3',
                        task.dueDate && task.dueDate < todayUtc()
                          ? 'border-danger/25'
                          : '',
                      )}
                    >
                      <Link to={`/events/${task.eventId}`} className="no-underline">
                        <span className="block truncate text-sm font-semibold text-midnight">
                          {task.title}
                        </span>
                        <span className="mt-1 flex items-center justify-between text-xs text-slate">
                          <span>{event?.title ?? 'Event'}</span>
                          <span className={cn(task.dueDate && task.dueDate < todayUtc() ? 'font-semibold text-danger' : '')}>
                            {relativeDeadline(task.dueDate)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Recent activity</h2>
            {recentActivity.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-midnight/15 px-4 py-4 text-sm text-slate">
                Activity will appear here as you plan.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet" aria-hidden="true" />
                    <span className="text-midnight-2">{entry.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <div className="text-right">
        <Link to="/" className="btn btn-ghost btn-sm no-underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

function QuickTool({
  title,
  body,
  to,
  disabled,
}: {
  title: string;
  body: string;
  to: string;
  disabled?: boolean;
}) {
  const className = cn(
    'card block px-4 py-4 no-underline transition-shadow hover:shadow-lift',
    disabled && 'opacity-50',
  );
  // A disabled <Link> would stay in the tab order and navigate on Enter —
  // render a non-interactive element instead.
  if (disabled) {
    return (
      <div className={cn(className, 'cursor-not-allowed')} aria-disabled="true">
        <span className="text-sm font-semibold text-midnight">{title}</span>
        <span className="mt-1 block text-xs text-slate">{body}</span>
      </div>
    );
  }
  return (
    <Link to={to} className={className}>
      <span className="text-sm font-semibold text-midnight">{title}</span>
      <span className="mt-1 block text-xs text-slate">{body}</span>
    </Link>
  );
}
