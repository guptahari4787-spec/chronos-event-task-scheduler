import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { signToken } from "../middleware/auth";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  timezone: z.string().optional().default("UTC"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, timezone } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({
          error: "ConflictError",
          message: "An account with this email address already exists.",
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Create user and default categories in a transaction
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name,
            email,
            passwordHash,
            timezone,
          },
        });

        // Seed default categories
        await tx.category.createMany({
          data: [
            { userId: newUser.id, name: "Engineering", color: "#3b82f6" },
            { userId: newUser.id, name: "Design", color: "#8b5cf6" },
            { userId: newUser.id, name: "Research", color: "#10b981" },
            { userId: newUser.id, name: "Urgent", color: "#ef4444" },
          ],
        });

        return newUser;
      });

      const token = signToken({
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
      });

      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          timezone: user.timezone,
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password.",
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password.",
        });
        return;
      }

      const token = signToken({
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
      });

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          timezone: user.timezone,
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          name: true,
          email: true,
          timezone: true,
          preferences: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: "NotFoundError", message: "User not found." });
        return;
      }

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, timezone, preferences } = req.body;
      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          ...(name && { name }),
          ...(timezone && { timezone }),
          ...(preferences && { preferences }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          timezone: true,
          preferences: true,
        },
      });

      res.json({ user: updated });
    } catch (err) {
      next(err);
    }
  }

  public static logout(_req: Request, res: Response): void {
    res.json({ message: "Logged out successfully." });
  }
}
