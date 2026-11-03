import { prisma } from "../prisma";
import { DependencyGraph, DownstreamImpactResult } from "../dsa/DependencyGraph";
import { KnapsackDP, DayPlanResult, KnapsackCandidate } from "../dsa/KnapsackDP";
import { MergeSort } from "../dsa/MergeSort";

export interface NextTaskRecommendation {
  recommendedTask: {
    id: string;
    title: string;
    priority: string;
    dueDate: Date | null;
    estimatedMinutes: number | null;
    status: string;
    explanation: string;
  } | null;
  eligibleCount: number;
  blockedCount: number;
  executionTiers: { tier: number; taskIds: string[] }[];
}

export class SchedulerService {
  /**
   * Plan My Day Engine
   * Syllabus: Unit III, Chapter 3.3 — 0/1 Knapsack Dynamic Programming
   * 
   * Considers only tasks that are eligible to start (0 unmet prerequisites).
   * Maximizes value (priority + deadline proximity) within the user's available time.
   */
  public static async planMyDay(
    userId: string,
    availableMinutes: number = 120
  ): Promise<DayPlanResult> {
    // 1. Fetch user tasks with dependencies in one optimized query
    const allTasks = await prisma.task.findMany({
      where: { userId },
      include: {
        category: true,
        dependencies: {
          include: {
            dependsOnTask: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    });

    const completedIds = new Set(
      allTasks.filter((t) => t.status === "COMPLETED").map((t) => t.id)
    );

    // 2. Filter tasks: must be active (TODO/IN_PROGRESS) AND all prerequisites completed
    const eligibleTasks = allTasks.filter((t) => {
      if (t.status === "COMPLETED" || t.status === "CANCELLED") return false;
      // All prerequisites must be completed
      const unmetPrereqs = t.dependencies.filter(
        (dep) => !completedIds.has(dep.dependsOnTaskId)
      );
      return unmetPrereqs.length === 0;
    });

    // 3. Map to Knapsack candidates
    const candidates: KnapsackCandidate[] = eligibleTasks.map((t) => ({
      id: t.id,
      title: t.title,
      durationMinutes: t.estimatedMinutes || 30,
      priority: t.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      dueDate: t.dueDate,
      status: t.status,
      categoryName: t.category?.name,
    }));

    // 4. Run 0/1 Knapsack DP
    return KnapsackDP.planDay(candidates, availableMinutes, new Date());
  }

  /**
   * Next Recommended Task
   * Orders ready active tasks using MergeSort by deadline, priority, and duration.
   */
  public static async getRecommendations(userId: string): Promise<NextTaskRecommendation> {
    const allTasks = await prisma.task.findMany({
      where: { userId },
      include: {
        dependencies: {
          include: {
            dependsOnTask: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    });

    const completedIds = new Set(
      allTasks.filter((t) => t.status === "COMPLETED").map((t) => t.id)
    );

    // Build Graph for execution tiers
    const graph = new DependencyGraph();
    for (const t of allTasks) {
      graph.addVertex(t.id);
      for (const dep of t.dependencies) {
        graph.addEdge(t.id, dep.dependsOnTaskId);
      }
    }

    const activeTasks = allTasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
    const eligibleTasks: typeof activeTasks = [];
    let blockedCount = 0;

    for (const task of activeTasks) {
      const unmet = task.dependencies.filter((d) => !completedIds.has(d.dependsOnTaskId));
      if (unmet.length > 0) {
        blockedCount++;
      } else {
        eligibleTasks.push(task);
      }
    }

    // MergeSort eligible tasks: earlier due date first, then higher priority
    const sortedEligible = MergeSort.sort(eligibleTasks, (a, b) => {
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (dueA !== dueB) return dueA - dueB;

      const pRank: Record<string, number> = { URGENT: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
      const prA = pRank[a.priority] || 3;
      const prB = pRank[b.priority] || 3;
      if (prA !== prB) return prA - prB;

      return (a.estimatedMinutes || 60) - (b.estimatedMinutes || 60);
    });

    const topTask = sortedEligible.length > 0 ? sortedEligible[0] : null;

    let explanation = "No pending tasks ready for execution.";
    if (topTask) {
      const dueText = topTask.dueDate
        ? `due ${new Date(topTask.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}`
        : "no deadline";
      explanation = `${topTask.priority} priority, ${dueText}, all prerequisites completed.`;
    }

    return {
      recommendedTask: topTask
        ? {
            id: topTask.id,
            title: topTask.title,
            priority: topTask.priority,
            dueDate: topTask.dueDate,
            estimatedMinutes: topTask.estimatedMinutes,
            status: topTask.status,
            explanation,
          }
        : null,
      eligibleCount: eligibleTasks.length,
      blockedCount,
      executionTiers: graph.getExecutionTiers(),
    };
  }

  /**
   * Downstream Cascade on Task Completion (BFS Traversal)
   * Syllabus: Unit III, Chapter 3.1 — BFS Graph Traversal
   */
  public static async evaluateCompletionImpactBfs(
    userId: string,
    completedTaskId: string
  ): Promise<DownstreamImpactResult> {
    const allTasks = await prisma.task.findMany({
      where: { userId },
      include: {
        dependencies: true,
      },
    });

    const completedIds = new Set(
      allTasks.filter((t) => t.status === "COMPLETED" || t.id === completedTaskId).map((t) => t.id)
    );

    const graph = new DependencyGraph();
    for (const t of allTasks) {
      graph.addVertex(t.id);
      for (const dep of t.dependencies) {
        graph.addEdge(t.id, dep.dependsOnTaskId);
      }
    }

    return graph.traverseDownstreamBfs(completedTaskId, completedIds);
  }
}
