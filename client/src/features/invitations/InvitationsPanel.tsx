import { useState, type FormEvent } from 'react';
import { ClipboardCopy, Mail, Sparkles, Wrench } from 'lucide-react';
import { useEvent } from '../../hooks/useEventData.js';
import { useAiStatus } from '../../hooks/useAiStatus.js';
import { useClipboard } from '../../hooks/useClipboard.js';
import { ApiError, api } from '../../services/api.js';
import { formatDate } from '../../lib/dates.js';
import { Button } from '../../components/ui/Button.js';
import { Badge, EmptyState } from '../../components/ui/Feedback.js';
import { ButtonSpinner } from '../../components/ui/Feedback.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { AiStatusNotice } from '../shared/AiStatusNotice.js';
import type { AiSource, GeneratedInvitation } from '../../types/index.js';

const TONES = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'warm', label: 'Warm' },
];
const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish' },
];
const CHANNELS = [
  { value: 'invitation', label: 'Invitation card' },
  { value: 'whatsapp', label: 'WhatsApp message' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social media post' },
];

export function InvitationsPanel({ eventId }: { eventId: string }) {
  const event = useEvent(eventId);
  const aiStatus = useAiStatus();

  const [hostName, setHostName] = useState('');
  const [timeLabel, setTimeLabel] = useState('');
  const [venue, setVenue] = useState('');
  const [rsvp, setRsvp] = useState('');
  const [tone, setTone] = useState('formal');
  const [language, setLanguage] = useState<'english' | 'hindi' | 'hinglish'>('english');
  const [channel, setChannel] = useState('invitation');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<GeneratedInvitation | null>(null);
  const [source, setSource] = useState<AiSource | null>(null);
  const { copied, copyError, copy } = useClipboard();

  const generate = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!event) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await api.generateInvitation({
        eventTitle: event.title,
        eventType: event.eventType,
        hostName: hostName.trim() || undefined,
        // Human-readable date ("12 June 2026"), not the raw ISO value.
        dateLabel: formatDate(event.startDate),
        timeLabel: timeLabel.trim() || undefined,
        venue: venue.trim() || event.location,
        rsvpDetails: rsvp.trim() || undefined,
        tone: tone as 'formal' | 'casual' | 'warm',
        language,
        channel: channel as 'invitation' | 'whatsapp' | 'email' | 'social',
        additionalNotes: notes.trim() || undefined,
      });
      setInvitation(response.invitation);
      setSource(response.source ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate an invitation.');
    } finally {
      setGenerating(false);
    }
  };

  if (!event) return null;
  // Only a *resolved* failure blocks the form — during 'loading' the notice
  // already shows a spinner and the panel must not flash "unavailable".
  const aiBlocked = aiStatus.state === 'unconfigured' || aiStatus.state === 'unreachable';

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Mail className="h-5 w-5 text-violet" aria-hidden="true" />
        Invitation generator
      </h2>

      <AiStatusNotice status={aiStatus} />

      {aiBlocked ? (
        <EmptyState
          icon={<Mail className="h-7 w-7" aria-hidden="true" />}
          title={
            aiStatus.state === 'unreachable'
              ? 'Cannot reach the server'
              : 'Invitation generation is unavailable'
          }
          description={
            aiStatus.state === 'unreachable'
              ? 'The Eventra API server is not responding. Retry from the banner above once it is back.'
              : 'No planning engine is configured on the server, so invitations cannot be generated.'
          }
        />
      ) : (
        <form onSubmit={generate} className="card space-y-4 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Host name" htmlFor="inv-host" optional hint="Who is hosting">
              <Input
                id="inv-host"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. The Sharma family"
              />
            </Field>
            <Field label="Time" htmlFor="inv-time" optional>
              <Input
                id="inv-time"
                value={timeLabel}
                onChange={(e) => setTimeLabel(e.target.value)}
                placeholder="e.g. 7:00 PM onwards"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Venue" htmlFor="inv-venue" optional hint="Defaults to your event location">
              <Input
                id="inv-venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder={event.location}
              />
            </Field>
            <Field label="RSVP details" htmlFor="inv-rsvp" optional>
              <Input
                id="inv-rsvp"
                value={rsvp}
                onChange={(e) => setRsvp(e.target.value)}
                placeholder="e.g. RSVP by 1 May · +91 98765 43210"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tone" htmlFor="inv-tone" required>
              <Select id="inv-tone" value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Language" htmlFor="inv-language" required>
              <Select
                id="inv-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as typeof language)}
              >
                {LANGUAGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Channel" htmlFor="inv-channel" required>
              <Select id="inv-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
                {CHANNELS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Additional notes" htmlFor="inv-notes" optional>
            <Textarea
              id="inv-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dress code, children welcome"
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" disabled={generating}>
            {generating ? <ButtonSpinner /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {generating ? 'Generating invitation…' : 'Generate invitation'}
          </Button>
        </form>
      )}

      {invitation && (
        <section className="card px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-midnight">Your invitation</h3>
              <Badge tone={source === 'local' ? 'neutral' : source === 'ai' ? 'success' : 'neutral'}>
                {source === 'local' ? (
                  <Wrench className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                )}
                {source === 'local' ? 'Local templates' : source === 'ai' ? 'AI generated' : 'Generated'}
              </Badge>
              <Badge tone="neutral">{invitation.language}</Badge>
              <Badge tone="neutral">{invitation.tone}</Badge>
              <Badge tone="neutral">{invitation.channel}</Badge>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void copy(invitation.text)}>
              <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
              {copied ? 'Copied' : 'Copy text'}
            </Button>
          </div>
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? 'Invitation copied to clipboard' : copyError ? 'Copy failed' : ''}
          </span>
          {copyError && (
            <p role="alert" className="mt-2 text-xs text-danger">
              Could not copy to clipboard. Select the text and copy it manually.
            </p>
          )}
          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-midnight/10 bg-ivory px-4 py-4 text-sm leading-relaxed text-midnight-2">
            {invitation.text}
          </div>
          {invitation.missingFields.length > 0 && (
            <p className="mt-3 text-xs text-slate">
              You can add more detail: {invitation.missingFields.join(', ')}.
            </p>
          )}
          <p className="mt-3 text-xs text-slate">
            Review and edit before sending. The assistant never publishes or sends invitations on
            your behalf.
          </p>
        </section>
      )}
    </div>
  );
}
