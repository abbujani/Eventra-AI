import { Link } from 'react-router-dom';
import { ArrowRight, CalendarRange, MapPin, Users } from 'lucide-react';
import type { Event } from '../../types/index.js';
import { formatCurrency } from '../../lib/format.js';
import { formatDate } from '../../lib/dates.js';
import { Badge, ProgressBar } from '../../components/ui/Feedback.js';

interface EventCardProps {
  event: Event;
  taskPercent: number;
  taskTotal: number;
  budgetSummary: {
    actualTotal: number;
    remaining: number;
    utilizationPercent: number;
    isOverBudget: boolean;
  } | null;
}

export function EventCard({ event, taskPercent, taskTotal, budgetSummary }: EventCardProps) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="card group block px-5 py-5 transition-shadow hover:shadow-lift no-underline"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-midnight group-hover:text-violet-2">
            {event.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate">
            <span className="inline-flex items-center gap-1">
              <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(event.startDate)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {event.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {event.guestCount} guests
            </span>
          </div>
        </div>
        <Badge>{event.eventType}</Badge>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ProgressBar
          label={`Checklist · ${taskTotal} tasks`}
          value={taskPercent}
          tone={taskPercent === 100 && taskTotal > 0 ? 'success' : 'default'}
        />
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate">
            <span>Budget</span>
            <span className="font-semibold text-midnight-2">
              {budgetSummary
                ? formatCurrency(budgetSummary.actualTotal, event.currency)
                : formatCurrency(0, event.currency)}
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${budgetSummary ? Math.min(100, budgetSummary.utilizationPercent) : 0}%`,
              }}
            />
          </div>
          {budgetSummary?.isOverBudget && (
            <p className="mt-1 text-xs font-semibold text-danger">Over budget</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-1 text-sm font-semibold text-violet">
        Open workspace
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}
