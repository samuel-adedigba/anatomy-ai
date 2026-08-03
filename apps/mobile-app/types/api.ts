import { VisualCommand } from "./viewer";
import type { ScenePlan } from "./scenePlan.generated";

// ─── Source reference returned by the AI service ────────────────────────────
export type SourceRef = {
  title: string;
  url?: string;
  snippet?: string;
  score?: number;
};

export type GatewaySuccess<T> = {
  status: true;
  message: string;
  data: T;
};

export type GatewayError = {
  status: false;
  message: string;
  errors?: unknown;
};

// ─── POST /ask ────────────────────────────────────────────────────────────────
export type AskRequest = {
  query: string;
  sessionId?: string;
};

export type AskResponseData = {
  answer: string;
  sources: SourceRef[];
  visualCommand: VisualCommand;
  scenePlan?: ScenePlan;
  visualSupport?: "reviewed_recipe" | "static_anatomy" | "unsupported_visual" | "unavailable";
  visualMessage?: string;
};

export type AskResponse = GatewaySuccess<AskResponseData>;

// ─── POST /visual-command ─────────────────────────────────────────────────────
export type VisualCommandRequest = {
  region: string;
  mode: string;
};

export type VisualCommandResponse = GatewaySuccess<VisualCommand>;

// ─── GET /health ──────────────────────────────────────────────────────────────
export type HealthStatus = "online" | "offline" | "degraded";

export type HealthResponse = {
  status: HealthStatus | string;
  service?: string;
  uptime?: number;
};

// ─── Normalised API error ─────────────────────────────────────────────────────
export type ApiError = {
  code: "network" | "timeout" | "server" | "parse" | "unknown";
  message: string; // user-facing, no stack traces
  retryable: boolean;
};
