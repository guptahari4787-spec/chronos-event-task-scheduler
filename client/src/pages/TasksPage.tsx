import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  Search,
  Clock,
  GitBranch,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  X,
  Info,
  CalendarClock,
  Zap,
} from "lucide-react";
import QuickCreateModal from "@/components/layout/QuickCreateModal";
import DependencyPlanner from "@/components/planner/DependencyPlanner";
import PriorityExplanationModal from "@/components/planner/PriorityExplanationModal";
import PlanMyDayModal from "@/components/planner/PlanMyDayModal";

interface TasksPageProps {
  initialView?: "board" | "list" | "graph";
}

export default function TasksPage({ initialView = "board" }: TasksPageProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"board" | "list" | "graph">(initialView);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [planMyDayOpen, setPlanMyDayOpen] = useState(false);

  // Recommendations State
  const [recommendation, setRecommendation] = useState<any>(null);
  const [whyModalOpen, setWhyModalOpen] = useState(false);

  // Dependency Management Modal (List/Board quick modal)
  const [depModalTask, setDepModalTask] = useState<any | null>(null);
  const [selectedDepId, setSelectedDepId] = useState("");
  const [depError, setDepError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (priorityFilter) params.append("priority", priorityFilter);
      if (categoryFilter) params.append("categoryId", categoryFilter);
      params.append("limit", "100");

      const [taskRes, catRes, recRes] = await Promise.all([
        api.get(`/tasks?${params.toString()}`),
        api.get("/categories"),
        api.get("/scheduler/recommendations"),
      ]);

      setTasks(taskRes.tasks || []);
      setCategories(catRes.categories || []);
      setRecommendation(recRes);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, priorityFilter, categoryFilter]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      await fetchTasks();
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      await fetchTasks();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleAddDependency = async () => {
    if (!depModalTask || !selectedDepId) return;
    setDepError(null);
    try {
      await api.post(`/tasks/${depModalTask.id}/dependencies`, {
        dependsOnTaskId: selectedDepId,
      });
      setSelectedDepId("");
      await fetchTasks();
      const updated = await api.get(`/tasks/${depModalTask.id}`);
      setDepModalTask(updated.task);
    } catch (err: any) {
      setDepError(err.message || "Cannot link task: this would create a circular dependency loop.");
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    if (!depModalTask) return;
    try {
      await api.delete(`/tasks/${depModalTask.id}/dependencies/${dependencyId}`);
      await fetchTasks();
      const updated = await api.get(`/tasks/${depModalTask.id}`);
      setDepModalTask(updated.task);
    } catch (err) {
      console.error("Failed to remove dependency:", err);
    }
  };

  const columns = [
    { id: "TODO", title: "To Do", bg: "bg-slate-100/70 dark:bg-slate-800/40" },
    { id: "IN_PROGRESS", title: "In Progress", bg: "bg-blue-50/50 dark:bg-blue-950/20" },
    { id: "COMPLETED", title: "Completed", bg: "bg-emerald-50/50 dark:bg-emerald-950/20" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks &amp; Dependency Pipeline</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your backlog, inspect task prerequisites, and track execution status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === "board"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Kanban Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === "graph"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Dependency Planner</span>
            </button>
          </div>

          {/* Plan My Day Action */}
          <button
            type="button"
            onClick={() => setPlanMyDayOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-semibold transition"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Plan My Day</span>
          </button>

          {/* New Task Action */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Recommended Next Task Card */}
      {recommendation?.recommendedTask && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  Recommended Next Task
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  {recommendation.recommendedTask.priority}
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                {recommendation.recommendedTask.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setWhyModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Why this task?</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange(recommendation.recommendedTask.id, "COMPLETED")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Done</span>
            </button>
          </div>
        </div>
      )}

      {/* Main View Area: Graph Canvas OR Board/List */}
      {viewMode === "graph" ? (
        <DependencyPlanner />
      ) : (
        <>
          {/* Filters Bar */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks by title or details..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Board View */}
          {viewMode === "board" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {columns.map((col) => {
                const columnTasks = tasks.filter((t) => t.status === col.id);
                return (
                  <div key={col.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs flex flex-col">
                    <div className={`p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between ${col.bg}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{col.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                          {columnTasks.length}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 space-y-3 min-h-[360px] max-h-[70vh] overflow-y-auto">
                      {columnTasks.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400">
                          No tasks in this stage.
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-400 transition space-y-2.5 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                  task.priority === "URGENT"
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                    : task.priority === "HIGH"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {task.priority}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setDepModalTask(task)}
                                  title="Manage Prerequisites"
                                  className="p-1 rounded text-slate-400 hover:text-purple-600 transition"
                                >
                                  <GitBranch className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task.id)}
                                  title="Delete Task"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            {/* Dependencies Pill */}
                            {task.dependencies?.length > 0 && (
                              <div className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                                <GitBranch className="w-3 h-3" />
                                <span>
                                  {task.dependencies.length} prerequisite(s):{" "}
                                  {task.dependencies.map((d: any) => d.dependsOnTask.title).join(", ")}
                                </span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                              {task.dueDate ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(task.dueDate)}
                                </span>
                              ) : (
                                <span>No deadline</span>
                              )}

                              {/* Quick Status Action */}
                              <div className="flex items-center gap-1">
                                {task.status !== "TODO" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(task.id, "TODO")}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                  >
                                    Todo
                                  </button>
                                )}
                                {task.status !== "IN_PROGRESS" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(task.id, "IN_PROGRESS")}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                  >
                                    Start
                                  </button>
                                )}
                                {task.status !== "COMPLETED" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(task.id, "COMPLETED")}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold"
                                  >
                                    Done
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No tasks found. Click "New Task" to create one.
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(task.id, task.status === "COMPLETED" ? "TODO" : "COMPLETED")
                        }
                        className="text-slate-400 hover:text-indigo-600"
                      >
                        {task.status === "COMPLETED" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-0.5">
                        <span className={`font-semibold block truncate ${task.status === "COMPLETED" ? "line-through text-slate-400" : ""}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>Priority: {task.priority}</span>
                          {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
                          {task.dependencies?.length > 0 && (
                            <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <GitBranch className="w-3 h-3" />
                              {task.dependencies.length} prereq(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDepModalTask(task)}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium"
                      >
                        Prerequisites
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Task Prerequisites Management Modal */}
      {depModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                <GitBranch className="w-4 h-4" />
                <span>Task Prerequisites &amp; Dependencies</span>
              </div>
              <button
                type="button"
                onClick={() => setDepModalTask(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-xs text-slate-400">Target Task:</span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                {depModalTask.title}
              </h3>
            </div>

            {depError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{depError}</span>
              </div>
            )}

            {/* Current Prerequisites List */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Current Prerequisites:
              </label>
              {!depModalTask.dependencies || depModalTask.dependencies.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No prerequisites. This task can run immediately.</p>
              ) : (
                <div className="space-y-1.5">
                  {depModalTask.dependencies.map((dep: any) => (
                    <div
                      key={dep.id}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {dep.dependsOnTask.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(dep.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="Remove link"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Prerequisite */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Add Prerequisite (Must complete before this task):
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedDepId}
                  onChange={(e) => setSelectedDepId(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                >
                  <option value="">Select a task...</option>
                  {tasks
                    .filter((t) => t.id !== depModalTask.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedDepId}
                  onClick={handleAddDependency}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-50"
                >
                  Add Link
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Circular dependencies are prevented automatically so tasks do not block each other in a loop.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Priority Explanation Modal */}
      <PriorityExplanationModal
        open={whyModalOpen}
        onClose={() => setWhyModalOpen(false)}
        task={recommendation?.recommendedTask}
      />

      {/* Plan My Day Modal */}
      <PlanMyDayModal
        open={planMyDayOpen}
        onClose={() => setPlanMyDayOpen(false)}
        onTaskUpdated={fetchTasks}
      />

      <QuickCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchTasks}
      />
    </div>
  );
}
