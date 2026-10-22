import type { TimelineItem } from '../types/index.js';

/** Timeline helpers: deterministic sorting and overlap detection. */

export function sortTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.startDateTime);
    const bTime = Date.parse(b.startDateTime);
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return aTime - bTime;
  });
}

function toRange(item: TimelineItem): { start: number; end: number; instant: boolean } | null {
  const start = Date.parse(item.startDateTime);
  if (Number.isNaN(start)) return null;
  const parsedEnd = item.endDateTime ? Date.parse(item.endDateTime) : NaN;
  // An item without a usable end time is treated as a point in time.
  const end = Number.isNaN(parsedEnd) ? start : parsedEnd;
  return { start, end, instant: start === end };
}

/**
 * True when two time ranges genuinely conflict. Ranges are half-open, so
 * back-to-back items (one ending exactly when the next begins) do not clash,
 * while two point-in-time items at the same moment do.
 */
function rangesConflict(a: Range, b: Range): boolean {
  if (a.instant && b.instant) return a.start === b.start;
  if (a.instant) return a.start >= b.start && a.start < b.end;
  if (b.instant) return b.start >= a.start && b.start < a.end;
  return a.start < b.end && b.start < a.end;
}

type Range = { start: number; end: number; instant: boolean };

export interface Overlap {
  firstId: string;
  secondId: string;
  firstTitle: string;
  secondTitle: string;
}

/**
 * Detects timeline items whose time ranges overlap. Items without a usable
 * range are ignored.
 */
export function findOverlaps(items: TimelineItem[]): Overlap[] {
  const ranged = items
    .map((item) => ({ item, range: toRange(item) }))
    .filter((entry): entry is { item: TimelineItem; range: Range } => entry.range !== null)
    .sort((a, b) => a.range.start - b.range.start);

  const overlaps: Overlap[] = [];
  for (let i = 0; i < ranged.length; i += 1) {
    for (let j = i + 1; j < ranged.length; j += 1) {
      const a = ranged[i]!;
      const b = ranged[j]!;
      if (b.range.start > a.range.end) break;
      if (rangesConflict(a.range, b.range)) {
        overlaps.push({
          firstId: a.item.id,
          secondId: b.item.id,
          firstTitle: a.item.title,
          secondTitle: b.item.title,
        });
      }
    }
  }
  return overlaps;
}

export function hasOverlap(items: TimelineItem[]): boolean {
  return findOverlaps(items).length > 0;
}

export function overlapMessage(overlaps: Overlap[]): string | null {
  if (overlaps.length === 0) return null;
  const first = overlaps[0]!;
  return `"${first.firstTitle}" overlaps with "${first.secondTitle}"${overlaps.length > 1 ? ` (and ${overlaps.length - 1} more)` : ''}.`;
}
