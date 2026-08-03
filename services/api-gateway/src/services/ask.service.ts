import axios from "axios";
import { AskRequestBody, AskResponse, InstructionParseResponse } from "../types";
import { AppError } from "../utils/errors";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8001";
const INSTRUCTION_ENGINE_URL = process.env.INSTRUCTION_ENGINE_URL ?? "http://localhost:3002";
const AI_TIMEOUT_MS = 120_000;
const INSTRUCTION_ENGINE_TIMEOUT_MS = 10_000;

/**
 * 1. Sends query to the Python AI service (RAG + LLM)
 * 2. Passes the raw AI response to the instruction engine for visual command extraction
 * 3. Returns the command plus a validated scene plan when RAG selected one
 */
export const processAskQuery = async (body: AskRequestBody): Promise<AskResponse> => {
  // ─── Step 1: RAG + answer generation ──────────────────────────
  const aiRes = await axios
    .post(`${AI_SERVICE_URL}/query`, {
      query: body.query,
      session_id: body.sessionId ?? null,
    }, {
      timeout: AI_TIMEOUT_MS,
    })
    .catch(() => {
      throw new AppError("AI service is unavailable", 503);
    });

  const aiData = aiRes.data as {
    answer: string;
    sources?: AskResponse["sources"];
    raw_context?: string;
    scene_plan?: unknown;
    scenePlan?: unknown;
  };
  const { answer, sources, raw_context } = aiData;
  const ragScenePlan = aiData.scene_plan ?? aiData.scenePlan;

  // ─── Step 2: Convert answer → visual command ──────────────────
  const instructionRes = await axios
    .post<InstructionParseResponse>(`${INSTRUCTION_ENGINE_URL}/parse`, {
      answer,
      raw_context: raw_context ?? "",
      ...(ragScenePlan !== undefined ? { scene_plan: ragScenePlan } : {}),
    }, {
      timeout: INSTRUCTION_ENGINE_TIMEOUT_MS,
    })
    .catch(() => {
      console.warn("[ask.service] Instruction engine unavailable; using fallback command");
      return null;
    });

  const scenePlan = instructionRes?.data?.scenePlan;

  return {
    answer,
    sources: sources ?? [],
    visualCommand: instructionRes?.data?.command ?? buildFallbackCommand(body.query),
    ...(scenePlan ? { scenePlan } : {}),
  };
};

const FALLBACK_VIEW_RULES: Array<{
  keywords: string[];
  focusRegion: string;
  viewMode: string;
}> = [
  { keywords: ["heart", "cardiac"], focusRegion: "heart", viewMode: "heart" },
  { keywords: ["brain", "cortex"], focusRegion: "brain", viewMode: "brain" },
  { keywords: ["spine", "spinal", "vertebra"], focusRegion: "spine", viewMode: "spine" },
  { keywords: ["lung", "breath", "respiratory"], focusRegion: "lung", viewMode: "respiratory" },
  { keywords: ["nerve", "neural", "neuron"], focusRegion: "nervous_system", viewMode: "nervous_system" },
  { keywords: ["blood", "artery", "vein", "circulatory"], focusRegion: "circulatory", viewMode: "circulatory" },
  { keywords: ["muscle", "tendon"], focusRegion: "muscular", viewMode: "muscular" },
  { keywords: ["bone", "skeleton", "ligament"], focusRegion: "skeleton", viewMode: "skeleton" },
  { keywords: ["stomach", "intestine", "liver", "digestive"], focusRegion: "digestive", viewMode: "digestive" },
];

const buildFallbackCommand = (query: string): AskResponse["visualCommand"] => {
  const normalizedQuery = query.toLowerCase();
  const match = FALLBACK_VIEW_RULES.find(({ keywords }) =>
    keywords.some((keyword) => normalizedQuery.includes(keyword))
  );

  return {
    focus_region: match?.focusRegion ?? "full_body",
    view_mode: match?.viewMode ?? "full_body",
    highlight: [],
    animation: "none",
    confidence: 0.3,
  };
};
