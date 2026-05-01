import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { errorResponse } from "../utils/response";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    errorResponse(res, err.message, err.statusCode);
    return;
  }
  console.error("[unhandled middleware error]", err);
  errorResponse(res, "Internal server error", 500);
};
