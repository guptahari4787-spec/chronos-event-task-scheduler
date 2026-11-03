import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import PolaroidLineCarousel, { Slide } from "@/components/ui/polaroid-line-carousel";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  GitBranch,
  Layers,
  Database,
  CalendarClock,
  ArrowUpDown,
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();

  // Curated Chronos-themed slides demonstrating the product ethos
  const slides: Slide[] = [
    {
      title: "Plan with Clarity",
      caption: "See your day and upcoming commitments at a glance.",
      palette: "alpine",
      seed: 4,
    },
    {
      title: "Prioritize What Matters",
      caption: "Optimize high-impact tasks and deadlines based on your available focus time.",
      palette: "dusk",
      seed: 12,
    },
    {
      title: "Respect Your Time",
      caption: "Detect calendar overlaps and claim continuous focus blocks.",
      palette: "mist",
      seed: 19,
    },
    {
      title: "Build Momentum",
      caption: "Track completed tasks and productive streaks with the Activity Heatmap.",
      palette: "dawn",
      seed: 27,
    },
    {
      title: "Never Miss a Deadline",
      caption: "Prerequisite dependency chains ensure tasks unlock in the right order.",
      palette: "alpine",
      seed: 42,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Navigation */}
      <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm shadow-sm shadow-indigo-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <span>CHRONOS</span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition inline-flex items-center gap-1.5"
            >
              <span>Go to App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-12 px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Smarter Task &amp; Event Management</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
          The Intelligent Calendar &amp; Task Engine Built for High Output.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Chronos synchronizes your commitments, organizes task prerequisites with dependency graphs, and optimizes your day's schedule in real time.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 transition"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 transition"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition"
              >
                <span>Sign In Demo (alex@chronos.io)</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Polaroid Line Carousel (Integrated component from EXACT PROMPT 2) */}
      <section className="py-6 px-4 md:px-8 max-w-6xl mx-auto w-full">
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-[#f5f2eb] dark:bg-[#181716]">
          <PolaroidLineCarousel
            slides={slides}
            height={460}
            cardWidth={260}
            sag={40}
            swing={0.8}
            autoplay={5000}
            background="transparent"
            ariaLabel="Chronos core principles gallery"
          />
        </div>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3 font-mono">
          &uarr; Drag the string or use &larr; / &rarr; keys to inspect Chronos core design principles.
        </p>
      </section>

      {/* Core Architectural Pillars */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            How Chronos Powers Everyday Scheduling
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Practical algorithms and relational database integrity quietly doing the heavy lifting in the background.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">Merge Sort Ordering</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Provides guaranteed stable ordering across calendar feeds, event timelines, and task priority queues with consistent tie-breaking.
            </p>
            <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold pt-1">
              Time: O(n log n) &bull; Stable
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <GitBranch className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">Dependency Graph</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              DFS cycle detection prevents circular locks, while BFS traverses downstream dependents upon completion to unlock ready tasks.
            </p>
            <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold pt-1">
              Traversal: O(V + E)
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <CalendarClock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">Plan My Day (0/1 DP)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dynamic programming algorithm selects the optimal subset of ready tasks that maximize priority and deadline urgency within your time budget.
            </p>
            <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold pt-1">
              Knapsack DP: O(n &bull; W)
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">PostgreSQL 18 ACID</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              All schedule changes, prerequisite edges, and completions are stored under strict relational constraints with cascading updates.
            </p>
            <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
              ACID Compliant &bull; Relational
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-8 px-6 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} Chronos Scheduling Systems. All rights reserved.</p>
      </footer>
    </div>
  );
}
