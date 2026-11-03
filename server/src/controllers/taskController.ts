import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { DependencyGraph } from "../dsa/DependencyGraph";
import { MergeSort } from "../dsa/MergeSort";
import { SchedulerService } from "../services/schedulerService";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional().default("TODO"),
  dueDate: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  dependencyIds: z.array(z.string()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  dueDate: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  actualMinutes: z.number().int().nonnegative().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

export class TaskController {
  public static async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { status, priority, categoryId, search, page = "1", limit = "50" } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const take = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * take;

      const where: any = { userId };
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (categoryId) where.categoryId = categoryId;
      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: "insensitive" } },
          { description: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          include: {
            category: true,
            dependencies: {
              include: {
                dependsOnTask: {
                  select: { id: true, title: true, status: true, priority: true },
                },
              },
            },
            dependentOn: {
              include: {
                task: {
                  select: { id: true, title: true, status: true, priority: true },
                },
              },
            },
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          skip,
          take,
        }),
        prisma.task.count({ where }),
      ]);

      // Custom MergeSort (Syllabus: Unit I, Chapter 1.2) for stable task ordering
      const sortedTasks = MergeSort.sort(tasks, (a, b) => {
        const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (dueA !== dueB) return dueA - dueB;

        const pRank: Record<string, number> = { URGENT: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
        const prA = pRank[a.priority] || 3;
        const prB = pRank[b.priority] || 3;
        if (prA !== prB) return prA - prB;

        return a.title.localeCompare(b.title);
      });

      res.json({
        tasks: sortedTasks,
        pagination: {
          page: pageNum,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        title,
        description,
        priority,
        status,
        dueDate,
        estimatedMinutes,
        categoryId,
        dependencyIds,
      } = req.body;

      const task = await prisma.$transaction(async (tx) => {
        const newTask = await tx.task.create({
          data: {
            userId,
            title,
            description,
            priority,
            status,
            dueDate: dueDate ? new Date(dueDate) : null,
            estimatedMinutes,
            categoryId,
            completedAt: status === "COMPLETED" ? new Date() : null,
          },
        });

        if (dependencyIds && dependencyIds.length > 0) {
          // Verify each dependency belongs to this user
          const validDeps = await tx.task.findMany({
            where: { id: { in: dependencyIds }, userId },
            select: { id: true },
          });

          await tx.taskDependency.createMany({
            data: validDeps.map((d) => ({
              taskId: newTask.id,
              dependsOnTaskId: d.id,
            })),
          });
        }

        return newTask;
      });

      const fullTask = await prisma.task.findUnique({
        where: { id: task.id },
        include: {
          category: true,
          dependencies: { include: { dependsOnTask: true } },
        },
      });

      res.status(201).json({ task: fullTask });
    } catch (err) {
      next(err);
    }
  }

  public static async getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const task = await prisma.task.findFirst({
        where: { id, userId },
        include: {
          category: true,
          dependencies: { include: { dependsOnTask: true } },
          dependentOn: { include: { task: true } },
        },
      });

      if (!task) {
        res.status(404).json({ error: "NotFoundError", message: "Task not found." });
        return;
      }

      res.json({ task });
    } catch (err) {
      next(err);
    }
  }

  public static async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const data = req.body;

      // Ownership check
      const existing = await prisma.task.findFirst({ where: { id, userId } });
      if (!existing) {
        res.status(404).json({ error: "NotFoundError", message: "Task not found." });
        return;
      }

      const updatePayload: any = {};
      if (data.title !== undefined) updatePayload.title = data.title;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.priority !== undefined) updatePayload.priority = data.priority;
      if (data.estimatedMinutes !== undefined) updatePayload.estimatedMinutes = data.estimatedMinutes;
      if (data.actualMinutes !== undefined) updatePayload.actualMinutes = data.actualMinutes;
      if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId;
      if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate ? new Date(data.dueDate) : null;

      if (data.status !== undefined) {
        updatePayload.status = data.status;
        if (data.status === "COMPLETED" && existing.status !== "COMPLETED") {
          updatePayload.completedAt = new Date();
        } else if (data.status !== "COMPLETED" && existing.status === "COMPLETED") {
          updatePayload.completedAt = null;
        }
      }

      const updated = await prisma.task.update({
        where: { id },
        data: updatePayload,
        include: {
          category: true,
          dependencies: { include: { dependsOnTask: true } },
        },
      });

      // BFS Downstream Traversal (Syllabus: Unit III, Chapter 3.1)
      let downstreamImpact = null;
      if (data.status === "COMPLETED" && existing.status !== "COMPLETED") {
        downstreamImpact = await SchedulerService.evaluateCompletionImpactBfs(userId, id);
      }

      res.json({ task: updated, downstreamImpact });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const existing = await prisma.task.findFirst({ where: { id, userId } });
      if (!existing) {
        res.status(404).json({ error: "NotFoundError", message: "Task not found." });
        return;
      }

      await prisma.task.delete({ where: { id } });
      res.json({ message: "Task deleted successfully." });
    } catch (err) {
      next(err);
    }
  }

  public static async addDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params; // taskId
      const { dependsOnTaskId } = req.body;

      if (id === dependsOnTaskId) {
        res.status(400).json({
          error: "ValidationError",
          message: "Self-dependency is invalid: a task cannot depend on itself.",
        });
        return;
      }

      // Verify ownership of both tasks
      const [task, prerequisite] = await Promise.all([
        prisma.task.findFirst({ where: { id, userId } }),
        prisma.task.findFirst({ where: { id: dependsOnTaskId, userId } }),
      ]);

      if (!task || !prerequisite) {
        res.status(404).json({
          error: "NotFoundError",
          message: "One or both tasks do not exist or do not belong to you.",
        });
        return;
      }

      // Check existing dependency
      const existingDep = await prisma.taskDependency.findUnique({
        where: {
          taskId_dependsOnTaskId: { taskId: id, dependsOnTaskId },
        },
      });

      if (existingDep) {
        res.status(409).json({
          error: "ConflictError",
          message: "This dependency relationship already exists.",
        });
        return;
      }

      // Fetch all existing user dependencies to perform graph cycle detection
      const allUserDeps = await prisma.taskDependency.findMany({
        where: {
          task: { userId },
        },
      });

      const allUserTasks = await prisma.task.findMany({
        where: { userId },
        select: { id: true },
      });

      const graph = new DependencyGraph(
        allUserTasks.map((t) => t.id),
        allUserDeps.map((d) => ({ taskId: d.taskId, dependsOnTaskId: d.dependsOnTaskId }))
      );

      const cycleCheck = graph.wouldCreateCycle(id, dependsOnTaskId);
      if (cycleCheck.wouldCycle) {
        res.status(400).json({
          error: "CycleError",
          message: "Cannot add dependency: this would create a circular dependency loop.",
          cyclePath: cycleCheck.cyclePath,
        });
        return;
      }

      const dependency = await prisma.taskDependency.create({
        data: {
          taskId: id,
          dependsOnTaskId,
        },
        include: {
          dependsOnTask: {
            select: { id: true, title: true, status: true },
          },
        },
      });

      res.status(201).json({ dependency });
    } catch (err) {
      next(err);
    }
  }

  public static async removeDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id, dependencyId } = req.params;

      const dep = await prisma.taskDependency.findFirst({
        where: {
          id: dependencyId,
          taskId: id,
          task: { userId },
        },
      });

      if (!dep) {
        res.status(404).json({ error: "NotFoundError", message: "Dependency not found." });
        return;
      }

      await prisma.taskDependency.delete({ where: { id: dependencyId } });
      res.json({ message: "Dependency removed successfully." });
    } catch (err) {
      next(err);
    }
  }
}
