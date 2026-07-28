import { z } from "zod";
import {
  ANIMATION_CLIPS,
  ANIMATION_MORPHS,
  FLOW_PATHS,
  SCENE_ASSETS,
  SEMANTIC_STATES,
  SEMANTIC_TARGETS,
} from "./scenePlan.generated";

const assetTargets = SEMANTIC_TARGETS.filter(
  (target) => !target.startsWith("camera.")
) as [
  Exclude<(typeof SEMANTIC_TARGETS)[number], `camera.${string}`>,
  ...Array<Exclude<(typeof SEMANTIC_TARGETS)[number], `camera.${string}`>>,
];
const nodeMappingSchema = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1).refine(
    (names) => new Set(names).size === names.length,
    "Mapped node names must be unique."
  ),
]);
const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Review date must be a real calendar date.");

export const AssetManifestSchema = z
  .object({
    schema_version: z.literal("1.0"),
    asset_id: z.enum(SCENE_ASSETS),
    file: z.string().regex(/^\/models\/[a-z0-9._/-]+\.glb$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    source: z
      .object({
        name: z.string().min(1),
        revision: z.string().min(1),
        url: z.string().url(),
        licence: z.string().min(1),
        attribution: z.string().min(1),
      })
      .strict(),
    modifications: z.array(z.string().min(1)),
    targets: z
      .record(z.enum(assetTargets), nodeMappingSchema)
      .refine(
        (targets) => Object.keys(targets).length > 0,
        "At least one semantic target is required."
      ),
    clips: z.record(z.enum(ANIMATION_CLIPS), z.string().min(1)),
    morphs: z.record(z.enum(ANIMATION_MORPHS), z.string().min(1)),
    paths: z.record(z.enum(FLOW_PATHS), z.string().min(1)),
    materials: z.record(
      z.string().min(1),
      z.array(z.enum(SEMANTIC_STATES)).refine(
        (states) => new Set(states).size === states.length,
        "Material states must be unique."
      )
    ),
    coordinate_system: z.enum(["y_up", "z_up"]),
    units: z.enum(["metres", "centimetres", "millimetres"]),
    scale: z.number().positive(),
    bounds: z
      .object({
        min: vector3Schema,
        max: vector3Schema,
      })
      .strict(),
    performance: z
      .object({
        bytes: z.number().int().positive(),
        node_count: z.number().int().positive(),
        mesh_count: z.number().int().positive(),
        primitive_count: z.number().int().positive(),
      })
      .strict(),
    review: z
      .object({
        status: z.enum(["pending", "approved", "changes_required"]),
        reviewer: z.string().min(1).nullable(),
        role: z.string().min(1).nullable(),
        date: isoDateSchema.nullable(),
      })
      .strict(),
    known_simplifications: z.array(z.string().min(1)),
  })
  .strict()
  .superRefine((manifest, context) => {
    if (
      manifest.review.status === "approved" &&
      (!manifest.review.reviewer ||
        !manifest.review.role ||
        !manifest.review.date)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["review"],
        message: "Approved assets require reviewer name, role, and date.",
      });
    }
  });

export type AssetManifest = z.infer<typeof AssetManifestSchema>;

export function validateAssetManifest(input: unknown):
  | { success: true; manifest: AssetManifest }
  | { success: false; issues: Array<{ path: string; message: string }> } {
  const result = AssetManifestSchema.safeParse(input);
  if (result.success) {
    return { success: true, manifest: result.data };
  }

  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "$",
      message: issue.message,
    })),
  };
}
