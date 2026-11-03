import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { ConflictService } from "../services/conflictService";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start time"),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end time"),
  categoryId: z.string().nullable().optional(),
  location: z.string().optional(),
  timezone: z.string().optional().default("UTC"),
  remindMinutesBefore: z.number().int().positive().optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start time").optional(),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end time").optional(),
  categoryId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  timezone: z.string().optional(),
});

export class EventController {
  public static async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { from, to, categoryId } = req.query;

      const where: any = { userId };
      if (categoryId) where.categoryId = categoryId;

      if (from || to) {
        where.AND = [];
        if (from) where.AND.push({ endTime: { gte: new Date(from as string) } });
        if (to) where.AND.push({ startTime: { lte: new Date(to as string) } });
      }

      const events = await prisma.event.findMany({
        where,
        include: { category: true, reminders: true },
        orderBy: { startTime: "asc" },
      });

      res.json({ events });
    } catch (err) {
      next(err);
    }
  }

  public static async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        title,
        description,
        startTime,
        endTime,
        categoryId,
        location,
        timezone,
        remindMinutesBefore,
      } = req.body;

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (end <= start) {
        res.status(400).json({
          error: "ValidationError",
          message: "Event end time must be after start time.",
        });
        return;
      }

      // Check conflicts using Sort-and-Sweep
      const conflicts = await ConflictService.checkEventConflict(userId, {
        title,
        startTime: start,
        endTime: end,
      });

      const event = await prisma.$transaction(async (tx) => {
        const newEvent = await tx.event.create({
          data: {
            userId,
            title,
            description,
            startTime: start,
            endTime: end,
            categoryId,
            location,
            timezone,
          },
        });

        if (remindMinutesBefore) {
          const remindAt = new Date(start.getTime() - remindMinutesBefore * 60 * 1000);
          if (remindAt > new Date()) {
            await tx.reminder.create({
              data: {
                eventId: newEvent.id,
                remindAt,
                channel: "IN_APP",
                idempotencyKey: `event-${newEvent.id}-${remindAt.getTime()}`,
              },
            });
          }
        }

        return newEvent;
      });

      const fullEvent = await prisma.event.findUnique({
        where: { id: event.id },
        include: { category: true, reminders: true },
      });

      res.status(201).json({
        event: fullEvent,
        conflicts,
        hasConflicts: conflicts.length > 0,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const event = await prisma.event.findFirst({
        where: { id, userId },
        include: { category: true, reminders: true },
      });

      if (!event) {
        res.status(404).json({ error: "NotFoundError", message: "Event not found." });
        return;
      }

      res.json({ event });
    } catch (err) {
      next(err);
    }
  }

  public static async updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const data = req.body;

      const existing = await prisma.event.findFirst({ where: { id, userId } });
      if (!existing) {
        res.status(404).json({ error: "NotFoundError", message: "Event not found." });
        return;
      }

      const newStart = data.startTime ? new Date(data.startTime) : existing.startTime;
      const newEnd = data.endTime ? new Date(data.endTime) : existing.endTime;

      if (newEnd <= newStart) {
        res.status(400).json({
          error: "ValidationError",
          message: "Event end time must be after start time.",
        });
        return;
      }

      // Check conflicts
      const conflicts = await ConflictService.checkEventConflict(userId, {
        id,
        title: data.title || existing.title,
        startTime: newStart,
        endTime: newEnd,
      });

      const updated = await prisma.event.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          ...(data.location !== undefined && { location: data.location }),
          ...(data.timezone && { timezone: data.timezone }),
          startTime: newStart,
          endTime: newEnd,
        },
        include: { category: true, reminders: true },
      });

      res.json({
        event: updated,
        conflicts,
        hasConflicts: conflicts.length > 0,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const existing = await prisma.event.findFirst({ where: { id, userId } });
      if (!existing) {
        res.status(404).json({ error: "NotFoundError", message: "Event not found." });
        return;
      }

      await prisma.event.delete({ where: { id } });
      res.json({ message: "Event deleted successfully." });
    } catch (err) {
      next(err);
    }
  }
}
