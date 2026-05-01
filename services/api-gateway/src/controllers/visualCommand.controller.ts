import { Request, Response } from "express";
import axios from "axios";
import { successResponse } from "../utils/response";
import { handleError, AppError } from "../utils/errors";

const INSTRUCTION_ENGINE_URL = process.env.INSTRUCTION_ENGINE_URL ?? "http://localhost:3002";

/**
 * Direct visual command endpoint.
 * Used when the frontend wants to trigger a visual change without a full AI query
 * (e.g. user taps "show skeleton" mode switch).
 */
export const handleVisualCommand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { region, mode } = req.body as { region?: string; mode?: string };

    if (!region && !mode) {
      throw new AppError("At least one of region or mode is required", 400);
    }

    const response = await axios
      .post(`${INSTRUCTION_ENGINE_URL}/direct`, { region, mode })
      .catch(() => {
        throw new AppError("Instruction engine is unavailable", 503);
      });

    successResponse(res, response.data.command, "Visual command generated");
  } catch (err) {
    handleError(res, err);
  }
};
