import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatDateTime, formatDate } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Clock,
  MapPin,
  Trash2,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import QuickCreateModal from "@/components/layout/QuickCreateModal";

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [tasksWithDeadlines, setTasksWithDeadlines] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [freeSlots, setFreeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      // Query 30 days before and after currentDate
      const from = new Date(currentDate.getTime() - 30 * 86400000).toISOString();
      const to = new Date(currentDate.getTime() + 30 * 86400000).toISOString();
      const dateStr = currentDate.toISOString().slice(0, 10);

      const [res, freeRes] = await Promise.all([
        api.get(`/calendar?from=${from}&to=${to}`),
        api.get(`/calendar/free-slots?date=${dateStr}&durationMinutes=30`),
      ]);

      setEvents(res.events || []);
      setTasksWithDeadlines(res.tasksWithDeadlines || []);
      setConflicts(res.conflicts || []);
      setFreeSlots(freeRes.freeSlots || []);
    } catch (err) {
      console.error("Failed to fetch calendar feed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [currentDate]);

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.delete(`/events/${id}`);
      await fetchCalendar();
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  const navigateDate = (delta: number) => {
    const next = new Date(currentDate);
    if (view === "month") {
      next.setMonth(next.getMonth() + delta);
    } else if (view === "week") {
      next.setDate(next.getDate() + delta * 7);
    } else {
      next.setDate(next.getDate() + delta);
    }
    setCurrentDate(next);
  };

  const conflictingEventIds = new Set(
    conflicts.flatMap((c) => [c.eventA.id, c.eventB.id])
  );

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar &amp; Interval Engine</h1>
          <p className="text-xs text-slate-500 mt-1">
            Schedule events, track task deadlines, and monitor real-time interval collisions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Navigation Controls */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => navigateDate(-1)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Previous range"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => navigateDate(1)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Next range"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {(["week", "day", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-lg capitalize transition ${
                  view === v
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Event</span>
          </button>
        </div>
      </div>

      {/* Conflicts Banner (Sort-and-Sweep) */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Sort-and-Sweep Interval Overlap Warnings ({conflicts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {conflicts.map((c, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/60 text-slate-800 dark:text-slate-200"
              >
                <div className="font-semibold text-amber-900 dark:text-amber-200">
                  {c.overlapMinutes} min conflict
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  "{c.eventA.title}" overlaps with "{c.eventB.title}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free Slots Strip (DSA System C MergeSort + Sweep Gaps) */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Available Focus Gaps</span>
          </div>
          <span className="text-[11px] text-slate-500">Standard Workday (09:00 &ndash; 18:00)</span>
        </div>

        {freeSlots.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No free 30+ min continuous gaps remaining on this date.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {freeSlots.map((slot, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs flex items-center gap-2 shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{slot.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold">
                  {slot.durationMinutes}m FREE
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar Grid Representation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <span className="font-bold text-base">
            {currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Event
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Conflicting Event
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Task Deadline
            </span>
          </div>
        </div>

        {/* Schedule List / Events Feed */}
        <div className="space-y-4">
          {events.length === 0 && tasksWithDeadlines.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No events or task deadlines scheduled in this window. Click "Schedule Event" to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Event Cards */}
              {events.map((ev) => {
                const isConflict = conflictingEventIds.has(ev.id);
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-xl border transition ${
                      isConflict
                        ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {isConflict && (
                            <span title="Interval Overlap Detected">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            </span>
                          )}
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                            {ev.title}
                          </h4>
                        </div>
                        {ev.category && (
                          <span
                            className="inline-block text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                            style={{ backgroundColor: ev.category.color }}
                          >
                            {ev.category.name}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatDateTime(ev.startTime)} -{" "}
                          {new Date(ev.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Task Deadline Cards */}
              {tasksWithDeadlines.map((t) => (
                <div
                  key={`task-${t.id}`}
                  className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Task Deadline</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold">
                      {t.priority}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    {t.title}
                  </h4>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Due {formatDateTime(t.dueDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <QuickCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchCalendar}
      />
    </div>
  );
}
