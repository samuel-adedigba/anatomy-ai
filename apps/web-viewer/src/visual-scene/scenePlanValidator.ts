import {
  ANIMATION_CLIPS,
  ANIMATION_MORPHS,
  CAMERA_TARGETS,
  CAPABILITY_REGISTRY_VERSION,
  CLIP_TARGETS,
  CONFLICT_GROUPS,
  FLOW_PATH_REQUIREMENTS,
  FLOW_PATHS,
  LABEL_TEXT_KEYS,
  MATERIAL_TARGETS,
  MORPH_TARGETS,
  SCENE_ACTIONS,
  SCENE_ASSETS,
  SCENE_PLAN_SCHEMA_VERSION,
  SCENE_TOPICS,
  SCENE_LIMITS,
  SCENE_VIEW_MODES,
  SEMANTIC_STATES,
  SEMANTIC_TARGETS,
  TARGET_ASSETS,
  ScenePlan,
} from "./scenePlan.generated";

export type ScenePlanValidationIssue = {
  path: string;
  message: string;
};

export type ScenePlanValidationResult =
  | { success: true; plan: ScenePlan }
  | { success: false; issues: ScenePlanValidationIssue[] };

const actions = new Set<string>(SCENE_ACTIONS);
const assets = new Set<string>(SCENE_ASSETS);
const topics = new Set<string>(SCENE_TOPICS);
const targets = new Set<string>(SEMANTIC_TARGETS);
const clips = new Set<string>(ANIMATION_CLIPS);
const morphs = new Set<string>(ANIMATION_MORPHS);
const paths = new Set<string>(FLOW_PATHS);
const states = new Set<string>(SEMANTIC_STATES);
const labelTextKeys = new Set<string>(LABEL_TEXT_KEYS);
const viewModes = new Set<string>(SCENE_VIEW_MODES);
const cameraTargets = new Set<string>(CAMERA_TARGETS);
const materialTargets = new Set<string>(MATERIAL_TARGETS);
const oxygenStates = new Set<string>([
  "oxygen_poor_blood",
  "oxygen_rich_blood",
]);
const conflictGroupByAction = new Map<string, string>();
Object.entries(CONFLICT_GROUPS).forEach(([group, groupedActions]) => {
  groupedActions.forEach((action) => conflictGroupByAction.set(action, group));
});
const targetAssets = TARGET_ASSETS as Record<string, string>;
const clipTargets = CLIP_TARGETS as Record<string, readonly string[]>;
const morphTargets = MORPH_TARGETS as Record<string, readonly string[]>;
const flowRequirements = FLOW_PATH_REQUIREMENTS as Record<
  string,
  {
    target: string;
    state: string;
    required_assets: readonly string[];
  }
>;
const identifierPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const planIdentifierPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/;
const commonTrackKeys = ["id", "target", "action", "start_ms", "duration_ms"];
const actionKeys: Record<string, string[]> = {
  play_clip: ["clip", "loop"],
  play_morph: ["morph", "from", "to"],
  particle_flow: ["path", "state"],
  signal_propagation: ["path", "state"],
  highlight: ["state"],
  set_material_state: ["state"],
  fade: ["opacity"],
  show_label: ["text_key"],
  camera_focus: [],
  camera_orbit: [],
  wait: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isUnitNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 120 &&
    identifierPattern.test(value)
  );
}

function isPlanIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 120 &&
    planIdentifierPattern.test(value)
  );
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function addIssue(
  issues: ScenePlanValidationIssue[],
  path: string,
  message: string
): void {
  issues.push({ path, message });
}

function validateTrack(
  value: unknown,
  index: number,
  durationMs: number,
  requiredAssets: Set<string>,
  issues: ScenePlanValidationIssue[]
): value is ScenePlan["tracks"][number] {
  const basePath = `tracks.${index}`;
  if (!isRecord(value)) {
    addIssue(issues, basePath, "Track must be an object.");
    return false;
  }

  const action = value["action"];
  if (typeof action !== "string" || !actions.has(action)) {
    addIssue(issues, `${basePath}.action`, "Unknown scene action.");
    return false;
  }
  if (!hasOnlyKeys(value, [...commonTrackKeys, ...actionKeys[action]])) {
    addIssue(issues, basePath, "Track contains fields that are not allowed for its action.");
  }
  if (!isIdentifier(value["id"])) {
    addIssue(issues, `${basePath}.id`, "Track id is invalid.");
  }
  if (typeof value["target"] !== "string" || !targets.has(value["target"])) {
    addIssue(issues, `${basePath}.target`, "Unknown semantic target.");
  }
  if (!isInteger(value["start_ms"]) || value["start_ms"] < 0) {
    addIssue(issues, `${basePath}.start_ms`, "Track start must be a non-negative integer.");
  }
  if (!isInteger(value["duration_ms"]) || value["duration_ms"] <= 0) {
    addIssue(issues, `${basePath}.duration_ms`, "Track duration must be a positive integer.");
  } else if (
    isInteger(value["start_ms"]) &&
    value["start_ms"] + value["duration_ms"] > durationMs
  ) {
    addIssue(issues, `${basePath}.duration_ms`, "Track timing exceeds the scene duration.");
  }

  switch (action) {
    case "play_clip":
      if (typeof value["clip"] !== "string" || !clips.has(value["clip"])) {
        addIssue(issues, `${basePath}.clip`, "Unknown animation clip.");
      }
      if (typeof value["loop"] !== "boolean") {
        addIssue(issues, `${basePath}.loop`, "Clip loop must be a boolean.");
      }
      if (
        typeof value["clip"] === "string" &&
        typeof value["target"] === "string" &&
        !clipTargets[value["clip"]]?.includes(value["target"])
      ) {
        addIssue(issues, `${basePath}.target`, "The clip does not support this target.");
      }
      break;
    case "play_morph":
      if (typeof value["morph"] !== "string" || !morphs.has(value["morph"])) {
        addIssue(issues, `${basePath}.morph`, "Unknown morph target.");
      }
      if (!isUnitNumber(value["from"]) || !isUnitNumber(value["to"])) {
        addIssue(issues, basePath, "Morph weights must be between 0 and 1.");
      }
      if (
        typeof value["morph"] === "string" &&
        typeof value["target"] === "string" &&
        !morphTargets[value["morph"]]?.includes(value["target"])
      ) {
        addIssue(issues, `${basePath}.target`, "The morph does not support this target.");
      }
      break;
    case "particle_flow":
    case "signal_propagation":
      if (typeof value["path"] !== "string" || !paths.has(value["path"])) {
        addIssue(issues, `${basePath}.path`, "Unknown flow path.");
      }
      if (typeof value["state"] !== "string" || !oxygenStates.has(value["state"])) {
        addIssue(issues, `${basePath}.state`, "Flow state must describe oxygen-rich or oxygen-poor blood.");
      }
      if (typeof value["path"] === "string") {
        const requirement = flowRequirements[value["path"]];
        if (
          !requirement ||
          requirement.target !== value["target"] ||
          requirement.state !== value["state"]
        ) {
          addIssue(
            issues,
            `${basePath}.path`,
            "The flow path does not support this target and state."
          );
        } else {
          requirement.required_assets.forEach((asset) => {
            if (!requiredAssets.has(asset)) {
              addIssue(
                issues,
                "required_assets",
                `Flow path "${value["path"]}" requires asset "${asset}".`
              );
            }
          });
        }
      }
      break;
    case "highlight":
    case "set_material_state":
      if (
        typeof value["target"] !== "string" ||
        !materialTargets.has(value["target"])
      ) {
        addIssue(issues, `${basePath}.target`, "Material actions require an anatomical target.");
      }
      if (typeof value["state"] !== "string" || !states.has(value["state"])) {
        addIssue(issues, `${basePath}.state`, "Unknown semantic material state.");
      }
      break;
    case "fade":
      if (
        typeof value["target"] !== "string" ||
        !materialTargets.has(value["target"])
      ) {
        addIssue(issues, `${basePath}.target`, "Fade requires an anatomical target.");
      }
      if (!isUnitNumber(value["opacity"])) {
        addIssue(issues, `${basePath}.opacity`, "Opacity must be between 0 and 1.");
      }
      break;
    case "show_label":
      if (
        typeof value["text_key"] !== "string" ||
        !labelTextKeys.has(value["text_key"])
      ) {
        addIssue(issues, `${basePath}.text_key`, "Unknown label text key.");
      } else if (value["target"] !== value["text_key"]) {
        addIssue(
          issues,
          `${basePath}.text_key`,
          "Label target and text key must identify the same structure."
        );
      }
      break;
    case "camera_focus":
    case "camera_orbit":
      if (typeof value["target"] !== "string" || !cameraTargets.has(value["target"])) {
        addIssue(issues, `${basePath}.target`, "Camera actions require a registered camera target.");
      }
      break;
  }

  if (
    action !== "wait" &&
    typeof value["target"] === "string" &&
    targetAssets[value["target"]] &&
    !requiredAssets.has(targetAssets[value["target"]])
  ) {
    addIssue(
      issues,
      `${basePath}.target`,
      `Target "${value["target"]}" requires asset "${targetAssets[value["target"]]}".`
    );
  }

  return true;
}

export function validateScenePlan(input: unknown): ScenePlanValidationResult {
  const issues: ScenePlanValidationIssue[] = [];
  if (!isRecord(input)) {
    return {
      success: false,
      issues: [{ path: "$", message: "Scene plan must be an object." }],
    };
  }

  const allowedPlanKeys = [
    "schema_version",
    "capability_registry_version",
    "plan_id",
    "topic",
    "learning_objective",
    "duration_ms",
    "loop",
    "required_assets",
    "tracks",
    "steps",
    "evidence_refs",
    "fallback",
  ];
  if (!hasOnlyKeys(input, allowedPlanKeys)) {
    addIssue(issues, "$", "Scene plan contains unknown fields.");
  }
  if (input["schema_version"] !== SCENE_PLAN_SCHEMA_VERSION) {
    addIssue(
      issues,
      "schema_version",
      `Unsupported scene schema version. Expected ${SCENE_PLAN_SCHEMA_VERSION}.`
    );
  }
  if (input["capability_registry_version"] !== CAPABILITY_REGISTRY_VERSION) {
    addIssue(
      issues,
      "capability_registry_version",
      `Unsupported capability registry version. Expected ${CAPABILITY_REGISTRY_VERSION}.`
    );
  }
  if (!isPlanIdentifier(input["plan_id"])) {
    addIssue(issues, "plan_id", "Plan id is invalid.");
  }
  if (typeof input["topic"] !== "string" || !topics.has(input["topic"])) {
    addIssue(issues, "topic", "Unknown scene topic.");
  }
  if (
    typeof input["learning_objective"] !== "string" ||
    input["learning_objective"].length < 1 ||
    input["learning_objective"].length > 500
  ) {
    addIssue(issues, "learning_objective", "Learning objective is required.");
  }
  const durationMs = input["duration_ms"];
  if (!isInteger(durationMs) || durationMs <= 0 || durationMs > 600_000) {
    addIssue(issues, "duration_ms", "Scene duration must be a positive integer up to 600000 ms.");
  }
  if (typeof input["loop"] !== "boolean") {
    addIssue(issues, "loop", "Scene loop must be a boolean.");
  }

  const requiredAssets = input["required_assets"];
  if (
    !Array.isArray(requiredAssets) ||
    requiredAssets.length > SCENE_LIMITS.max_required_assets ||
    requiredAssets
      .slice(0, SCENE_LIMITS.max_required_assets)
      .some((asset) => typeof asset !== "string" || !assets.has(asset))
  ) {
    addIssue(issues, "required_assets", "Required assets contain an unknown asset.");
  } else if (new Set(requiredAssets).size !== requiredAssets.length) {
    addIssue(issues, "required_assets", "Required assets must be unique.");
  }

  const inputTracks = input["tracks"];
  if (!Array.isArray(inputTracks)) {
    addIssue(issues, "tracks", "Tracks must be an array.");
  } else if (isInteger(durationMs) && durationMs > 0) {
    if (inputTracks.length > SCENE_LIMITS.max_tracks) {
      addIssue(
        issues,
        "tracks",
        `A scene plan can contain at most ${SCENE_LIMITS.max_tracks} tracks.`
      );
    }
    const tracks = inputTracks.slice(0, SCENE_LIMITS.max_tracks);
    const requiredAssetSet = new Set(
      Array.isArray(requiredAssets)
        ? requiredAssets
            .slice(0, SCENE_LIMITS.max_required_assets)
            .filter((asset): asset is string => typeof asset === "string")
        : []
    );
    if (tracks.length > 0 && requiredAssetSet.size === 0) {
      addIssue(issues, "required_assets", "Plans with renderer tracks must declare at least one asset.");
    }
    tracks.forEach((track, index) =>
      validateTrack(track, index, durationMs, requiredAssetSet, issues)
    );
    const ids = new Set<string>();
    tracks.forEach((track, index) => {
      if (!isRecord(track) || typeof track["id"] !== "string") return;
      if (ids.has(track["id"])) {
        addIssue(issues, `tracks.${index}.id`, `Duplicate track id "${track["id"]}".`);
      }
      ids.add(track["id"]);
    });
    tracks.forEach((track, index) => {
      if (
        !isRecord(track) ||
        typeof track["action"] !== "string" ||
        !isInteger(track["start_ms"]) ||
        !isInteger(track["duration_ms"])
      ) {
        return;
      }
      const conflictGroup = conflictGroupByAction.get(track["action"]);
      if (!conflictGroup) return;
      const trackStart = track["start_ms"];
      const end = trackStart + track["duration_ms"];
      const conflict = tracks.findIndex((candidate, candidateIndex) => {
        if (
          candidateIndex >= index ||
          !isRecord(candidate) ||
          typeof candidate["action"] !== "string" ||
          conflictGroupByAction.get(candidate["action"]) !== conflictGroup ||
          (conflictGroup !== "camera_motion" &&
            candidate["target"] !== track["target"]) ||
          !isInteger(candidate["start_ms"]) ||
          !isInteger(candidate["duration_ms"])
        ) {
          return false;
        }
        const candidateEnd = candidate["start_ms"] + candidate["duration_ms"];
        return trackStart < candidateEnd && candidate["start_ms"] < end;
      });
      if (conflict >= 0) {
        addIssue(
          issues,
          `tracks.${index}.start_ms`,
          `Track conflicts with track ${conflict} in the "${conflictGroup}" capability group.`
        );
      }
    });
  }

  const inputSteps = input["steps"];
  if (!Array.isArray(inputSteps) || inputSteps.length === 0) {
    addIssue(issues, "steps", "At least one learning step is required.");
  } else if (isInteger(durationMs) && durationMs > 0) {
    if (inputSteps.length > SCENE_LIMITS.max_steps) {
      addIssue(
        issues,
        "steps",
        `A scene plan can contain at most ${SCENE_LIMITS.max_steps} steps.`
      );
    }
    const steps = inputSteps.slice(0, SCENE_LIMITS.max_steps);
    const ids = new Set<string>();
    steps.forEach((step, index) => {
      const basePath = `steps.${index}`;
      if (!isRecord(step) || !hasOnlyKeys(step, ["id", "start_ms", "end_ms", "caption"])) {
        addIssue(issues, basePath, "Step must contain only id, timing, and caption.");
        return;
      }
      if (!isIdentifier(step["id"])) {
        addIssue(issues, `${basePath}.id`, "Step id is invalid.");
      } else if (ids.has(step["id"])) {
        addIssue(issues, `${basePath}.id`, `Duplicate step id "${step["id"]}".`);
      } else {
        ids.add(step["id"]);
      }
      if (!isInteger(step["start_ms"]) || step["start_ms"] < 0) {
        addIssue(issues, `${basePath}.start_ms`, "Step start must be a non-negative integer.");
      }
      if (
        !isInteger(step["end_ms"]) ||
        !isInteger(step["start_ms"]) ||
        step["end_ms"] <= step["start_ms"] ||
        step["end_ms"] > durationMs
      ) {
        addIssue(issues, `${basePath}.end_ms`, "Step end must follow its start and stay within the scene.");
      }
      if (
        index > 0 &&
        isRecord(steps[index - 1]) &&
        isInteger(steps[index - 1]["end_ms"]) &&
        isInteger(step["start_ms"]) &&
        step["start_ms"] < steps[index - 1]["end_ms"]
      ) {
        addIssue(issues, `${basePath}.start_ms`, "Ordered learning steps must not overlap.");
      }
      if (
        typeof step["caption"] !== "string" ||
        step["caption"].length < 1 ||
        step["caption"].length > 500
      ) {
        addIssue(issues, `${basePath}.caption`, "Step caption is required.");
      }
    });
  }

  const evidenceRefs = input["evidence_refs"];
  if (
    !Array.isArray(evidenceRefs) ||
    evidenceRefs.length === 0 ||
    evidenceRefs.length > SCENE_LIMITS.max_evidence_refs ||
    evidenceRefs.slice(0, SCENE_LIMITS.max_evidence_refs).some(
      (reference) =>
        typeof reference !== "string" ||
        reference.length < 1 ||
        reference.length > 160
    )
  ) {
    addIssue(issues, "evidence_refs", "At least one valid evidence reference is required.");
  } else if (new Set(evidenceRefs).size !== evidenceRefs.length) {
    addIssue(issues, "evidence_refs", "Evidence references must be unique.");
  }

  const fallback = input["fallback"];
  if (
    !isRecord(fallback) ||
    !hasOnlyKeys(fallback, ["view_mode", "message"]) ||
    typeof fallback["view_mode"] !== "string" ||
    !viewModes.has(fallback["view_mode"]) ||
    typeof fallback["message"] !== "string" ||
    fallback["message"].length < 1 ||
    fallback["message"].length > 500
  ) {
    addIssue(issues, "fallback", "A valid static fallback is required.");
  }

  return issues.length === 0
    ? { success: true, plan: input as ScenePlan }
    : { success: false, issues };
}
