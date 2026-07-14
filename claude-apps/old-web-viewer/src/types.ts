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

export type CameraAction =
  | "zoom_in"
  | "zoom_out"
  | "reset"
  | "rotate_left"
  | "rotate_right";

// This type is the contract with the instruction-engine.
// Do not change field names without updating both sides.
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
