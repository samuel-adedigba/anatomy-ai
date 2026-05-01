// ─── Core visual command schema ─────────────────────────────────
// This is the contract between the instruction engine and the visual engine.
// Every field here maps to a real Three.js operation.

export type ViewMode =
  | "full_body"
  | "skeleton"
  | "muscular"
  | "nervous_system"
  | "circulatory"
  | "respiratory"
  | "digestive"
  | "brain"
  | "heart"
  | "spine";

export type AnimationType =
  | "none"
  | "pulse"
  | "wave"
  | "flow"
  | "highlight_flash"
  | "expand"
  | "contract";

export type CameraAction = "zoom_in" | "zoom_out" | "reset" | "rotate_left" | "rotate_right";

export type VisualCommand = {
  focus_region: string;          // e.g. "brain", "lumbar_spine"
  view_mode: ViewMode;           // which body system to render
  highlight: string[];           // list of mesh/bone names to highlight
  animation: AnimationType;      // animation to trigger on highlighted region
  camera?: CameraAction;         // optional camera instruction
  label?: string;                // optional annotation label to show
  opacity?: number;              // 0–1 for fade other regions
  confidence: number;            // 0–1 how certain the parser is — low = fallback to default
};

// ─── Parse request from gateway ─────────────────────────────────
export type ParseRequest = {
  answer: string;
  raw_context: string;
};

// ─── Direct command request (no AI needed) ───────────────────────
export type DirectCommandRequest = {
  region?: string;
  mode?: ViewMode;
};

// ─── Response ────────────────────────────────────────────────────
export type CommandResponse = {
  command: VisualCommand;
};
