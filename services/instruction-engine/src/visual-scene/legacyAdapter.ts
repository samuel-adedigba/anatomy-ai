import { VisualCommand, ViewMode } from "../types";
import {
  CAPABILITY_REGISTRY_VERSION,
  SCENE_PLAN_SCHEMA_VERSION,
  ScenePlan,
  SceneViewMode,
} from "./scenePlan.generated";

const SCENE_VIEW_MODES = new Set<SceneViewMode>([
  "full_body",
  "skeleton",
  "muscular",
  "nervous_system",
  "circulatory",
  "respiratory",
  "digestive",
  "brain",
  "heart",
  "spine",
]);

function toSceneViewMode(viewMode: ViewMode): SceneViewMode {
  return SCENE_VIEW_MODES.has(viewMode as SceneViewMode)
    ? (viewMode as SceneViewMode)
    : "full_body";
}

export function compileLegacyCommandToScenePlan(
  command: VisualCommand
): ScenePlan {
  const viewMode = toSceneViewMode(command.view_mode);
  const label = command.label?.trim();

  return {
    schema_version: SCENE_PLAN_SCHEMA_VERSION,
    capability_registry_version: CAPABILITY_REGISTRY_VERSION,
    plan_id: `legacy.${viewMode}.static.v1`,
    topic: "general_anatomy",
    learning_objective:
      label || `Inspect the ${viewMode.replace(/_/g, " ")} model.`,
    duration_ms: 1,
    loop: false,
    required_assets: [],
    tracks: [],
    steps: [
      {
        id: "static-view",
        start_ms: 0,
        end_ms: 1,
        caption:
          label ||
          "This legacy request provides a static anatomy view. Timed motion is unavailable.",
      },
    ],
    evidence_refs: ["legacy.visual-command"],
    fallback: {
      view_mode: viewMode,
      message:
        "This request uses the legacy visual contract. Showing the static model safely.",
    },
  };
}
