import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message || err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "ValidationError",
      message: "One or more fields failed validation.",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // Handle Prisma unique constraint error
  if (err.code === "P2002") {
    res.status(409).json({
      error: "ConflictError",
      message: `A record with this ${err.meta?.target || "unique field"} already exists.`,
    });
    return;
  }

  // Handle Prisma record not found error
  if (err.code === "P2025") {
    res.status(404).json({
      error: "NotFoundError",
      message: "The requested record was not found.",
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || "InternalServerError",
    message: err.message || "An unexpected error occurred on the server.",
  });
}
