import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { ConflictService } from "../services/conflictService";
import { MergeSort } from "../dsa/MergeSort";

export class CalendarController {
  /**
   * Calendar Feed
   * Syllabus: Unit I, Chapter 1.2 — Merge Sort for Event and Task Ordering
   * 
   * Fetches events & tasks for target range from PostgreSQL, then applies
   * MergeSort in memory with deterministic tie-breaking.
   */
  public static async getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { from, to } = req.query;

      const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const [events, tasks, conflicts] = await Promise.all([
        prisma.event.findMany({
          where: {
            userId,
            AND: [
              { endTime: { gte: fromDate } },
              { startTime: { lte: toDate } },
            ],
          },
          include: { category: true },
        }),
        prisma.task.findMany({
          where: {
            userId,
            dueDate: {
              gte: fromDate,
              lte: toDate,
            },
          },
          include: { category: true },
        }),
        ConflictService.getUserConflicts(userId, fromDate, toDate),
      ]);

      // Custom MergeSort for Calendar Events (Start Time -> End Time -> Title)
      const sortedEvents = MergeSort.sort(events, (a, b) => {
        const startDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (startDiff !== 0) return startDiff;
        const endDiff = new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
        if (endDiff !== 0) return endDiff;
        return a.title.localeCompare(b.title);
      });

      // Custom MergeSort for Tasks by Deadline -> Priority -> Title
      const sortedTasks = MergeSort.sort(tasks, (a, b) => {
        const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (dueA !== dueB) return dueA - dueB;

        const pWeight: Record<string, number> = { URGENT: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
        const pwA = pWeight[a.priority] || 3;
        const pwB = pWeight[b.priority] || 3;
        if (pwA !== pwB) return pwA - pwB;

        return a.title.localeCompare(b.title);
      });

      res.json({
        events: sortedEvents,
        tasksWithDeadlines: sortedTasks,
        conflicts,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Free-Time Slots Finder
   * GET /api/calendar/free-slots?date=YYYY-MM-DD&durationMinutes=60
   */
  public static async getFreeSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { date, durationMinutes = "30" } = req.query;

      const targetDate = (date as string) || new Date().toISOString().slice(0, 10);
      const duration = parseInt(durationMinutes as string, 10) || 30;

      const result = await ConflictService.getFreeSlots(userId, targetDate, duration);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
