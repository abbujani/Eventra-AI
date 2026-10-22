import { useMemo } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { useEvent, useEventBudget, useEventExpenses, useEventPlan, useEventTasks, useEventTimeline, useEventVendors } from '../../hooks/useEventData.js';
import { formatCurrency } from '../../lib/format.js';
import { formatDate, formatDateTimeInZone } from '../../lib/dates.js';
import { Button } from '../../components/ui/Button.js';
import { DonutChart } from '../../components/charts/Charts.js';
import { EmptyState } from '../../components/ui/Feedback.js';

export function ReportPanel({ eventId }: { eventId: string }) {
  const event = useEvent(eventId);
  const budget = useEventBudget(eventId);
  const expenses = useEventExpenses(eventId);
  const tasks = useEventTasks(eventId);
  const { sorted } = useEventTimeline(eventId);
  const vendors = useEventVendors(eventId);
  const plan = useEventPlan(eventId);

  const completedTasks = useMemo(() => tasks.filter((task) => task.completed), [tasks]);

  const exportJson = () => {
    if (!event) return;
    const report = {
      generatedAt: new Date().toISOString(),
      event,
      budget,
      expenses,
      tasks,
      timeline: sorted,
      vendors,
      plan,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!event || !budget) return null;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-violet" aria-hidden="true" />
          Event report
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportJson}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export JSON
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <div className="print-full card px-6 py-6">
        <header className="border-b border-midnight/10 pb-4">
          <h1 className="text-2xl font-bold text-midnight">{event.title}</h1>
          <p className="mt-1 text-sm text-slate">
            {event.eventType} · {formatDate(event.startDate)}
            {event.endDate ? ` – ${formatDate(event.endDate)}` : ''} · {event.location} ·{' '}
            {event.guestCount} guests · {event.timezone}
          </p>
          <p className="mt-1 text-xs text-slate">Generated {formatDate(new Date().toISOString().slice(0, 10))}</p>
        </header>

        <section className="mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">Budget summary</h2>
          <dl className="mt-2 grid gap-3 sm:grid-cols-4">
            <ReportStat label="Total budget" value={formatCurrency(budget.totalBudget, budget.currency)} />
            <ReportStat label="Estimated" value={formatCurrency(budget.estimatedTotal, budget.currency)} />
            <ReportStat label="Actual spent" value={formatCurrency(budget.actualTotal, budget.currency)} />
            <ReportStat
              label="Remaining"
              value={formatCurrency(budget.remaining, budget.currency)}
              danger={budget.remaining < 0}
            />
          </dl>
          {budget.categories.length > 0 && (
            <div className="mt-4">
              <DonutChart
                data={budget.categories.map((category) => ({
                  name: category.name,
                  value: category.actual > 0 ? category.actual : category.estimated,
                }))}
                centerLabel="total"
                centerValue={String(Math.round(budget.actualTotal || budget.estimatedTotal))}
              />
              <table className="mt-4 w-full text-sm">
                <caption className="sr-only">Budget by category</caption>
                <thead>
                  <tr className="border-b border-midnight/10 text-left">
                    <th scope="col" className="py-1.5 font-semibold">Category</th>
                    <th scope="col" className="py-1.5 text-right font-semibold">Estimated</th>
                    <th scope="col" className="py-1.5 text-right font-semibold">Actual</th>
                    <th scope="col" className="py-1.5 text-right font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.categories.map((category) => (
                    <tr key={category.name} className="border-b border-midnight/5">
                      <th scope="row" className="py-1.5 text-left font-medium">{category.name}</th>
                      <td className="py-1.5 text-right">{formatCurrency(category.estimated, budget.currency)}</td>
                      <td className="py-1.5 text-right">{formatCurrency(category.actual, budget.currency)}</td>
                      <td className="py-1.5 text-right">{category.percentOfBudget.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {sorted.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">Timeline</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {sorted.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="w-44 shrink-0 text-slate">
                    {formatDateTimeInZone(item.startDateTime, event.timezone)}
                  </span>
                  <span className="text-midnight-2">
                    {item.title}
                    {item.completed && ' (done)'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tasks.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
              Checklist ({completedTasks.length}/{tasks.length} complete)
            </h2>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex gap-2">
                  <span aria-hidden="true">{task.completed ? '☑' : '☐'}</span>
                  <span className={task.completed ? 'text-slate line-through' : 'text-midnight-2'}>
                    {task.title}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {vendors.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">Vendors</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {vendors.map((vendor) => (
                <li key={vendor.id} className="flex flex-wrap gap-2">
                  <span className="font-medium text-midnight-2">{vendor.name}</span>
                  <span className="text-slate">({vendor.category} · {vendor.status})</span>
                  {vendor.quotedAmount !== undefined && (
                    <span className="text-slate">
                      — {formatCurrency(vendor.quotedAmount, vendor.currency)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {plan && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">AI plan highlights</h2>
            <p className="mt-1 text-sm text-midnight-2">
              <span className="font-semibold">Theme:</span> {plan.theme.name} — {plan.theme.description}
            </p>
            {plan.risks.length > 0 && (
              <>
                <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate">Risks</h3>
                <ul className="mt-1 space-y-1 text-sm text-midnight-2">
                  {plan.risks.map((risk) => (
                    <li key={risk.title}>
                      <span className="font-medium">{risk.title}:</span> {risk.mitigation}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {plan.nextActions.length > 0 && (
              <>
                <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate">Next actions</h3>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-midnight-2">
                  {plan.nextActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ol>
              </>
            )}
          </section>
        )}

        <footer className="mt-6 border-t border-midnight/10 pt-3 text-xs text-slate">
          <p>
            Prepared with Eventra AI — {expenses.length} expenses · {tasks.length} tasks ·{' '}
            {vendors.length} vendors tracked.
          </p>
          <p className="mt-1">
            Generated budgets and schedules are illustrative estimates, not verified quotes. Always
            confirm prices and availability with vendors before booking.
          </p>
        </footer>
      </div>

      {tasks.length === 0 && expenses.length === 0 && sorted.length === 0 && (
        <EmptyState
          title="Nothing to report yet"
          description="Add expenses, tasks or timeline items and this report will build itself automatically."
        />
      )}
    </div>
  );
}

function ReportStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-slate">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${danger ? 'text-danger' : 'text-midnight'}`}>{value}</dd>
    </div>
  );
}
