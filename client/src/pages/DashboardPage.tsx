import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import ActivityHeatmap, { ActivityDay } from "@/components/ui/activity-heatmap";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  GitBranch,
  Info,
  CalendarClock,
  Zap,
} from "lucide-react";
import PriorityExplanationModal from "@/components/planner/PriorityExplanationModal";
import PlanMyDayModal from "@/components/planner/PlanMyDayModal";

export default function DashboardPage() {
  const [range, setRange] = useState<"90" | "365">("90");
  const [heatmapDays, setHeatmapDays] = useState<ActivityDay[]>([]);
  const [heatmapPeriod, setHeatmapPeriod] = useState("the last 90 days");
  const [tasksByDate, setTasksByDate] = useState<Record<string, any[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [recommendation, setRecommendation] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [whyModalOpen, setWhyModalOpen] = useState(false);
  const [planMyDayOpen, setPlanMyDayOpen] = useState(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("plan") === "true"
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [activityRes, recRes, calendarRes, summaryRes] = await Promise.all([
        api.get(`/analytics/activity?range=${range}`),
        api.get("/scheduler/recommendations"),
        api.get("/calendar"),
        api.get("/analytics/summary"),
      ]);

      setHeatmapDays(activityRes.days || []);
      setHeatmapPeriod(activityRes.period || `the last ${range} days`);
      setTasksByDate(activityRes.tasksByDate || {});

      setRecommendation(recRes);
      setUpcomingEvents(calendarRes.events?.slice(0, 4) || []);
      setConflicts(calendarRes.conflicts || []);
      setSummary(summaryRes);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [range]);

  const handleMarkComplete = async (taskId: string) => {
    try {
      setCompletingTaskId(taskId);
      await api.patch(`/tasks/${taskId}`, { status: "COMPLETED" });
      await fetchDashboardData();
    } catch (err) {
      console.error("Failed to complete task:", err);
    } finally {
      setCompletingTaskId(null);
    }
  };

  const tasksOnSelectedDate = selectedDate ? tasksByDate[selectedDate] || [] : [];

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today's Workspace Overview</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Intelligent task scheduling, calendar conflict detection, and continuous progress tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPlanMyDayOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Plan My Day</span>
          </button>

          <button
            type="button"
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500">Tasks Completed</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary?.completedTasks ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">/ {summary?.totalTasks ?? 0}</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {summary?.completionRate ?? 0}% overall completion
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500">In Progress / Todo</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {(summary?.inProgressTasks ?? 0) + (summary?.todoTasks ?? 0)}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            {recommendation?.rankedQueue?.length ?? 0} ready to start
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500">Overdue Tasks</span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {summary?.overdueTasks ?? 0}
          </div>
          <div className="text-[11px] text-slate-400">Past target deadline</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500">Calendar Collisions</span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {conflicts.length}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Overlapping events flagged
          </div>
        </div>
      </div>

      {/* Recommended Next Task Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Zap className="w-4 h-4" />
            <span>Recommended Next Task</span>
          </div>

          <button
            type="button"
            onClick={() => setPlanMyDayOpen(true)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Plan Multiple Tasks for Today</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recommendation?.recommendedTask ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  {recommendation.recommendedTask.priority}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {recommendation.recommendedTask.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                {recommendation.recommendedTask.dueDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Due {formatDateTime(recommendation.recommendedTask.dueDate)}
                  </span>
                )}
                {recommendation.recommendedTask.estimatedMinutes && (
                  <span>Est: {recommendation.recommendedTask.estimatedMinutes} mins</span>
                )}
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Prerequisites completed
                </span>

                <button
                  type="button"
                  onClick={() => setWhyModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Why this task?</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={completingTaskId === recommendation.recommendedTask.id}
              onClick={() => handleMarkComplete(recommendation.recommendedTask.id)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition whitespace-nowrap self-start md:self-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{completingTaskId ? "Marking..." : "Mark as Completed"}</span>
            </button>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-slate-500">
            No pending tasks ready for execution. All backlog tasks completed or waiting on prerequisites!
          </div>
        )}

        <PriorityExplanationModal
          open={whyModalOpen}
          onClose={() => setWhyModalOpen(false)}
          task={recommendation?.recommendedTask}
        />
      </div>

      {/* Main Grid: Activity Heatmap (Component A from EXACT PROMPT 1) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Your Activity</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real persisted task completions mapped day-by-day. Zero-filled for gaps.
            </p>
          </div>

          {/* Range Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setRange("90")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                range === "90"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              90 Days
            </button>
            <button
              type="button"
              onClick={() => setRange("365")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                range === "365"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              365 Days
            </button>
          </div>
        </div>

        {/* Activity Heatmap Component */}
        <div className="overflow-x-auto py-2">
          {heatmapDays.length > 0 ? (
            <ActivityHeatmap
              days={heatmapDays}
              label={`Completed tasks in ${heatmapPeriod}`}
              period={heatmapPeriod}
              unit={{ one: "task completed", other: "tasks completed" }}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
            />
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">Loading activity heatmap...</div>
          )}
        </div>

        {/* Date Inspector Callback Panel */}
        {selectedDate && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 animate-in fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tasks Completed on {formatDate(selectedDate)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                  {tasksOnSelectedDate.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear selection
              </button>
            </div>

            {tasksOnSelectedDate.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No tasks completed on this calendar day.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {tasksOnSelectedDate.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="truncate">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                        {t.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Done"}
                      </span>
                    </div>
                    {t.category && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded text-white shrink-0 font-medium"
                        style={{ backgroundColor: t.category.color }}
                      >
                        {t.category.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two Column Layout: Upcoming Events & Task Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events & Conflicts */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm">Upcoming Calendar Events</h3>
            </div>
            <Link to="/calendar" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              View Calendar
            </Link>
          </div>

          {/* Conflict Alert Banner if detected */}
          {conflicts.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{conflicts.length} Overlapping Conflict(s) Detected</span>
              </div>
              {conflicts.slice(0, 2).map((c, i) => (
                <p key={i} className="text-[11px] pl-5">
                  &bull; {c.description}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No upcoming events scheduled.</p>
            ) : (
              upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {ev.title}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(ev.startTime)} - {new Date(ev.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {ev.category && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: ev.category.color }}
                    >
                      {ev.category.name}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Blocked Tasks (Waiting on Prerequisites) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-sm">Tasks Waiting on Prerequisites</h3>
            </div>
            <Link to="/planner" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              Dependency Planner
            </Link>
          </div>

          <p className="text-xs text-slate-500">
            Tasks with unmet prerequisites. They unlock automatically as prerequisite tasks are marked completed.
          </p>

          <div className="space-y-2">
            {!recommendation?.blockedTasks || recommendation.blockedTasks.length === 0 ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 py-4 text-center font-medium">
                No blocked tasks! All ready tasks can be scheduled.
              </p>
            ) : (
              recommendation.blockedTasks.map((bt: any) => (
                <div
                  key={bt.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{bt.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                      BLOCKED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Waiting on:{" "}
                    {bt.blockedBy.map((b: any) => (
                      <span key={b.id} className="font-medium text-slate-700 dark:text-slate-300 mr-2">
                        &bull; {b.title} ({b.status})
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Plan My Day Modal */}
      <PlanMyDayModal
        open={planMyDayOpen}
        onClose={() => setPlanMyDayOpen(false)}
        onTaskUpdated={fetchDashboardData}
      />
    </div>
  );
}
