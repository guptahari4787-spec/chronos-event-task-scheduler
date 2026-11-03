import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { prisma } from "../prisma";

describe("Chronos API Integration Test Suite", () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let createdTaskId: string;

  beforeAll(async () => {
    // Register User 1
    const res1 = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User 1",
        email: `test1_${Date.now()}@chronos.io`,
        password: "Password123!",
      });
    expect(res1.status).toBe(201);
    user1Token = res1.body.token;
    user1Id = res1.body.user.id;

    // Register User 2
    const res2 = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User 2",
        email: `test2_${Date.now()}@chronos.io`,
        password: "Password123!",
      });
    expect(res2.status).toBe(201);
    user2Token = res2.body.token;
    user2Id = res2.body.user.id;
  });

  describe("Health Check", () => {
    it("GET /api/health should return ok and healthy database", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.dependencies.database.status).toBe("healthy");
    });
  });

  describe("Authentication & Authorization", () => {
    it("should reject invalid login credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "nonexistent@chronos.io",
        password: "WrongPassword",
      });
      expect(res.status).toBe(401);
    });

    it("should access /api/auth/me with valid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${user1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user1Id);
    });

    it("should reject protected routes without token", async () => {
      const res = await request(app).get("/api/tasks");
      expect(res.status).toBe(401);
    });
  });

  describe("Task Operations & Ownership Isolation", () => {
    it("should create a task for User 1", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({
          title: "Setup CI/CD Pipeline",
          description: "Configure GitHub actions and test runner",
          priority: "HIGH",
          estimatedMinutes: 60,
        });

      expect(res.status).toBe(201);
      expect(res.body.task.title).toBe("Setup CI/CD Pipeline");
      createdTaskId = res.body.task.id;
    });

    it("User 2 should NOT be able to view or edit User 1's task (Ownership Isolation)", async () => {
      // User 2 tries to GET
      const getRes = await request(app)
        .get(`/api/tasks/${createdTaskId}`)
        .set("Authorization", `Bearer ${user2Token}`);
      expect(getRes.status).toBe(404);

      // User 2 tries to PATCH
      const patchRes = await request(app)
        .patch(`/api/tasks/${createdTaskId}`)
        .set("Authorization", `Bearer ${user2Token}`)
        .send({ title: "Hacked Title" });
      expect(patchRes.status).toBe(404);
    });
  });

  describe("Task Dependencies & Cycle Prevention", () => {
    it("should prevent cycle creation when adding dependencies", async () => {
      // Create Task A and Task B for User 1
      const taskA = await prisma.task.create({
        data: { userId: user1Id, title: "Task A", priority: "MEDIUM" },
      });
      const taskB = await prisma.task.create({
        data: { userId: user1Id, title: "Task B", priority: "MEDIUM" },
      });

      // B depends on A (A -> B)
      const dep1 = await request(app)
        .post(`/api/tasks/${taskB.id}/dependencies`)
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ dependsOnTaskId: taskA.id });
      expect(dep1.status).toBe(201);

      // Now attempt to make A depend on B (B -> A), which forms a cycle: A -> B -> A!
      const dep2 = await request(app)
        .post(`/api/tasks/${taskA.id}/dependencies`)
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ dependsOnTaskId: taskB.id });

      expect(dep2.status).toBe(400);
      expect(dep2.body.error).toBe("CycleError");
      expect(dep2.body.message).toContain("circular dependency");
    });
  });

  describe("Calendar & Interval Conflict Detection", () => {
    it("should detect overlapping events on creation", async () => {
      const now = new Date();
      const start1 = new Date(now.getTime() + 10 * 3600 * 1000);
      const end1 = new Date(start1.getTime() + 2 * 3600 * 1000);

      // Event 1
      await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({
          title: "Sprint Retrospective",
          startTime: start1.toISOString(),
          endTime: end1.toISOString(),
        });

      // Event 2 (Overlapping by 1 hour)
      const start2 = new Date(start1.getTime() + 3600 * 1000); // 1 hr after start1
      const end2 = new Date(end1.getTime() + 3600 * 1000);

      const res2 = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({
          title: "Client Quarterly Business Review",
          startTime: start2.toISOString(),
          endTime: end2.toISOString(),
        });

      expect(res2.status).toBe(201);
      expect(res2.body.hasConflicts).toBe(true);
      expect(res2.body.conflicts.length).toBeGreaterThanOrEqual(1);
      expect(res2.body.conflicts[0].overlapMinutes).toBe(60);
    });
  });

  describe("Analytics & Activity Heatmap Data", () => {
    it("should return contiguous zero-filled days for the activity heatmap", async () => {
      const res = await request(app)
        .get("/api/analytics/activity?range=90")
        .set("Authorization", `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.days)).toBe(true);
      expect(res.body.days.length).toBe(90);

      // Verify oldest first
      const firstDay = new Date(res.body.days[0].date).getTime();
      const lastDay = new Date(res.body.days[res.body.days.length - 1].date).getTime();
      expect(firstDay).toBeLessThan(lastDay);

      // Verify zero-fill structure
      res.body.days.forEach((day: any) => {
        expect(day).toHaveProperty("date");
        expect(day).toHaveProperty("count");
        expect(typeof day.count).toBe("number");
      });
    });
  });

  describe("Calendar Free-Slots Engine (DSA System C)", () => {
    it("should calculate available free time slots on a target day", async () => {
      const targetDate = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .get(`/api/calendar/free-slots?date=${targetDate}&durationMinutes=30`)
        .set("Authorization", `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("freeSlots");
      expect(Array.isArray(res.body.freeSlots)).toBe(true);
      if (res.body.freeSlots.length > 0) {
        expect(res.body.freeSlots[0]).toHaveProperty("startTime");
        expect(res.body.freeSlots[0]).toHaveProperty("endTime");
        expect(res.body.freeSlots[0].durationMinutes).toBeGreaterThanOrEqual(30);
      }
    });
  });

  describe("Plan My Day (0/1 Knapsack Dynamic Programming)", () => {
    it("should select optimal ready tasks within available time limit", async () => {
      // Create two ready tasks for user 1
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({
          title: "Quick Documentation",
          priority: "HIGH",
          estimatedMinutes: 30,
        });

      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({
          title: "In-depth Security Audit",
          priority: "URGENT",
          estimatedMinutes: 60,
        });

      const res = await request(app)
        .post("/api/scheduler/plan-my-day")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ availableMinutes: 90 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("selectedTasks");
      expect(res.body).toHaveProperty("totalPlannedMinutes");
      expect(res.body).toHaveProperty("remainingMinutes");
      expect(res.body).toHaveProperty("summaryReason");
      expect(res.body.totalPlannedMinutes).toBeLessThanOrEqual(90);
      expect(res.body.remainingMinutes).toBeGreaterThanOrEqual(0);
      expect(res.body.selectedTasks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Calendar Ordering (Merge Sort Verification)", () => {
    it("should return calendar feed ordered stably by start time via Merge Sort", async () => {
      const res = await request(app)
        .get("/api/calendar")
        .set("Authorization", `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.events)).toBe(true);

      const events = res.body.events;
      for (let i = 0; i < events.length - 1; i++) {
        const timeA = new Date(events[i].startTime).getTime();
        const timeB = new Date(events[i + 1].startTime).getTime();
        expect(timeA).toBeLessThanOrEqual(timeB);
      }
    });
  });

  describe("Downstream Impact (Graph BFS Traversal)", () => {
    it("should evaluate downstream impact when a task completes", async () => {
      // Create Parent Task and Child Task
      const parentRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ title: "Core Data Model Definition", priority: "HIGH" });

      const childRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ title: "Migration Scripts", priority: "MEDIUM" });

      const parentId = parentRes.body.task.id;
      const childId = childRes.body.task.id;

      // Link: child depends on parent
      await request(app)
        .post(`/api/tasks/${childId}/dependencies`)
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ dependsOnTaskId: parentId });

      // Query impact endpoint
      const impactRes = await request(app)
        .get(`/api/scheduler/impact/${parentId}`)
        .set("Authorization", `Bearer ${user1Token}`);

      expect(impactRes.status).toBe(200);
      expect(impactRes.body).toHaveProperty("downstreamImpact");
      expect(impactRes.body.downstreamImpact.newlyReadyTaskIds).toContain(childId);

      // Complete parent task and verify downstream impact in response
      const patchRes = await request(app)
        .patch(`/api/tasks/${parentId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ status: "COMPLETED" });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body).toHaveProperty("downstreamImpact");
      expect(patchRes.body.downstreamImpact.newlyReadyTaskIds).toContain(childId);
    });
  });
});
