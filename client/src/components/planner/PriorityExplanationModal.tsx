import React from "react";
import { X, CheckCircle2, Clock, Calendar, Sparkles } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface PriorityExplanationModalProps {
  open: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    priority: string;
    dueDate?: Date | string | null;
    estimatedMinutes?: number | null;
    score?: number;
    explanation?: string;
  } | null;
}

export default function PriorityExplanationModal({
  open,
  onClose,
  task,
}: PriorityExplanationModalProps) {
  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Task Scheduling Rationale</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Title */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Recommended Task
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                task.priority === "URGENT"
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  : task.priority === "HIGH"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {task.priority}
            </span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {task.title}
            </h3>
          </div>
        </div>

        {/* Rationale Factors */}
        <div className="space-y-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Prerequisites Completed</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-6">
              All tasks this item depends on have been finished. It is fully ready for execution.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Priority &amp; Deadline Urgency</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-6">
              {task.dueDate
                ? `Due on ${formatDateTime(task.dueDate)}. Ranked ahead of lower priority tasks.`
                : `Set as ${task.priority} priority with no blocking predecessors.`}
            </p>
          </div>

          {task.estimatedMinutes && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Estimated Duration</span>
              </div>
              <p className="text-[11px] text-slate-500 pl-6">
                Estimated at {task.estimatedMinutes} minutes.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
