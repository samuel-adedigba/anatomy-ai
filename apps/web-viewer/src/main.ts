import { VisualEngine } from "./VisualEngine";
import { VisualCommand } from "./types";

const container = document.getElementById("canvas-container") as HTMLElement;
const viewSelect = document.getElementById("view-mode") as HTMLSelectElement | null;
const engine = new VisualEngine(container);
let activeViewMode: VisualCommand["view_mode"] =
  (viewSelect?.value as VisualCommand["view_mode"] | undefined) ?? "full_body";

const runCommand = (viewMode: VisualCommand["view_mode"]) => {
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
    runCommand(viewSelect.value as VisualCommand["view_mode"]);
  });
  runCommand(viewSelect.value as VisualCommand["view_mode"]);
} else {
  engine.reset();
}

/**
 * Command bridge — listens for postMessage events from the React Native WebView.
 * The mobile app sends VisualCommand JSON via window.ReactNativeWebView.postMessage()
 * and the web-viewer receives it here via the window message event.
 *
 * This keeps the visual engine fully decoupled from the mobile app.
 */
window.addEventListener("message", async (event: MessageEvent) => {
  try {
    const payload = event.data;
    const command: VisualCommand =
      typeof payload === "string" ? JSON.parse(payload) : (payload as VisualCommand);
    const nextCommand = preserveActiveViewForCameraCommand(command, activeViewMode);
    await engine.executeCommand(nextCommand);
    activeViewMode = nextCommand.view_mode;
    if (viewSelect && viewSelect.value !== activeViewMode) {
      viewSelect.value = activeViewMode;
    }
  } catch (err) {
    console.error("[web-viewer] Failed to parse or execute command:", err);
  }
});

// ─── Also expose on window for browser dev testing ────────────
(window as any).executeCommand = (command: VisualCommand) => {
  const nextCommand = preserveActiveViewForCameraCommand(command, activeViewMode);
  engine.executeCommand(nextCommand);
  activeViewMode = nextCommand.view_mode;
  if (viewSelect && viewSelect.value !== activeViewMode) {
    viewSelect.value = activeViewMode;
  }
};

console.log("[web-viewer] Visual engine ready");

function preserveActiveViewForCameraCommand(
  command: VisualCommand,
  currentViewMode: VisualCommand["view_mode"]
): VisualCommand {
  const isDefaultFullBodyCommand =
    command.view_mode === "full_body" &&
    command.focus_region === "full_body" &&
    command.highlight.length === 0;

  if (!isDefaultFullBodyCommand || currentViewMode === "full_body") {
    return command;
  }

  return {
    ...command,
    view_mode: currentViewMode,
  };
}
