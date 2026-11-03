import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  LayoutDashboard,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
  Clock,
  AlertTriangle,
  GitBranch,
  Sparkles,
} from "lucide-react";
import QuickCreateModal from "./QuickCreateModal";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  const fetchNotificationCount = async () => {
    try {
      const data = await api.get("/notifications");
      setUnreadCount(data.unreadCount || 0);
      setRecentNotifications(data.notifications?.slice(0, 5) || []);
    } catch {
      // Ignore background poll errors
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotificationCount();
      const interval = setInterval(fetchNotificationCount, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Calendar", path: "/calendar", icon: CalendarIcon },
    { name: "Tasks & Board", path: "/tasks", icon: CheckSquare },
    { name: "Dependency Planner", path: "/planner", icon: GitBranch },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Notifications", path: "/notifications", icon: Bell, count: unreadCount },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Bar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5 font-semibold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-indigo-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <span>CHRONOS</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Create Button */}
          <button
            type="button"
            onClick={() => setQuickCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Event / Task</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-sm">Notifications</span>
                  <Link
                    to="/notifications"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    View all
                  </Link>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {recentNotifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    recentNotifications.map((n) => (
                      <div key={n.id} className="p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                          {n.type === "CONFLICT" && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                          <span>{n.title}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold leading-tight">{user?.name || "Alex Mercer"}</span>
              <span className="text-[11px] text-slate-400 leading-tight">{user?.email || "alex@chronos.io"}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 fixed md:static inset-y-16 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out`}
        >
          <div className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${active ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                    <span>{item.name}</span>
                  </div>
                  {typeof item.count === "number" && item.count > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-bold">
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Clean Workspace Status Box */}
          <div className="p-4 m-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Workspace Active</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Task dependencies, schedule optimization, and calendar sync are running smoothly.
            </p>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Quick Create Dialog */}
      <QuickCreateModal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} />
    </div>
  );
}
