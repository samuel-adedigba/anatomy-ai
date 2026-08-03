/**
 * useAnatomyStore — central Zustand store for Anatomy AI mobile.
 *
 * Organised into logical slices but kept in one store for simplicity:
 *   - query / answer / sources
 *   - current visual command + view mode
 *   - loading + error state
 *   - viewer readiness
 *   - service health
 *   - onboarding
 *   - session management
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SourceRef, ApiError, HealthStatus } from "../types/api";
import type { ScenePlan } from "../types/scenePlan.generated";
import { VisualCommand, ViewMode } from "../types/viewer";
import { askQuestion, getVisualCommand, checkHealth, isApiError } from "../services/apiClient";

// ─── Storage keys ─────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  onboardingDismissed: "@anatomy_ai:onboarding_dismissed",
  lastViewMode:        "@anatomy_ai:last_view_mode",
} as const;

// ─── State type ───────────────────────────────────────────────────────────────
type AnatomyState = {
  // Query
  query:          string;
  answer:         string;
  sources:        SourceRef[];
  isLoading:      boolean;
  error:          ApiError | null;
  hasAsked:       boolean;

  // Visual
  currentCommand: VisualCommand | null;
  currentMode:    ViewMode;
  pendingCommand: VisualCommand | null;
  currentScenePlan: ScenePlan | null;
  pendingScenePlan: ScenePlan | null;

  // Viewer
  viewerReady:    boolean;
  viewerLoading:  boolean;

  // Health
  serviceHealth:  HealthStatus;

  // UX
  onboardingDismissed: boolean;
  sessionId:      string;

  // Actions
  setQuery:               (q: string) => void;
  submitQuery:            () => Promise<void>;
  clearAnswer:            () => void;
  selectSystem:           (mode: ViewMode) => Promise<void>;
  setViewerReady:         (ready: boolean) => void;
  setViewerLoading:       (loading: boolean) => void;
  setCurrentMode:         (mode: ViewMode) => void;
  dismissOnboarding:      () => Promise<void>;
  refreshHealth:          () => Promise<void>;
  hydrate:                () => Promise<void>;
  retry:                  () => Promise<void>;
};

let requestId = 0;

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAnatomyStore = create<AnatomyState>((set, get) => ({
  // ── Initial state ───────────────────────────────────────────────────────────
  query:    "",
  answer:   "",
  sources:  [],
  isLoading: false,
  error:    null,
  hasAsked: false,

  currentCommand: null,
  currentMode:    "full_body",
  pendingCommand: null,
  currentScenePlan: null,
  pendingScenePlan: null,

  viewerReady:   false,
  viewerLoading: false,

  serviceHealth: "offline",

  onboardingDismissed: false,
  sessionId: generateSessionId(),

  // ── Setters ─────────────────────────────────────────────────────────────────
  setQuery: (q) => set({ query: q, error: null }),

  clearAnswer: () => set({
    answer: "",
    sources: [],
    hasAsked: false,
    error: null,
    currentCommand: null,
    pendingCommand: null,
    currentScenePlan: null,
    pendingScenePlan: null,
  }),

  setViewerReady: (ready) => {
    set({ viewerReady: ready });
    if (ready) {
      const { pendingCommand, pendingScenePlan } = get();
      if (pendingScenePlan) {
        set({
          currentCommand: null,
          pendingCommand: null,
          currentScenePlan: pendingScenePlan,
          pendingScenePlan: null,
        });
      } else if (pendingCommand) {
        set({ currentCommand: pendingCommand, pendingCommand: null });
      }
    }
  },

  setViewerLoading: (loading) => set({ viewerLoading: loading }),

  setCurrentMode: (mode) => {
    set({ currentMode: mode });
    AsyncStorage.setItem(STORAGE_KEYS.lastViewMode, mode).catch(() => {});
  },

  // ── Submit a query ──────────────────────────────────────────────────────────
  submitQuery: async () => {
    const { query, sessionId } = get();
    const trimmed = query.trim();
    if (!trimmed) return;

    const currentRequestId = ++requestId;

    set({ isLoading: true, error: null, answer: "", sources: [], hasAsked: false });

    try {
      const data = await askQuestion(trimmed, sessionId);
      if (currentRequestId !== requestId) return;

      const { viewerReady } = get();
      const scenePlan = data.scenePlan ?? null;
      set({
        answer:         data.answer,
        sources:        data.sources ?? [],
        currentMode:    data.visualCommand?.view_mode ?? get().currentMode,
        isLoading:      false,
        hasAsked:       true,
        error:          null,
        ...(viewerReady
          ? {
              currentCommand: scenePlan ? null : data.visualCommand,
              pendingCommand: null,
              currentScenePlan: scenePlan,
              pendingScenePlan: null,
            }
          : {
              currentCommand: null,
              pendingCommand: scenePlan ? null : data.visualCommand,
              currentScenePlan: null,
              pendingScenePlan: scenePlan,
            }),
      });
    } catch (err) {
      if (currentRequestId !== requestId) return;
      const apiErr: ApiError = isApiError(err)
        ? err
        : {
            code:      "unknown",
            message:   "Something went wrong. Please try again.",
            retryable: false,
          };
      set({ isLoading: false, error: apiErr, hasAsked: false });
    }
  },

  // ── Retry last query ─────────────────────────────────────────────────────────
  retry: async () => {
    const { query } = get();
    if (query.trim()) {
      await get().submitQuery();
    }
  },

  // ── Select a body system manually ────────────────────────────────────────────
  selectSystem: async (mode) => {
    const currentRequestId = ++requestId;
    set({ isLoading: true, error: null });
    try {
      const command = await getVisualCommand(mode, mode);
      if (currentRequestId !== requestId) return;

      const { viewerReady } = get();
      set({
        currentMode:    mode,
        isLoading:      false,
        currentScenePlan: null,
        pendingScenePlan: null,
        ...(viewerReady
          ? { currentCommand: command, pendingCommand: null }
          : { pendingCommand: command }),
      });
      get().setCurrentMode(mode);
    } catch (err) {
      if (currentRequestId !== requestId) return;
      const apiErr: ApiError = isApiError(err)
        ? err
        : {
            code:      "unknown",
            message:   "Could not load this anatomy system. Try again.",
            retryable: true,
          };
      set({ isLoading: false, error: apiErr });
    }
  },

  // ── Dismiss onboarding ───────────────────────────────────────────────────────
  dismissOnboarding: async () => {
    set({ onboardingDismissed: true });
    await AsyncStorage.setItem(STORAGE_KEYS.onboardingDismissed, "true").catch(() => {});
  },

  // ── Poll service health ──────────────────────────────────────────────────────
  refreshHealth: async () => {
    const health = await checkHealth();
    const status: HealthStatus =
      health.status === "online"
        ? "online"
        : health.status === "degraded"
        ? "degraded"
        : "offline";
    set({ serviceHealth: status });
  },

  // ── Hydrate persisted state on startup ──────────────────────────────────────
  hydrate: async () => {
    try {
      const [dismissed, lastMode] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.onboardingDismissed),
        AsyncStorage.getItem(STORAGE_KEYS.lastViewMode),
      ]);
      set({
        onboardingDismissed: dismissed === "true",
        currentMode: (lastMode as ViewMode | null) ?? "full_body",
      });
    } catch {
      // Non-fatal: storage unavailable, use defaults
    }
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
