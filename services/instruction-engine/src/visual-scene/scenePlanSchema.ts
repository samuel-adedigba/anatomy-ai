import { z } from "zod";
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
  SCENE_ASSETS,
  SCENE_LIMITS,
  SCENE_PLAN_SCHEMA_VERSION,
  SCENE_TOPICS,
  SCENE_VIEW_MODES,
  SEMANTIC_STATES,
  SEMANTIC_TARGETS,
  TARGET_ASSETS,
  ScenePlan,
} from "./scenePlan.generated";

const identifierSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const planIdentifierSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)+$/);
const targetSchema = z.enum(SEMANTIC_TARGETS);
const timingSchema = {
  id: identifierSchema,
  target: targetSchema,
  start_ms: z.number().int().nonnegative(),
  duration_ms: z.number().int().positive(),
};

const playClipTrackSchema = z
  .object({
    ...timingSchema,
    target: z.literal("heart"),
    action: z.literal("play_clip"),
    clip: z.enum(ANIMATION_CLIPS),
    loop: z.boolean(),
  })
  .strict();

const playMorphTrackSchema = z
  .object({
    ...timingSchema,
    action: z.literal("play_morph"),
    morph: z.enum(ANIMATION_MORPHS),
    from: z.number().min(0).max(1),
    to: z.number().min(0).max(1),
  })
  .strict();

const flowTrackFields = {
  ...timingSchema,
  path: z.enum(FLOW_PATHS),
  state: z.enum(["oxygen_poor_blood", "oxygen_rich_blood"]),
};
const particleFlowTrackSchema = z
  .object({ ...flowTrackFields, action: z.literal("particle_flow") })
  .strict();
const signalTrackSchema = z
  .object({ ...flowTrackFields, action: z.literal("signal_propagation") })
  .strict();

const materialTrackFields = {
  ...timingSchema,
  target: z.enum(MATERIAL_TARGETS),
  state: z.enum(SEMANTIC_STATES),
};
const highlightTrackSchema = z
  .object({ ...materialTrackFields, action: z.literal("highlight") })
  .strict();
const materialStateTrackSchema = z
  .object({
    ...materialTrackFields,
    action: z.literal("set_material_state"),
  })
  .strict();

const fadeTrackSchema = z
  .object({
    ...timingSchema,
    target: z.enum(MATERIAL_TARGETS),
    action: z.literal("fade"),
    opacity: z.number().min(0).max(1),
  })
  .strict();

const labelTrackSchema = z
  .object({
    ...timingSchema,
    target: z.enum(LABEL_TEXT_KEYS),
    action: z.literal("show_label"),
    text_key: z.enum(LABEL_TEXT_KEYS),
  })
  .strict();

const cameraTargetSchema = z.enum(CAMERA_TARGETS);
const cameraTrackFields = { ...timingSchema, target: cameraTargetSchema };
const cameraFocusTrackSchema = z
  .object({ ...cameraTrackFields, action: z.literal("camera_focus") })
  .strict();
const cameraOrbitTrackSchema = z
  .object({ ...cameraTrackFields, action: z.literal("camera_orbit") })
  .strict();

const waitTrackSchema = z
  .object({ ...timingSchema, action: z.literal("wait") })
  .strict();

const sceneTrackSchema = z.discriminatedUnion("action", [
  playClipTrackSchema,
  playMorphTrackSchema,
  particleFlowTrackSchema,
  signalTrackSchema,
  highlightTrackSchema,
  materialStateTrackSchema,
  fadeTrackSchema,
  labelTrackSchema,
  cameraFocusTrackSchema,
  cameraOrbitTrackSchema,
  waitTrackSchema,
]);

const sceneStepSchema = z
  .object({
    id: identifierSchema,
    start_ms: z.number().int().nonnegative(),
    end_ms: z.number().int().positive(),
    caption: z.string().min(1).max(500),
  })
  .strict();

const conflictGroupByAction = new Map<string, string>();
Object.entries(CONFLICT_GROUPS).forEach(([group, actions]) => {
  actions.forEach((action) => conflictGroupByAction.set(action, group));
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

export const ScenePlanSchema = z
  .object({
    schema_version: z.literal(SCENE_PLAN_SCHEMA_VERSION, {
      errorMap: () => ({
        message: `Unsupported scene schema version. Expected ${SCENE_PLAN_SCHEMA_VERSION}.`,
      }),
    }),
    capability_registry_version: z.literal(CAPABILITY_REGISTRY_VERSION, {
      errorMap: () => ({
        message: `Unsupported capability registry version. Expected ${CAPABILITY_REGISTRY_VERSION}.`,
      }),
    }),
    plan_id: planIdentifierSchema,
    topic: z.enum(SCENE_TOPICS),
    learning_objective: z.string().min(1).max(500),
    duration_ms: z.number().int().positive().max(600_000),
    loop: z.boolean(),
    required_assets: z
      .array(z.enum(SCENE_ASSETS))
      .max(SCENE_LIMITS.max_required_assets)
      .refine(
        (assets) => new Set(assets).size === assets.length,
        "Required assets must be unique."
      ),
    tracks: z.array(sceneTrackSchema).max(SCENE_LIMITS.max_tracks),
    steps: z
      .array(sceneStepSchema)
      .min(1)
      .max(SCENE_LIMITS.max_steps),
    evidence_refs: z
      .array(z.string().min(1).max(160))
      .min(1)
      .max(SCENE_LIMITS.max_evidence_refs)
      .refine(
        (references) => new Set(references).size === references.length,
        "Evidence references must be unique."
      ),
    fallback: z
      .object({
        view_mode: z.enum(SCENE_VIEW_MODES),
        message: z.string().min(1).max(500),
      })
      .strict(),
  })
  .strict()
  .superRefine((plan, context) => {
    if (
      plan.required_assets.length > SCENE_LIMITS.max_required_assets ||
      plan.tracks.length > SCENE_LIMITS.max_tracks ||
      plan.steps.length > SCENE_LIMITS.max_steps ||
      plan.evidence_refs.length > SCENE_LIMITS.max_evidence_refs
    ) {
      return;
    }

    if (plan.tracks.length > 0 && plan.required_assets.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["required_assets"],
        message: "Plans with renderer tracks must declare at least one asset.",
      });
    }

    const trackIds = new Set<string>();
    const requiredAssets = new Set<string>(plan.required_assets);
    plan.tracks.forEach((track, index) => {
      if (trackIds.has(track.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tracks", index, "id"],
          message: `Duplicate track id "${track.id}".`,
        });
      }
      trackIds.add(track.id);

      if (track.start_ms + track.duration_ms > plan.duration_ms) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tracks", index, "duration_ms"],
          message: "Track timing exceeds the scene duration.",
        });
      }

      const targetAsset = targetAssets[track.target];
      if (
        targetAsset &&
        track.action !== "wait" &&
        !requiredAssets.has(targetAsset)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tracks", index, "target"],
          message: `Target "${track.target}" requires asset "${targetAsset}".`,
        });
      }

      if (
        track.action === "play_clip" &&
        !clipTargets[track.clip]?.includes(track.target)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tracks", index, "target"],
          message: `Clip "${track.clip}" cannot play on target "${track.target}".`,
        });
      }
      if (
        track.action === "play_morph" &&
        !morphTargets[track.morph]?.includes(track.target)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tracks", index, "target"],
          message: `Morph "${track.morph}" cannot play on target "${track.target}".`,
        });
      }
      if (
        (track.action === "particle_flow" ||
          track.action === "signal_propagation")
      ) {
        const requirement = flowRequirements[track.path];
        if (
          !requirement ||
          requirement.target !== track.target ||
          requirement.state !== track.state
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["tracks", index, "path"],
            message: `Flow path "${track.path}" does not support this target and state.`,
          });
        } else {
          requirement.required_assets.forEach((asset) => {
            if (!requiredAssets.has(asset)) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["required_assets"],
                message: `Flow path "${track.path}" requires asset "${asset}".`,
              });
            }
          });
        }
      }
      if (
        track.action === "show_label" &&
        track.target !== track.text_key
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tracks", index, "text_key"],
          message: "Label target and text key must identify the same structure.",
        });
      }
    });

    const stepIds = new Set<string>();
    plan.steps.forEach((step, index) => {
      if (stepIds.has(step.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", index, "id"],
          message: `Duplicate step id "${step.id}".`,
        });
      }
      stepIds.add(step.id);

      if (step.start_ms >= step.end_ms) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", index, "end_ms"],
          message: "Step end must be later than its start.",
        });
      }
      if (step.end_ms > plan.duration_ms) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", index, "end_ms"],
          message: "Step timing exceeds the scene duration.",
        });
      }
      if (index > 0 && step.start_ms < plan.steps[index - 1].end_ms) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", index, "start_ms"],
          message: "Ordered learning steps must not overlap.",
        });
      }
    });

    plan.tracks.forEach((track, index) => {
      const conflictGroup = conflictGroupByAction.get(track.action);
      if (!conflictGroup) return;

      const end = track.start_ms + track.duration_ms;
      const conflictingIndex = plan.tracks.findIndex((candidate, candidateIndex) => {
        const candidateGroup = conflictGroupByAction.get(candidate.action);
        const sameScope =
          conflictGroup === "camera_motion"
            ? candidateGroup === conflictGroup
            : candidateGroup === conflictGroup &&
              candidate.target === track.target;
        if (
          candidateIndex >= index ||
          !sameScope
        ) {
          return false;
        }
        const candidateEnd = candidate.start_ms + candidate.duration_ms;
        return track.start_ms < candidateEnd && candidate.start_ms < end;
      });

      if (conflictingIndex >= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tracks", index, "start_ms"],
          message: `Track conflicts with track ${conflictingIndex} in the "${conflictGroup}" capability group.`,
        });
      }
    });
  });

export type ScenePlanValidationIssue = {
  path: string;
  message: string;
};

export type ScenePlanValidationResult =
  | { success: true; plan: ScenePlan }
  | { success: false; issues: ScenePlanValidationIssue[] };

export function validateScenePlan(input: unknown): ScenePlanValidationResult {
  const result = ScenePlanSchema.safeParse(input);
  if (result.success) {
    return { success: true, plan: result.data as ScenePlan };
  }

  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "$",
      message: issue.message,
    })),
  };
}
