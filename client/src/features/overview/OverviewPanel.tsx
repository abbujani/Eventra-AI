import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Coins,
  ListChecks,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore.js';
import { useEvent, useEventBudget, useEventPlan, useEventProgress, useEventTimeline, useEventVendors } from '../../hooks/useEventData.js';
import { formatCurrency } from '../../lib/format.js';
import { formatDate, formatTimeInZone, relativeDeadline } from '../../lib/dates.js';
import { Badge, ProgressBar } from '../../components/ui/Feedback.js';
import { cn } from '../../lib/cn.js';

interface OverviewPanelProps {
  eventId: string;
  onNavigate: (tab: string) => void;
}

export function OverviewPanel({ eventId, onNavigate }: OverviewPanelProps) {
  const { state } = useAppStore();
  const event = useEvent(eventId);
  const budget = useEventBudget(eventId);
  const progress = useEventProgress(eventId);
  const plan = useEventPlan(eventId);
  const vendors = useEventVendors(eventId);
  const { sorted } = useEventTimeline(eventId);

  if (!event) return null;

  const upcomingTasks = state.tasks
    .filter((task) => task.eventId === eventId && !task.completed && task.dueDate)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 4);

  const bookedVendors = vendors.filter((vendor) => vendor.status === 'booked').length;

  return (
    <div className="space-y-6">
      <section className="card px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-midnight">{event.title}</h2>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate">
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange className="h-4 w-4" aria-hidden="true" />
                {formatDate(event.startDate)}
                {event.endDate ? ` – ${formatDate(event.endDate)}` : ''}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {event.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" aria-hidden="true" />
                {event.guestCount} guests
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Coins className="h-4 w-4" aria-hidden="true" />
                {formatCurrency(event.totalBudget, event.currency)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{event.eventType}</Badge>
            <Badge tone="neutral">{event.venuePreference}</Badge>
            <Badge tone="neutral">{event.budgetFlexibility} budget</Badge>
          </div>
        </div>
        {event.description && <p className="mt-3 text-sm text-slate">{event.description}</p>}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key metrics">
        <Metric
          icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
          label="Checklist progress"
          value={`${progress.completed}/${progress.total} tasks`}
        >
          <ProgressBar value={progress.percent} />
        </Metric>
        <Metric
          icon={<Coins className="h-4 w-4" aria-hidden="true" />}
          label="Budget spent"
          value={formatCurrency(budget?.actualTotal ?? 0, event.currency)}
        >
          <ProgressBar
            value={budget?.utilizationPercent ?? 0}
            tone={
              (budget?.utilizationPercent ?? 0) > 100
                ? 'danger'
                : (budget?.utilizationPercent ?? 0) > 85
                  ? 'warning'
                  : 'default'
            }
          />
        </Metric>
        <Metric
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          label="Vendors booked"
          value={`${bookedVendors}/${vendors.length}`}
        />
        <Metric
          icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          label="AI plan"
          value={plan ? 'Generated' : 'Not generated'}
        />
      </section>

      {budget?.isOverBudget && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Over budget.</strong> You are{' '}
            {formatCurrency(budget.overrunAmount, event.currency)} over your planned total.
          </span>
        </div>
      )}

      {!plan && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-violet/30 bg-violet-soft/40 px-5 py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-midnight">Generate your AI event plan</p>
              <p className="text-xs text-slate">
                Get a theme, budget breakdown, timeline, vendor checklist and risk mitigations.
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate('plan')}>
            Open AI plan
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate">
            Upcoming deadlines
          </h3>
          {upcomingTasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-midnight/15 px-4 py-4 text-sm text-slate">
              No dated tasks yet. Add due dates to see them here.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="card px-4 py-2.5">
                  <p className="text-sm font-semibold text-midnight">{task.title}</p>
                  <p className="text-xs text-slate">{relativeDeadline(task.dueDate)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate">
            Day-of timeline
          </h3>
          {sorted.length === 0 ? (
            <p className="rounded-xl border border-dashed border-midnight/15 px-4 py-4 text-sm text-slate">
              No timeline items yet. Add run-of-show items in the Timeline tab.
            </p>
          ) : (
            <ul className="space-y-2">
              {sorted.slice(0, 5).map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <span className="w-20 shrink-0 font-mono text-xs font-semibold text-violet">
                    {formatTimeInZone(item.startDateTime, event.timezone)}
                  </span>
                  <span className={cn('text-midnight-2', item.completed && 'line-through opacity-70')}>
                    {item.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {event.notes && (
        <section className="card px-5 py-4">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-midnight-2">{event.notes}</p>
        </section>
      )}

      <p className="text-xs text-slate">
        Your data is stored in this browser only. See the{' '}
        <Link to="/" className="underline">
          privacy section
        </Link>{' '}
        for details.
      </p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card px-4 py-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate">
        <span className="text-violet">{icon}</span>
        {label}
      </p>
      <p className="mt-1.5 text-lg font-bold text-midnight">{value}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
