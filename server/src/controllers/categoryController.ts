import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../prisma";

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
});

export class CategoryController {
  public static async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const categories = await prisma.category.findMany({
        where: { userId },
        include: {
          _count: {
            select: { tasks: true, events: true },
          },
        },
        orderBy: { name: "asc" },
      });
      res.json({ categories });
    } catch (err) {
      next(err);
    }
  }

  public static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, color } = req.body;

      const existing = await prisma.category.findUnique({
        where: { userId_name: { userId, name } },
      });

      if (existing) {
        res.status(409).json({
          error: "ConflictError",
          message: `Category with name "${name}" already exists.`,
        });
        return;
      }

      const category = await prisma.category.create({
        data: { userId, name, color },
      });

      res.status(201).json({ category });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const category = await prisma.category.findFirst({
        where: { id, userId },
      });

      if (!category) {
        res.status(404).json({ error: "NotFoundError", message: "Category not found." });
        return;
      }

      await prisma.category.delete({ where: { id } });
      res.json({ message: "Category deleted successfully." });
    } catch (err) {
      next(err);
    }
  }
}
