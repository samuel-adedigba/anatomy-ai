import { z } from "zod";
import { CAPABILITY_REGISTRY_VERSION } from "../visual-scene/scenePlan.generated";

export const ParseRequestSchema = z.object({
  question: z.string().min(1, "question is required").max(500).optional(),
  answer: z.string().min(1, "answer is required").max(4000),
  raw_context: z.string().max(8000).default(""),
  evidence_refs: z.array(z.string().min(1).max(160)).max(32).default([]),
  capability_registry_version: z
    .literal(CAPABILITY_REGISTRY_VERSION)
    .optional(),
  // The RAG service may explicitly select a structured scene plan. Keep this
  // unknown at the transport boundary and validate it with ScenePlanSchema.
  scene_plan: z.unknown().optional(),
});

export const DirectCommandSchema = z.object({
  region: z.string().max(100).optional(),
  mode: z
    .enum([
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
    ])
    .optional(),
});

export type ParseRequestInput = z.infer<typeof ParseRequestSchema>;
export type DirectCommandInput = z.infer<typeof DirectCommandSchema>;
