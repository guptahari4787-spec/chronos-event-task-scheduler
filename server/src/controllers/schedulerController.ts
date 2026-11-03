import { Request, Response, NextFunction } from "express";
import { SchedulerService } from "../services/schedulerService";

export class SchedulerController {
  /**
   * Next Recommended Task
   */
  public static async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await SchedulerService.getRecommendations(userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Plan My Day (0/1 Knapsack Dynamic Programming)
   * Syllabus: Unit III, Chapter 3.3 — Dynamic Programming & Knapsack
   * POST /api/scheduler/plan-my-day
   * Body: { availableMinutes: number }
   */
  public static async planMyDay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const rawMinutes = req.body.availableMinutes ?? req.query.availableMinutes ?? 120;
      const availableMinutes = parseInt(String(rawMinutes), 10);

      if (isNaN(availableMinutes) || availableMinutes < 15 || availableMinutes > 720) {
        res.status(400).json({
          error: "ValidationError",
          message: "Available planning time must be between 15 and 720 minutes (up to 12 hours).",
        });
        return;
      }

      const plan = await SchedulerService.planMyDay(userId, availableMinutes);
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Evaluate Completion Impact (BFS Graph Traversal)
   * Syllabus: Unit III, Chapter 3.1 — Graph Traversal
   * GET /api/scheduler/impact/:taskId
   */
  public static async evaluateImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { taskId } = req.params;
      const impact = await SchedulerService.evaluateCompletionImpactBfs(userId, taskId);
      res.json({ downstreamImpact: impact });
    } catch (err) {
      next(err);
    }
  }
}
