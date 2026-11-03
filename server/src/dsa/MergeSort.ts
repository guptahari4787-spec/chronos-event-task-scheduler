/**
 * Chronos Custom Merge Sort
 * Generic, stable, divide-and-conquer sorting algorithm.
 * Guarantees O(n log n) time complexity in worst, average, and best cases.
 * Used for interval point events, calendar intervals, and task sequences.
 */

export class MergeSort {
  /**
   * Sorts an array using custom comparator.
   * Returns a new sorted array without mutating the input.
   * 
   * @param arr Array to sort
   * @param compare Comparator function returning < 0 if a < b, 0 if equal, > 0 if a > b
   */
  public static sort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {
    if (arr.length <= 1) {
      return [...arr];
    }

    const mid = Math.floor(arr.length / 2);
    const left = this.sort(arr.slice(0, mid), compare);
    const right = this.sort(arr.slice(mid), compare);

    return this.merge(left, right, compare);
  }

  /**
   * Merges two sorted subarrays into a single sorted array.
   */
  private static merge<T>(
    left: T[],
    right: T[],
    compare: (a: T, b: T) => number
  ): T[] {
    const result: T[] = new Array(left.length + right.length);
    let i = 0;
    let j = 0;
    let k = 0;

    // Stable merge: if elements compare equal, left element is picked first (<= 0)
    while (i < left.length && j < right.length) {
      if (compare(left[i], right[j]) <= 0) {
        result[k++] = left[i++];
      } else {
        result[k++] = right[j++];
      }
    }

    while (i < left.length) {
      result[k++] = left[i++];
    }

    while (j < right.length) {
      result[k++] = right[j++];
    }

    return result;
  }
}
