import { z } from "zod";

export const ParseRequestSchema = z.object({
  answer: z.string().min(1, "answer is required").max(4000),
  raw_context: z.string().max(8000).default(""),
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
