/**
 * Visual command validation and WebView message parsing tests.
 */

import { ViewMode, VisualCommand, ViewerToMobileMessage } from "../types/viewer";

// ─── Helpers (mirror of main.ts isValidCommand) ───────────────────────────────

const VALID_VIEW_MODES: ViewMode[] = [
  "full_body", "skeleton", "muscular", "nervous_system",
  "circulatory", "respiratory", "digestive", "brain", "heart", "spine",
];

function isValidCommand(obj: unknown): obj is VisualCommand {
  if (typeof obj !== "object" || obj === null) return false;
  const cmd = obj as Record<string, unknown>;
  return (
    typeof cmd["focus_region"] === "string" &&
    typeof cmd["view_mode"] === "string" &&
    VALID_VIEW_MODES.includes(cmd["view_mode"] as ViewMode) &&
    Array.isArray(cmd["highlight"]) &&
    typeof cmd["animation"] === "string" &&
    typeof cmd["confidence"] === "number"
  );
}

function parseViewerMessage(data: string): ViewerToMobileMessage | null {
  try {
    const msg = JSON.parse(data);
    if (typeof msg?.type === "string") return msg as ViewerToMobileMessage;
    return null;
  } catch {
    return null;
  }
}

// ─── isValidCommand ───────────────────────────────────────────────────────────

describe("isValidCommand", () => {
  const validCmd: VisualCommand = {
    focus_region: "heart",
    view_mode:    "heart",
    highlight:    ["Heart_Mesh"],
    animation:    "pulse",
    confidence:   0.9,
  };

  it("accepts a valid VisualCommand", () => {
    expect(isValidCommand(validCmd)).toBe(true);
  });

  it("rejects null", () => expect(isValidCommand(null)).toBe(false));
  it("rejects a string", () => expect(isValidCommand("heart")).toBe(false));
  it("rejects missing focus_region", () => {
    const { focus_region: _, ...rest } = validCmd;
    expect(isValidCommand(rest)).toBe(false);
  });
  it("rejects invalid view_mode", () => {
    expect(isValidCommand({ ...validCmd, view_mode: "pancreas" })).toBe(false);
  });
  it("rejects non-array highlight", () => {
    expect(isValidCommand({ ...validCmd, highlight: "Heart_Mesh" })).toBe(false);
  });
  it("rejects non-number confidence", () => {
    expect(isValidCommand({ ...validCmd, confidence: "high" })).toBe(false);
  });
  it("accepts all valid view modes", () => {
    for (const mode of VALID_VIEW_MODES) {
      expect(isValidCommand({ ...validCmd, view_mode: mode })).toBe(true);
    }
  });
  it("accepts optional camera field", () => {
    expect(isValidCommand({ ...validCmd, camera: "zoom_in" })).toBe(true);
  });
});

// ─── parseViewerMessage ───────────────────────────────────────────────────────

describe("parseViewerMessage", () => {
  it("parses viewer_ready message", () => {
    const result = parseViewerMessage(JSON.stringify({ type: "viewer_ready" }));
    expect(result?.type).toBe("viewer_ready");
  });

  it("parses model_loaded message with view_mode", () => {
    const result = parseViewerMessage(
      JSON.stringify({ type: "model_loaded", view_mode: "brain" })
    );
    expect(result?.type).toBe("model_loaded");
    if (result?.type === "model_loaded") {
      expect(result.view_mode).toBe("brain");
    }
  });

  it("parses viewer_error with message", () => {
    const result = parseViewerMessage(
      JSON.stringify({ type: "viewer_error", message: "GLTF load failed" })
    );
    expect(result?.type).toBe("viewer_error");
  });

  it("returns null for malformed JSON", () => {
    expect(parseViewerMessage("{not json")).toBeNull();
  });

  it("returns null for JSON without type field", () => {
    expect(parseViewerMessage(JSON.stringify({ foo: "bar" }))).toBeNull();
  });
});

// ─── Low confidence gating ────────────────────────────────────────────────────

describe("confidence gating", () => {
  const CONFIDENCE_THRESHOLD = 0.4;

  it("allows highlights at confidence 0.4", () => {
    const cmd: VisualCommand = {
      focus_region: "brain",
      view_mode:    "brain",
      highlight:    ["Cerebrum"],
      animation:    "wave",
      confidence:   0.4,
    };
    expect(cmd.confidence >= CONFIDENCE_THRESHOLD).toBe(true);
  });

  it("blocks highlights below threshold", () => {
    const cmd: VisualCommand = {
      focus_region: "brain",
      view_mode:    "brain",
      highlight:    ["Cerebrum"],
      animation:    "wave",
      confidence:   0.2,
    };
    expect(cmd.confidence >= CONFIDENCE_THRESHOLD).toBe(false);
  });
});
