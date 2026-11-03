/**
 * Chronos Binary Min-Heap / Priority Queue Implementation
 * Used for deterministic task scheduling and recommendation scoring.
 * 
 * Complexities:
 * - peek(): O(1)
 * - push() / insert(): O(log n)
 * - pop() / extractMin(): O(log n)
 * - buildHeap(): O(n)
 * - size(): O(1)
 */

export interface HeapNode<T> {
  id: string;
  score: number;
  data: T;
  explanation: string;
  dueDate?: Date | string | null;
  createdAt?: Date | string | null;
}

export class MinHeap<T> {
  private heap: HeapNode<T>[] = [];
  private idToIndexMap: Map<string, number> = new Map();

  constructor(items?: HeapNode<T>[]) {
    if (items && items.length > 0) {
      this.heap = [...items];
      this.rebuildIndexMap();
      this.buildHeap();
    }
  }

  public size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public peek(): HeapNode<T> | null {
    if (this.isEmpty()) return null;
    return this.heap[0];
  }

  /**
   * Inserts a new node into the min-heap. O(log n)
   */
  public push(node: HeapNode<T>): void {
    this.heap.push(node);
    const index = this.heap.length - 1;
    this.idToIndexMap.set(node.id, index);
    this.heapifyUp(index);
  }

  // Alias for backward compatibility
  public insert(node: HeapNode<T>): void {
    this.push(node);
  }

  /**
   * Extracts and returns the minimum element from the heap. O(log n)
   */
  public pop(): HeapNode<T> | null {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    this.idToIndexMap.delete(min.id);

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.idToIndexMap.set(last.id, 0);
      this.heapifyDown(0);
    }

    return min;
  }

  // Alias for backward compatibility
  public extractMin(): HeapNode<T> | null {
    return this.pop();
  }

  /**
   * In-place bottom-up heap construction. O(n)
   */
  public buildHeap(items?: HeapNode<T>[]): void {
    if (items) {
      this.heap = [...items];
      this.rebuildIndexMap();
    }
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.heapifyDown(i);
    }
  }

  public updateScore(id: string, newScore: number, explanation?: string): boolean {
    const index = this.idToIndexMap.get(id);
    if (index === undefined) return false;

    const oldScore = this.heap[index].score;
    this.heap[index].score = newScore;
    if (explanation) {
      this.heap[index].explanation = explanation;
    }

    if (newScore < oldScore) {
      this.heapifyUp(index);
    } else if (newScore > oldScore) {
      this.heapifyDown(index);
    }
    return true;
  }

  public toArray(): HeapNode<T>[] {
    return [...this.heap];
  }

  public toSortedArray(): HeapNode<T>[] {
    const clone = new MinHeap<T>(this.heap);
    const result: HeapNode<T>[] = [];
    while (!clone.isEmpty()) {
      const min = clone.pop();
      if (min) result.push(min);
    }
    return result;
  }

  /**
   * Stable deterministic comparator:
   * 1. Primary: Numerical Score (lower = higher priority)
   * 2. Secondary: Earlier due date
   * 3. Tertiary: Earlier created date
   * 4. Quaternary: Alphabetical task ID
   */
  private isLessThan(a: HeapNode<T>, b: HeapNode<T>): boolean {
    if (a.score !== b.score) {
      return a.score < b.score;
    }

    // Tie-break 1: earlier due date
    const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (dueA !== dueB) {
      return dueA < dueB;
    }

    // Tie-break 2: earlier createdAt
    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (createdA !== createdB) {
      return createdA < createdB;
    }

    // Tie-break 3: deterministic string comparison
    return a.id.localeCompare(b.id) < 0;
  }

  private heapifyUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.isLessThan(this.heap[current], this.heap[parent])) {
        this.swap(current, parent);
        current = parent;
      } else {
        break;
      }
    }
  }

  private heapifyDown(index: number): void {
    let current = index;
    const length = this.heap.length;

    while (true) {
      const left = 2 * current + 1;
      const right = 2 * current + 2;
      let smallest = current;

      if (left < length && this.isLessThan(this.heap[left], this.heap[smallest])) {
        smallest = left;
      }
      if (right < length && this.isLessThan(this.heap[right], this.heap[smallest])) {
        smallest = right;
      }

      if (smallest !== current) {
        this.swap(current, smallest);
        current = smallest;
      } else {
        break;
      }
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;

    this.idToIndexMap.set(this.heap[i].id, i);
    this.idToIndexMap.set(this.heap[j].id, j);
  }

  private rebuildIndexMap(): void {
    this.idToIndexMap.clear();
    for (let i = 0; i < this.heap.length; i++) {
      this.idToIndexMap.set(this.heap[i].id, i);
    }
  }
}

/**
 * Deterministic Priority Score Calculator
 * Lower score = higher execution priority in the MinHeap
 */
export interface ScheduleTaskInput {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: Date | string | null;
  createdAt?: Date | string | null;
  estimatedMinutes?: number | null;
  prerequisiteIds?: string[];
  completedPrerequisiteIds?: string[];
}

export interface PriorityScoreResult {
  score: number;
  eligible: boolean;
  explanation: string;
  breakdown: {
    priorityWeight: number;
    urgencyHours: number;
    durationHours: number;
    total: number;
  };
}

export function calculatePriorityScore(
  task: ScheduleTaskInput,
  now: Date = new Date()
): PriorityScoreResult {
  // Check dependency eligibility
  const prerequisites = task.prerequisiteIds || [];
  const completed = new Set(task.completedPrerequisiteIds || []);
  const uncompleted = prerequisites.filter((id) => !completed.has(id));

  if (uncompleted.length > 0) {
    return {
      score: Infinity,
      eligible: false,
      explanation: `Blocked: waiting on ${uncompleted.length} incomplete prerequisite task(s)`,
      breakdown: {
        priorityWeight: 0,
        urgencyHours: 0,
        durationHours: 0,
        total: Infinity,
      },
    };
  }

  // 1. User Priority Weight (Lower score = higher priority)
  const priorityWeights: Record<string, number> = {
    URGENT: -1000,
    HIGH: -500,
    MEDIUM: 0,
    LOW: 500,
  };
  const priorityScore = priorityWeights[task.priority] ?? 0;

  // 2. Deadline Urgency (Hours from now)
  let urgencyScore = 168; // Default 1 week if no due date
  let urgencyText = "No deadline (+168.0h)";
  if (task.dueDate) {
    const dueTime = new Date(task.dueDate).getTime();
    const hoursRemaining = (dueTime - now.getTime()) / (1000 * 60 * 60);
    urgencyScore = hoursRemaining;
    if (hoursRemaining < 0) {
      urgencyText = `Overdue by ${Math.abs(hoursRemaining).toFixed(1)}h`;
    } else {
      urgencyText = `Due in ${hoursRemaining.toFixed(1)}h`;
    }
  }

  // 3. Duration SJ Heuristic (Shorter tasks get slight preference)
  const durationMinutes = task.estimatedMinutes || 60;
  const durationScore = durationMinutes / 60;

  const totalScore = priorityScore + urgencyScore + durationScore;
  const explanation = `${task.priority} priority (${priorityScore >= 0 ? "+" : ""}${priorityScore}), ${urgencyText}, estimated ${durationMinutes}m duration (+${durationScore.toFixed(2)}h) -> Heap score: ${totalScore.toFixed(2)}`;

  return {
    score: totalScore,
    eligible: true,
    explanation,
    breakdown: {
      priorityWeight: priorityScore,
      urgencyHours: Number(urgencyScore.toFixed(2)),
      durationHours: Number(durationScore.toFixed(2)),
      total: Number(totalScore.toFixed(2)),
    },
  };
}
