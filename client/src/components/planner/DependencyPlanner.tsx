import React, { useState, useEffect, useRef, useMemo } from "react";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  GitBranch,
  X,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
} from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  dependencies: {
    id: string;
    taskId: string;
    dependsOnTaskId: string;
    dependsOnTask: { id: string; title: string; status: string; priority: string };
  }[];
  dependentOn: {
    id: string;
    taskId: string;
    dependsOnTaskId: string;
    task: { id: string; title: string; status: string; priority: string };
  }[];
}

interface NodePosition {
  x: number;
  y: number;
}

export default function DependencyPlanner() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Canvas Transform (Pan & Zoom)
  const [transform, setTransform] = useState({ x: 40, y: 40, scale: 0.9 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Draggable Node Positions (keyed by task id)
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Dependency Edge Creation Modal / Drawer
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [cycleError, setCycleError] = useState<{ message: string; cyclePath?: string[] } | null>(null);

  // Container Ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch tasks and initialize node layout
  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks?limit=100");
      const fetchedTasks: TaskItem[] = res.tasks || [];
      setTasks(fetchedTasks);

      // Fetch scheduler recommendations to get execution tiers for auto-layout
      try {
        const recRes = await api.get("/scheduler/recommendations");
        const tiers: { tier: number; taskIds: string[] }[] = recRes.executionTiers || [];

        // Build automatic tier coordinates
        const positions: Record<string, NodePosition> = {};
        const colWidth = 320;
        const rowHeight = 140;

        tiers.forEach((tierObj, tierIdx) => {
          tierObj.taskIds.forEach((tId, rowIdx) => {
            positions[tId] = {
              x: 60 + tierIdx * colWidth,
              y: 60 + rowIdx * rowHeight,
            };
          });
        });

        // Any leftover unpositioned tasks
        let leftoverIdx = 0;
        fetchedTasks.forEach((t) => {
          if (!positions[t.id]) {
            positions[t.id] = {
              x: 60 + (tiers.length + 1) * colWidth,
              y: 60 + leftoverIdx * rowHeight,
            };
            leftoverIdx++;
          }
        });

        setNodePositions((prev) => ({ ...positions, ...prev }));
      } catch {
        // Fallback grid
        const positions: Record<string, NodePosition> = {};
        fetchedTasks.forEach((t, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          positions[t.id] = { x: 60 + col * 320, y: 60 + row * 140 };
        });
        setNodePositions((prev) => ({ ...positions, ...prev }));
      }
    } catch (err) {
      console.error("Failed to load dependency graph tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Pan Handlers
  const handleMouseDownBackground = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".graph-node") || (e.target as HTMLElement).closest(".graph-control")) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    } else if (draggingNodeId) {
      // Calculate node position in canvas scale
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const rawX = (e.clientX - containerRect.left - transform.x) / transform.scale;
      const rawY = (e.clientY - containerRect.top - transform.y) / transform.scale;

      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: {
          x: Math.round(rawX - dragOffset.x),
          y: Math.round(rawY - dragOffset.y),
        },
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag Start
  const handleNodeDragStart = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const currentPos = nodePositions[taskId] || { x: 0, y: 0 };
    const mouseCanvasX = (e.clientX - containerRect.left - transform.x) / transform.scale;
    const mouseCanvasY = (e.clientY - containerRect.top - transform.y) / transform.scale;

    setDragOffset({
      x: mouseCanvasX - currentPos.x,
      y: mouseCanvasY - currentPos.y,
    });
    setDraggingNodeId(taskId);
    setSelectedTaskId(taskId);
  };

  // Zoom Controls
  const handleZoom = (delta: number) => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(2.0, Math.max(0.4, Number((prev.scale + delta).toFixed(2)))),
    }));
  };

  const handleResetView = () => {
    setTransform({ x: 40, y: 40, scale: 0.85 });
  };

  const handleFitScreen = () => {
    if (tasks.length === 0) return;
    const xs = Object.values(nodePositions).map((p) => p.x);
    const ys = Object.values(nodePositions).map((p) => p.y);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 600);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 400);

    const width = maxX - minX + 300;
    const height = maxY - minY + 200;

    const containerWidth = containerRef.current?.clientWidth || 1000;
    const containerHeight = containerRef.current?.clientHeight || 600;

    const scale = Math.min(
      1.2,
      Math.max(0.4, Math.min(containerWidth / width, containerHeight / height) * 0.9)
    );

    setTransform({
      x: 30 - minX * scale,
      y: 30 - minY * scale,
      scale,
    });
  };

  // Edge Dependency Add with 3-Color Cycle Check
  const handleAddDependencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkSourceId || !linkTargetId) return;

    setCycleError(null);
    try {
      // In Chronos: target depends on source (source -> target)
      await api.post(`/tasks/${linkTargetId}/dependencies`, {
        dependsOnTaskId: linkSourceId,
      });

      setLinkModalOpen(false);
      setLinkSourceId("");
      setLinkTargetId("");
      await loadTasks();
    } catch (err: any) {
      setCycleError({
        message: err.message || "Failed to add dependency relationship.",
        cyclePath: err.cyclePath,
      });
    }
  };

  // Remove Dependency Edge
  const handleRemoveDependency = async (taskId: string, depId: string) => {
    try {
      await api.delete(`/tasks/${taskId}/dependencies/${depId}`);
      await loadTasks();
    } catch (err) {
      console.error("Failed to remove dependency:", err);
    }
  };

  // Quick Status Toggle on Node
  const handleToggleStatus = async (task: TaskItem) => {
    const nextStatus =
      task.status === "TODO"
        ? "IN_PROGRESS"
        : task.status === "IN_PROGRESS"
        ? "COMPLETED"
        : "TODO";
    try {
      await api.patch(`/tasks/${task.id}`, { status: nextStatus });
      await loadTasks();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Selected Task
  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Compute Ready vs Blocked
  const taskStatusMap = useMemo(() => {
    const map = new Map<string, { isReady: boolean; uncompletedCount: number }>();
    const completedSet = new Set(tasks.filter((t) => t.status === "COMPLETED").map((t) => t.id));

    tasks.forEach((t) => {
      const uncompletedPrereqs = t.dependencies.filter(
        (d) => !completedSet.has(d.dependsOnTaskId)
      );
      map.set(t.id, {
        isReady: uncompletedPrereqs.length === 0,
        uncompletedCount: uncompletedPrereqs.length,
      });
    });

    return map;
  }, [tasks]);

  // Edges to render
  const edges = useMemo(() => {
    const edgeList: {
      id: string;
      sourceId: string;
      targetId: string;
      sourcePos: NodePosition;
      targetPos: NodePosition;
      isCompleted: boolean;
    }[] = [];

    const nodeWidth = 240;
    const nodeHeight = 84;

    tasks.forEach((targetTask) => {
      targetTask.dependencies.forEach((dep) => {
        const sourcePos = nodePositions[dep.dependsOnTaskId];
        const targetPos = nodePositions[targetTask.id];

        if (sourcePos && targetPos) {
          edgeList.push({
            id: dep.id,
            sourceId: dep.dependsOnTaskId,
            targetId: targetTask.id,
            // Source right-center handle
            sourcePos: {
              x: sourcePos.x + nodeWidth,
              y: sourcePos.y + nodeHeight / 2,
            },
            // Target left-center handle
            targetPos: {
              x: targetPos.x,
              y: targetPos.y + nodeHeight / 2,
            },
            isCompleted: dep.dependsOnTask.status === "COMPLETED",
          });
        }
      });
    });

    return edgeList;
  }, [tasks, nodePositions]);

  return (
    <div className="relative w-full h-[760px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl flex flex-col select-none">
      {/* Dark Canvas Topbar */}
      <div className="z-30 h-14 px-5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white tracking-wide">
                Dependency Planner Canvas
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                Interactive DAG
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive task dependencies: drag nodes, inspect prerequisites, connect tasks, and view execution readiness.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700/60 graph-control">
            <button
              type="button"
              onClick={() => handleZoom(-0.15)}
              title="Zoom Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-300">
              {Math.round(transform.scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(0.15)}
              title="Zoom In"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitScreen}
              title="Fit to Screen"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition ml-1"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              title="Reset View"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setCycleError(null);
              setLinkSourceId("");
              setLinkTargetId(selectedTaskId || "");
              setLinkModalOpen(true);
            }}
            className="graph-control inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Tasks</span>
          </button>
        </div>
      </div>

      {/* Main Graph Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDownBackground}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: "#090d16",
          backgroundImage:
            "radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Transform Layer for Pan and Zoom */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          {/* SVG Connector Lines Layer (pointer-events-none on root svg) */}
          <svg
            className="absolute inset-0 pointer-events-none overflow-visible"
            style={{ width: "4000px", height: "4000px" }}
          >
            <defs>
              {/* Completed Arrow Marker */}
              <marker
                id="arrow-completed"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
              </marker>

              {/* Active / Incomplete Arrow Marker */}
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
              </marker>
            </defs>

            {/* Render Edges */}
            {edges.map((edge) => {
              const dx = edge.targetPos.x - edge.sourcePos.x;
              const dy = edge.targetPos.y - edge.sourcePos.y;
              const controlOffset = Math.max(40, Math.abs(dx) * 0.45);

              const pathData = `M ${edge.sourcePos.x} ${edge.sourcePos.y} C ${edge.sourcePos.x + controlOffset} ${edge.sourcePos.y}, ${edge.targetPos.x - controlOffset} ${edge.targetPos.y}, ${edge.targetPos.x} ${edge.targetPos.y}`;

              const isEdgeHighlighted =
                selectedTaskId === edge.sourceId || selectedTaskId === edge.targetId;

              return (
                <g key={edge.id} className="transition-opacity duration-200">
                  {/* Background shadow stroke */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#020617"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  {/* Main stroke */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={
                      isEdgeHighlighted
                        ? "#a855f7"
                        : edge.isCompleted
                        ? "#10b981"
                        : "#6366f1"
                    }
                    strokeWidth={isEdgeHighlighted ? "2.5" : "1.75"}
                    strokeDasharray={edge.isCompleted ? "none" : "5,4"}
                    markerEnd={
                      edge.isCompleted ? "url(#arrow-completed)" : "url(#arrow-active)"
                    }
                  />
                </g>
              );
            })}
          </svg>

          {/* HTML Task Nodes Layer (pointer-events-none container, pointer-events-auto on cards) */}
          <div className="absolute inset-0 pointer-events-none">
            {tasks.map((task) => {
              const pos = nodePositions[task.id] || { x: 40, y: 40 };
              const isSelected = selectedTaskId === task.id;
              const statusInfo = taskStatusMap.get(task.id) || {
                isReady: true,
                uncompletedCount: 0,
              };

              const isCompleted = task.status === "COMPLETED";
              const isBlocked = !isCompleted && !statusInfo.isReady;
              const isReady = !isCompleted && statusInfo.isReady;

              return (
                <div
                  key={task.id}
                  onMouseDown={(e) => handleNodeDragStart(e, task.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTaskId(task.id);
                  }}
                  style={{
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                    width: "240px",
                  }}
                  className={`graph-node pointer-events-auto absolute p-3 rounded-xl border transition-all duration-150 cursor-grab active:cursor-grabbing shadow-xl ${
                    isSelected
                      ? "ring-2 ring-indigo-400 border-indigo-400 bg-slate-900 shadow-indigo-500/20 z-20"
                      : isCompleted
                      ? "border-emerald-600/60 bg-slate-900/90 hover:border-emerald-500 z-10"
                      : isBlocked
                      ? "border-amber-600/70 bg-slate-900/95 hover:border-amber-500 z-10"
                      : "border-indigo-600/60 bg-slate-900/95 hover:border-indigo-400 z-10"
                  }`}
                >
                  {/* Node Header */}
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        task.priority === "URGENT"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : task.priority === "HIGH"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {task.priority}
                    </span>

                    {/* Readiness Badge */}
                    {isCompleted ? (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Done</span>
                      </span>
                    ) : isBlocked ? (
                      <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/80">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Blocked ({statusInfo.uncompletedCount})</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/80">
                        <Circle className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    )}
                  </div>

                  {/* Node Title */}
                  <h4 className="text-xs font-semibold text-white leading-tight line-clamp-2">
                    {task.title}
                  </h4>

                  {/* Node Footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate">
                      {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(task);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium transition"
                    >
                      {task.status === "COMPLETED" ? "Reopen" : task.status === "TODO" ? "Start" : "Complete"}
                    </button>
                  </div>

                  {/* Left Connector Handle (Prerequisite input) */}
                  <div
                    title="Prerequisite input"
                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-800 border-2 border-indigo-400 shadow-sm"
                  />

                  {/* Right Connector Handle (Dependent output) */}
                  <div
                    title="Dependent output"
                    className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-900 shadow-sm"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Canvas Legend */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-auto p-3 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-800 text-[11px] text-slate-300 shadow-xl space-y-1.5">
          <div className="font-bold text-xs text-white mb-1">DAG Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Ready to Start (0 unmet prereqs)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Blocked (waiting on predecessors)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Completed Task</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
            <ArrowRight className="w-3 h-3 text-indigo-400" />
            <span>Edge A &rarr; B means A must complete before B</span>
          </div>
        </div>

        {/* Selected Task Inspector Drawer */}
        {selectedTask && (
          <div className="absolute top-4 right-4 z-20 w-80 max-h-[85%] rounded-2xl bg-slate-900/95 backdrop-blur border border-slate-700/80 shadow-2xl p-5 overflow-y-auto space-y-4 animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Task Inspector</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Title</span>
              <h3 className="font-bold text-sm text-white mt-0.5">{selectedTask.title}</h3>
              {selectedTask.description && (
                <p className="text-xs text-slate-400 mt-1">{selectedTask.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">Status</span>
                <span className="font-semibold text-slate-200">{selectedTask.status}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">Priority</span>
                <span className="font-semibold text-slate-200">{selectedTask.priority}</span>
              </div>
            </div>

            {/* Prerequisites List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Prerequisites ({selectedTask.dependencies.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCycleError(null);
                    setLinkSourceId("");
                    setLinkTargetId(selectedTask.id);
                    setLinkModalOpen(true);
                  }}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  + Add Prereq
                </button>
              </div>

              {selectedTask.dependencies.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  No prerequisites. This task can run concurrently.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedTask.dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-medium text-slate-200 block truncate">
                          {dep.dependsOnTask.title}
                        </span>
                        <span
                          className={`text-[9px] ${
                            dep.dependsOnTask.status === "COMPLETED"
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          {dep.dependsOnTask.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(selectedTask.id, dep.id)}
                        title="Remove link"
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dependents (Tasks waiting on this task) */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-200 block">
                Dependents Waiting ({selectedTask.dependentOn?.length || 0})
              </span>
              {(!selectedTask.dependentOn || selectedTask.dependentOn.length === 0) ? (
                <p className="text-[11px] text-slate-500 italic">No downstream tasks waiting on this.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedTask.dependentOn.map((dep) => (
                    <div
                      key={dep.id}
                      className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-300 truncate">
                        {dep.task?.title || "Dependent task"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Status Change */}
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedTask)}
                className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
              >
                Change Status
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dependency Link Modal with 3-Color Cycle Error Notice */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-400">
                <GitBranch className="w-4 h-4" />
                <span>Connect Task Dependency</span>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cycle Error Banner */}
            {cycleError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 space-y-2 animate-in zoom-in-95">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Circular Dependency Rejected</span>
                </div>
                <p className="text-[11px] leading-relaxed">{cycleError.message}</p>
                {cycleError.cyclePath && (
                  <div className="p-2 rounded bg-slate-950/90 font-mono text-[10px] text-amber-300 break-all">
                    Cycle path: {cycleError.cyclePath.join(" &rarr; ")}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleAddDependencySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Prerequisite Task (Must be done FIRST):
                </label>
                <select
                  value={linkSourceId}
                  onChange={(e) => setLinkSourceId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select prerequisite...</option>
                  {tasks
                    .filter((t) => t.id !== linkTargetId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.priority})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Dependent Task (Runs AFTER prerequisite completes):
                </label>
                <select
                  value={linkTargetId}
                  onChange={(e) => setLinkTargetId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select dependent...</option>
                  {tasks
                    .filter((t) => t.id !== linkSourceId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.priority})
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400">
                Adding prerequisite: <strong>Source</strong> must complete before <strong>Target</strong> can begin. Chronos validates that no circular loops are created.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!linkSourceId || !linkTargetId}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50"
                >
                  Add Dependency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
