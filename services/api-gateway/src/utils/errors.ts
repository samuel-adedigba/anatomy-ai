import { Response } from "express";
import { errorResponse } from "./response";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    // Preserve proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleError = (res: Response, err: unknown): Response => {
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode);
  }
  console.error("[unhandled error]", err);
  return errorResponse(res, "Internal server error", 500);
};
