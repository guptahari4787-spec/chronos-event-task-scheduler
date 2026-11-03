import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { X, CheckSquare, Calendar as CalendarIcon, AlertTriangle, CheckCircle2, Sparkles, Clock } from "lucide-react";

interface QuickCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickCreateModal({ open, onClose, onSuccess }: QuickCreateModalProps) {
  const [tab, setTab] = useState<"task" | "event">("task");
  const [categories, setCategories] = useState<any[]>([]);
  const [existingTasks, setExistingTasks] = useState<any[]>([]);

  // Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDuration, setTaskDuration] = useState("60");
  const [taskCategory, setTaskCategory] = useState("");
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);

  // Event Form State
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventCategory, setEventCategory] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventReminder, setEventReminder] = useState("15");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setError(null);
      setConflictWarning([]);
      api.get("/categories").then((data) => {
        setCategories(data.categories || []);
        if (data.categories?.length > 0) {
          setTaskCategory(data.categories[0].id);
          setEventCategory(data.categories[0].id);
        }
      });
      api.get("/tasks?status=TODO&limit=50").then((data) => {
        setExistingTasks(data.tasks || []);
      });

      // Default start time: next hour
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const endHour = new Date(nextHour);
      endHour.setHours(endHour.getHours() + 1);

      const toLocalISO = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
      };

      setEventStart(toLocalISO(nextHour));
      setEventEnd(toLocalISO(endHour));
      setTaskDueDate(toLocalISO(endHour));
    }
  }, [open]);

  // Check event conflict whenever event times change
  useEffect(() => {
    if (tab === "event" && eventStart && eventEnd && eventTitle) {
      const s = new Date(eventStart).getTime();
      const e = new Date(eventEnd).getTime();
      if (s < e) {
        // Query calendar events around this window
        api
          .get(`/calendar?from=${new Date(s - 86400000).toISOString()}&to=${new Date(e + 86400000).toISOString()}`)
          .then((res) => {
            const events = res.events || [];
            const overlaps: any[] = [];
            for (const ev of events) {
              const evS = new Date(ev.startTime).getTime();
              const evE = new Date(ev.endTime).getTime();
              // Boundary touch check: ends at or before start, or starts at or after end -> no overlap
              if (Math.max(s, evS) < Math.min(e, evE)) {
                const overlapMins = Math.round((Math.min(e, evE) - Math.max(s, evS)) / 60000);
                overlaps.push({
                  title: ev.title,
                  overlapMins,
                });
              }
            }
            setConflictWarning(overlaps);
          })
          .catch(() => {});
      }
    }
  }, [tab, eventStart, eventEnd, eventTitle]);

  const [suggestingSlot, setSuggestingSlot] = useState(false);
  const [freeSlotMessage, setFreeSlotMessage] = useState<string | null>(null);

  const handleSuggestFreeSlot = async () => {
    try {
      setSuggestingSlot(true);
      setFreeSlotMessage(null);
      const targetDate = eventStart ? eventStart.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const res = await api.get(`/calendar/free-slots?date=${targetDate}&durationMinutes=60`);

      if (res.freeSlots && res.freeSlots.length > 0) {
        const slot = res.freeSlots[0];
        const toLocalISO = (d: Date) => {
          const offset = d.getTimezoneOffset() * 60000;
          return new Date(d.getTime() - offset).toISOString().slice(0, 16);
        };
        const s = new Date(slot.startTime);
        const e = new Date(slot.endTime);
        // Default to a 60-min window within that slot
        const eventEndCalc = new Date(Math.min(e.getTime(), s.getTime() + 60 * 60000));

        setEventStart(toLocalISO(s));
        setEventEnd(toLocalISO(eventEndCalc));
        setConflictWarning([]);
        setFreeSlotMessage(`Applied gap slot: ${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${eventEndCalc.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Sort-and-Sweep gap engine)`);
      } else {
        setFreeSlotMessage("No 60-minute continuous gap found in standard workday hours (09:00 - 18:00).");
      }
    } catch (err: any) {
      console.error("Failed to suggest free slot:", err);
      setFreeSlotMessage("Failed to query free slots.");
    } finally {
      setSuggestingSlot(false);
    }
  };

  if (!open) return null;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/tasks", {
        title: taskTitle,
        description: taskDesc || undefined,
        priority: taskPriority,
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        estimatedMinutes: taskDuration ? parseInt(taskDuration, 10) : null,
        categoryId: taskCategory || null,
        dependencyIds: selectedDeps,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/events", {
        title: eventTitle,
        description: eventDesc || undefined,
        startTime: new Date(eventStart).toISOString(),
        endTime: new Date(eventEnd).toISOString(),
        categoryId: eventCategory || null,
        location: eventLocation || undefined,
        remindMinutesBefore: eventReminder ? parseInt(eventReminder, 10) : undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with tabs */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTab("task")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === "task"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("event")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === "event"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Schedule Event</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Task Form */}
        {tab === "task" && (
          <form onSubmit={handleCreateTask} className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Implement Graph Cycle Detection"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Est. Minutes
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={taskDuration}
                  onChange={(e) => setTaskDuration(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Prerequisites (DAG Dependencies)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                This task will remain blocked until selected prerequisites are marked completed.
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 border border-slate-200 dark:border-slate-700 rounded-lg">
                {existingTasks.length === 0 ? (
                  <span className="text-xs text-slate-400">No active tasks available to depend on.</span>
                ) : (
                  existingTasks.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        checked={selectedDeps.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDeps([...selectedDeps, t.id]);
                          } else {
                            setSelectedDeps(selectedDeps.filter((id) => id !== t.id));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate">{t.title}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">({t.priority})</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Key details, acceptance criteria, or viva notes..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {loading ? "Creating..." : "Save Task"}
              </button>
            </div>
          </form>
        )}

        {/* Event Form */}
        {tab === "event" && (
          <form onSubmit={handleCreateEvent} className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g. Project Viva Defense Presentation"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Event Schedule Time *
                </span>
                <button
                  type="button"
                  disabled={suggestingSlot}
                  onClick={handleSuggestFreeSlot}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>{suggestingSlot ? "Calculating..." : "Suggest Free Slot"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="datetime-local"
                    required
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <input
                    type="datetime-local"
                    required
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Free Slot Notification */}
            {freeSlotMessage && (
              <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{freeSlotMessage}</span>
              </div>
            )}

            {/* Live Interval Conflict Warning */}
            {conflictWarning.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Interval Conflict Detected by Sort &amp; Sweep Algorithm:</span>
                </div>
                {conflictWarning.map((cw, i) => (
                  <p key={i} className="text-[11px] pl-5">
                    &bull; Overlaps with <strong>"{cw.title}"</strong> by {cw.overlapMins} minutes.
                  </p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reminder
                </label>
                <select
                  value={eventReminder}
                  onChange={(e) => setEventReminder(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="0">No reminder</option>
                  <option value="5">5 minutes before</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                  <option value="1440">1 day before</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Location (Optional)
              </label>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="e.g. Lab 4B / Google Meet"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
                placeholder="Agenda, attendees, or preparation notes..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {loading ? "Scheduling..." : "Schedule Event"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
