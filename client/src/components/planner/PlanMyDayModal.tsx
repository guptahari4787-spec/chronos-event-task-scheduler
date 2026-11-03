import React, { useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  Sparkles,
  X,
  ArrowRight,
  AlertCircle,
  Play,
} from "lucide-react";

interface PlanMyDayModalProps {
  open: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export default function PlanMyDayModal({
  open,
  onClose,
  onTaskUpdated,
}: PlanMyDayModalProps) {
  const [availableMinutes, setAvailableMinutes] = useState<number>(120);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const presets = [30, 60, 90, 120, 180, 240];

  const handleGeneratePlan = async (minutesToPlan = availableMinutes) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post("/scheduler/plan-my-day", {
        availableMinutes: minutesToPlan,
      });
      setPlan(res);
    } catch (err: any) {
      console.error("Failed to plan day:", err);
      setError(err.message || "Failed to generate schedule.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status: "COMPLETED" });
      if (onTaskUpdated) onTaskUpdated();
      // Re-run plan with same duration
      await handleGeneratePlan();
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-5 text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 font-bold text-base">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60">
              <CalendarClock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Plan My Day
              </h2>
              <p className="text-xs font-normal text-slate-500">
                Optimize your day based on available time, task readiness, and deadlines.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time Selector */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            How much focused work time do you have today?
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            {presets.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  setAvailableMinutes(mins);
                  handleGeneratePlan(mins);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  availableMinutes === mins
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                }`}
              >
                {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                {mins % 60 !== 0 && mins > 60 ? ` ${mins % 60}m` : ""}
              </button>
            ))}

            <div className="flex items-center gap-1.5 ml-auto">
              <input
                type="number"
                min="15"
                max="720"
                step="15"
                value={availableMinutes}
                onChange={(e) => setAvailableMinutes(Math.max(15, parseInt(e.target.value) || 15))}
                className="w-18 px-2 py-1 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              />
              <span className="text-xs text-slate-500 font-medium">mins</span>
              <button
                type="button"
                onClick={() => handleGeneratePlan(availableMinutes)}
                disabled={loading}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {loading ? "Planning..." : "Apply"}
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Plan Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {!plan && !loading && (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Ready to plan your day</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Click a time preset above or enter your available minutes to get an optimal schedule of ready tasks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleGeneratePlan(availableMinutes)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <span>Generate Plan for {availableMinutes} Minutes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {plan && (
            <>
              {/* Summary Stats Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 to-purple-50/60 dark:from-indigo-950/40 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Your Tailored Day Plan
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {plan.totalPlannedMinutes} / {plan.availableMinutes} min planned
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {plan.summaryReason}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (plan.totalPlannedMinutes / plan.availableMinutes) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Selected Tasks List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Scheduled Tasks ({plan.selectedTasks?.length || 0})
                </span>

                {(!plan.selectedTasks || plan.selectedTasks.length === 0) ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    No unblocked tasks found that fit into this time slot. Try selecting more time or completing prerequisite tasks first.
                  </div>
                ) : (
                  plan.selectedTasks.map((task: any, index: number) => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                              {task.title}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                                task.priority === "URGENT"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : task.priority === "HIGH"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {task.durationMinutes} mins
                            </span>
                            {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                            {task.categoryName && (
                              <span className="text-slate-500 font-medium">
                                {task.categoryName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCompleteTask(task.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] transition shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400">
          <span>Only ready tasks with 0 unmet prerequisites are scheduled.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
