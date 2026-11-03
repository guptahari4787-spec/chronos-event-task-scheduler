/**
 * Chronos Binary Search Module
 * Locates items in sorted in-memory time arrays with O(log n) complexity.
 */

export interface TimeBoundItem {
  startTime: Date | string;
  [key: string]: any;
}

export class BinarySearch {
  /**
   * Returns index of the first item where startTime >= targetTime
   * (Lower bound)
   */
  public static lowerBound<T extends TimeBoundItem>(sortedItems: T[], targetTime: Date | string | number): number {
    const targetMs = typeof targetTime === "number" ? targetTime : new Date(targetTime).getTime();
    let low = 0;
    let high = sortedItems.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const midMs = new Date(sortedItems[mid].startTime).getTime();
      if (midMs < targetMs) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  /**
   * Returns index of the first item where startTime > targetTime
   * (Upper bound)
   */
  public static upperBound<T extends TimeBoundItem>(sortedItems: T[], targetTime: Date | string | number): number {
    const targetMs = typeof targetTime === "number" ? targetTime : new Date(targetTime).getTime();
    let low = 0;
    let high = sortedItems.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const midMs = new Date(sortedItems[mid].startTime).getTime();
      if (midMs <= targetMs) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  /**
   * Fast range extraction on sorted array using dual binary search: O(log n + k)
   */
  public static rangeSlice<T extends TimeBoundItem>(
    sortedItems: T[],
    fromTime: Date | string | number,
    toTime: Date | string | number
  ): T[] {
    const startIdx = this.lowerBound(sortedItems, fromTime);
    const endIdx = this.upperBound(sortedItems, toTime);
    return sortedItems.slice(startIdx, endIdx);
  }
}
