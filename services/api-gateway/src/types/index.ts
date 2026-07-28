// ─── Shared types across the gateway ───────────────────────────

import type { ScenePlan } from "./scenePlan.generated";

export type AskRequestBody = {
  query: string;
  sessionId?: string;
};

export type AskResponse = {
  answer: string;
  sources: SourceRef[];
  visualCommand: VisualCommand;
  scenePlan?: ScenePlan;
};

export type SourceRef = {
  title: string;
  url?: string;
  snippet: string;
};

export type VisualCommand = {
  focus_region: string;
  view_mode: string;
  highlight: string[];
  animation: string;
  camera?: string;
  label?: string;
  confidence: number;
};

export type ApiSuccess<T> = {
  status: true;
  message: string;
  data: T;
};

export type ApiError = {
  status: false;
  message: string;
  errors?: unknown;
};
