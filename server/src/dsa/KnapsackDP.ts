import { MergeSort } from "./MergeSort";

/**
 * Chronos 0/1 Knapsack Dynamic Programming Engine
 * Syllabus: Unit III, Chapter 3.3 — Dynamic Programming & Knapsack
 * 
 * Powers the "Plan My Day" feature:
 * Given a user's available time budget (capacity W in minutes), selects a subset
 * of ready tasks (weight = estimatedMinutes, value = priority + deadline urgency)
 * that maximizes total value without exceeding the available time.
 * Each task is selected at most once (0/1 Knapsack).
 * 
 * Complexity:
 * - Time: O(n * W)
 * - Space: O(n * W)
 */

export interface KnapsackCandidate {
  id: string;
  title: string;
  durationMinutes: number; // Weight
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: Date | string | null;
  status: string;
  categoryName?: string;
}

export interface KnapsackItem {
  task: KnapsackCandidate;
  weight: number; // Duration in minutes
  value: number;  // Importance score
}

export interface DayPlanResult {
  selectedTasks: KnapsackCandidate[];
  totalPlannedMinutes: number;
  availableMinutes: number;
  remainingMinutes: number;
  totalValue: number;
  taskCount: number;
  summaryReason: string;
}

export class KnapsackDP {
  /**
   * Deterministically calculates the importance value of a task based on:
   * 1. User priority (URGENT: 100, HIGH: 60, MEDIUM: 30, LOW: 10)
   * 2. Proximity to deadline (Overdue: +50, <=24h: +40, <=48h: +20, <=7d: +10)
   */
  public static calculateTaskValue(
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    dueDate: Date | string | null,
    now: Date = new Date()
  ): number {
    const priorityScores: Record<string, number> = {
      URGENT: 100,
      HIGH: 60,
      MEDIUM: 30,
      LOW: 10,
    };
    let value = priorityScores[priority] ?? 30;

    if (dueDate) {
      const dueTime = new Date(dueDate).getTime();
      const diffHours = (dueTime - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 0) {
        value += 50; // Overdue bonus
      } else if (diffHours <= 24) {
        value += 40; // Due within 24 hours
      } else if (diffHours <= 48) {
        value += 20; // Due within 48 hours
      } else if (diffHours <= 168) {
        value += 10; // Due within 7 days
      }
    }

    return value;
  }

  /**
   * Solves 0/1 Knapsack to select optimal subset of tasks for available time.
   * 
   * @param candidates Array of eligible tasks (must have 0 incomplete prerequisites)
   * @param availableMinutes Time budget in minutes (capacity, e.g. 60, 120, 180, up to 720)
   * @param now Current timestamp for deadline calculation
   */
  public static planDay(
    candidates: KnapsackCandidate[],
    availableMinutes: number,
    now: Date = new Date()
  ): DayPlanResult {
    // 1. Sanitize & clamp capacity (15 mins to 720 mins = 12h)
    const capacity = Math.max(15, Math.min(720, Math.round(availableMinutes)));

    if (candidates.length === 0) {
      return {
        selectedTasks: [],
        totalPlannedMinutes: 0,
        availableMinutes: capacity,
        remainingMinutes: capacity,
        totalValue: 0,
        taskCount: 0,
        summaryReason: "No ready tasks available. All tasks are completed or waiting on prerequisites.",
      };
    }

    // 2. Prepare items with weight and value
    const items: KnapsackItem[] = candidates.map((c) => {
      // Duration must be at least 10 minutes and positive
      const weight = Math.max(10, c.durationMinutes || 30);
      const value = this.calculateTaskValue(c.priority, c.dueDate, now);
      return { task: c, weight, value };
    });

    const n = items.length;

    // 3. Construct DP table: dp[i][w] = max value using a subset of first i items with weight limit w
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      const { weight, value } = items[i - 1];
      for (let w = 0; w <= capacity; w++) {
        if (weight <= w) {
          dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + value);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }

    // 4. Backtrack to find chosen items
    const selected: KnapsackCandidate[] = [];
    let w = capacity;

    for (let i = n; i > 0; i--) {
      // If value is different from previous row, item i-1 was included
      if (dp[i][w] !== dp[i - 1][w]) {
        selected.push(items[i - 1].task);
        w -= items[i - 1].weight;
      }
    }

    // 5. Order selected tasks in a practical execution sequence using MergeSort:
    // Earlier deadlines first, then higher priority, then shorter duration
    const sortedPlan = MergeSort.sort(selected, (a, b) => {
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (dueA !== dueB) return dueA - dueB;

      const pRank: Record<string, number> = { URGENT: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
      const prA = pRank[a.priority] || 3;
      const prB = pRank[b.priority] || 3;
      if (prA !== prB) return prA - prB;

      return (a.durationMinutes || 30) - (b.durationMinutes || 30);
    });

    const totalPlannedMinutes = selected.reduce((sum, t) => sum + (t.durationMinutes || 30), 0);
    const remainingMinutes = Math.max(0, capacity - totalPlannedMinutes);
    const totalValue = dp[n][capacity];

    // Generate concise, human-focused reason
    let summaryReason = "";
    if (selected.length === 0) {
      summaryReason = `Available time (${capacity}m) is shorter than any ready task.`;
    } else if (remainingMinutes === 0) {
      summaryReason = `Planned ${totalPlannedMinutes} of ${capacity} minutes, perfectly filling your schedule with highest-priority tasks.`;
    } else {
      summaryReason = `Planned ${totalPlannedMinutes} of ${capacity} minutes (${remainingMinutes}m buffer), focusing on your closest deadlines.`;
    }

    return {
      selectedTasks: sortedPlan,
      totalPlannedMinutes,
      availableMinutes: capacity,
      remainingMinutes,
      totalValue,
      taskCount: selected.length,
      summaryReason,
    };
  }
}
