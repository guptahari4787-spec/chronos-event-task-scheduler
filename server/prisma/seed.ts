import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("[Seed] Seeding Chronos database with realistic data...");

  // Clean existing data for clean demo
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Demo User
  const user = await prisma.user.create({
    data: {
      name: "Alex Mercer",
      email: "alex@chronos.io",
      passwordHash,
      timezone: "UTC",
      preferences: {
        theme: "light",
        weekStartsOn: 1, // Monday
        defaultReminderMinutes: 15,
        compactMode: false,
      },
    },
  });

  console.log(`[Seed] Created User: ${user.email} (${user.id})`);

  // 2. Create Categories
  const catEngineering = await prisma.category.create({
    data: { userId: user.id, name: "Engineering", color: "#3b82f6" },
  });
  const catDesign = await prisma.category.create({
    data: { userId: user.id, name: "Design & UI", color: "#8b5cf6" },
  });
  const catViva = await prisma.category.create({
    data: { userId: user.id, name: "Project Viva & DSA", color: "#10b981" },
  });
  const catUrgent = await prisma.category.create({
    data: { userId: user.id, name: "Critical Deadlines", color: "#ef4444" },
  });
  const catPersonal = await prisma.category.create({
    data: { userId: user.id, name: "Personal", color: "#f59e0b" },
  });

  console.log("[Seed] Created 5 categories");

  // 3. Create Tasks forming a clear DAG
  const now = new Date();

  // Task 1: Architecture (completed 5 days ago)
  const task1 = await prisma.task.create({
    data: {
      userId: user.id,
      categoryId: catEngineering.id,
      title: "Design Relational Schema & Normalization Plan",
      description: "Define 3NF tables, foreign key constraints, and index strategies for high-frequency queries.",
      priority: "HIGH",
      status: "COMPLETED",
      dueDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 180,
      actualMinutes: 165,
      completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  // Task 2: Database setup (completed 3 days ago, depends on Task 1)
  const task2 = await prisma.task.create({
    data: {
      userId: user.id,
      categoryId: catEngineering.id,
      title: "Implement PostgreSQL Migrations & EXPLAIN ANALYZE Benchmarks",
      description: "Run Prisma migrations and verify B-tree index scans on composite timestamp keys.",
      priority: "HIGH",
      status: "COMPLETED",
      dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 120,
      actualMinutes: 110,
      completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  // Task 3: Min-Heap Implementation (completed yesterday, depends on Task 2)
  const task3 = await prisma.task.create({
    data: {
      userId: user.id,
      categoryId: catViva.id,
      title: "Implement Binary Min-Heap with Deterministic Priority Scoring",
      description: "Complete binary heap with O(log n) insert/extract, deterministic weights for deadline urgency and duration.",
      priority: "URGENT",
      status: "COMPLETED",
      dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 240,
      actualMinutes: 210,
      completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Task 4: 3-Color DFS Cycle Detection (IN_PROGRESS, depends on Task 3)
  const task4 = await prisma.task.create({
    data: {
      userId: user.id,
      categoryId: catViva.id,
      title: "Implement 3-Color DFS Cycle Detection & Kahn's Topological Sort",
      description: "Detect circular task dependencies in O(V + E) and compute valid execution tiers.",
      priority: "URGENT",
      status: "IN_PROGRESS",
      dueDate: new Date(now.getTime() + 6 * 60 * 60 * 1000), // Due in 6 hours!
      estimatedMinutes: 150,
      actualMinutes: 60,
    },
  });

  // Task 5: Interval Conflict Sweep (TODO, depends on Task 4)
  const task5 = await prisma.task.create({
    data: {
      userId: user.id,
      categoryId: catViva.id,
      title: "Sort-and-Sweep Interval Overlap Detector with Boundary Touch Handling",
      description: "Verify that events ending exactly when another starts do not trigger conflict warnings.",
      priority: "HIGH",
      status: "TODO",
      dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      estimatedMinutes: 90,
    },
  });

  // Task 6: College Project Viva Defense (TODO, depends on Task 5, URGENT)
  const task6 = await prisma.task.create({
    data: {
      userId: user.id,
      categoryId: catUrgent.id,
      title: "Prepare College Project Viva Defense & Demo Script",
      description: "Demonstrate live Min-Heap extraction, DAG topological sort, and Sort-and-Sweep conflict detection to examiners.",
      priority: "URGENT",
      status: "TODO",
      dueDate: new Date(now.getTime() + 48 * 60 * 60 * 1000), // In 2 days
      estimatedMinutes: 180,
    },
  });

  // Task 7: Independent Quick Task (TODO, no dependencies)
  const task7 = await prisma.task.create({
    data: {
      userId: user.id,
      categoryId: catDesign.id,
      title: "Audit UI Accessibility & Dark Mode Contrast",
      description: "Check WCAG 2.1 AA focus rings, accessible names, and reduced-motion tokens.",
      priority: "MEDIUM",
      status: "TODO",
      dueDate: new Date(now.getTime() + 18 * 60 * 60 * 1000),
      estimatedMinutes: 45,
    },
  });

  // Connect Dependencies
  await prisma.taskDependency.createMany({
    data: [
      { taskId: task2.id, dependsOnTaskId: task1.id },
      { taskId: task3.id, dependsOnTaskId: task2.id },
      { taskId: task4.id, dependsOnTaskId: task3.id },
      { taskId: task5.id, dependsOnTaskId: task4.id },
      { taskId: task6.id, dependsOnTaskId: task5.id },
    ],
  });

  console.log("[Seed] Created 7 core workflow tasks with DAG dependencies");

  // 4. Seed Historical Completed Tasks for Activity Heatmap
  // Populate realistic completions across the last 90 days
  const heatmapTasksData: any[] = [];
  for (let daysAgo = 1; daysAgo <= 90; daysAgo++) {
    // Deterministic pseudo-random pattern for realistic activity bursts
    const daySeed = (daysAgo * 7 + 13) % 10;
    let completedCount = 0;
    if (daySeed > 7) completedCount = 4;
    else if (daySeed > 5) completedCount = 3;
    else if (daySeed > 2) completedCount = 1;

    for (let c = 0; c < completedCount; c++) {
      const completionTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      completionTime.setUTCHours(10 + c * 2, 15, 0, 0);

      heatmapTasksData.push({
        userId: user.id,
        categoryId: c % 2 === 0 ? catEngineering.id : catDesign.id,
        title: `Completed Sprint Deliverable #${daysAgo}-${c + 1}`,
        description: `Verified and merged pull request #${100 + daysAgo * 2}.`,
        priority: "MEDIUM",
        status: "COMPLETED",
        dueDate: completionTime,
        estimatedMinutes: 60,
        actualMinutes: 55,
        completedAt: completionTime,
      });
    }
  }

  await prisma.task.createMany({ data: heatmapTasksData });
  console.log(`[Seed] Created ${heatmapTasksData.length} historical completed tasks for Activity Heatmap`);

  // 5. Create Calendar Events (Non-conflicting & Conflicting for demonstration)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Non-conflicting events (touching boundary: 09:00-10:00 and 10:00-11:30)
  const event1 = await prisma.event.create({
    data: {
      userId: user.id,
      categoryId: catEngineering.id,
      title: "Daily Engineering Sync",
      description: "Standup, review blockers, and align on scheduling priority heap updates.",
      startTime: new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 9, 0, 0)),
      endTime: new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 10, 0, 0)),
      location: "Virtual Room A",
    },
  });

  const event2 = await prisma.event.create({
    data: {
      userId: user.id,
      categoryId: catDesign.id,
      title: "Design System Review (Boundary Touch)",
      description: "Touches exactly at 10:00:00 UTC - verified as NON-conflicting by Sort-and-Sweep.",
      startTime: new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 10, 0, 0)),
      endTime: new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 11, 30, 0)),
      location: "Design Studio",
    },
  });

  // Conflicting Events (14:00-15:30 and 14:45-16:00 -> 45 min real overlap!)
  const event3 = await prisma.event.create({
    data: {
      userId: user.id,
      categoryId: catViva.id,
      title: "Faculty Project Progress Review",
      description: "Presentation of DBMS indexing and DSA topological scheduler.",
      startTime: new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 14, 0, 0)),
      endTime: new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 15, 30, 0)),
      location: "Conference Hall B",
    },
  });

  const event4 = await prisma.event.create({
    data: {
      userId: user.id,
      categoryId: catUrgent.id,
      title: "Overlapping Client Architecture Walkthrough",
      description: "Overlaps with Faculty Review from 14:45 to 15:30 (45 minutes conflict detected).",
      startTime: new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 14, 45, 0)),
      endTime: new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 16, 0, 0)),
      location: "Boardroom 1",
    },
  });

  console.log("[Seed] Created 4 calendar events (including 1 intentional conflict pair)");

  // 6. Create Reminders and Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        title: "Schedule Conflict Detected",
        message: 'Faculty Project Review overlaps with Client Architecture Walkthrough tomorrow by 45 minutes.',
        type: "CONFLICT",
        entityType: "EVENT",
        entityId: event3.id,
      },
      {
        userId: user.id,
        title: "Recommended Next Task",
        message: 'Task "Implement 3-Color DFS Cycle Detection" is ready for execution with all prerequisites satisfied.',
        type: "TASK_DUE",
        entityType: "TASK",
        entityId: task4.id,
      },
      {
        userId: user.id,
        title: "Welcome to Chronos",
        message: "Your high-performance event and task scheduling workspace is initialized and connected to PostgreSQL 18.",
        type: "SYSTEM",
      },
    ],
  });

  await prisma.reminder.create({
    data: {
      taskId: task4.id,
      remindAt: new Date(now.getTime() + 30 * 60 * 1000),
      channel: "IN_APP",
      idempotencyKey: `remind-task4-${user.id}`,
    },
  });

  console.log("[Seed] Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
