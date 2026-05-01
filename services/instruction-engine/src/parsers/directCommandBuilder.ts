import { VisualCommand, ViewMode } from "../types";
import { REGION_TO_VIEW_MODE, REGION_TO_MESHES, DEFAULT_COMMAND } from "../types/regionMap";

/**
 * Builds a visual command directly from a region/mode selection.
 * Used when the user taps a body system in the UI — no inference required.
 * Deterministic: same input always produces same output.
 */
export const buildDirectCommand = (
  region?: string,
  mode?: ViewMode
): VisualCommand => {
  const resolvedRegion = region?.toLowerCase().trim();
  const resolvedMode: ViewMode =
    mode ??
    (resolvedRegion ? REGION_TO_VIEW_MODE[resolvedRegion] : undefined) ??
    "full_body";

  const highlight =
    resolvedRegion ? (REGION_TO_MESHES[resolvedRegion] ?? []) : [];

  return {
    focus_region: resolvedRegion ?? "full_body",
    view_mode: resolvedMode,
    highlight,
    animation: "none",
    confidence: 1.0, // direct commands are always high confidence
  };
};
