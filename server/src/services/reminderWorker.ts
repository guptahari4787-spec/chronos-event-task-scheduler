import { prisma } from "../prisma";

export class ReminderWorker {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  public static start(): void {
    if (this.timer) return;
    console.log("[ReminderWorker] Background worker initialized. Starting reconcile...");
    this.reconcileObsoleteReminders();

    // Check every 10 seconds
    this.timer = setInterval(() => {
      this.processDueReminders().catch((err) => {
        console.error("[ReminderWorker] Error processing reminders:", err);
      });
    }, 10000);
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[ReminderWorker] Background worker stopped.");
    }
  }

  /**
   * Cleans up orphaned or cancelled reminders
   */
  public static async reconcileObsoleteReminders(): Promise<void> {
    try {
      // Find reminders for completed/cancelled tasks
      const completedTasks = await prisma.task.findMany({
        where: { status: { in: ["COMPLETED", "CANCELLED"] } },
        select: { id: true },
      });
      const completedTaskIds = completedTasks.map((t) => t.id);

      if (completedTaskIds.length > 0) {
        await prisma.reminder.updateMany({
          where: {
            taskId: { in: completedTaskIds },
            status: "PENDING",
          },
          data: { status: "CANCELLED" },
        });
      }
    } catch (err) {
      console.error("[ReminderWorker] Reconcile error:", err);
    }
  }

  /**
   * Process all reminders that are due
   */
  public static async processDueReminders(): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;

    try {
      const now = new Date();
      const dueReminders = await prisma.reminder.findMany({
        where: {
          status: "PENDING",
          remindAt: { lte: now },
        },
        include: {
          task: { select: { id: true, title: true, userId: true, status: true } },
          event: { select: { id: true, title: true, userId: true, startTime: true } },
        },
        take: 50,
      });

      let processedCount = 0;

      for (const reminder of dueReminders) {
        try {
          const userId = reminder.task?.userId || reminder.event?.userId;
          if (!userId) {
            // Orphaned reminder
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: "FAILED", attempts: reminder.attempts + 1 },
            });
            continue;
          }

          // Check if task is already completed
          if (reminder.task && (reminder.task.status === "COMPLETED" || reminder.task.status === "CANCELLED")) {
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: "CANCELLED" },
            });
            continue;
          }

          const title = reminder.task
            ? `Task Reminder: ${reminder.task.title}`
            : `Event Reminder: ${reminder.event?.title}`;
          const message = reminder.task
            ? `Your task "${reminder.task.title}" is due soon.`
            : `Your event "${reminder.event?.title}" starts at ${reminder.event?.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;

          // Idempotent delivery: create notification inside a transaction
          await prisma.$transaction(async (tx) => {
            await tx.notification.create({
              data: {
                userId,
                title,
                message,
                type: "REMINDER",
                entityType: reminder.taskId ? "TASK" : "EVENT",
                entityId: reminder.taskId || reminder.eventId,
              },
            });

            await tx.reminder.update({
              where: { id: reminder.id },
              data: {
                status: "SENT",
                sentAt: new Date(),
                attempts: reminder.attempts + 1,
              },
            });
          });

          processedCount++;
        } catch (itemErr) {
          console.error(`[ReminderWorker] Failed reminder ${reminder.id}:`, itemErr);
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: reminder.attempts >= 3 ? "FAILED" : "PENDING",
              attempts: reminder.attempts + 1,
            },
          });
        }
      }

      return processedCount;
    } finally {
      this.isRunning = false;
    }
  }
}
