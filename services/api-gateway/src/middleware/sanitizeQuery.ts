import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

// Characters and patterns that could inject into prompts or break JSON parsing
const BLOCKED_PATTERNS = [
  /\bignore previous instructions\b/i,
  /\bsystem prompt\b/i,
  /\bjailbreak\b/i,
  /<\s*script/i,
];

const MAX_QUERY_LENGTH = 500;

/**
 * Sanitizes and validates the incoming query string.
 * Blocks obvious prompt injection attempts before they reach the AI layer.
 */
export const sanitizeQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { query } = req.body as { query?: string };

  if (!query || typeof query !== "string") {
    throw new AppError("query is required and must be a string", 400);
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw new AppError(`query must not exceed ${MAX_QUERY_LENGTH} characters`, 400);
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(query)) {
      throw new AppError("Query contains disallowed content", 400);
    }
  }

  // Trim and forward clean query
  req.body.query = query.trim();
  next();
};
