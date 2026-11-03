/**
 * Chronos Directed Dependency Graph
 * Syllabus: Unit III, Chapter 3.1 — Graph Traversal (BFS & DFS)
 * 
 * - DFS: Inspects dependency chains, detects cycles, and rejects circular edges before saving.
 * - BFS: Traverses downstream tasks when a prerequisite is completed or updated,
 *        identifying affected, blocked, and newly ready tasks layer-by-layer.
 * - Kahn's Algorithm (BFS): Computes topological execution tiers and linear scheduling order.
 * 
 * Complexities:
 * - Cycle Detection (DFS): O(V + E) time, O(V) space
 * - Downstream Cascade (BFS): O(V + E) time, O(V) space
 * - Topological Sort (BFS): O(V + E) time, O(V) space
 */

export interface DependencyEdge {
  taskId: string;          // Dependent task
  dependsOnTaskId: string; // Prerequisite task
}

export interface DownstreamImpactResult {
  affectedTaskIds: string[];
  newlyReadyTaskIds: string[];
  stillBlockedTasks: {
    taskId: string;
    remainingPrerequisites: string[];
  }[];
}

export class DependencyGraph {
  // prerequisiteId -> Set of dependent taskIds (edges: prerequisite -> dependent)
  private forwardAdj: Map<string, Set<string>> = new Map();
  // taskId -> Set of prerequisite taskIds
  private reverseAdj: Map<string, Set<string>> = new Map();
  // Set of all vertices
  private vertices: Set<string> = new Set();

  constructor(vertices: string[] = [], edges: DependencyEdge[] = []) {
    for (const v of vertices) {
      this.addVertex(v);
    }
    for (const edge of edges) {
      this.addEdge(edge.taskId, edge.dependsOnTaskId);
    }
  }

  public addVertex(v: string): void {
    this.vertices.add(v);
    if (!this.forwardAdj.has(v)) this.forwardAdj.set(v, new Set());
    if (!this.reverseAdj.has(v)) this.reverseAdj.set(v, new Set());
  }

  public addEdge(taskId: string, dependsOnTaskId: string): void {
    if (taskId === dependsOnTaskId) {
      throw new Error(`Self-dependency is invalid: task cannot depend on itself.`);
    }
    this.addVertex(taskId);
    this.addVertex(dependsOnTaskId);

    // Prerequisite -> Dependent
    this.forwardAdj.get(dependsOnTaskId)!.add(taskId);
    // Dependent has prerequisite
    this.reverseAdj.get(taskId)!.add(dependsOnTaskId);
  }

  public removeEdge(taskId: string, dependsOnTaskId: string): void {
    this.forwardAdj.get(dependsOnTaskId)?.delete(taskId);
    this.reverseAdj.get(taskId)?.delete(dependsOnTaskId);
  }

  public getVertices(): string[] {
    return Array.from(this.vertices);
  }

  public getPrerequisites(taskId: string): string[] {
    return Array.from(this.reverseAdj.get(taskId) || []);
  }

  public getDependents(prerequisiteId: string): string[] {
    return Array.from(this.forwardAdj.get(prerequisiteId) || []);
  }

  public getInDegree(taskId: string): number {
    return this.reverseAdj.get(taskId)?.size || 0;
  }

  /**
   * DFS Cycle Detection & Validation
   * 0 = WHITE (unvisited)
   * 1 = GRAY (currently in recursion stack)
   * 2 = BLACK (visited and all descendants completed)
   * 
   * Returns null if acyclic, or array of task IDs forming the cycle path.
   */
  public detectCycleDfs(): string[] | null {
    const color = new Map<string, number>();
    const parent = new Map<string, string | null>();

    for (const v of this.vertices) {
      color.set(v, 0); // WHITE
      parent.set(v, null);
    }

    for (const v of this.vertices) {
      if (color.get(v) === 0) {
        const cycle = this.dfsVisit(v, color, parent);
        if (cycle) return cycle;
      }
    }

    return null;
  }

  private dfsVisit(
    u: string,
    color: Map<string, number>,
    parent: Map<string, string | null>
  ): string[] | null {
    color.set(u, 1); // GRAY

    const dependents = this.forwardAdj.get(u) || new Set();
    for (const v of dependents) {
      if (color.get(v) === 1) {
        // Back edge detected: cycle found!
        const cyclePath: string[] = [v, u];
        let curr = parent.get(u);
        while (curr && curr !== v) {
          cyclePath.push(curr);
          curr = parent.get(curr);
        }
        cyclePath.push(v);
        return cyclePath.reverse();
      }

      if (color.get(v) === 0) {
        parent.set(v, u);
        const result = this.dfsVisit(v, color, parent);
        if (result) return result;
      }
    }

    color.set(u, 2); // BLACK
    return null;
  }

  /**
   * Pre-save DFS Cycle Check
   * Temporarily inserts the proposed dependency edge and inspects whether a cycle is introduced.
   */
  public wouldCreateCycle(taskId: string, dependsOnTaskId: string): { wouldCycle: boolean; cyclePath?: string[] } {
    if (taskId === dependsOnTaskId) {
      return { wouldCycle: true, cyclePath: [taskId, taskId] };
    }

    this.addEdge(taskId, dependsOnTaskId);
    const cycle = this.detectCycleDfs();
    this.removeEdge(taskId, dependsOnTaskId);

    if (cycle) {
      return { wouldCycle: true, cyclePath: cycle };
    }
    return { wouldCycle: false };
  }

  /**
   * BFS Downstream Traversal & Readiness Cascades
   * When a prerequisite task is marked completed or updated, BFS traverses downstream
   * dependents layer-by-layer to determine which tasks are now newly ready to start.
   */
  public traverseDownstreamBfs(
    completedTaskId: string,
    allCompletedTaskIds: Set<string>
  ): DownstreamImpactResult {
    const queue: string[] = [];
    const visited = new Set<string>();
    const affectedTaskIds: string[] = [];
    const newlyReadyTaskIds: string[] = [];
    const stillBlockedTasks: DownstreamImpactResult["stillBlockedTasks"] = [];

    // Enqueue direct dependents of the completed task
    const directDependents = this.forwardAdj.get(completedTaskId) || new Set();
    for (const depId of directDependents) {
      queue.push(depId);
      visited.add(depId);
    }

    // BFS loop
    while (queue.length > 0) {
      const currentTaskId = queue.shift()!;
      affectedTaskIds.push(currentTaskId);

      // Check all prerequisites for currentTaskId
      const allPrereqs = this.getPrerequisites(currentTaskId);
      const remainingUnmet = allPrereqs.filter((p) => !allCompletedTaskIds.has(p));

      if (remainingUnmet.length === 0) {
        newlyReadyTaskIds.push(currentTaskId);
      } else {
        stillBlockedTasks.push({
          taskId: currentTaskId,
          remainingPrerequisites: remainingUnmet,
        });
      }

      // Continue BFS downstream to descendants
      const nextDependents = this.forwardAdj.get(currentTaskId) || new Set();
      for (const nextId of nextDependents) {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push(nextId);
        }
      }
    }

    return {
      affectedTaskIds,
      newlyReadyTaskIds,
      stillBlockedTasks,
    };
  }

  /**
   * BFS Kahn's Algorithm for Topological Ordering
   * Returns tasks in valid execution order.
   */
  public topologicalSortBfs(): string[] {
    const inDegree = new Map<string, number>();
    for (const v of this.vertices) {
      inDegree.set(v, this.reverseAdj.get(v)?.size || 0);
    }

    // Queue of vertices with 0 in-degree (no prerequisites)
    const queue: string[] = [];
    for (const [v, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(v);
      }
    }

    const order: string[] = [];

    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);

      const dependents = this.forwardAdj.get(u) || new Set();
      for (const v of dependents) {
        const newDeg = inDegree.get(v)! - 1;
        inDegree.set(v, newDeg);
        if (newDeg === 0) {
          queue.push(v);
        }
      }
    }

    if (order.length !== this.vertices.size) {
      const cycle = this.detectCycleDfs();
      throw new Error(`Cannot perform topological sort: cyclic dependency detected (${cycle?.join(" -> ")})`);
    }

    return order;
  }

  // Alias for backward compatibility
  public topologicalSort(): string[] {
    return this.topologicalSortBfs();
  }

  public detectCycle(): string[] | null {
    return this.detectCycleDfs();
  }

  /**
   * Computes topological execution tiers (BFS levels).
   * Tier 0: tasks with no prerequisites (can run concurrently right away).
   * Tier 1: tasks whose prerequisites are in Tier 0, and so on.
   */
  public getExecutionTiers(): { tier: number; taskIds: string[] }[] {
    const inDegree = new Map<string, number>();
    for (const v of this.vertices) {
      inDegree.set(v, this.reverseAdj.get(v)?.size || 0);
    }

    let currentQueue: string[] = [];
    for (const [v, deg] of inDegree.entries()) {
      if (deg === 0) {
        currentQueue.push(v);
      }
    }

    let tierIndex = 0;
    const tiers: { tier: number; taskIds: string[] }[] = [];

    while (currentQueue.length > 0) {
      tiers.push({ tier: tierIndex, taskIds: [...currentQueue] });
      const nextQueue: string[] = [];

      for (const u of currentQueue) {
        const dependents = this.forwardAdj.get(u) || new Set();
        for (const v of dependents) {
          const newDeg = inDegree.get(v)! - 1;
          inDegree.set(v, newDeg);
          if (newDeg === 0) {
            nextQueue.push(v);
          }
        }
      }

      currentQueue = nextQueue;
      tierIndex++;
    }

    return tiers;
  }
}
