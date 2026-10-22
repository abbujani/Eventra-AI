import { describe, expect, it } from 'vitest';
import {
  combineDateAndTime,
  dayKeyInZone,
  daysBetween,
  daysUntil,
  formatDate,
  isValidDateString,
  relativeDeadline,
  todayUtc,
  zonedWallClock,
} from './dates.js';

describe('isValidDateString', () => {
  it('accepts valid ISO dates', () => {
    expect(isValidDateString('2026-06-12')).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-13-01')).toBe(false);
  });

  it('rejects non-padded or malformed values', () => {
    expect(isValidDateString('2026-6-12')).toBe(false);
    expect(isValidDateString('12/06/2026')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });
});

describe('daysBetween / daysUntil', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30);
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('treats today as zero days away', () => {
    expect(daysUntil(todayUtc())).toBe(0);
  });

  it('handles month boundaries', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
  });
});

describe('relativeDeadline', () => {
  it('describes today, tomorrow and past deadlines', () => {
    expect(relativeDeadline(todayUtc())).toBe('Due today');
    expect(relativeDeadline(addDays(1))).toBe('Due tomorrow');
    expect(relativeDeadline(addDays(-1))).toBe('1 day overdue');
    expect(relativeDeadline(addDays(-5))).toBe('5 days overdue');
  });

  it('describes future deadlines', () => {
    expect(relativeDeadline(addDays(10))).toBe('In 10 days');
  });

  it('handles a missing deadline', () => {
    expect(relativeDeadline(undefined)).toBe('No deadline');
  });
});

describe('combineDateAndTime', () => {
  it('produces an ISO instant for a valid date and time', () => {
    const result = combineDateAndTime('2026-06-12', '18:30');
    expect(result).not.toBeNull();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('returns null for an invalid date', () => {
    expect(combineDateAndTime('2026-02-30', '18:30')).toBeNull();
    expect(combineDateAndTime('nope', '18:30')).toBeNull();
  });

  it('returns null for an invalid time', () => {
    expect(combineDateAndTime('2026-06-12', 'not-a-time')).toBeNull();
    expect(combineDateAndTime('2026-06-12', '25:00')).toBeNull();
  });

  it('interprets the wall clock in the event timezone, not the viewer clock', () => {
    // 18:30 in Kolkata (UTC+5:30) is 13:00 UTC.
    expect(combineDateAndTime('2026-06-12', '18:30', 'Asia/Kolkata')).toBe('2026-06-12T13:00:00.000Z');
    // 18:30 in New York in June (UTC-4) is 22:30 UTC.
    expect(combineDateAndTime('2026-06-12', '18:30', 'America/New_York')).toBe('2026-06-12T22:30:00.000Z');
  });

  it('handles a zone on the other side of midnight', () => {
    // 00:30 on 13 Jan 2026 in Kolkata is 19:00 UTC on 12 Jan.
    expect(combineDateAndTime('2026-01-13', '00:30', 'Asia/Kolkata')).toBe('2026-01-12T19:00:00.000Z');
  });

  it('round-trips through zonedWallClock', () => {
    const instant = combineDateAndTime('2026-11-05', '21:15', 'Europe/London');
    expect(zonedWallClock(instant!, 'Europe/London')).toEqual({ date: '2026-11-05', time: '21:15' });
  });
});

describe('zonedWallClock / dayKeyInZone', () => {
  it('reads the wall clock of an instant in the event timezone', () => {
    // 19:00 UTC on 2 Jan is already 00:30 on 3 Jan in Kolkata.
    expect(zonedWallClock('2026-01-02T19:00:00.000Z', 'Asia/Kolkata')).toEqual({
      date: '2026-01-03',
      time: '00:30',
    });
  });

  it('groups by the event-timezone day, not the UTC day', () => {
    expect(dayKeyInZone('2026-01-02T19:00:00.000Z', 'Asia/Kolkata')).toBe('2026-01-03');
    expect(dayKeyInZone('2026-01-02T19:00:00.000Z', 'UTC')).toBe('2026-01-02');
  });

  it('returns null for unparseable instants', () => {
    expect(zonedWallClock('not-a-date', 'Asia/Kolkata')).toBeNull();
  });
});

describe('formatDate', () => {
  it('formats a date-only value as an explicit calendar date', () => {
    expect(formatDate('2026-06-12')).toBe('12 Jun 2026');
  });
});

function addDays(days: number): string {
  const [year, month, day] = todayUtc().split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
