import fs from "node:fs";
import path from "node:path";
import { parseAnswerToCommand } from "../parsers/answerParser";
import { VisualCommand } from "../types";
import { ScenePlan } from "../visual-scene/scenePlan.generated";
import { validateScenePlan } from "../visual-scene/scenePlanSchema";

export type PlannerIntent =
  | "static_anatomy"
  | "process"
  | "comparison"
  | "unsupported_visual";

export type VisualSupport =
  | "reviewed_recipe"
  | "static_anatomy"
  | "unsupported_visual";

export type ScenePlannerResult = {
  intent: PlannerIntent;
  visualSupport: VisualSupport;
  command: VisualCommand;
  scenePlan?: ScenePlan;
  message?: string;
};

const RECIPE_PATH = path.resolve(
  __dirname,
  "../../../../configs/visual-scene/fixtures/cardiovascular.normal-circulation.v1.json"
);

const HEART_TERMS = [
  "heart",
  "cardiac",
  "atrium",
  "ventricle",
  "valve",
  "pulmonary circulation",
  "systemic circulation",
];

const PROCESS_TERMS = [
  "pump",
  "pumping",
  "move",
  "moving",
  "flow",
  "circulation",
  "circulate",
  "beat",
  "beating",
  "contract",
  "contracting",
  "relax",
  "where does",
  "how does",
  "what happens",
  "show me",
  "show how",
];

const COMPARISON_TERMS = ["compare", "comparison", "versus", " vs ", "difference between"];

/**
 * Selects only reviewed visual recipes. Retrieved answer text is deliberately
 * excluded from intent classification so it cannot inject renderer actions.
 */
export function planQuestion(
  question: string,
  evidenceRefs: string[] = []
): ScenePlannerResult {
  const normalizedQuestion = ` ${question.trim().toLowerCase()} `;
  const isHeartQuestion = HEART_TERMS.some((term) => normalizedQuestion.includes(term));
  const isProcessQuestion = PROCESS_TERMS.some((term) => normalizedQuestion.includes(term));
  const isComparison = COMPARISON_TERMS.some((term) => normalizedQuestion.includes(term));
  const staticCommand = parseAnswerToCommand(question, "");

  if (isHeartQuestion && isProcessQuestion && !isComparison) {
    const scenePlan = loadCardiovascularRecipe(evidenceRefs);
    if (scenePlan) {
      return {
        intent: "process",
        visualSupport: "reviewed_recipe",
        command: staticHeartCommand(),
        scenePlan,
      };
    }
  }

  if (isHeartQuestion && !isProcessQuestion && !isComparison) {
    return {
      intent: "static_anatomy",
      visualSupport: "static_anatomy",
      command: staticHeartCommand(),
    };
  }

  if (!isHeartQuestion && staticCommand.view_mode !== "full_body") {
    return {
      intent: "unsupported_visual",
      visualSupport: "unsupported_visual",
      command: staticCommand,
      message: "This visual explanation is not supported yet. Showing a relevant static anatomy view and the written explanation.",
    };
  }

  if (isProcessQuestion || isComparison) {
    return {
      intent: isComparison ? "comparison" : "unsupported_visual",
      visualSupport: "unsupported_visual",
      command: staticCommand,
      message: "This visual process is not supported yet. Showing a relevant static anatomy view and the written explanation.",
    };
  }

  return {
    intent: "static_anatomy",
    visualSupport: "static_anatomy",
    command: staticCommand,
  };
}

function staticHeartCommand(): VisualCommand {
  return {
    focus_region: "heart",
    view_mode: "heart",
    highlight: [],
    animation: "none",
    camera: "reset",
    confidence: 1,
  };
}

function loadCardiovascularRecipe(evidenceRefs: string[]): ScenePlan | undefined {
  try {
    const recipe = JSON.parse(fs.readFileSync(RECIPE_PATH, "utf8")) as ScenePlan;
    const mergedEvidence = [...new Set([...recipe.evidence_refs, ...evidenceRefs])]
      .filter((reference) => reference.length > 0 && reference.length <= 160)
      .slice(0, 32);
    const result = validateScenePlan({ ...recipe, evidence_refs: mergedEvidence });
    if (!result.success) {
      console.warn("[instruction-engine] Reviewed cardiovascular recipe failed validation", result.issues);
      return undefined;
    }
    return result.plan;
  } catch (error) {
    console.warn("[instruction-engine] Reviewed cardiovascular recipe unavailable", error);
    return undefined;
  }
}
