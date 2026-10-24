import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Download, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useAppStore } from '../../store/appStore.js';
import { useEvent, useEventBudget, useEventExpenses } from '../../hooks/useEventData.js';
import { chartData } from '../../lib/budget.js';
import { formatCurrency } from '../../lib/format.js';
import { formatDate } from '../../lib/dates.js';
import { generateId } from '../../lib/id.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { Badge, EmptyState, ProgressBar } from '../../components/ui/Feedback.js';
import { Modal } from '../../components/ui/Modal.js';
import { BarChart, DonutChart } from '../../components/charts/Charts.js';
import { ConfirmDeleteDialog } from '../../components/ui/ConfirmDeleteDialog.js';
import { ErrorAlert } from '../../components/ui/ErrorAlert.js';
import {
  DEFAULT_BUDGET_CATEGORIES,
  type Expense,
  type PaymentStatus,
} from '../../types/index.js';
import { cn } from '../../lib/cn.js';

const PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'partial', 'paid'];

interface DraftExpense {
  id?: string;
  title: string;
  category: string;
  vendor: string;
  estimatedAmount: string;
  actualAmount: string;
  paymentStatus: PaymentStatus;
  notes: string;
}

const EMPTY_DRAFT: DraftExpense = {
  title: '',
  category: 'Venue',
  vendor: '',
  estimatedAmount: '',
  actualAmount: '',
  paymentStatus: 'unpaid',
  notes: '',
};

export function BudgetPanel({ eventId }: { eventId: string }) {
  const { dispatch } = useAppStore();
  const event = useEvent(eventId);
  const expenses = useEventExpenses(eventId);
  const summary = useEventBudget(eventId);

  const [draft, setDraft] = useState<DraftExpense>(EMPTY_DRAFT);
  const [editing, setEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);

  const currency = event?.currency ?? 'INR';
  const donutData = useMemo(() => (summary ? chartData(summary) : []), [summary]);

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setEditing(false);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setDraft({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      vendor: expense.vendor ?? '',
      estimatedAmount: String(expense.estimatedAmount),
      actualAmount: expense.actualAmount !== undefined ? String(expense.actualAmount) : '',
      paymentStatus: expense.paymentStatus,
      notes: expense.notes ?? '',
    });
    setEditing(true);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    const estimated = Number(draft.estimatedAmount.replace(/[^0-9.]/g, ''));
    const actualRaw = draft.actualAmount.replace(/[^0-9.]/g, '');
    const actual = actualRaw === '' ? undefined : Number(actualRaw);

    if (!draft.title.trim()) {
      setFormError('Enter a title for this expense.');
      return;
    }
    if (!Number.isFinite(estimated) || estimated < 0) {
      setFormError('Estimated amount must be zero or a positive number.');
      return;
    }
    if (actual !== undefined && (!Number.isFinite(actual) || actual < 0)) {
      setFormError('Actual amount must be zero or a positive number.');
      return;
    }

    const now = new Date().toISOString();
    if (editing && draft.id) {
      const existing = expenses.find((expense) => expense.id === draft.id);
      const updated: Expense = {
        id: draft.id,
        eventId,
        title: draft.title.trim(),
        category: draft.category,
        vendor: draft.vendor.trim() || undefined,
        estimatedAmount: estimated,
        actualAmount: actual,
        currency,
        paymentStatus: draft.paymentStatus,
        notes: draft.notes.trim() || undefined,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      dispatch({ type: 'UPDATE_EXPENSE', expense: updated });
    } else {
      dispatch({
        type: 'ADD_EXPENSE',
        expense: {
          id: generateId('exp'),
          eventId,
          title: draft.title.trim(),
          category: draft.category,
          vendor: draft.vendor.trim() || undefined,
          estimatedAmount: estimated,
          actualAmount: actual,
          currency,
          paymentStatus: draft.paymentStatus,
          notes: draft.notes.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
    setModalOpen(false);
  };

  const exportCsv = () => {
    const header = ['Category', 'Item', 'Vendor', 'Estimated', 'Actual', 'Status', 'Notes'];
    const rows = expenses.map((expense) => [
      expense.category,
      expense.title,
      expense.vendor ?? '',
      String(expense.estimatedAmount),
      expense.actualAmount !== undefined ? String(expense.actualAmount) : '',
      expense.paymentStatus,
      expense.notes ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event?.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() ?? 'event'}-budget.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!event || !summary) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Wallet className="h-5 w-5 text-violet" aria-hidden="true" />
          Budget planner
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={expenses.length === 0}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add expense
          </Button>
        </div>
      </div>

      {summary.isOverBudget && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Over budget.</strong> You have spent{' '}
            {formatCurrency(summary.overrunAmount, currency)} beyond your planned total. Consider
            trimming the largest cost drivers below.
          </span>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Budget summary">
        <Stat label="Total budget" value={formatCurrency(summary.totalBudget, currency)} />
        <Stat label="Actual spent" value={formatCurrency(summary.actualTotal, currency)} />
        <Stat
          label="Remaining"
          value={formatCurrency(summary.remaining, currency)}
          tone={summary.remaining < 0 ? 'danger' : 'default'}
        />
        <Stat
          label="Estimated total"
          value={formatCurrency(summary.estimatedTotal, currency)}
          sub={`${summary.remainingVsEstimate >= 0 ? 'Under' : 'Over'} estimate by ${formatCurrency(Math.abs(summary.remainingVsEstimate), currency)}`}
        />
      </section>

      <section className="card px-5 py-4" aria-label="Budget utilisation">
        <ProgressBar
          label="Budget utilisation"
          value={summary.utilizationPercent}
          tone={
            summary.utilizationPercent > 100
              ? 'danger'
              : summary.utilizationPercent > 85
                ? 'warning'
                : 'default'
          }
        />
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-midnight/10 px-3 py-2">
            <p className="text-slate">Contingency (10%)</p>
            <p className="mt-0.5 font-semibold text-midnight">
              {formatCurrency(summary.totalBudget * 0.1, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-midnight/10 px-3 py-2">
            <p className="text-slate">Largest driver</p>
            <p className="mt-0.5 font-semibold text-midnight">
              {summary.categories[0]?.name ?? 'None yet'}
            </p>
          </div>
          <div className="rounded-xl border border-midnight/10 px-3 py-2">
            <p className="text-slate">Expenses tracked</p>
            <p className="mt-0.5 font-semibold text-midnight">{expenses.length}</p>
          </div>
        </div>
      </section>

      {expenses.length > 0 && (
        <section className="card px-5 py-5" aria-label="Category breakdown">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate">
            Category breakdown
          </h3>
          <div className="grid gap-8 lg:grid-cols-2">
            <DonutChart
              data={donutData}
              centerLabel={summary.actualTotal > 0 ? 'spent' : 'estimated'}
              centerValue={formatCurrency(
                summary.actualTotal > 0 ? summary.actualTotal : summary.estimatedTotal,
                currency,
              ).replace(/[^\d.,]/g, '')}
            />
            <BarChart
              data={summary.categories.map((category) => ({
                name: category.name,
                value: category.actual > 0 ? category.actual : category.estimated,
              }))}
              formatValue={(value) => formatCurrency(value, currency)}
            />
          </div>
          <p className="mt-4 text-xs text-slate">
            Amounts are your own recorded figures. Eventra AI does not invent vendor prices or
            quotes — verify costs with each vendor directly.
          </p>
        </section>
      )}

      <section aria-label="Expense records">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
          Expense records
        </h3>
        {expenses.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-7 w-7" aria-hidden="true" />}
            title="No expenses recorded yet"
            description="Add your first expense to see category totals, utilisation and overrun warnings."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add expense
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {expenses.map((expense) => (
              <li key={expense.id} className="card px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-midnight">{expense.title}</span>
                      <Badge tone="neutral">{expense.category}</Badge>
                      <Badge
                        tone={
                          expense.paymentStatus === 'paid'
                            ? 'success'
                            : expense.paymentStatus === 'partial'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {expense.paymentStatus}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate">
                      {expense.vendor ? `Vendor: ${expense.vendor} · ` : ''}
                      Added {formatDate(expense.createdAt.slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <p className="font-semibold text-midnight">
                        {formatCurrency(expense.actualAmount ?? expense.estimatedAmount, currency)}
                      </p>
                      <p className="text-xs text-slate">
                        est. {formatCurrency(expense.estimatedAmount, currency)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(expense)}
                        aria-label={`Edit ${expense.title}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirmDelete(expense)}
                        aria-label={`Delete ${expense.title}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit expense' : 'Add expense'}
        description="Record an estimated or actual cost against a category."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorAlert message={formError} className="rounded-lg px-3 py-2" />}
          <Field label="Item name" htmlFor="expense-title" required>
            <Input
              id="expense-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Venue booking deposit"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="expense-category" required>
              <Select
                id="expense-category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {DEFAULT_BUDGET_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Payment status" htmlFor="expense-status" required>
              <Select
                id="expense-status"
                value={draft.paymentStatus}
                onChange={(e) =>
                  setDraft({ ...draft, paymentStatus: e.target.value as PaymentStatus })
                }
              >
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Vendor" htmlFor="expense-vendor" optional>
            <Input
              id="expense-vendor"
              value={draft.vendor}
              onChange={(e) => setDraft({ ...draft, vendor: e.target.value })}
              placeholder="e.g. Sunrise Banquet Hall"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Estimated amount"
              htmlFor="expense-estimated"
              required
              hint={`In ${currency}`}
            >
              <Input
                id="expense-estimated"
                type="number"
                min={0}
                step="0.01"
                value={draft.estimatedAmount}
                onChange={(e) => setDraft({ ...draft, estimatedAmount: e.target.value })}
              />
            </Field>
            <Field label="Actual amount" htmlFor="expense-actual" optional hint="Leave empty if not paid yet">
              <Input
                id="expense-actual"
                type="number"
                min={0}
                step="0.01"
                value={draft.actualAmount}
                onChange={(e) => setDraft({ ...draft, actualAmount: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="expense-notes" optional>
            <Textarea
              id="expense-notes"
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Check className="h-4 w-4" aria-hidden="true" />
              {editing ? 'Save changes' : 'Add expense'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteDialog
        open={confirmDelete !== null}
        title="Delete expense"
        itemName={confirmDelete?.title ?? null}
        description={confirmDelete ? `Delete “${confirmDelete.title}”? This cannot be undone.` : undefined}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            dispatch({ type: 'DELETE_EXPENSE', expenseId: confirmDelete.id });
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className="card px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate">{label}</p>
      <p className={cn('mt-1.5 text-xl font-bold', tone === 'danger' ? 'text-danger' : 'text-midnight')}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate">{sub}</p>}
    </div>
  );
}
