import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Wand2,
  Wrench,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore.js';
import { useEvent, useEventPlan } from '../../hooks/useEventData.js';
import { useAiStatus } from '../../hooks/useAiStatus.js';
import { ApiError, api } from '../../services/api.js';
import { formatCompactCurrency, formatCurrency } from '../../lib/format.js';
import { combineDateAndTime } from '../../lib/dates.js';
import { generateId } from '../../lib/id.js';
import { Button } from '../../components/ui/Button.js';
import { Badge, EmptyState } from '../../components/ui/Feedback.js';
import { Modal } from '../../components/ui/Modal.js';
import { DonutChart } from '../../components/charts/Charts.js';
import { AiStatusNotice } from '../shared/AiStatusNotice.js';
import type { Expense, Task, TimelineItem } from '../../types/index.js';
import { cn } from '../../lib/cn.js';

export function PlanPanel({ eventId }: { eventId: string }) {
  const { state, dispatch } = useAppStore();
  const event = useEvent(eventId);
  const plan = useEventPlan(eventId);
  const aiStatus = useAiStatus();

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);
  const [appliedSummary, setAppliedSummary] = useState<string | null>(null);

  const generate = async () => {
    if (!event) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await api.generatePlan(event);
      // Record provenance with the plan so every rendering site can label the
      // result honestly ('ai' vs built-in 'local' templates).
      dispatch({ type: 'SET_PLAN', eventId, plan: { ...response.plan, source: response.source } });
      setAppliedSummary(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not generate a plan. Please try again.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const applyPlan = () => {
    if (!plan || !event) return;
    const now = new Date().toISOString();
    const planLabel =
      plan.source === 'local' ? 'Local plan' : plan.source === 'ai' ? 'AI plan' : 'Generated plan';

    // Dedupe against existing records so applying twice — or applying a
    // regenerated plan — never creates duplicate expenses, tasks or items.
    const existingExpenseTitles = new Set(
      state.expenses.filter((expense) => expense.eventId === eventId).map((expense) => expense.title),
    );
    const existingTaskTitles = new Set(
      state.tasks.filter((task) => task.eventId === eventId).map((task) => task.title),
    );
    const existingTimelineTitles = new Set(
      state.timelineItems.filter((item) => item.eventId === eventId).map((item) => item.title),
    );

    const expenses: Expense[] = [];
    let skipped = 0;
    for (const category of plan.budget.categories) {
      const title = `${category.name} (${planLabel})`;
      if (existingExpenseTitles.has(title)) {
        skipped += 1;
        continue;
      }
      expenses.push({
        id: generateId('exp'),
        eventId,
        title,
        category: category.name,
        estimatedAmount: category.estimatedAmount,
        currency: plan.budget.currency,
        paymentStatus: 'unpaid',
        notes: category.reasoning
          ? `Reasoning: ${category.reasoning}`
          : `Added from ${planLabel.toLowerCase()}`,
        createdAt: now,
        updatedAt: now,
      });
    }

    const tasks: Task[] = [];
    for (const task of plan.preparationTasks) {
      if (existingTaskTitles.has(task.title)) {
        skipped += 1;
        continue;
      }
      tasks.push({
        id: generateId('tsk'),
        eventId,
        title: task.title,
        description: task.description,
        category: planLabel,
        priority: task.priority,
        completed: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    const timelineItems: TimelineItem[] = [];
    for (const item of plan.timeline) {
      if (existingTimelineTitles.has(item.title)) {
        skipped += 1;
        continue;
      }
      timelineItems.push({
        id: generateId('tl'),
        eventId,
        title: item.title,
        description: item.description,
        // Plan times are wall-clock in the event's own timezone.
        startDateTime:
          combineDateAndTime(event.startDate, item.time, event.timezone) ??
          `${event.startDate}T09:00:00Z`,
        category: item.category,
        priority: 'medium',
        completed: false,
        createdAt: now,
      });
    }

    expenses.forEach((expense) => dispatch({ type: 'ADD_EXPENSE', expense }));
    if (tasks.length > 0) dispatch({ type: 'ADD_TASKS', tasks });
    if (timelineItems.length > 0) dispatch({ type: 'ADD_TIMELINE_ITEMS', items: timelineItems });

    const added = expenses.length + tasks.length + timelineItems.length;
    if (added > 0) {
      dispatch({
        type: 'LOG_ACTIVITY',
        eventId,
        activityType: 'plan-applied',
        message: `Applied the ${planLabel.toLowerCase()}: ${expenses.length} expenses, ${tasks.length} tasks, ${timelineItems.length} timeline items.`,
      });
    }
    setAppliedSummary(
      added === 0
        ? 'Everything in this plan is already in your workspace — nothing new to add.'
        : `Added ${expenses.length} expenses, ${tasks.length} tasks and ${timelineItems.length} timeline items.${
            skipped > 0 ? ` Skipped ${skipped} item${skipped === 1 ? '' : 's'} already in your workspace.` : ''
          }`,
    );
    setConfirmApply(false);
  };

  if (!event) return null;

  // Only treat a *resolved* health check as blocking: during 'loading' the
  // notice already shows a spinner, and panels must not flash an
  // "unavailable" message before the check completes.
  const aiBlocked = aiStatus.state === 'unconfigured' || aiStatus.state === 'unreachable';
  const isLocalPlan = plan?.source === 'local';
  // Plans saved before provenance tracking have no source — never claim "AI"
  // for something we cannot verify.
  const isAiPlan = plan?.source === 'ai';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-violet" aria-hidden="true" />
          AI event plan
        </h2>
        {plan && (
          <Button
            variant="dark"
            size="sm"
            onClick={() => setConfirmApply(true)}
            disabled={plan.budget.categories.length === 0}
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            Apply plan to workspace
          </Button>
        )}
      </div>

      <AiStatusNotice status={aiStatus} />

      {!plan && (aiStatus.state === 'ready' || aiStatus.state === 'local') && (
        <section className="card space-y-4 px-6 py-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-violet" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-semibold text-midnight">
              {aiStatus.state === 'local' ? 'Generate your local event plan' : 'Generate your event plan'}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate">
              {aiStatus.state === 'local'
                ? "Eventra's built-in template engine will produce a theme, budget breakdown, timeline, vendor checklist, menu ideas and risk mitigations from your saved event details. Connect a Gemini API key for AI-authored plans."
                : 'Eventra AI will produce a theme, a realistic budget breakdown, a timeline, a vendor checklist, menu ideas and risk mitigations based on your saved event details.'}
            </p>
          </div>
          {error && (
            <div
              role="alert"
              className="mx-auto flex max-w-md items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-left text-sm text-danger"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <Button size="lg" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {generating ? 'Generating plan…' : 'Generate plan'}
          </Button>
          <p className="mx-auto max-w-md text-xs text-slate">
            Generated budgets and timelines are illustrative estimates. Always confirm prices and
            availability directly with vendors before booking.
          </p>
        </section>
      )}

      {!plan && aiBlocked && (
        <EmptyState
          icon={<Sparkles className="h-7 w-7" aria-hidden="true" />}
          title={aiStatus.state === 'unreachable' ? 'Cannot reach the server' : 'Plan generation is unavailable'}
          description={
            aiStatus.state === 'unreachable'
              ? 'The Eventra API server is not responding. Check that it is running, then retry from the banner above. You can still plan manually using the budget, timeline, task and vendor tabs.'
              : 'No planning engine is configured on the server. You can still plan manually using the budget, timeline, task and vendor tabs.'
          }
        />
      )}

      {plan && (
        <div className="space-y-6">
          {generating && (
            <p className="flex items-center gap-2 text-sm text-slate" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Refreshing your plan…
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {error}
            </div>
          )}
          {appliedSummary && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{appliedSummary}</span>
            </div>
          )}

          <section className="card px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-midnight">{plan.eventOverview.title}</h3>
                <p className="mt-1 text-sm text-slate">{plan.eventOverview.summary}</p>
              </div>
              <Badge tone={isAiPlan ? 'success' : 'neutral'}>
                {isLocalPlan ? (
                  <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isLocalPlan ? 'Local templates' : isAiPlan ? 'AI generated' : 'Generated'}
              </Badge>
            </div>
            {plan.eventOverview.planningAssumptions.length > 0 && (
              <div className="mt-3 rounded-xl border border-midnight/10 bg-ivory px-4 py-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate">
                  Planning assumptions
                </h4>
                <ul className="mt-1.5 space-y-1 text-sm text-midnight-2">
                  {plan.eventOverview.planningAssumptions.map((assumption) => (
                    <li key={assumption} className="flex gap-2">
                      <span className="text-violet" aria-hidden="true">•</span>
                      {assumption}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={generate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                Regenerate
              </Button>
            </div>
          </section>

          <section className="card px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">Theme</h3>
            <p className="text-base font-semibold text-midnight">{plan.theme.name}</p>
            <p className="mt-1 text-sm text-slate">{plan.theme.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.theme.colors.map((color) => (
                <span
                  key={color}
                  className="flex items-center gap-2 rounded-full border border-midnight/10 px-2.5 py-1 text-xs"
                >
                  <span
                    className="h-4 w-4 rounded-full border border-midnight/10"
                    style={{ backgroundColor: /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#EEE9FF' }}
                    aria-hidden="true"
                  />
                  {color}
                </span>
              ))}
            </div>
            {plan.theme.decorationIdeas.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-midnight-2">
                {plan.theme.decorationIdeas.map((idea) => (
                  <li key={idea} className="flex gap-2">
                    <span className="text-violet" aria-hidden="true">•</span>
                    {idea}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
              {isAiPlan ? 'AI budget breakdown' : 'Budget breakdown'}
            </h3>
            {plan.budget.isOverBudget && (
              <div
                role="alert"
                className="mb-3 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">Over budget.</strong> The estimated total exceeds
                  your budget by {formatCurrency(plan.budget.overrunAmount, plan.budget.currency)}.
                </span>
              </div>
            )}
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-midnight/10 px-3 py-2">
                <dt className="text-slate">Your budget</dt>
                <dd className="mt-0.5 font-semibold text-midnight">
                  {formatCurrency(plan.budget.totalBudget, plan.budget.currency)}
                </dd>
              </div>
              <div className="rounded-xl border border-midnight/10 px-3 py-2">
                <dt className="text-slate">Estimated total</dt>
                <dd className="mt-0.5 font-semibold text-midnight">
                  {formatCurrency(plan.budget.computedCategoriesTotal, plan.budget.currency)}
                </dd>
              </div>
              <div className="rounded-xl border border-midnight/10 px-3 py-2">
                <dt className="text-slate">With contingency</dt>
                <dd className="mt-0.5 font-semibold text-midnight">
                  {formatCurrency(plan.budget.computedGrandTotal, plan.budget.currency)}
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <DonutChart
                data={plan.budget.categories.map((category) => ({
                  name: category.name,
                  value: category.estimatedAmount,
                }))}
                centerLabel="estimated"
                centerValue={formatCompactCurrency(
                  plan.budget.computedCategoriesTotal,
                  plan.budget.currency,
                )}
              />
            </div>

            <ul className="mt-4 space-y-2">
              {plan.budget.categories.map((category) => (
                <li key={category.name} className="rounded-xl border border-midnight/10 px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-midnight">{category.name}</span>
                    <span className="text-right">
                      <span className="font-semibold text-midnight">
                        {formatCurrency(category.estimatedAmount, plan.budget.currency)}
                      </span>
                      <span className="ml-2 text-slate">{category.percentage.toFixed(1)}%</span>
                    </span>
                  </div>
                  {category.reasoning && (
                    <p className="mt-1 text-xs text-slate">{category.reasoning}</p>
                  )}
                </li>
              ))}
            </ul>

            {plan.budget.largestCostDrivers.length > 0 && (
              <p className="mt-3 text-xs text-slate">
                Largest cost drivers: {plan.budget.largestCostDrivers.join(', ')}.
              </p>
            )}

            {plan.budget.savingTips.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate">
                  Saving tips
                </h4>
                <ul className="space-y-1 text-sm text-midnight-2">
                  {plan.budget.savingTips.map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <span className="text-violet" aria-hidden="true">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="card px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
              Timeline
            </h3>
            <ul className="space-y-2">
              {plan.timeline.map((item, index) => (
                <li key={`${item.time}-${index}`} className="flex gap-3 text-sm">
                  <span className="w-16 shrink-0 font-mono text-xs font-semibold text-violet">
                    {item.time}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-midnight">{item.title}</span>
                    {item.description && <span className="block text-xs text-slate">{item.description}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
              Vendor checklist
            </h3>
            <div className="space-y-3">
              {plan.vendorChecklist.map((entry) => (
                <div key={entry.category} className="rounded-xl border border-midnight/10 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-midnight">{entry.category}</span>
                    <Badge tone={entry.priority === 'high' ? 'danger' : 'neutral'}>
                      {entry.priority}
                    </Badge>
                    {entry.suggestedBookingWindow && (
                      <Badge tone="neutral">{entry.suggestedBookingWindow}</Badge>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-midnight-2">
                    {entry.tasks.map((task) => (
                      <li key={task} className="flex gap-2">
                        <span className="text-violet" aria-hidden="true">•</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate">
              These are evaluation criteria and preparation steps — not vendor listings. Eventra AI
              does not fabricate vendor names, prices or availability.
            </p>
          </section>

          {plan.menuIdeas.length > 0 && (
            <section className="card px-5 py-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate">
                Menu ideas
              </h3>
              <ul className="space-y-1 text-sm text-midnight-2">
                {plan.menuIdeas.map((idea) => (
                  <li key={idea} className="flex gap-2">
                    <span className="text-violet" aria-hidden="true">•</span>
                    {idea}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.guestExperienceIdeas.length > 0 && (
            <section className="card px-5 py-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate">
                Guest experience ideas
              </h3>
              <ul className="space-y-1 text-sm text-midnight-2">
                {plan.guestExperienceIdeas.map((idea) => (
                  <li key={idea} className="flex gap-2">
                    <span className="text-violet" aria-hidden="true">•</span>
                    {idea}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.entertainmentRecommendations.length > 0 && (
            <section className="card px-5 py-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate">
                Entertainment recommendations
              </h3>
              <ul className="space-y-1 text-sm text-midnight-2">
                {plan.entertainmentRecommendations.map((idea) => (
                  <li key={idea} className="flex gap-2">
                    <span className="text-violet" aria-hidden="true">•</span>
                    {idea}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
              Preparation tasks
            </h3>
            <ul className="space-y-2">
              {plan.preparationTasks.map((task) => (
                <li key={task.title} className="rounded-xl border border-midnight/10 px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-midnight">{task.title}</span>
                    <Badge tone={task.priority === 'high' ? 'danger' : 'neutral'}>
                      {task.priority}
                    </Badge>
                    {task.relativeDeadline && (
                      <Badge tone="neutral">{task.relativeDeadline}</Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-1 text-xs text-slate">{task.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="card px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
              Risk mitigation plan
            </h3>
            <ul className="space-y-2">
              {plan.risks.map((risk) => (
                <li key={risk.title} className="rounded-xl border border-midnight/10 px-4 py-2.5">
                  <p className="text-sm font-semibold text-midnight">{risk.title}</p>
                  <p className="mt-0.5 text-xs text-slate">{risk.mitigation}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card px-5 py-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate">
              Recommended next actions
            </h3>
            <ol className="space-y-1.5 text-sm text-midnight-2">
              {plan.nextActions.map((action, index) => (
                <li key={action} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet text-[0.7rem] font-bold text-white">
                    {index + 1}
                  </span>
                  {action}
                </li>
              ))}
            </ol>
          </section>

          <p className="rounded-xl border border-midnight/10 bg-ivory px-4 py-3 text-xs text-slate">
            {isLocalPlan
              ? 'This plan was produced by Eventra’s built-in template engine from your event details — not by an AI model. '
              : isAiPlan
                ? 'This plan was generated by AI and validated structurally. '
                : 'This plan was generated from your event details. '}
            Budget figures and timelines are illustrative estimates, not verified quotes. Confirm
            all costs and availability with vendors before booking.
          </p>
        </div>
      )}

      <Modal
        open={confirmApply}
        onClose={() => setConfirmApply(false)}
        title="Apply plan to workspace"
        description={`This adds items from the ${plan?.source === 'local' ? 'local template plan' : plan?.source === 'ai' ? 'AI-generated plan' : 'generated plan'} to your saved data. Items already in your workspace are skipped.`}
      >
        <div className="space-y-3 text-sm text-midnight-2">
          {plan && event && plan.budget.currency !== event.currency && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                This plan is denominated in {plan.budget.currency} but your event budget uses{' '}
                {event.currency}. Mixing currencies would corrupt your budget totals, so applying
                is blocked. Regenerate the plan or update your event currency first.
              </span>
            </div>
          )}
          <p>Applying this plan will create:</p>
          <ul className="space-y-1.5 rounded-xl border border-midnight/10 bg-ivory px-4 py-3">
            <li>
              <strong>{plan?.budget.categories.length}</strong> estimated expenses (budget tab)
            </li>
            <li>
              <strong>{plan?.preparationTasks.length}</strong> preparation tasks (tasks tab)
            </li>
            <li>
              <strong>{plan?.timeline.length}</strong> timeline items (timeline tab)
            </li>
          </ul>
          <p className="text-xs text-slate">
            Nothing is removed. Existing records are kept, duplicates are skipped, and you can
            delete anything the plan adds. Review each item after applying.
          </p>
        </div>
        <div className={cn('mt-5 flex justify-end gap-2')}>
          <Button variant="secondary" onClick={() => setConfirmApply(false)}>
            Cancel
          </Button>
          <Button
            onClick={applyPlan}
            disabled={Boolean(plan && event && plan.budget.currency !== event.currency)}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Apply plan
          </Button>
        </div>
      </Modal>
    </div>
  );
}
