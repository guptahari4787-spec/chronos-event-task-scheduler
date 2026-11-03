import { MergeSort } from "./MergeSort";

/**
 * Chronos Interval Conflict Detection & Free-Slot Engine
 * Uses Custom MergeSort + Interval Sweep-Line algorithm.
 * 
 * Half-Open Interval Semantics:
 * Intervals are represented as [start, end).
 * If interval A ends at t (e.g. 10:00) and interval B begins at t (10:00),
 * this is a valid boundary touch and does NOT trigger a conflict.
 * 
 * At equal timestamps, 'end' point-events are processed BEFORE 'start' point-events.
 * 
 * Complexity:
 * - O(n log n) custom MergeSort for point events
 * - O(n + k) sweep scan where k is the number of overlaps
 * - Space: O(n)
 */

export interface EventInterval {
  id: string;
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  categoryId?: string | null;
  location?: string | null;
}

export interface ConflictPair {
  eventA: EventInterval;
  eventB: EventInterval;
  overlapMinutes: number;
  overlapStart: Date;
  overlapEnd: Date;
  description: string;
  isMultipleOverlap?: boolean;
}

export interface FreeTimeSlot {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  label: string;
}

type PointType = "end" | "start";

export interface NormalizedInterval {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  startMs: number;
  endMs: number;
  categoryId?: string | null;
  location?: string | null;
}

interface SweepPoint {
  timeMs: number;
  type: PointType;
  interval: NormalizedInterval;
}

export class IntervalSweep {
  /**
   * Detects all pairwise and concurrent overlaps in a collection of event intervals
   * using a point-event sweep-line driven by custom MergeSort.
   */
  public static detectAllConflicts(events: EventInterval[]): ConflictPair[] {
    if (events.length < 2) return [];

    // 1. Normalize intervals into valid timestamp numbers
    const validIntervals: NormalizedInterval[] = events
      .map((e) => {
        const startMs = new Date(e.startTime).getTime();
        const endMs = new Date(e.endTime).getTime();
        return {
          id: e.id,
          title: e.title,
          startTime: new Date(startMs),
          endTime: new Date(endMs),
          startMs,
          endMs,
          categoryId: e.categoryId,
          location: e.location,
        };
      })
      .filter((e) => !isNaN(e.startMs) && !isNaN(e.endMs) && e.startMs < e.endMs);

    if (validIntervals.length < 2) return [];

    // 2. Generate point events: (t, 'start', item) and (t, 'end', item)
    const points: SweepPoint[] = [];
    for (const item of validIntervals) {
      points.push({ timeMs: item.startMs, type: "start", interval: item });
      points.push({ timeMs: item.endMs, type: "end", interval: item });
    }

    // 3. Custom MergeSort point events
    // Tie-break rule: if timestamps are identical, 'end' precedes 'start'
    // so adjacent intervals [a, b) and [b, c) do NOT conflict!
    const sortedPoints = MergeSort.sort<SweepPoint>(points, (a, b) => {
      if (a.timeMs !== b.timeMs) {
        return a.timeMs - b.timeMs;
      }
      // 'end' precedes 'start'
      if (a.type === "end" && b.type === "start") return -1;
      if (a.type === "start" && b.type === "end") return 1;
      return 0;
    });

    const conflicts: ConflictPair[] = [];
    const recordedPairKeys = new Set<string>();

    // Active intervals currently overlapping the sweep-line
    const activeMap = new Map<string, NormalizedInterval>();

    // 4. Sweep across time points
    for (const point of sortedPoints) {
      if (point.type === "start") {
        // Interval is starting: it conflicts with all currently active intervals!
        const current = point.interval;
        const currentActiveCount = activeMap.size;

        for (const [activeId, active] of activeMap.entries()) {
          const pairKey = current.id < activeId ? `${current.id}_${activeId}` : `${activeId}_${current.id}`;
          if (!recordedPairKeys.has(pairKey)) {
            recordedPairKeys.add(pairKey);

            const overlapStartMs = Math.max(current.startMs, active.startMs);
            const overlapEndMs = Math.min(current.endMs, active.endMs);

            if (overlapEndMs > overlapStartMs) {
              const overlapMinutes = Math.round((overlapEndMs - overlapStartMs) / 60000);
              const isMultiple = currentActiveCount >= 2;

              conflicts.push({
                eventA: {
                  id: active.id,
                  title: active.title,
                  startTime: active.startTime,
                  endTime: active.endTime,
                  categoryId: active.categoryId,
                  location: active.location,
                },
                eventB: {
                  id: current.id,
                  title: current.title,
                  startTime: current.startTime,
                  endTime: current.endTime,
                  categoryId: current.categoryId,
                  location: current.location,
                },
                overlapMinutes,
                overlapStart: new Date(overlapStartMs),
                overlapEnd: new Date(overlapEndMs),
                isMultipleOverlap: isMultiple,
                description: `"${active.title}" and "${current.title}" overlap by ${overlapMinutes} min (${new Date(overlapStartMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(overlapEndMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
              });
            }
          }
        }

        activeMap.set(current.id, current);
      } else {
        // Point is 'end': interval finishes its duration; remove from active set
        activeMap.delete(point.interval.id);
      }
    }

    return conflicts;
  }

  /**
   * Checks if a proposed event conflicts with existing events.
   * Useful for pre-save validation and live warnings.
   */
  public static checkEventConflict(
    targetEvent: EventInterval,
    existingEvents: EventInterval[]
  ): ConflictPair[] {
    const targetStart = new Date(targetEvent.startTime).getTime();
    const targetEnd = new Date(targetEvent.endTime).getTime();

    if (isNaN(targetStart) || isNaN(targetEnd) || targetStart >= targetEnd) {
      return [];
    }

    const filtered = existingEvents.filter((e) => e.id !== targetEvent.id);
    const all = [...filtered, targetEvent];
    const allConflicts = this.detectAllConflicts(all);

    return allConflicts.filter(
      (c) => c.eventA.id === targetEvent.id || c.eventB.id === targetEvent.id
    );
  }

  /**
   * Free-Time Gap Finder
   * Given booked intervals for a target date and workday boundaries (e.g., 09:00 to 18:00),
   * merges overlapping blocks with MergeSort and computes unallocated continuous gaps
   * satisfying the requested duration.
   */
  public static findFreeSlots(
    events: EventInterval[],
    workdayStart: Date,
    workdayEnd: Date,
    minDurationMinutes: number = 30
  ): FreeTimeSlot[] {
    const dayStartMs = workdayStart.getTime();
    const dayEndMs = workdayEnd.getTime();

    if (dayEndMs <= dayStartMs) return [];

    // Filter and clip events that intersect the workday window
    const relevantBlocks: { startMs: number; endMs: number }[] = [];

    for (const e of events) {
      const s = new Date(e.startTime).getTime();
      const end = new Date(e.endTime).getTime();
      if (!isNaN(s) && !isNaN(end) && end > dayStartMs && s < dayEndMs) {
        relevantBlocks.push({
          startMs: Math.max(dayStartMs, s),
          endMs: Math.min(dayEndMs, end),
        });
      }
    }

    // Sort blocks by start time using custom MergeSort
    const sortedBlocks = MergeSort.sort(relevantBlocks, (a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

    // Merge overlapping and touching busy blocks
    const mergedBusy: { startMs: number; endMs: number }[] = [];
    for (const block of sortedBlocks) {
      if (mergedBusy.length === 0) {
        mergedBusy.push({ ...block });
      } else {
        const last = mergedBusy[mergedBusy.length - 1];
        if (block.startMs <= last.endMs) {
          // Overlapping or touching -> extend busy block
          last.endMs = Math.max(last.endMs, block.endMs);
        } else {
          mergedBusy.push({ ...block });
        }
      }
    }

    // Calculate free complementary gaps
    const freeSlots: FreeTimeSlot[] = [];
    let currentMs = dayStartMs;

    for (const busy of mergedBusy) {
      if (busy.startMs > currentMs) {
        const gapMinutes = Math.round((busy.startMs - currentMs) / 60000);
        if (gapMinutes >= minDurationMinutes) {
          freeSlots.push({
            startTime: new Date(currentMs),
            endTime: new Date(busy.startMs),
            durationMinutes: gapMinutes,
            label: `${gapMinutes}m free window (${new Date(currentMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(busy.startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          });
        }
      }
      currentMs = Math.max(currentMs, busy.endMs);
    }

    // Check gap between last busy block and workdayEnd
    if (dayEndMs > currentMs) {
      const gapMinutes = Math.round((dayEndMs - currentMs) / 60000);
      if (gapMinutes >= minDurationMinutes) {
        freeSlots.push({
          startTime: new Date(currentMs),
          endTime: new Date(dayEndMs),
          durationMinutes: gapMinutes,
          label: `${gapMinutes}m free window (${new Date(currentMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(dayEndMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        });
      }
    }

    return freeSlots;
  }
}
