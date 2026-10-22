/**
 * Timezone-aware date helpers.
 *
 * Date-only strings (YYYY-MM-DD) are compared as UTC midnights so day
 * arithmetic is stable regardless of the viewer's clock. Absolute instants are
 * displayed in the event's own timezone via Intl, never in the viewer's.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function todayUtc(): string {
  const now = new Date();
  return toDateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
}

export function toDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Difference in whole days between two date-only strings (b - a). */
export function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

export function daysUntil(dateStr: string): number {
  return daysBetween(todayUtc(), dateStr);
}

export function isOverdue(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return daysUntil(dateStr) < 0;
}

export function relativeDeadline(dateStr: string | undefined): string {
  if (!dateStr) return 'No deadline';
  const days = daysUntil(dateStr);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return '1 day overdue';
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days overdue`;
}

export function formatDate(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  const iso = `${dateStr}T00:00:00Z`;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...opts,
    }).format(new Date(iso));
  } catch {
    return dateStr;
  }
}

function zoneFormatter(timeZone: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone, ...opts });
  } catch {
    return new Intl.DateTimeFormat('en-GB', opts);
  }
}

export function formatDateInZone(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return zoneFormatter(timeZone, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatTimeInZone(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return zoneFormatter(timeZone, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatDateTimeInZone(iso: string, timeZone: string): string {
  return `${formatDateInZone(iso, timeZone)} · ${formatTimeInZone(iso, timeZone)}`;
}

export interface ZonedWallClock {
  /** Wall-clock date in the given zone, as YYYY-MM-DD. */
  date: string;
  /** Wall-clock time in the given zone, as HH:mm. */
  time: string;
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = zoneFormatter(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? '0');
  const hour = get('hour') % 24; // some ICU builds render midnight as "24"
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return asUtc - date.getTime();
}

/**
 * The wall-clock date and time of an absolute instant as it reads in the
 * given timezone — what a user in that timezone would see on a clock.
 */
export function zonedWallClock(iso: string, timeZone: string): ZonedWallClock | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = zoneFormatter(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
  };
}

/** Sortable YYYY-MM-DD day key of an instant, computed in the given timezone. */
export function dayKeyInZone(iso: string, timeZone: string): string {
  return zonedWallClock(iso, timeZone)?.date ?? iso.slice(0, 10);
}

/**
 * Combines a wall-clock date and time — exactly as the user typed them, i.e.
 * in the event's own timezone — into the matching absolute instant (ISO UTC).
 * The offset is resolved iteratively so DST transitions are handled.
 */
export function combineDateAndTime(
  dateStr: string,
  timeStr: string,
  timeZone = 'UTC',
): string | null {
  if (!isValidDateString(dateStr)) return null;
  // Accepts "18:30", "6:30 PM", "6:30pm" — models and templates vary.
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase().replace(/\./g, '');
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const wallClock = Date.UTC(year!, month! - 1, day!, hour, minute);
  let instant = wallClock;
  for (let pass = 0; pass < 2; pass += 1) {
    const corrected = wallClock - zoneOffsetMs(new Date(instant), timeZone);
    if (corrected === instant) break;
    instant = corrected;
  }
  const result = new Date(instant);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

export function isSameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}
