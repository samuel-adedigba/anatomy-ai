import axios from "axios";
import { AskRequestBody, AskResponse } from "../types";
import { AppError } from "../utils/errors";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8001";
const INSTRUCTION_ENGINE_URL = process.env.INSTRUCTION_ENGINE_URL ?? "http://localhost:3002";

/**
 * 1. Sends query to the Python AI service (RAG + LLM)
 * 2. Passes the raw AI response to the instruction engine for visual command extraction
 * 3. Returns unified response: answer + sources + visual command
 */
export const processAskQuery = async (body: AskRequestBody): Promise<AskResponse> => {
  // ─── Step 1: RAG + answer generation ──────────────────────────
  const aiRes = await axios
    .post(`${AI_SERVICE_URL}/query`, {
      query: body.query,
      session_id: body.sessionId ?? null,
    })
    .catch(() => {
      throw new AppError("AI service is unavailable", 503);
    });

  const { answer, sources, raw_context } = aiRes.data;

  // ─── Step 2: Convert answer → visual command ──────────────────
  const instructionRes = await axios
    .post(`${INSTRUCTION_ENGINE_URL}/parse`, {
      answer,
      raw_context,
    })
    .catch(() => {
      throw new AppError("Instruction engine is unavailable", 503);
    });

  return {
    answer,
    sources: sources ?? [],
    visualCommand: instructionRes.data.command,
  };
};
