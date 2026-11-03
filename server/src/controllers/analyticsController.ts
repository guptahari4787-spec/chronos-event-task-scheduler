import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";

export class AnalyticsController {
  public static async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { range = "90", from, to } = req.query;

      let startDate: Date;
      let endDate: Date = new Date();

      if (from && to) {
        startDate = new Date(from as string);
        endDate = new Date(to as string);
      } else {
        const daysCount = parseInt(range as string, 10) || 90;
        startDate = new Date();
        startDate.setUTCDate(startDate.getUTCDate() - (daysCount - 1));
      }

      // Normalize to start of day UTC
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);

      // Fetch completed tasks in this window
      const completedTasks = await prisma.task.findMany({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          title: true,
          priority: true,
          completedAt: true,
          category: { select: { id: true, name: true, color: true } },
        },
        orderBy: { completedAt: "asc" },
      });

      // Group counts and task items by YYYY-MM-DD
      const countsMap = new Map<string, number>();
      const tasksMap: Record<string, any[]> = {};

      for (const t of completedTasks) {
        if (!t.completedAt) continue;
        const dayStr = t.completedAt.toISOString().slice(0, 10);
        countsMap.set(dayStr, (countsMap.get(dayStr) || 0) + 1);

        if (!tasksMap[dayStr]) tasksMap[dayStr] = [];
        tasksMap[dayStr].push(t);
      }

      // Generate continuous daily range (oldest first, zero-filled for missing dates)
      const days: { date: string; count: number }[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const dayKey = current.toISOString().slice(0, 10);
        days.push({
          date: dayKey,
          count: countsMap.get(dayKey) || 0,
        });
        current.setUTCDate(current.getUTCDate() + 1);
      }

      const totalCompleted = completedTasks.length;
      const periodLabel = range === "365" ? "the last year" : `the last ${days.length} days`;

      res.json({
        days,
        totalCompleted,
        period: periodLabel,
        tasksByDate: tasksMap,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const now = new Date();

      const [allTasks, allEvents, categories] = await Promise.all([
        prisma.task.findMany({
          where: { userId },
          include: { category: true },
        }),
        prisma.event.findMany({
          where: { userId },
          include: { category: true },
        }),
        prisma.category.findMany({
          where: { userId },
        }),
      ]);

      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter((t) => t.status === "COMPLETED").length;
      const inProgressTasks = allTasks.filter((t) => t.status === "IN_PROGRESS").length;
      const todoTasks = allTasks.filter((t) => t.status === "TODO").length;

      const overdueTasks = allTasks.filter(
        (t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate) < now
      ).length;

      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Category breakdown
      const categoryMap = new Map<string, { name: string; color: string; count: number }>();
      for (const cat of categories) {
        categoryMap.set(cat.id, { name: cat.name, color: cat.color, count: 0 });
      }

      for (const t of allTasks) {
        if (t.categoryId && categoryMap.has(t.categoryId)) {
          categoryMap.get(t.categoryId)!.count++;
        }
      }

      // Time tracking: estimated vs actual minutes
      let totalEstimated = 0;
      let totalActual = 0;
      for (const t of allTasks) {
        if (t.estimatedMinutes) totalEstimated += t.estimatedMinutes;
        if (t.actualMinutes) totalActual += t.actualMinutes;
      }

      res.json({
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        overdueTasks,
        completionRate,
        totalEvents: allEvents.length,
        categoryDistribution: Array.from(categoryMap.values()),
        timeTracking: {
          totalEstimatedHours: Number((totalEstimated / 60).toFixed(1)),
          totalActualHours: Number((totalActual / 60).toFixed(1)),
          varianceHours: Number(((totalActual - totalEstimated) / 60).toFixed(1)),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
