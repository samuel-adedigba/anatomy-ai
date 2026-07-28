import assert from "node:assert/strict";
import test from "node:test";
import cardiovascularFixture from "../../../configs/visual-scene/fixtures/cardiovascular.normal-circulation.v1.json";
import negativeDurationFixture from "../../../configs/visual-scene/fixtures/invalid/negative-duration.json";
import overlappingMaterialFixture from "../../../configs/visual-scene/fixtures/invalid/overlapping-material-state.json";
import unknownActionFixture from "../../../configs/visual-scene/fixtures/invalid/unknown-action.json";
import unknownTargetFixture from "../../../configs/visual-scene/fixtures/invalid/unknown-target.json";
import versionMismatchFixture from "../../../configs/visual-scene/fixtures/invalid/version-mismatch.json";
import { validateScenePlan } from "../src/visual-scene/scenePlanValidator";

type MutableFixture = {
  schema_version: string;
  duration_ms: number;
  tracks: Array<Record<string, unknown>>;
};

function cloneFixture(): MutableFixture {
  return structuredClone(cardiovascularFixture) as unknown as MutableFixture;
}

test("viewer accepts the cardiovascular fixture", () => {
  const result = validateScenePlan(cloneFixture());

  assert.equal(result.success, true);
  assert.equal(result.plan.steps.length, 5);
});

test("viewer rejects unknown renderer capabilities", () => {
  assert.equal(validateScenePlan(unknownActionFixture).success, false);
  assert.equal(validateScenePlan(unknownTargetFixture).success, false);
});

test("viewer rejects invalid and conflicting timing", () => {
  assert.equal(validateScenePlan(negativeDurationFixture).success, false);
  assert.equal(validateScenePlan(overlappingMaterialFixture).success, false);
});

test("viewer reports an actionable schema mismatch", () => {
  const result = validateScenePlan(versionMismatchFixture);
  assert.equal(result.success, false);
  assert.ok(
    result.issues.some((issue) =>
      issue.message.includes("Expected 1.0")
    )
  );
});

test("viewer rejects incompatible capabilities and missing flow assets", () => {
  const clipTargetMismatch = cloneFixture();
  clipTargetMismatch.tracks[0].target = "camera.heart_overview";
  const labelMismatch = cloneFixture();
  const label = labelMismatch.tracks.find(
    (track) => track["id"] === "right-atrium-label"
  );
  if (label) label["text_key"] = "heart.left_atrium";
  const missingFlowAsset = cloneFixture() as MutableFixture & {
    required_assets: string[];
  };
  missingFlowAsset.required_assets = ["heart.educational.v1"];

  assert.equal(validateScenePlan(clipTargetMismatch).success, false);
  assert.equal(validateScenePlan(labelMismatch).success, false);
  assert.equal(validateScenePlan(missingFlowAsset).success, false);
});

test("viewer rejects plans above collection limits", () => {
  const plan = cloneFixture();
  plan.tracks = Array.from({ length: 129 }, (_, index) => ({
    id: `wait-${index}`,
    target: "heart",
    action: "wait",
    start_ms: 0,
    duration_ms: 1,
  }));

  assert.equal(validateScenePlan(plan).success, false);
});
