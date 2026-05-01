import { ViewMode } from "../types";

// ─── Maps keywords in AI answers → view mode ──────────────────
// Add entries here as the knowledge base expands
export const REGION_TO_VIEW_MODE: Record<string, ViewMode> = {
  brain: "brain",
  cortex: "brain",
  neuron: "nervous_system",
  nerve: "nervous_system",
  spine: "spine",
  vertebra: "spine",
  lumbar: "spine",
  cervical: "spine",
  heart: "heart",
  artery: "circulatory",
  vein: "circulatory",
  blood: "circulatory",
  lung: "respiratory",
  bronchi: "respiratory",
  muscle: "muscular",
  tendon: "muscular",
  ligament: "skeleton",
  bone: "skeleton",
  skeleton: "skeleton",
  stomach: "digestive",
  intestine: "digestive",
  liver: "digestive",
};

// ─── Maps region names → mesh/bone highlight targets ──────────
// These must match the actual names in the GLTF anatomy assets
export const REGION_TO_MESHES: Record<string, string[]> = {
  brain: ["Brain_Mesh", "Cerebrum", "Cerebellum", "BrainStem"],
  cortex: ["Cerebral_Cortex"],
  heart: ["Heart_Mesh", "Left_Ventricle", "Right_Ventricle"],
  spine: ["Cervical_Spine", "Thoracic_Spine", "Lumbar_Spine", "Sacrum"],
  lumbar: ["Lumbar_Spine", "L1", "L2", "L3", "L4", "L5"],
  lung: ["Left_Lung", "Right_Lung"],
  liver: ["Liver_Mesh"],
  stomach: ["Stomach_Mesh"],
};

// ─── Default fallback command when parsing confidence is low ──
export const DEFAULT_COMMAND = {
  focus_region: "full_body",
  view_mode: "full_body" as ViewMode,
  highlight: [] as string[],
  animation: "none" as const,
  confidence: 0,
};
