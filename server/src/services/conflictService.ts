import { prisma } from "../prisma";
import { IntervalSweep, EventInterval, ConflictPair, FreeTimeSlot } from "../dsa/IntervalSweep";

export class ConflictService {
  public static async getUserConflicts(
    userId: string,
    from?: Date,
    to?: Date
  ): Promise<ConflictPair[]> {
    const where: any = { userId };
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = from;
      if (to) where.startTime.lte = to;
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startTime: "asc" },
    });

    const intervals: EventInterval[] = events.map((e) => ({
      id: e.id,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      categoryId: e.categoryId,
      location: e.location,
    }));

    return IntervalSweep.detectAllConflicts(intervals);
  }

  public static async checkEventConflict(
    userId: string,
    target: { id?: string; title: string; startTime: Date; endTime: Date }
  ): Promise<ConflictPair[]> {
    // Only inspect existing events that overlap broadly with the window to keep SQL fast
    const dayBefore = new Date(target.startTime.getTime() - 24 * 60 * 60 * 1000);
    const dayAfter = new Date(target.endTime.getTime() + 24 * 60 * 60 * 1000);

    const existingEvents = await prisma.event.findMany({
      where: {
        userId,
        startTime: { lte: dayAfter },
        endTime: { gte: dayBefore },
      },
    });

    const intervals: EventInterval[] = existingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      categoryId: e.categoryId,
      location: e.location,
    }));

    return IntervalSweep.checkEventConflict(
      {
        id: target.id || "temp-new-event",
        title: target.title,
        startTime: target.startTime,
        endTime: target.endTime,
      },
      intervals
    );
  }

  /**
   * Free-Time Slot Calculation for a given date
   * Defaults to standard workday window 09:00 - 18:00
   */
  public static async getFreeSlots(
    userId: string,
    dateString: string,
    minDurationMinutes: number = 30
  ): Promise<{ date: string; freeSlots: FreeTimeSlot[]; bookedEventsCount: number }> {
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) {
      throw new Error("Invalid date parameter");
    }

    // Set workday boundaries: 09:00 to 18:00 on the target date
    const workdayStart = new Date(dateObj);
    workdayStart.setHours(9, 0, 0, 0);

    const workdayEnd = new Date(dateObj);
    workdayEnd.setHours(18, 0, 0, 0);

    // Fetch all events occurring on that calendar day
    const dayStart = new Date(dateObj);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dateObj);
    dayEnd.setHours(23, 59, 59, 999);

    const events = await prisma.event.findMany({
      where: {
        userId,
        startTime: { lte: dayEnd },
        endTime: { gte: dayStart },
      },
      orderBy: { startTime: "asc" },
    });

    const intervals: EventInterval[] = events.map((e) => ({
      id: e.id,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
    }));

    const freeSlots = IntervalSweep.findFreeSlots(
      intervals,
      workdayStart,
      workdayEnd,
      minDurationMinutes
    );

    return {
      date: dateString,
      freeSlots,
      bookedEventsCount: events.length,
    };
  }
}
