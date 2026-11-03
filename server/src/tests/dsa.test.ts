import { describe, it, expect } from "vitest";
import { MergeSort } from "../dsa/MergeSort";
import { DependencyGraph } from "../dsa/DependencyGraph";
import { KnapsackDP, KnapsackCandidate } from "../dsa/KnapsackDP";

describe("DSA System 1: Merge Sort (Syllabus: Unit I, Chapter 1.2)", () => {
  it("should handle empty arrays and single-element arrays gracefully", () => {
    expect(MergeSort.sort([], (a, b) => a - b)).toEqual([]);
    expect(MergeSort.sort([42], (a, b) => a - b)).toEqual([42]);
  });

  it("should sort already sorted and reverse-sorted inputs correctly", () => {
    const sortedInput = [1, 2, 3, 4, 5];
    expect(MergeSort.sort(sortedInput, (a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);

    const reverseInput = [5, 4, 3, 2, 1];
    expect(MergeSort.sort(reverseInput, (a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("should sort arbitrary numbers in O(n log n)", () => {
    const numbers = [42, 17, 89, 5, 23, 71, 10, 3];
    const sorted = MergeSort.sort(numbers, (a, b) => a - b);
    expect(sorted).toEqual([3, 5, 10, 17, 23, 42, 71, 89]);
  });

  it("should maintain stability for items with duplicate sort keys", () => {
    interface Item { id: string; key: number; originalOrder: number }
    const items: Item[] = [
      { id: "A", key: 5, originalOrder: 0 },
      { id: "B", key: 2, originalOrder: 1 },
      { id: "C", key: 5, originalOrder: 2 },
      { id: "D", key: 2, originalOrder: 3 },
      { id: "E", key: 5, originalOrder: 4 },
    ];

    const sorted = MergeSort.sort(items, (a, b) => a.key - b.key);
    expect(sorted.map((i) => i.id)).toEqual(["B", "D", "A", "C", "E"]);
  });

  it("should sort calendar event intervals deterministically by start time, end time, and title", () => {
    const events = [
      { id: "3", title: "Project Demo", startTime: "2026-11-03T11:00:00Z", endTime: "2026-11-03T12:00:00Z" },
      { id: "1", title: "Morning Standup", startTime: "2026-11-03T09:00:00Z", endTime: "2026-11-03T09:30:00Z" },
      { id: "2", title: "Architecture Review", startTime: "2026-11-03T10:00:00Z", endTime: "2026-11-03T11:00:00Z" },
    ];

    const sorted = MergeSort.sort(events, (a, b) => {
      const s = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      if (s !== 0) return s;
      return a.title.localeCompare(b.title);
    });

    expect(sorted.map((e) => e.id)).toEqual(["1", "2", "3"]);
  });
});

describe("DSA System 2: BFS and DFS Graph Traversal (Syllabus: Unit III, Chapter 3.1)", () => {
  it("should reject self-dependencies", () => {
    const graph = new DependencyGraph();
    expect(() => graph.addEdge("A", "A")).toThrow(/Self-dependency/);
  });

  it("should detect simple two-node cycle via DFS (A -> B -> A)", () => {
    const graph = new DependencyGraph(["A", "B"]);
    graph.addEdge("B", "A"); // B depends on A (A -> B)
    graph.addEdge("A", "B"); // A depends on B (B -> A) forms cycle!

    const cycle = graph.detectCycleDfs();
    expect(cycle).not.toBeNull();
    expect(cycle?.length).toBeGreaterThanOrEqual(3);
  });

  it("should detect multi-node circular chains via DFS", () => {
    const graph = new DependencyGraph(["A", "B", "C"]);
    graph.addEdge("B", "A"); // A -> B
    graph.addEdge("C", "B"); // B -> C
    graph.addEdge("A", "C"); // C -> A forms cycle!

    const cycle = graph.detectCycleDfs();
    expect(cycle).not.toBeNull();
    expect(() => graph.topologicalSortBfs()).toThrow(/cyclic dependency/);
  });

  it("wouldCreateCycle should validate proposed dependency without permanent mutation", () => {
    const graph = new DependencyGraph(["X", "Y"]);
    graph.addEdge("Y", "X"); // X -> Y

    const check = graph.wouldCreateCycle("X", "Y");
    expect(check.wouldCycle).toBe(true);
    expect(graph.detectCycleDfs()).toBeNull(); // Still clean
  });

  it("should produce valid linear execution order and tiers via BFS Kahn's Algorithm", () => {
    // Flow: Plan -> Code -> Review -> Ship
    const graph = new DependencyGraph();
    graph.addEdge("Code", "Plan");
    graph.addEdge("Review", "Code");
    graph.addEdge("Ship", "Review");

    const order = graph.topologicalSortBfs();
    expect(order).toEqual(["Plan", "Code", "Review", "Ship"]);

    const tiers = graph.getExecutionTiers();
    expect(tiers).toHaveLength(4);
    expect(tiers[0].taskIds).toEqual(["Plan"]);
    expect(tiers[1].taskIds).toEqual(["Code"]);
    expect(tiers[2].taskIds).toEqual(["Review"]);
    expect(tiers[3].taskIds).toEqual(["Ship"]);
  });

  it("should perform BFS downstream traversal to identify newly ready tasks upon prerequisite completion", () => {
    // Task Graph:
    // Auth (completed) -> Dashboard (needs Auth)
    //                  -> Reports (needs Auth AND Payments)
    const graph = new DependencyGraph();
    graph.addEdge("Dashboard", "Auth");
    graph.addEdge("Reports", "Auth");
    graph.addEdge("Reports", "Payments");

    // Case 1: Auth completes, Payments is still incomplete
    const completedSet1 = new Set(["Auth"]);
    const impact1 = graph.traverseDownstreamBfs("Auth", completedSet1);

    expect(impact1.affectedTaskIds).toContain("Dashboard");
    expect(impact1.affectedTaskIds).toContain("Reports");
    expect(impact1.newlyReadyTaskIds).toEqual(["Dashboard"]); // All prerequisites met
    expect(impact1.stillBlockedTasks).toHaveLength(1);
    expect(impact1.stillBlockedTasks[0].taskId).toBe("Reports");
    expect(impact1.stillBlockedTasks[0].remainingPrerequisites).toEqual(["Payments"]);

    // Case 2: Payments also completes -> Reports becomes newly ready
    const completedSet2 = new Set(["Auth", "Payments"]);
    const impact2 = graph.traverseDownstreamBfs("Payments", completedSet2);
    expect(impact2.newlyReadyTaskIds).toEqual(["Reports"]);
  });
});

describe("DSA System 3: 0/1 Knapsack Dynamic Programming (Syllabus: Unit III, Chapter 3.3)", () => {
  it("should return empty selection when candidate list is empty", () => {
    const result = KnapsackDP.planDay([], 120);
    expect(result.selectedTasks).toHaveLength(0);
    expect(result.totalPlannedMinutes).toBe(0);
    expect(result.remainingMinutes).toBe(120);
  });

  it("should handle when all tasks exceed available capacity", () => {
    const candidates: KnapsackCandidate[] = [
      { id: "1", title: "Full System Refactor", durationMinutes: 180, priority: "HIGH", dueDate: null, status: "TODO" }
    ];
    // Only 30 minutes available
    const result = KnapsackDP.planDay(candidates, 30);
    expect(result.selectedTasks).toHaveLength(0);
    expect(result.totalPlannedMinutes).toBe(0);
  });

  it("should select task that fits exactly into available time", () => {
    const candidates: KnapsackCandidate[] = [
      { id: "1", title: "Quick Sprint Fix", durationMinutes: 60, priority: "HIGH", dueDate: null, status: "TODO" }
    ];
    const result = KnapsackDP.planDay(candidates, 60);
    expect(result.selectedTasks).toHaveLength(1);
    expect(result.totalPlannedMinutes).toBe(60);
    expect(result.remainingMinutes).toBe(0);
  });

  it("should select optimal combination of tasks (not simply the single longest task)", () => {
    // 3 tasks with 120 minutes capacity:
    // Task A: duration 120, value = 60 (HIGH, no due date)
    // Task B: duration 60,  value = 100 (URGENT, no due date)
    // Task C: duration 60,  value = 60 (HIGH, no due date)
    // Optimal combination: Task B + Task C = duration 120, value = 160 (vs Task A value = 60)!
    const candidates: KnapsackCandidate[] = [
      { id: "A", title: "Large Task", durationMinutes: 120, priority: "HIGH", dueDate: null, status: "TODO" },
      { id: "B", title: "Urgent Subtask", durationMinutes: 60, priority: "URGENT", dueDate: null, status: "TODO" },
      { id: "C", title: "High Subtask", durationMinutes: 60, priority: "HIGH", dueDate: null, status: "TODO" },
    ];

    const result = KnapsackDP.planDay(candidates, 120);
    expect(result.selectedTasks).toHaveLength(2);
    expect(result.selectedTasks.map((t) => t.id)).toEqual(["B", "C"]);
    expect(result.totalPlannedMinutes).toBe(120);
    expect(result.totalValue).toBe(160);
  });

  it("should never select any task more than once (0/1 Knapsack property)", () => {
    const candidates: KnapsackCandidate[] = [
      { id: "1", title: "Fix Login Bug", durationMinutes: 30, priority: "URGENT", dueDate: null, status: "TODO" }
    ];
    // 120 minutes capacity: with unbounded knapsack it would pick it 4 times, but 0/1 picks it at most ONCE!
    const result = KnapsackDP.planDay(candidates, 120);
    expect(result.selectedTasks).toHaveLength(1);
    expect(result.totalPlannedMinutes).toBe(30);
    expect(result.remainingMinutes).toBe(90);
  });

  it("should order selected tasks in practical execution order using MergeSort", () => {
    const now = new Date("2026-11-03T10:00:00Z");
    const candidates: KnapsackCandidate[] = [
      { id: "3", title: "Task Later", durationMinutes: 30, priority: "MEDIUM", dueDate: "2026-11-05T10:00:00Z", status: "TODO" },
      { id: "1", title: "Task Today", durationMinutes: 30, priority: "URGENT", dueDate: "2026-11-03T18:00:00Z", status: "TODO" },
      { id: "2", title: "Task Tomorrow", durationMinutes: 30, priority: "HIGH", dueDate: "2026-11-04T12:00:00Z", status: "TODO" },
    ];

    const result = KnapsackDP.planDay(candidates, 120, now);
    expect(result.selectedTasks.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });
});
