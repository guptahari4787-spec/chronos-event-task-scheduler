import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";

export class NotificationController {
  public static async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      res.json({ notifications, unreadCount });
    } catch (err) {
      next(err);
    }
  }

  public static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({ message: "Notification marked as read." });
    } catch (err) {
      next(err);
    }
  }

  public static async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({ message: "All notifications marked as read." });
    } catch (err) {
      next(err);
    }
  }
}
