import type { VisualEngine } from "./VisualEngine";
import { VisualCommand, ViewMode, ViewerToMobileMessage } from "./types";
import { ScenePlan } from "./visual-scene/scenePlan.generated";
import {
  renderScenePlanFallback,
  renderScenePlanError,
  renderScenePlanSteps,
  updateScenePlanPlayback,
} from "./visual-scene/ScenePlanSteps";
import { validateScenePlan } from "./visual-scene/scenePlanValidator";

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Send a message to the native WebView or browser iframe host. */
function postToHost(msg: ViewerToMobileMessage): void {
  try {
    if ((window as any).ReactNativeWebView?.postMessage) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify(msg));
    } else if (window.parent !== window) {
      window.parent.postMessage(msg, "*");
    }
  } catch {
    // Non-fatal: running in browser dev mode without an embedded host.
  }
}

/** Validate that an incoming object looks like a VisualCommand before executing. */
function isValidCommand(obj: unknown): obj is VisualCommand {
  if (typeof obj !== "object" || obj === null) return false;
  const cmd = obj as Record<string, unknown>;
  const validViewModes: ViewMode[] = [
    "full_body", "skeleton", "muscular", "nervous_system",
    "circulatory", "respiratory", "digestive", "brain", "heart", "spine",
  ];
  return (
    typeof cmd["focus_region"] === "string" &&
    typeof cmd["view_mode"] === "string" &&
    validViewModes.includes(cmd["view_mode"] as ViewMode) &&
    Array.isArray(cmd["highlight"]) &&
    typeof cmd["animation"] === "string" &&
    typeof cmd["confidence"] === "number"
  );
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const container = document.getElementById("canvas-container") as HTMLElement;
const viewSelect = document.getElementById("view-mode") as HTMLSelectElement | null;
const playHeartButton = document.getElementById("play-heart-explanation") as HTMLButtonElement | null;
const loadingEl = document.getElementById("loading-overlay") as HTMLElement | null;
const loadingLabel = document.getElementById("loading-label") as HTMLElement | null;
const isEmbedded =
  Boolean((window as any).ReactNativeWebView?.postMessage) ||
  window.parent !== window;

if (isEmbedded) {
  document.body.classList.add("embedded");
}

let activeViewMode: ViewMode =
  (viewSelect?.value as ViewMode | undefined) ?? "full_body";
let activeScenePlan: ScenePlan | null = null;
let engine: VisualEngine | null = null;
let enginePromise: Promise<VisualEngine> | null = null;
let sceneReadyPromise: Promise<void> | null = null;

// Three.js is loaded only when a user command or an explicit scene plan
// arrives. The initial embedded viewer therefore stays inert and lightweight.
function getEngine(): Promise<VisualEngine> {
  if (engine) return Promise.resolve(engine);
  if (!enginePromise) {
    enginePromise = import("./VisualEngine").then(({ VisualEngine: Engine }) => {
      engine = new Engine(container, {
        onModelLoading: (viewMode) => {
          if (loadingEl) loadingEl.style.display = "flex";
          if (loadingLabel) loadingLabel.textContent = `Loading ${viewMode.replace(/_/g, " ")}…`;
          postToHost({ type: "model_loading", view_mode: viewMode as ViewMode });
        },
        onModelLoaded: (viewMode) => {
          if (loadingEl) loadingEl.style.display = "none";
          postToHost({ type: "model_loaded", view_mode: viewMode as ViewMode });
        },
        onSceneLoading: (planId) => {
          if (loadingEl) loadingEl.style.display = "flex";
          if (loadingLabel) loadingLabel.textContent = "Loading visual sequence…";
          postToHost({ type: "scene_loading", plan_id: planId });
        },
        onSceneLoaded: (planId) => {
          if (loadingEl) loadingEl.style.display = "none";
          postToHost({ type: "scene_loaded", plan_id: planId });
        },
        onError: (message, viewMode) => {
          if (loadingEl) loadingEl.style.display = "none";
          postToHost({ type: "viewer_error", message, view_mode: viewMode as ViewMode | undefined });
        },
        onSceneProgress: (progress) => {
          if (!activeScenePlan) return;
          updateScenePlanPlayback(
            activeScenePlan,
            progress.time_ms,
            progress.state,
            progress.step_id
          );
          postToHost({ type: "scene_progress", ...progress });
        },
        onSceneComplete: (planId) => {
          postToHost({ type: "scene_complete", plan_id: planId });
        },
        onSceneFallback: (planId, message) => {
          renderScenePlanFallback(message);
          postToHost({ type: "scene_fallback", plan_id: planId, message });
        },
      });
      return engine!;
    });
  }
  return enginePromise;
}

async function executeCommand(command: VisualCommand): Promise<void> {
  const visualEngine = await getEngine();
  await visualEngine.executeCommand(command);
}

async function executeScenePlan(plan: ScenePlan): Promise<void> {
  const visualEngine = await getEngine();
  await visualEngine.executeScenePlan(plan);
}

// ─── View mode selector (browser dev UI) ────────────────────────────────────

const runCommand = (viewMode: ViewMode) => {
  activeViewMode = viewMode;
  void executeCommand({
    focus_region: "full_body",
    view_mode: viewMode,
    highlight: [],
    animation: "none",
    camera: "reset",
    confidence: 1.0,
  });
};

if (viewSelect) {
  viewSelect.addEventListener("change", () => {
    runCommand(viewSelect.value as ViewMode);
  });
}

if (playHeartButton) {
  playHeartButton.addEventListener("click", () => {
    playHeartButton.disabled = true;
    void loadHeartExplanation().finally(() => {
      playHeartButton.disabled = false;
    });
  });
}

// Keep the initial viewer inert. Models and scene plans are loaded only after
// a user selection or an explicit host/RAG command.

// ─── WebView message bridge ──────────────────────────────────────────────────
// Receives VisualCommand JSON from React Native via postMessage.

window.addEventListener("message", async (event: MessageEvent) => {
  try {
    if (!isTrustedHostMessage(event)) return;

    const payload = event.data;
    const parsed: unknown =
      typeof payload === "string" ? JSON.parse(payload) : payload;

    if (isPotentialScenePlan(parsed)) {
      const result = validateScenePlan(parsed);
      if (!result.success) {
        const message = result.issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join(" ");
        renderScenePlanError(message);
        postToHost({ type: "viewer_error", message });
        return;
      }

      showScenePlan(result.plan);
      return;
    }

    if (!isValidCommand(parsed)) {
      console.warn("[web-viewer] Ignored invalid command:", parsed);
      return;
    }

    const command = preserveViewModeForCameraCommand(parsed, activeViewMode);
    await executeCommand(command);
    activeViewMode = command.view_mode;

    if (viewSelect && viewSelect.value !== activeViewMode) {
      viewSelect.value = activeViewMode;
    }

    postToHost({ type: "command_complete", view_mode: activeViewMode });
  } catch (err) {
    console.error("[web-viewer] Failed to handle message:", err);
    postToHost({
      type: "viewer_error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// ─── Browser dev console helper ───────────────────────────────────────────────
(window as any).executeCommand = async (command: VisualCommand) => {
  if (!isValidCommand(command)) {
    console.warn("[web-viewer] Invalid command passed to executeCommand:", command);
    return;
  }
  const next = preserveViewModeForCameraCommand(command, activeViewMode);
  await executeCommand(next);
  activeViewMode = next.view_mode;
  if (viewSelect && viewSelect.value !== activeViewMode) {
    viewSelect.value = activeViewMode;
  }
};

(window as any).loadScenePlan = (input: unknown): ScenePlan | null => {
  const result = validateScenePlan(input);
  if (!result.success) {
    const message = result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join(" ");
    renderScenePlanError(message);
    console.warn("[web-viewer] Invalid scene plan:", result.issues);
    return null;
  }

  showScenePlan(result.plan);
  return result.plan;
};

// Notify host that the viewer is ready
postToHost({ type: "viewer_ready" });
console.log("[web-viewer] Viewer bridge ready — Three.js engine is lazy-loaded");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function preserveViewModeForCameraCommand(
  command: VisualCommand,
  currentViewMode: ViewMode
): VisualCommand {
  const isDefaultFullBodyCommand =
    command.view_mode === "full_body" &&
    command.focus_region === "full_body" &&
    command.highlight.length === 0;

  if (!isDefaultFullBodyCommand || currentViewMode === "full_body") {
    return command;
  }

  return { ...command, view_mode: currentViewMode };
}

function isPotentialScenePlan(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    ("schema_version" in value || "tracks" in value || "steps" in value)
  );
}

function isTrustedHostMessage(event: MessageEvent): boolean {
  if ((window as any).ReactNativeWebView?.postMessage) {
    return true;
  }

  return window.parent !== window && event.source === window.parent;
}

function showScenePlan(plan: ScenePlan): void {
  activeScenePlan = plan;
  activeViewMode = plan.fallback.view_mode as ViewMode;
  if (viewSelect) viewSelect.value = activeViewMode;
  renderScenePlanSteps(plan, {
    onTogglePlay: () => afterSceneReady(() => {
      const state = engine?.getSceneProgress()?.state;
      if (state === "playing") engine?.pauseScene();
      else engine?.playScene();
    }),
    onReplay: () => afterSceneReady(() => engine?.replayScene()),
    onSeek: (timeMs) => afterSceneReady(() => engine?.seekScene(timeMs)),
    onStepSelect: (timeMs) => {
      afterSceneReady(() => {
        engine?.pauseScene();
        engine?.seekScene(timeMs);
      });
    },
    onSpeedChange: (speed) => afterSceneReady(() => engine?.setSceneSpeed(speed)),
  });
  renderScenePlanSources(plan);
  sceneReadyPromise = executeScenePlan(plan);
}

function afterSceneReady(action: () => void): void {
  void (sceneReadyPromise ?? Promise.resolve()).then(action);
}

async function loadHeartExplanation(): Promise<void> {
  try {
    const response = await fetch("/visual-scene/fixtures/cardiovascular.normal-circulation.v1.json");
    if (!response.ok) {
      throw new Error(`The heart explanation could not be loaded (${response.status}).`);
    }
    const result = validateScenePlan(await response.json());
    if (!result.success) {
      const message = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" ");
      renderScenePlanError(message);
      return;
    }
    showScenePlan(result.plan);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "The heart explanation could not be loaded.";
    renderScenePlanError(message);
    postToHost({ type: "viewer_error", message });
  }
}

function renderScenePlanSources(plan: ScenePlan): void {
  const sources = document.getElementById("scene-plan-sources");
  if (!sources) return;
  const sourceDetails: Record<string, { label: string; href?: string }> = {
    "medlineplus.heartbeat.000067": {
      label: "MedlinePlus: How the heart works",
      href: "https://medlineplus.gov/ency/anatomyvideos/000067.htm",
    },
    "anatomy-ai.cardiovascular.seed.v1": {
      label: "Anatomy AI cardiovascular reference set (local)",
    },
  };
  sources.replaceChildren(
    ...plan.evidence_refs.map((reference) => {
      const item = document.createElement("li");
      const source = sourceDetails[reference];
      if (!source?.href) {
        item.textContent = source?.label ?? reference;
        return item;
      }
      const link = document.createElement("a");
      link.href = source.href;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = `${source.label} (opens in a new tab)`;
      item.append(link);
      return item;
    })
  );
}
