import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { BarChart3, TrendingUp, CheckCircle, Clock, PieChart, RefreshCw } from "lucide-react";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get("/analytics/summary");
      setSummary(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productivity &amp; Velocity Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track completion trends, estimate accuracy, and category distribution over time.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold self-start sm:self-auto hover:bg-slate-100"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500">Completed Rate</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary?.completionRate ?? 0}%
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {summary?.completedTasks ?? 0} out of {summary?.totalTasks ?? 0} tasks
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500">Estimated Effort</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary?.timeTracking?.totalEstimatedHours ?? 0}h
          </div>
          <span className="text-[11px] text-slate-400">Total planned duration</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500">Actual Logged</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary?.timeTracking?.totalActualHours ?? 0}h
          </div>
          <span className="text-[11px] text-indigo-600 font-medium">
            Variance: {summary?.timeTracking?.varianceHours ?? 0}h
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500">Calendar Events</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary?.totalEvents ?? 0}
          </div>
          <span className="text-[11px] text-slate-400">Scheduled commitments</span>
        </div>
      </div>

      {/* Category Distribution Breakdown */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm">Workload Distribution by Category</h3>
        <div className="space-y-3">
          {summary?.categoryDistribution?.map((cat: any, i: number) => {
            const total = summary.totalTasks || 1;
            const pct = Math.round((cat.count / total) * 100);
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {cat.count} tasks ({pct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
