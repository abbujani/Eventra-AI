import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Handshake, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore.js';
import { useEvent, useEventVendors } from '../../hooks/useEventData.js';
import { formatDate, isOverdue } from '../../lib/dates.js';
import { generateId } from '../../lib/id.js';
import { formatCurrency } from '../../lib/format.js';
import { Button } from '../../components/ui/Button.js';
import { Badge, EmptyState } from '../../components/ui/Feedback.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { Modal } from '../../components/ui/Modal.js';
import { VENDOR_CATEGORIES, type Vendor, type VendorStatus } from '../../types/index.js';
import { cn } from '../../lib/cn.js';

const STATUSES: VendorStatus[] = [
  'researching',
  'contacted',
  'quote-received',
  'shortlisted',
  'booked',
  'rejected',
];

const STATUS_TONE: Record<VendorStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  researching: 'neutral',
  contacted: 'neutral',
  'quote-received': 'warning',
  shortlisted: 'warning',
  booked: 'success',
  rejected: 'danger',
};

interface DraftVendor {
  id?: string;
  name: string;
  category: string;
  contactDetails: string;
  website: string;
  quotedAmount: string;
  status: VendorStatus;
  followUpDate: string;
  notes: string;
}

const EMPTY_DRAFT: DraftVendor = {
  name: '',
  category: 'Venues',
  contactDetails: '',
  website: '',
  quotedAmount: '',
  status: 'researching',
  followUpDate: '',
  notes: '',
};

export function VendorsPanel({ eventId }: { eventId: string }) {
  const { dispatch } = useAppStore();
  const event = useEvent(eventId);
  const vendors = useEventVendors(eventId);

  const [draft, setDraft] = useState<DraftVendor>(EMPTY_DRAFT);
  const [editing, setEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Vendor | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Vendor[]>();
    for (const vendor of vendors) {
      map.set(vendor.category, [...(map.get(vendor.category) ?? []), vendor]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [vendors]);

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setEditing(false);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setDraft({
      id: vendor.id,
      name: vendor.name,
      category: vendor.category,
      contactDetails: vendor.contactDetails ?? '',
      website: vendor.website ?? '',
      quotedAmount: vendor.quotedAmount !== undefined ? String(vendor.quotedAmount) : '',
      status: vendor.status,
      followUpDate: vendor.followUpDate ?? '',
      notes: vendor.notes ?? '',
    });
    setEditing(true);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!event) return;
    if (!draft.name.trim()) {
      setFormError('Enter a vendor name.');
      return;
    }
    // Reject negatives before sanitizing — stripping non-digits would silently
    // turn "-500" into "500".
    if (draft.quotedAmount.trim().startsWith('-')) {
      setFormError('Quoted amount cannot be negative.');
      return;
    }
    const quotedRaw = draft.quotedAmount.replace(/[^0-9.]/g, '');
    const quoted = quotedRaw === '' ? undefined : Number(quotedRaw);
    if (quoted !== undefined && !Number.isFinite(quoted)) {
      setFormError('Quoted amount must be a valid number.');
      return;
    }

    const now = new Date().toISOString();
    if (editing && draft.id) {
      const existing = vendors.find((vendor) => vendor.id === draft.id);
      dispatch({
        type: 'UPDATE_VENDOR',
        vendor: {
          id: draft.id,
          eventId,
          name: draft.name.trim(),
          category: draft.category,
          contactDetails: draft.contactDetails.trim() || undefined,
          website: draft.website.trim() || undefined,
          quotedAmount: quoted,
          currency: event.currency,
          status: draft.status,
          followUpDate: draft.followUpDate || undefined,
          notes: draft.notes.trim() || undefined,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        },
      });
    } else {
      dispatch({
        type: 'ADD_VENDOR',
        vendor: {
          id: generateId('vnd'),
          eventId,
          name: draft.name.trim(),
          category: draft.category,
          contactDetails: draft.contactDetails.trim() || undefined,
          website: draft.website.trim() || undefined,
          quotedAmount: quoted,
          currency: event.currency,
          status: draft.status,
          followUpDate: draft.followUpDate || undefined,
          notes: draft.notes.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
    setModalOpen(false);
  };

  if (!event) return null;
  const currency = event.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Handshake className="h-5 w-5 text-violet" aria-hidden="true" />
          Vendor workspace
        </h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add vendor
        </Button>
      </div>

      <div className="rounded-xl border border-midnight/10 bg-ivory px-4 py-3 text-sm text-slate">
        <strong className="font-semibold text-midnight-2">How suggestions work:</strong> Eventra AI
        does not list real vendors, prices or ratings. It only suggests{' '}
        <em>what to look for</em> in each category. Add the vendors you research and record the
        quotes you receive directly.
      </div>

      {vendors.length === 0 ? (
        <EmptyState
          icon={<Handshake className="h-7 w-7" aria-hidden="true" />}
          title="No vendors recorded yet"
          description="Track vendors, quotes, statuses and follow-up dates as you research."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add your first vendor
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, items]) => (
            <section key={category}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate">
                {category}
              </h3>
              <ul className="space-y-2">
                {items.map((vendor) => (
                  <li key={vendor.id} className="card px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-midnight">{vendor.name}</span>
                          <Badge tone={STATUS_TONE[vendor.status]}>
                            {vendor.status
                              .split('-')
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ')}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate">
                          {vendor.contactDetails && <span>{vendor.contactDetails} · </span>}
                          {vendor.website && <span>{vendor.website} · </span>}
                          <span>
                            Quoted:{' '}
                            {vendor.quotedAmount !== undefined
                              ? formatCurrency(vendor.quotedAmount, vendor.currency)
                              : 'Not recorded'}
                          </span>
                        </p>
                        {vendor.followUpDate && (
                          <p
                            className={cn(
                              'mt-1 text-xs font-medium',
                              isOverdue(vendor.followUpDate) ? 'text-danger' : 'text-slate',
                            )}
                          >
                            Follow up {formatDate(vendor.followUpDate)}{' '}
                            {isOverdue(vendor.followUpDate) && '(overdue)'}
                          </p>
                        )}
                        {vendor.notes && (
                          <p className="mt-1 text-xs text-slate">{vendor.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(vendor)}
                          aria-label={`Edit ${vendor.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setConfirmDelete(vendor)}
                          aria-label={`Delete ${vendor.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit vendor' : 'Add vendor'}
        description="Record vendors you have researched or contacted yourself."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
          <Field label="Vendor name" htmlFor="vendor-name" required>
            <Input
              id="vendor-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Sunrise Banquet Hall"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="vendor-category" required>
              <Select
                id="vendor-category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {[...VENDOR_CATEGORIES].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="vendor-status" required>
              <Select
                id="vendor-status"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as VendorStatus })}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact details" htmlFor="vendor-contact" optional>
              <Input
                id="vendor-contact"
                value={draft.contactDetails}
                onChange={(e) => setDraft({ ...draft, contactDetails: e.target.value })}
                placeholder="Phone or email"
              />
            </Field>
            <Field label="Website" htmlFor="vendor-website" optional>
              <Input
                id="vendor-website"
                value={draft.website}
                onChange={(e) => setDraft({ ...draft, website: e.target.value })}
                placeholder="https://"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Quoted amount"
              htmlFor="vendor-quote"
              optional
              hint={`In ${currency}. Only what you recorded.`}
            >
              <Input
                id="vendor-quote"
                type="number"
                min={0}
                step="0.01"
                value={draft.quotedAmount}
                onChange={(e) => setDraft({ ...draft, quotedAmount: e.target.value })}
              />
            </Field>
            {event && Number(draft.quotedAmount) > event.totalBudget && (
              <p className="sm:col-span-2 -mt-2 flex items-start gap-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                This quote ({formatCurrency(Number(draft.quotedAmount), event.currency)}) exceeds
                your entire event budget of {formatCurrency(event.totalBudget, event.currency)}.
              </p>
            )}
            <Field label="Follow-up date" htmlFor="vendor-followup" optional>
              <Input
                id="vendor-followup"
                type="date"
                value={draft.followUpDate}
                onChange={(e) => setDraft({ ...draft, followUpDate: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="vendor-notes" optional>
            <Textarea
              id="vendor-notes"
              rows={3}
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
              {editing ? 'Save changes' : 'Add vendor'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete vendor"
        size="sm"
      >
        <p className="text-sm text-midnight-2">Delete “{confirmDelete?.name}”?</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) dispatch({ type: 'DELETE_VENDOR', vendorId: confirmDelete.id });
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
