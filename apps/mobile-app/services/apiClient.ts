/**
 * apiClient — centralised HTTP layer for Anatomy AI mobile.
 *
 * Rules:
 *  - URL read from Expo config extra, never hardcoded in components
 *  - All errors normalised to ApiError before surfacing
 *  - Timeout handled explicitly (10 s default)
 *  - Non-2xx responses converted to ApiError
 *  - Session ID injected automatically
 */

import Constants from "expo-constants";
import { AskRequest, AskResponse, AskResponseData, ApiError, HealthResponse, VisualCommandResponse } from "../types/api";
import { VisualCommand } from "../types/viewer";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiGatewayUrl as string | undefined) ??
  "http://localhost:3001";

const TIMEOUT_MS = 10_000;

// ─── Internal fetch wrapper ───────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept:         "application/json",
        ...(options.headers ?? {}),
      },
    });

    clearTimeout(timer);

    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json() as Record<string, unknown>;
        detail = (body["message"] ?? body["error"] ?? "") as string;
      } catch { /* ignore parse errors on error bodies */ }

      const err: ApiError = {
        code:      res.status >= 500 ? "server" : "unknown",
        message:   detail || friendlyHttpError(res.status),
        retryable: res.status >= 500 || res.status === 429,
      };
      throw err;
    }

    return res.json() as Promise<T>;
  } catch (err: unknown) {
    clearTimeout(timer);

    if (isApiError(err)) throw err;

    if (err instanceof DOMException && err.name === "AbortError") {
      throw {
        code:      "timeout",
        message:   "The request took too long. Check your connection and try again.",
        retryable: true,
      } satisfies ApiError;
    }

    if (err instanceof TypeError) {
      throw {
        code:      "network",
        message:   "Anatomy AI could not reach the server. Check your connection and try again.",
        retryable: true,
      } satisfies ApiError;
    }

    throw {
      code:      "unknown",
      message:   "Something went wrong. Please try again.",
      retryable: false,
    } satisfies ApiError;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function askQuestion(query: string, sessionId?: string): Promise<AskResponseData> {
  const body: AskRequest = { query, ...(sessionId ? { sessionId } : {}) };
  const res = await request<AskResponse>("/ask", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return extractData<AskResponseData>(res, "The server returned an unexpected response.");
}

export async function getVisualCommand(region: string, mode: string): Promise<VisualCommand> {
  const res = await request<VisualCommandResponse>("/visual-command", {
    method: "POST",
    body: JSON.stringify({ region, mode }),
  });

  return extractData<VisualCommand>(res, "Could not generate visual command.");
}

export async function checkHealth(): Promise<HealthResponse> {
  try {
    const response = await request<HealthResponse>("/health");
    return typeof response.status === "string" ? response : { status: "online" };
  } catch {
    return { status: "offline" };
  }
}

function extractData<T>(raw: unknown, fallbackMessage: string): T {
  if (typeof raw !== "object" || raw === null) {
    throw { code: "parse", message: fallbackMessage, retryable: false } satisfies ApiError;
  }

  const envelope = raw as Record<string, unknown>;
  if (envelope.status === true && "data" in envelope) {
    return envelope.data as T;
  }

  const message = typeof envelope.message === "string" ? envelope.message : fallbackMessage;
  throw { code: "server", message, retryable: false } satisfies ApiError;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err &&
    "retryable" in err
  );
}

function friendlyHttpError(status: number): string {
  if (status === 404) return "The requested resource was not found.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "The server encountered an error. Please try again shortly.";
  return "An unexpected error occurred.";
}
