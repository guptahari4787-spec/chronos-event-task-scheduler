import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Cpu,
  GitBranch,
  Calendar,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function SchedulerLabPage() {
  const [activeTab, setActiveTab] = useState<"heap" | "graph" | "sweep">("heap");

  // Min-Heap State
  const [heapTrace, setHeapTrace] = useState<any>(null);
  const [heapLoading, setHeapLoading] = useState(false);

  // Graph State
  const [graphData, setGraphData] = useState<any>(null);
  const [cycleTestMode, setCycleTestMode] = useState(false);
  const [graphLoading, setGraphLoading] = useState(false);

  // Sweep State
  const [sweepData, setSweepData] = useState<any>(null);
  const [sweepLoading, setSweepLoading] = useState(false);

  const runHeapSimulation = async () => {
    setHeapLoading(true);
    try {
      const res = await api.post("/scheduler/lab/simulate", {
        algorithm: "heap",
      });
      setHeapTrace(res);
    } catch (err) {
      console.error(err);
    } finally {
      setHeapLoading(false);
    }
  };

  const runGraphSimulation = async (injectCycle = false) => {
    setGraphLoading(true);
    setCycleTestMode(injectCycle);
    try {
      const nodes = ["Database Plan", "Schema Design", "ORM Integration", "API Routes", "E2E Testing"];
      const edges = injectCycle
        ? [
            { taskId: "Schema Design", dependsOnTaskId: "Database Plan" },
            { taskId: "ORM Integration", dependsOnTaskId: "Schema Design" },
            { taskId: "API Routes", dependsOnTaskId: "ORM Integration" },
            { taskId: "E2E Testing", dependsOnTaskId: "API Routes" },
            { taskId: "Database Plan", dependsOnTaskId: "E2E Testing" }, // INTENTIONAL CIRCULAR LOOP!
          ]
        : [
            { taskId: "Schema Design", dependsOnTaskId: "Database Plan" },
            { taskId: "ORM Integration", dependsOnTaskId: "Schema Design" },
            { taskId: "API Routes", dependsOnTaskId: "ORM Integration" },
            { taskId: "E2E Testing", dependsOnTaskId: "API Routes" },
          ];

      const res = await api.post("/scheduler/lab/simulate", {
        algorithm: "graph",
        inputData: { nodes, edges },
      });
      setGraphData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setGraphLoading(false);
    }
  };

  const runSweepSimulation = async () => {
    setSweepLoading(true);
    try {
      const res = await api.post("/scheduler/lab/simulate", {
        algorithm: "sweep",
      });
      setSweepData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSweepLoading(false);
    }
  };

  useEffect(() => {
    runHeapSimulation();
    runGraphSimulation(false);
    runSweepSimulation();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
          <Cpu className="w-4 h-4" />
          <span>Interactive Computer Science Laboratory &bull; Project Viva Defense</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Scheduler Lab: Algorithmic Verification
        </h1>
        <p className="text-xs text-slate-500 max-w-2xl mt-1">
          Demonstrate and inspect real data structure and algorithmic state transitions. Every simulation runs the identical TypeScript algorithms used by the Chronos backend.
        </p>
      </div>

      {/* Algorithm Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("heap")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "heap"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>1. Binary Min-Heap</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("graph")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "graph"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>2. 3-Color DFS DAG &amp; Kahn's Sort</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sweep")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "sweep"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>3. Sort &amp; Sweep Interval Overlaps</span>
        </button>
      </div>

      {/* TAB 1: MIN-HEAP */}
      {activeTab === "heap" && (
        <div className="space-y-6">
          {/* Theory & Complexity Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Binary Min-Heap Priority Queue
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Orders eligible tasks using a deterministic mathematical formula combining deadline urgency, priority tiers, and estimated duration.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">
                  Peek: O(1)
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                  Insert/Extract: O(log n)
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                  Space: O(n)
                </span>
              </div>
            </div>

            {/* Formula Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-xs space-y-2">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                Deterministic Score Formula (Lower score = higher execution rank):
              </span>
              <p className="text-slate-700 dark:text-slate-300">
                score = (Priority Weight: URGENT=-1000, HIGH=-500, MED=0, LOW=+500) + (Hours to Deadline) + (Estimated Minutes / 60)
              </p>
              <p className="text-[11px] text-slate-400">
                Prerequisite Gate: If any dependency is incomplete, task eligibility = false, score = &infin;.
              </p>
            </div>
          </div>

          {/* Heap Trace Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insertion Trace */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">1. Insertion &amp; Heapify-Up Trace</h4>
                <button
                  type="button"
                  onClick={runHeapSimulation}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {heapTrace?.insertionTrace?.map((step: any) => (
                  <div
                    key={step.step}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        Step {step.step}: {step.action}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Calculated Score: {step.score}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px] flex-wrap">
                      <span className="text-slate-400">Heap Array:</span>
                      {step.heapState.map((node: any, idx: number) => (
                        <span
                          key={idx}
                          className={`px-1.5 py-0.5 rounded ${
                            idx === 0
                              ? "bg-indigo-600 text-white font-bold"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          [{idx}] {node.id}: {node.score}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Current Root (Min): "{step.minElement}" (O(1) peek)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extraction Trace */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="font-bold text-sm">2. Sequential Extract-Min Order</h4>
              <p className="text-xs text-slate-500">
                Pops the root, swaps with last element, and executes heapifyDown in O(log n).
              </p>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {heapTrace?.extractionTrace?.map((ex: any) => (
                  <div
                    key={ex.step}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center font-mono text-xs">
                        #{ex.step}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Extracted Task "{ex.extractedId}"
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          Score: {ex.score} &bull; Complexity: {ex.complexity}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Remaining: {ex.remainingHeap.length}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIRECTED GRAPH & TOPOLOGICAL SORT */}
      {activeTab === "graph" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Directed Acyclic Graph &bull; 3-Color DFS &amp; Kahn's Topological Sort
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Validates task dependencies. DFS 3-color marks WHITE (0), GRAY (1), and BLACK (2) to detect back-edges.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runGraphSimulation(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    !cycleTestMode
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Valid Acyclic DAG
                </button>
                <button
                  type="button"
                  onClick={() => runGraphSimulation(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    cycleTestMode
                      ? "bg-rose-600 text-white"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  }`}
                >
                  Inject Circular Dependency (Test)
                </button>
              </div>
            </div>

            {/* Cycle Status Alert */}
            {graphData && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  graphData.cycleDetected
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-300"
                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {graphData.cycleDetected ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>
                    {graphData.cycleDetected
                      ? "Circular Dependency Loop Detected & Rejected"
                      : "Acyclic Graph Verified: Valid Execution Pipeline"}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed pl-6">{graphData.explanation}</p>
              </div>
            )}
          </div>

          {/* DAG Nodes and Topological Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="font-bold text-sm">Dependency Edges (Prerequisite &rarr; Dependent)</h4>
              <div className="space-y-2">
                {graphData?.edges?.map((edge: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between font-mono"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {edge.dependsOnTaskId}
                    </span>
                    <ArrowRight className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {edge.taskId}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="font-bold text-sm">Kahn's Topological Execution Tiers</h4>
              <p className="text-xs text-slate-500">
                Tasks in Tier 0 can run concurrently right away. Tier 1 requires Tier 0 completion.
              </p>

              {graphData?.cycleDetected ? (
                <div className="p-8 text-center text-xs text-rose-500 font-medium">
                  Topological Sort aborted because graph contains a cycle.
                </div>
              ) : (
                <div className="space-y-3">
                  {graphData?.executionTiers?.map((tier: any) => (
                    <div
                      key={tier.tier}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          Tier {tier.tier} (Parallel Execution Group)
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {tier.taskIds.length} task(s)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tier.taskIds.map((id: string) => (
                          <span
                            key={id}
                            className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 font-semibold text-xs"
                          >
                            {id}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SORT & SWEEP INTERVAL CONFLICT DETECTOR */}
      {activeTab === "sweep" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Sort-and-Sweep Interval Overlap Detector
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detects collisions between calendar intervals in O(n log n). Boundary-touching intervals (end &le; start) are verified non-conflicting.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono font-bold">
                  Complexity: O(n log n)
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1">
              <span className="font-bold text-amber-600 dark:text-amber-400">
                Boundary Semantics Note:
              </span>
              <p>{sweepData?.boundaryTouchingNote}</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="font-bold text-sm">Detected Overlaps &amp; Sweep Results</h4>
            {sweepData?.conflicts?.length === 0 ? (
              <p className="text-xs text-slate-400">No overlapping intervals detected.</p>
            ) : (
              <div className="space-y-3">
                {sweepData?.conflicts?.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-700 dark:text-rose-300">
                        Collision Pair #{i + 1}: {c.overlapMinutes} Minutes Overlap
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-bold">
                        CONFLICT
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      "{c.eventA.title}" ({new Date(c.eventA.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(c.eventA.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      {" "}collides with{" "}
                      "{c.eventB.title}" ({new Date(c.eventB.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(c.eventB.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
