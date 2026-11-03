import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import taskRoutes from "./routes/taskRoutes";
import eventRoutes from "./routes/eventRoutes";
import calendarRoutes from "./routes/calendarRoutes";
import schedulerRoutes from "./routes/schedulerRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import healthRoutes from "./routes/healthRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { ReminderWorker } from "./services/reminderWorker";

dotenv.config();

const app = express();
const HOST = process.env.HOST || "127.0.0.1";
const PORT = parseInt(process.env.PORT || "2345", 10);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://chronos.localhost:3456";

// Allowed origins: primary chronos.localhost + loopback aliases for local dev
const allowedOrigins = [
  FRONTEND_ORIGIN,
  "http://chronos.localhost:3456",
  "http://127.0.0.1:3456",
  "http://localhost:3456",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for local dev
app.use((req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const duration = (performance.now() - start).toFixed(1);
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Mount API routes under /api
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/scheduler", schedulerRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/categories", categoryRoutes);

// Central error handler
app.use(errorHandler);

// Start server (only if not running in test runner)
let server: any;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, HOST, () => {
    console.log(`======================================================`);
    console.log(` Chronos Backend API Service Running`);
    console.log(` Listening on: http://${HOST}:${PORT}`);
    console.log(` API Base URL: http://${HOST}:${PORT}/api`);
    console.log(` Health Check: http://${HOST}:${PORT}/api/health`);
    console.log(` Allowed Frontend Origin: ${FRONTEND_ORIGIN}`);
    console.log(` Database: PostgreSQL 18 on 127.0.0.1:5433 (chronos)`);
    console.log(`======================================================`);

    // Start background reminder worker
    ReminderWorker.start();
  });
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down Chronos Backend gracefully...");
  ReminderWorker.stop();
  server.close(() => {
    console.log("Server stopped.");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  ReminderWorker.stop();
  server.close(() => {
    process.exit(0);
  });
});

export default app;
