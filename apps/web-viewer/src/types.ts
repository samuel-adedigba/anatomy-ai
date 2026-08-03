// ─── Core visual command types ────────────────────────────────────────────────
// This file is the shared contract between the instruction-engine and web-viewer.
// Do NOT change field names without updating services/instruction-engine/src/types/index.ts

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

// Extended with front/back/top for richer mobile controls
export type CameraAction =
  | "zoom_in"
  | "zoom_out"
  | "reset"
  | "rotate_left"
  | "rotate_right"
  | "front"
  | "back"
  | "top";

export type VisualCommand = {
  focus_region: string;
  view_mode: ViewMode;
  highlight: string[];
  animation: AnimationType;
  camera?: CameraAction;
  label?: string;
  opacity?: number;
  confidence: number;
};

// ─── Viewer → Mobile message protocol ────────────────────────────────────────
// Messages sent FROM the web-viewer TO the React Native host via postMessage.
// The mobile app listens for these to track viewer state.
export type ViewerToMobileMessage =
  | { type: "viewer_ready" }
  | { type: "model_loading"; view_mode: ViewMode }
  | { type: "model_loaded"; view_mode: ViewMode }
  | { type: "scene_loading"; plan_id: string }
  | { type: "scene_loaded"; plan_id: string }
  | { type: "viewer_error"; message: string; view_mode?: ViewMode }
  | { type: "command_complete"; view_mode: ViewMode }
  | {
      type: "scene_progress";
      plan_id: string;
      time_ms: number;
      duration_ms: number;
      state: "idle" | "playing" | "paused" | "completed";
      step_id?: string;
    }
  | { type: "scene_complete"; plan_id: string }
  | { type: "scene_fallback"; plan_id: string; message: string };

export type ScenePlaybackCommand =
  | { type: "scene_control"; action: "play" | "pause" | "replay" }
  | { type: "scene_control"; action: "seek"; time_ms: number }
  | { type: "scene_control"; action: "set_speed"; speed: number }
  | { type: "scene_control"; action: "set_reduced_motion"; enabled: boolean };
