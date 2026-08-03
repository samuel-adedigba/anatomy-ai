const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const Ajv2020 = require("ajv/dist/2020").default;

const {
  parseAnswerToCommand,
} = require("../dist/parsers/answerParser.js");
const {
  buildDirectCommand,
} = require("../dist/parsers/directCommandBuilder.js");
const {
  compileLegacyCommandToScenePlan,
} = require("../dist/visual-scene/legacyAdapter.js");
const {
  validateScenePlan,
} = require("../dist/visual-scene/scenePlanSchema.js");
const {
  validateAssetManifest,
} = require("../dist/visual-scene/assetManifestSchema.js");

const fixtureDirectory = path.resolve(
  __dirname,
  "../../../configs/visual-scene/fixtures"
);
const loadFixture = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(fixtureDirectory, relativePath), "utf8"));
const cardiovascularFixture = loadFixture(
  "cardiovascular.normal-circulation.v1.json"
);
const scenePlanJsonSchema = JSON.parse(
  fs.readFileSync(
    path.resolve(fixtureDirectory, "../scene-plan.schema.json"),
    "utf8"
  )
);
const validateScenePlanJsonSchema = new Ajv2020({
  allErrors: true,
  strict: true,
}).compile(scenePlanJsonSchema);

const cloneFixture = () => structuredClone(cardiovascularFixture);

test("keeps heart motion off when only answer prose mentions contraction", () => {
  const command = parseAnswerToCommand(
    "The heart contracts to move blood.",
    "The heart has left and right ventricles."
  );

  assert.equal(command.focus_region, "heart");
  assert.equal(command.view_mode, "heart");
  assert.equal(command.animation, "none");
  assert.ok(command.highlight.includes("Heart_Mesh"));
  assert.ok(command.confidence >= 0.4);
});

test("returns the safe full-body fallback when no region matches", () => {
  const command = parseAnswerToCommand(
    "The available sources do not cover this topic in enough detail.",
    ""
  );

  assert.deepEqual(command, {
    focus_region: "full_body",
    view_mode: "full_body",
    highlight: [],
    animation: "none",
    confidence: 0,
  });
});

test("builds deterministic direct commands", () => {
  const command = buildDirectCommand("spine", "spine");

  assert.equal(command.focus_region, "spine");
  assert.equal(command.view_mode, "spine");
  assert.ok(command.highlight.includes("Lumbar_Spine"));
  assert.equal(command.confidence, 1);
});

test("accepts the deterministic cardiovascular scene with concurrent tracks", () => {
  const result = validateScenePlan(cloneFixture());

  assert.equal(result.success, true);
  assert.equal(validateScenePlanJsonSchema(cloneFixture()), true);
  assert.equal(result.plan.plan_id, "cardiovascular.normal-circulation.v1");
  assert.equal(result.plan.steps.length, 5);
});

test("rejects unknown actions and semantic targets", () => {
  const unknownAction = loadFixture("invalid/unknown-action.json");
  const unknownTarget = loadFixture("invalid/unknown-target.json");

  assert.equal(validateScenePlan(unknownAction).success, false);
  assert.equal(validateScenePlan(unknownTarget).success, false);
  assert.equal(validateScenePlanJsonSchema(unknownAction), false);
  assert.equal(validateScenePlanJsonSchema(unknownTarget), false);
});

test("rejects invalid timing and schema version mismatches", () => {
  const negativeDuration = loadFixture("invalid/negative-duration.json");
  const overrun = cloneFixture();
  overrun.tracks[0].duration_ms = overrun.duration_ms + 1;
  const versionMismatch = loadFixture("invalid/version-mismatch.json");

  assert.equal(validateScenePlan(negativeDuration).success, false);
  assert.equal(validateScenePlan(overrun).success, false);
  const mismatchResult = validateScenePlan(versionMismatch);
  assert.equal(mismatchResult.success, false);
  assert.match(mismatchResult.issues[0].message, /Expected 1\.0/);
  assert.equal(validateScenePlanJsonSchema(negativeDuration), false);
  assert.equal(validateScenePlanJsonSchema(versionMismatch), false);
});

test("rejects overlapping state changes on the same target", () => {
  const plan = loadFixture("invalid/overlapping-material-state.json");

  const result = validateScenePlan(plan);
  assert.equal(result.success, false);
  assert.ok(
    result.issues.some((issue) => issue.message.includes("material_state"))
  );
});

test("rejects incompatible targets, labels, and flow assets", () => {
  const clipTargetMismatch = cloneFixture();
  clipTargetMismatch.tracks[0].target = "camera.heart_overview";
  const labelMismatch = cloneFixture();
  labelMismatch.tracks.find(
    (track) => track.id === "right-atrium-label"
  ).text_key = "heart.left_atrium";
  const missingFlowAsset = cloneFixture();
  missingFlowAsset.required_assets = [];

  assert.equal(validateScenePlan(clipTargetMismatch).success, false);
  assert.equal(validateScenePlan(labelMismatch).success, false);
  assert.equal(validateScenePlanJsonSchema(clipTargetMismatch), false);
  assert.equal(validateScenePlanJsonSchema(labelMismatch), false);
  const flowResult = validateScenePlan(missingFlowAsset);
  assert.equal(flowResult.success, false);
  assert.equal(validateScenePlanJsonSchema(missingFlowAsset), false);
  assert.ok(
    flowResult.issues.some((issue) =>
    issue.message.includes("heart.educational.v1")
    )
  );
});

test("rejects scene plans above collection limits", () => {
  const plan = cloneFixture();
  plan.tracks = Array.from({ length: 129 }, (_, index) => ({
    id: `highlight-${index}`,
    target: "heart",
    action: "highlight",
    state: "selected_structure",
    start_ms: 0,
    duration_ms: 1,
  }));

  const result = validateScenePlan(plan);
  assert.equal(result.success, false);
  assert.equal(result.issues.length, 1);
  assert.equal(validateScenePlanJsonSchema(plan), false);
});

test("compiles legacy commands to a safe static scene plan", () => {
  const command = buildDirectCommand("spine", "spine");
  const plan = compileLegacyCommandToScenePlan(command);
  const result = validateScenePlan(plan);

  assert.equal(result.success, true);
  assert.equal(plan.fallback.view_mode, "spine");
  assert.deepEqual(plan.tracks, []);
});

test("validates versioned asset manifests and reviewer requirements", () => {
  const manifest = {
    schema_version: "1.0",
    asset_id: "heart.educational.v1",
    file: "/models/heart/heart.educational.v1.glb",
    sha256: "0".repeat(64),
    source: {
      name: "Contract test asset",
      revision: "test-revision",
      url: "https://example.invalid/heart",
      licence: "Test-only",
      attribution: "Not a production asset",
    },
    modifications: [],
    targets: {
      heart: "HeartRoot",
      "heart.left_ventricle": "LeftVentricle",
    },
    clips: { normal_cardiac_cycle: "CardiacCycle" },
    morphs: {},
    paths: {},
    materials: {
      HeartMaterial: ["default_tissue", "selected_structure"],
    },
    coordinate_system: "y_up",
    units: "metres",
    scale: 1,
    bounds: { min: [-1, -1, -1], max: [1, 1, 1] },
    performance: {
      bytes: 1024,
      node_count: 2,
      mesh_count: 2,
      primitive_count: 2,
    },
    review: {
      status: "pending",
      reviewer: null,
      role: null,
      date: null,
    },
    known_simplifications: ["Contract fixture only."],
  };

  assert.equal(validateAssetManifest(manifest).success, true);

  manifest.review.date = "2026-99-99";
  assert.equal(validateAssetManifest(manifest).success, false);

  manifest.review.date = null;
  manifest.review.status = "approved";
  const approvedWithoutReviewer = validateAssetManifest(manifest);
  assert.equal(approvedWithoutReviewer.success, false);
  assert.ok(
    approvedWithoutReviewer.issues.some((issue) =>
      issue.message.includes("reviewer")
    )
  );
});
