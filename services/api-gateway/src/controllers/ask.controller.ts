import { Request, Response } from "express";
import { processAskQuery } from "../services/ask.service";
import { successResponse } from "../utils/response";
import { handleError } from "../utils/errors";
import { AskRequestBody } from "../types";

export const handleAsk = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as AskRequestBody;
    const result = await processAskQuery(body);
    successResponse(res, result, "Query processed");
  } catch (err) {
    handleError(res, err);
  }
};
