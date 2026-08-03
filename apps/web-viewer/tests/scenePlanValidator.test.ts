import assert from "node:assert/strict";
import test from "node:test";
import cardiovascularFixture from "../../../configs/visual-scene/fixtures/cardiovascular.normal-circulation.v1.json";
import negativeDurationFixture from "../../../configs/visual-scene/fixtures/invalid/negative-duration.json";
import overlappingMaterialFixture from "../../../configs/visual-scene/fixtures/invalid/overlapping-material-state.json";
import unknownActionFixture from "../../../configs/visual-scene/fixtures/invalid/unknown-action.json";
import unknownTargetFixture from "../../../configs/visual-scene/fixtures/invalid/unknown-target.json";
import versionMismatchFixture from "../../../configs/visual-scene/fixtures/invalid/version-mismatch.json";
import { validateScenePlan } from "../src/visual-scene/scenePlanValidator";
import { TimelinePlayer } from "../src/timeline/TimelinePlayer";
import { ScenePlanRuntime } from "../src/runtime/ScenePlanRuntime";
import * as THREE from "three";
import type { ScenePlan } from "../src/visual-scene/scenePlan.generated";

type RuntimeHarness = {
  layers: {
    load: (assetId: string) => Promise<unknown>;
    activate: (layers: unknown[]) => void;
    clear: () => void;
  };
  particles: { clear: () => void; setReducedMotion: (enabled: boolean) => void };
  labels: { clear: () => void };
  timeline: TimelinePlayer;
  plan: ScenePlan | null;
  mixers: Map<unknown, unknown>;
  clipActions: Map<string, THREE.AnimationAction>;
  materialSnapshots: Map<THREE.Mesh, unknown>;
  morphSnapshots: Map<THREE.Mesh, Map<number, number>>;
  activeCameraTrackId: string | null;
  cameraOrbitStartPosition: THREE.Vector3 | null;
  loadSequence: number;
  lastProgressEmitTime: number;
  lastProgressState: string | null;
  restoreMaterials: () => void;
  restoreMorphs: () => void;
  load: (plan: ScenePlan) => Promise<boolean>;
  stop: () => void;
  emitProgress: (timeMs?: number, force?: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  callbacks: { onProgress?: (progress: unknown) => void };
};

function createRuntimeHarness(
  load: (assetId: string) => Promise<unknown>,
  callbacks: RuntimeHarness["callbacks"] = {}
): RuntimeHarness {
  const runtime = Object.create(ScenePlanRuntime.prototype) as RuntimeHarness;
  runtime.layers = { load, activate: () => {}, clear: () => {} };
  runtime.particles = { clear: () => {}, setReducedMotion: () => {} };
  runtime.labels = { clear: () => {} };
  runtime.timeline = new TimelinePlayer();
  runtime.plan = null;
  runtime.mixers = new Map();
  runtime.clipActions = new Map();
  runtime.materialSnapshots = new Map();
  runtime.morphSnapshots = new Map();
  runtime.activeCameraTrackId = null;
  runtime.cameraOrbitStartPosition = null;
  runtime.loadSequence = 0;
  runtime.lastProgressEmitTime = -Infinity;
  runtime.lastProgressState = null;
  runtime.callbacks = callbacks;
  runtime.restoreMaterials = () => {};
  runtime.restoreMorphs = (
    ScenePlanRuntime.prototype as unknown as {
      restoreMorphs: () => void;
    }
  ).restoreMorphs.bind(runtime);
  return runtime;
}

function minimalScenePlan(): ScenePlan {
  return {
    ...structuredClone(cardiovascularFixture),
    duration_ms: 100,
    required_assets: ["heart.educational.v1"],
    tracks: [],
    steps: [{ id: "only-step", start_ms: 0, end_ms: 100, caption: "Inspect the heart." }],
  } as ScenePlan;
}

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

test("cardiovascular fixture covers the reviewed vertical-slice learning path", () => {
  const result = validateScenePlan(cloneFixture());
  assert.equal(result.success, true);
  if (!result.success) return;

  assert.deepEqual(result.plan.required_assets, ["heart.educational.v1"]);
  assert.deepEqual(
    result.plan.tracks
      .filter((track) => track.action === "show_label")
      .map((track) => track.target),
    [
      "heart.right_atrium",
      "heart.right_ventricle",
      "heart.left_atrium",
      "heart.left_ventricle",
      "heart.tricuspid_valve",
      "heart.pulmonary_valve",
      "heart.mitral_valve",
      "heart.aortic_valve",
    ]
  );
  assert.deepEqual(
    result.plan.tracks
      .filter((track) => track.action === "particle_flow")
      .map((track) => track.path),
    [
      "body_to_right_atrium",
      "right_atrium_to_right_ventricle",
      "right_ventricle_to_lungs",
      "lungs_to_left_atrium",
      "left_atrium_to_left_ventricle",
      "left_ventricle_to_body",
    ]
  );
  assert.match(result.plan.steps[1].caption, /right atrium/i);
  assert.match(result.plan.steps[2].caption, /lungs/i);
  assert.match(result.plan.steps[4].caption, /aorta/i);
  assert.equal(result.plan.fallback.view_mode, "heart");
  assert.match(result.plan.fallback.message, /static heart view/i);
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
  missingFlowAsset.required_assets = ["circulation.major-vessels.v1"];

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

test("timeline pause freezes the shared scene clock", () => {
  const timeline = new TimelinePlayer();
  timeline.load(1000, false, [
    { id: "flow", start_ms: 0, duration_ms: 1000 },
  ]);
  timeline.play();
  timeline.update(0.25);
  timeline.pause();
  timeline.update(0.75);

  assert.equal(timeline.getTimeMs(), 250);
  assert.equal(timeline.getState(), "paused");
});

test("timeline replay emits the same track order", () => {
  const events: string[] = [];
  const timeline = new TimelinePlayer({
    onTrackEvent: (event) => events.push(`${event.type}:${event.track_id}`),
  });
  timeline.load(100, false, [
    { id: "heartbeat", start_ms: 0, duration_ms: 100 },
  ]);
  timeline.play();
  timeline.update(0.2);
  timeline.replay();
  timeline.update(0.2);

  assert.deepEqual(events, [
    "track_start:heartbeat",
    "track_end:heartbeat",
    "track_start:heartbeat",
    "track_end:heartbeat",
  ]);
});

test("timeline seek clamps to the scene duration", () => {
  const timeline = new TimelinePlayer();
  timeline.load(500, false, []);
  timeline.seek(900);

  assert.equal(timeline.getTimeMs(), 500);
  assert.equal(timeline.getState(), "completed");
});

test("scene runtime ignores a superseded asset load", async () => {
  let releaseFirstLoad = () => {};
  const firstLoadGate = new Promise<void>((resolve) => {
    releaseFirstLoad = resolve;
  });
  let loadCount = 0;
  const runtime = createRuntimeHarness(async () => {
    loadCount += 1;
    if (loadCount === 1) await firstLoadGate;
    return { assetId: "heart.educational.v1", available: true };
  });
  const plan = minimalScenePlan();

  const first = runtime.load(plan);
  const second = runtime.load(plan);
  releaseFirstLoad();

  assert.equal(await first, false);
  assert.equal(await second, true);
});

test("scene runtime restores morph values when stopped", () => {
  const runtime = createRuntimeHarness(async () => undefined);
  const mesh = new THREE.Mesh();
  mesh.morphTargetInfluences = [0.25];
  runtime.morphSnapshots.set(mesh, new Map([[0, 0.25]]));
  mesh.morphTargetInfluences[0] = 0.9;

  runtime.stop();

  assert.equal(mesh.morphTargetInfluences[0], 0.25);
  assert.equal(runtime.morphSnapshots.size, 0);
});

test("scene progress callbacks are throttled while forced updates remain immediate", () => {
  const progress: unknown[] = [];
  const runtime = createRuntimeHarness(async () => undefined, {
    onProgress: (value) => progress.push(value),
  });
  runtime.plan = minimalScenePlan();
  runtime.timeline.load(1000, false, []);

  runtime.emitProgress(0, true);
  runtime.emitProgress(25);
  runtime.emitProgress(50);
  runtime.emitProgress(100);

  assert.equal(progress.length, 2);
});

test("scene runtime applies host reduced-motion preferences", () => {
  const runtime = createRuntimeHarness(async () => undefined);
  let particlesReduced = false;
  runtime.particles.setReducedMotion = (enabled) => {
    particlesReduced = enabled;
  };

  runtime.setReducedMotion(true);

  assert.equal(particlesReduced, true);
});
