#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const goldenPath = path.join(
  repositoryRoot,
  "configs/evaluations/phase5-golden-questions.json"
);
const outputPath = process.env.PHASE5_EVALUATION_OUTPUT ?? path.join(
  repositoryRoot,
  "docs/evaluations/phase5-latest.json"
);
const gatewayUrl = process.env.PHASE5_GATEWAY_URL ?? "http://localhost:3001";
const instructionUrl = process.env.PHASE5_INSTRUCTION_URL ?? "http://localhost:3002";
const repeatCount = Number.parseInt(process.env.PHASE5_REPEAT_COUNT ?? "3", 10);
const timeoutMs = Number.parseInt(process.env.PHASE5_TIMEOUT_MS ?? "130000", 10);

if (!Number.isInteger(repeatCount) || repeatCount < 2 || repeatCount > 10) {
  throw new Error("PHASE5_REPEAT_COUNT must be an integer between 2 and 10.");
}

const goldenQuestions = JSON.parse(await fs.readFile(goldenPath, "utf8"));
const supportedQuestions = goldenQuestions.filter(
  (item) => item.expected === "reviewed_recipe"
);

const results = [];
let liveFailure = null;

for (const item of goldenQuestions) {
  const attempts = [];
  for (let attempt = 1; attempt <= (item.expected === "reviewed_recipe" ? repeatCount : 1); attempt += 1) {
    try {
      const response = await postJson(`${gatewayUrl}/ask`, { query: item.question });
      const plan = response.data?.scenePlan;
      const validation = plan
        ? await validatePlan(plan)
        : { valid: false, errors: ["No scenePlan returned."] };
      attempts.push({
        attempt,
        http_status: 200,
        visual_support: response.data?.visualSupport ?? null,
        plan_id: plan?.plan_id ?? null,
        schema_valid: validation.valid,
        validation_errors: validation.errors,
        plan_signature: plan ? canonicalPlan(plan) : null,
        fallback_message: response.data?.visualMessage ?? null,
      });
    } catch (error) {
      liveFailure = liveFailure ?? safeError(error);
      attempts.push({
        attempt,
        http_status: null,
        visual_support: null,
        plan_id: null,
        schema_valid: false,
        validation_errors: [safeError(error)],
        plan_signature: null,
        fallback_message: null,
      });
      break;
    }
  }

  const first = attempts[0];
  const repeatedSignatures = attempts
    .filter((attempt) => attempt.plan_signature)
    .map((attempt) => attempt.plan_signature);
  const equivalent = repeatedSignatures.length > 1 &&
    repeatedSignatures.every((signature) => signature === repeatedSignatures[0]);
  const selected = item.expected === "reviewed_recipe"
    ? attempts.every((attempt) =>
        attempt.plan_id === "cardiovascular.normal-circulation.v1" &&
        attempt.visual_support === "reviewed_recipe" &&
        attempt.schema_valid
      )
    : first?.visual_support === "unsupported_visual" &&
      first?.plan_id === null &&
      typeof first?.fallback_message === "string";

  results.push({
    id: item.id,
    question: item.question,
    expected: item.expected,
    attempts,
    selection_pass: selected,
    repeated_plan_equivalent: item.expected === "reviewed_recipe" ? equivalent : null,
  });
}

const supportedPassed = results.filter(
  (result) => result.expected === "reviewed_recipe" && result.selection_pass
).length;
const selectionRate = supportedQuestions.length === 0
  ? 0
  : supportedPassed / supportedQuestions.length;
const repeatedResults = results.filter(
  (result) => result.expected === "reviewed_recipe"
);
const repeatedPassed = repeatedResults.filter(
  (result) => result.repeated_plan_equivalent
).length;
const repeatRate = repeatedResults.length === 0 ? 0 : repeatedPassed / repeatedResults.length;
const unsupportedPassed = results.filter(
  (result) => result.expected === "unsupported_visual" && result.selection_pass
).length;
const unsupportedCount = results.filter(
  (result) => result.expected === "unsupported_visual"
).length;
const schemaValid = results.every((result) =>
  result.attempts.every((attempt) =>
    result.expected === "unsupported_visual" || attempt.schema_valid
  )
);
const passed = !liveFailure &&
  selectionRate >= 0.9 &&
  repeatRate === 1 &&
  unsupportedPassed === unsupportedCount &&
  schemaValid;

const report = {
  phase: 5,
  generated_at: new Date().toISOString(),
  gateway_url: gatewayUrl,
  instruction_engine_url: instructionUrl,
  repeat_count: repeatCount,
  live: !liveFailure,
  live_failure: liveFailure,
  selection_rate: selectionRate,
  selection_target: 0.9,
  repeated_equivalence_rate: repeatRate,
  unsupported_fallback_passed: unsupportedPassed,
  unsupported_fallback_total: unsupportedCount,
  schema_valid: schemaValid,
  passed,
  results,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  passed,
  live: report.live,
  selection_rate: `${Math.round(selectionRate * 100)}%`,
  repeated_equivalence_rate: `${Math.round(repeatRate * 100)}%`,
  unsupported_fallback: `${unsupportedPassed}/${unsupportedCount}`,
  schema_valid: schemaValid,
  report: path.relative(repositoryRoot, outputPath),
}, null, 2));

if (!passed) process.exitCode = 1;

async function postJson(url, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok || payload.status === false) {
      throw new Error(`HTTP ${response.status}: ${payload.message ?? "request failed"}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function validatePlan(plan) {
  try {
    const response = await postJson(`${instructionUrl}/scene-plan/validate`, plan);
    return { valid: response.status === true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [safeError(error)] };
  }
}

function canonicalPlan(plan) {
  return JSON.stringify({
    schema_version: plan.schema_version,
    capability_registry_version: plan.capability_registry_version,
    plan_id: plan.plan_id,
    topic: plan.topic,
    learning_objective: plan.learning_objective,
    duration_ms: plan.duration_ms,
    loop: plan.loop,
    required_assets: plan.required_assets,
    tracks: plan.tracks,
    steps: plan.steps,
    fallback: plan.fallback,
  });
}

function safeError(error) {
  if (error?.name === "AbortError") return `Request timed out after ${timeoutMs}ms.`;
  return error instanceof Error ? error.message : "Live evaluation request failed.";
}
