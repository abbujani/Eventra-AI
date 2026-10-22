import { describe, expect, it } from 'vitest';
import { findOverlaps, hasOverlap, overlapMessage, sortTimeline } from './timeline.js';
import type { TimelineItem } from '../types/index.js';

function item(overrides: Partial<TimelineItem>): TimelineItem {
  return {
    id: `tl_${Math.random().toString(36).slice(2)}`,
    eventId: 'evt_1',
    title: 'Item',
    startDateTime: '2026-06-12T09:00:00.000Z',
    priority: 'medium',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('sortTimeline', () => {
  it('orders items by start time', () => {
    const items = [
      item({ id: 'b', startDateTime: '2026-06-12T14:00:00.000Z' }),
      item({ id: 'a', startDateTime: '2026-06-12T09:00:00.000Z' }),
      item({ id: 'c', startDateTime: '2026-06-12T18:00:00.000Z' }),
    ];
    expect(sortTimeline(items).map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const items = [
      item({ id: 'b', startDateTime: '2026-06-12T14:00:00.000Z' }),
      item({ id: 'a', startDateTime: '2026-06-12T09:00:00.000Z' }),
    ];
    sortTimeline(items);
    expect(items[0]?.id).toBe('b');
  });

  it('pushes invalid dates to the end rather than throwing', () => {
    const items = [
      item({ id: 'bad', startDateTime: 'not-a-date' }),
      item({ id: 'good', startDateTime: '2026-06-12T09:00:00.000Z' }),
    ];
    expect(sortTimeline(items).map((entry) => entry.id)).toEqual(['good', 'bad']);
  });
});

describe('findOverlaps', () => {
  it('detects overlapping time ranges', () => {
    const items = [
      item({ id: 'a', title: 'Ceremony', startDateTime: '2026-06-12T09:00:00.000Z', endDateTime: '2026-06-12T11:00:00.000Z' }),
      item({ id: 'b', title: 'Photos', startDateTime: '2026-06-12T10:30:00.000Z', endDateTime: '2026-06-12T12:00:00.000Z' }),
    ];
    const overlaps = findOverlaps(items);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]?.firstTitle).toBe('Ceremony');
    expect(overlaps[0]?.secondTitle).toBe('Photos');
    expect(hasOverlap(items)).toBe(true);
  });

  it('reports no overlap for back-to-back items', () => {
    const items = [
      item({ id: 'a', startDateTime: '2026-06-12T09:00:00.000Z', endDateTime: '2026-06-12T10:00:00.000Z' }),
      item({ id: 'b', startDateTime: '2026-06-12T10:00:00.000Z', endDateTime: '2026-06-12T11:00:00.000Z' }),
    ];
    expect(findOverlaps(items)).toHaveLength(0);
    expect(hasOverlap(items)).toBe(false);
  });

  it('treats an instant without an end time as zero-duration', () => {
    const items = [
      item({ id: 'a', startDateTime: '2026-06-12T09:00:00.000Z' }),
      item({ id: 'b', startDateTime: '2026-06-12T09:00:00.000Z' }),
    ];
    expect(findOverlaps(items)).toHaveLength(1);
  });

  it('ignores items with unusable ranges', () => {
    const items = [item({ id: 'a', startDateTime: 'not-a-date' }), item({ id: 'b', startDateTime: 'also-bad' })];
    expect(findOverlaps(items)).toHaveLength(0);
  });
});

describe('overlapMessage', () => {
  it('returns null when there are no overlaps', () => {
    expect(overlapMessage([])).toBeNull();
  });

  it('names the conflicting items', () => {
    const message = overlapMessage([
      { firstId: 'a', secondId: 'b', firstTitle: 'Ceremony', secondTitle: 'Photos' },
    ]);
    expect(message).toContain('Ceremony');
    expect(message).toContain('Photos');
  });
});
