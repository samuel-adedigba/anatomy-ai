import "dotenv/config";
import express, { Request, Response } from "express";
import { parseAnswerToCommand } from "./parsers/answerParser";
import { buildDirectCommand } from "./parsers/directCommandBuilder";
import { ParseRequestSchema, DirectCommandSchema } from "./validators/schemas";
import { compileLegacyCommandToScenePlan } from "./visual-scene/legacyAdapter";
import { validateAssetManifest } from "./visual-scene/assetManifestSchema";
import { validateScenePlan } from "./visual-scene/scenePlanSchema";
import { planQuestion } from "./planner/scenePlanner";

const app = express();
app.use(express.json({ limit: "512kb" }));

// ─── Health ────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: true, service: "instruction-engine" });
});

// ─── Parse: AI answer → visual command ────────────────────────
app.post("/parse", (req: Request, res: Response) => {
  const parsed = ParseRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: false, errors: parsed.error.flatten() });
    return;
  }

  const { question, answer, raw_context, evidence_refs } = parsed.data;
  const plannerResult = question
    ? planQuestion(question, evidence_refs)
    : undefined;
  const command = plannerResult?.command ?? parseAnswerToCommand(answer, raw_context);

  const scenePlanResult = plannerResult
    ? plannerResult.scenePlan
      ? { success: true as const, plan: plannerResult.scenePlan }
      : null
    : parsed.data.scene_plan === undefined
    ? null
    : validateScenePlan(parsed.data.scene_plan);

  // An invalid RAG plan is never executed. The legacy command remains a safe
  // static fallback, and heart motion is disabled by parseAnswerToCommand.
  if (scenePlanResult && !scenePlanResult.success) {
    console.warn("[instruction-engine] Ignoring invalid RAG scene plan", scenePlanResult.issues);
  }

  res.json({
    status: true,
    command,
    ...(scenePlanResult?.success ? { scenePlan: scenePlanResult.plan } : {}),
    ...(plannerResult?.visualSupport ? { visualSupport: plannerResult.visualSupport } : {}),
    ...(plannerResult?.message ? { visualMessage: plannerResult.message } : {}),
  });
});

// ─── Direct: region/mode tap → visual command ─────────────────
app.post("/direct", (req: Request, res: Response) => {
  const parsed = DirectCommandSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: false, errors: parsed.error.flatten() });
    return;
  }

  const { region, mode } = parsed.data;
  const command = buildDirectCommand(region, mode);

  res.json({ status: true, command });
});

// ─── Scene plan validation ─────────────────────────────────────
app.post("/scene-plan/validate", (req: Request, res: Response) => {
  const result = validateScenePlan(req.body);
  if (!result.success) {
    res.status(400).json({
      status: false,
      message: "Scene plan validation failed.",
      errors: result.issues,
    });
    return;
  }

  res.json({ status: true, plan: result.plan });
});

app.post("/asset-manifest/validate", (req: Request, res: Response) => {
  const result = validateAssetManifest(req.body);
  if (!result.success) {
    res.status(400).json({
      status: false,
      message: "Asset manifest validation failed.",
      errors: result.issues,
    });
    return;
  }

  res.json({ status: true, manifest: result.manifest });
});

// ─── Legacy command migration adapter ──────────────────────────
app.post("/scene-plan/from-legacy", (req: Request, res: Response) => {
  const parsed = DirectCommandSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: false, errors: parsed.error.flatten() });
    return;
  }

  const command = buildDirectCommand(parsed.data.region, parsed.data.mode);
  res.json({
    status: true,
    command,
    plan: compileLegacyCommandToScenePlan(command),
  });
});

export default app;
