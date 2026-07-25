import { VisualEngine } from "./VisualEngine";
import { VisualCommand, ViewMode, ViewerToMobileMessage } from "./types";

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

// Intercept model events so we can show/hide the loading overlay and notify host
const engine = new VisualEngine(container, {
  onModelLoading: (viewMode) => {
    if (loadingEl) loadingEl.style.display = "flex";
    if (loadingLabel) loadingLabel.textContent = `Loading ${viewMode.replace(/_/g, " ")}…`;
    postToHost({ type: "model_loading", view_mode: viewMode as ViewMode });
  },
  onModelLoaded: (viewMode) => {
    if (loadingEl) loadingEl.style.display = "none";
    postToHost({ type: "model_loaded", view_mode: viewMode as ViewMode });
  },
  onError: (message, viewMode) => {
    if (loadingEl) loadingEl.style.display = "none";
    postToHost({ type: "viewer_error", message, view_mode: viewMode as ViewMode | undefined });
  },
});

// ─── View mode selector (browser dev UI) ────────────────────────────────────

const runCommand = (viewMode: ViewMode) => {
  activeViewMode = viewMode;
  engine.executeCommand({
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

if (!isEmbedded && viewSelect) {
  runCommand(viewSelect.value as ViewMode);
} else if (!isEmbedded) {
  engine.reset();
}

// ─── WebView message bridge ──────────────────────────────────────────────────
// Receives VisualCommand JSON from React Native via postMessage.

window.addEventListener("message", async (event: MessageEvent) => {
  try {
    const payload = event.data;
    const parsed: unknown =
      typeof payload === "string" ? JSON.parse(payload) : payload;

    if (!isValidCommand(parsed)) {
      console.warn("[web-viewer] Ignored invalid command:", parsed);
      return;
    }

    const command = preserveViewModeForCameraCommand(parsed, activeViewMode);
    await engine.executeCommand(command);
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
  await engine.executeCommand(next);
  activeViewMode = next.view_mode;
  if (viewSelect && viewSelect.value !== activeViewMode) {
    viewSelect.value = activeViewMode;
  }
};

// Notify host that the viewer is ready
postToHost({ type: "viewer_ready" });
console.log("[web-viewer] Visual engine ready — postMessage bridge active");

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
