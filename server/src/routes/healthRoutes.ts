import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Number((performance.now() - start).toFixed(2));

    res.json({
      status: "ok",
      service: "chronos-backend-api",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        database: {
          status: "healthy",
          type: "PostgreSQL 18",
          latencyMs: dbLatencyMs,
        },
      },
      host: process.env.HOST || "127.0.0.1",
      port: process.env.PORT || 2345,
    });
  } catch (err: any) {
    res.status(503).json({
      status: "degraded",
      service: "chronos-backend-api",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: {
          status: "unhealthy",
          error: err.message,
        },
      },
    });
  }
});

export default router;
