#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  animationDuration,
  morphTargetNames,
  readGlbJson,
  scalarFloatAccessorValues,
  transformedSceneBounds,
  uniqueNames,
} from "./glb.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const defaultModelsDirectory = path.join(
  repositoryRoot,
  "engines/anatomy-assets/models"
);
const maxAssetBytes = 20 * 1024 * 1024;
const requiredHeartTargets = [
  "heart",
  "heart.right_atrium",
  "heart.right_ventricle",
  "heart.left_atrium",
  "heart.left_ventricle",
  "heart.tricuspid_valve",
  "heart.pulmonary_valve",
  "heart.mitral_valve",
  "heart.aortic_valve",
  "heart.vena_cavae",
  "heart.pulmonary_artery",
  "heart.pulmonary_veins",
  "heart.aorta",
];
const requiredFlowPaths = [
  "body_to_right_atrium",
  "right_atrium_to_right_ventricle",
  "right_ventricle_to_lungs",
  "lungs_to_left_atrium",
  "left_atrium_to_left_ventricle",
  "left_ventricle_to_body",
];
const expectedPathState = {
  body_to_right_atrium: "oxygen_poor_blood",
  right_atrium_to_right_ventricle: "oxygen_poor_blood",
  right_ventricle_to_lungs: "oxygen_poor_blood",
  lungs_to_left_atrium: "oxygen_rich_blood",
  left_atrium_to_left_ventricle: "oxygen_rich_blood",
  left_ventricle_to_body: "oxygen_rich_blood",
};
const requiredAnimatedTargets = {
  "heart.right_atrium": "atrial_systole",
  "heart.left_atrium": "atrial_systole",
  "heart.right_ventricle": "ventricular_systole",
  "heart.left_ventricle": "ventricular_systole",
  "heart.tricuspid_valve": "valve_open",
  "heart.pulmonary_valve": "valve_open",
  "heart.mitral_valve": "valve_open",
  "heart.aortic_valve": "valve_open",
};
const requiredManifestFields = [
  "schema_version",
  "asset_id",
  "file",
  "sha256",
  "source",
  "modifications",
  "targets",
  "clips",
  "morphs",
  "paths",
  "materials",
  "coordinate_system",
  "units",
  "scale",
  "bounds",
  "performance",
  "review",
  "known_simplifications",
];
const args = process.argv.slice(2);

function argument(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

function addIssue(issues, message) {
  issues.push(message);
}

function mappedNames(value) {
  return Array.isArray(value) ? value : [value];
}

function descendants(document, rootIndex) {
  const result = new Set();
  const pending = [rootIndex];
  while (pending.length > 0) {
    const nodeIndex = pending.pop();
    if (result.has(nodeIndex)) continue;
    result.add(nodeIndex);
    pending.push(...(document.nodes?.[nodeIndex]?.children ?? []));
  }
  return result;
}

function closeBounds(actual, expected, tolerance = 1e-5) {
  return ["min", "max"].every((side) =>
    actual?.[side]?.length === 3 &&
    expected?.[side]?.length === 3 &&
    actual[side].every(
      (value, index) => Math.abs(value - expected[side][index]) <= tolerance
    )
  );
}

function sampleLinear(times, values, time) {
  if (time <= times[0]) return values[0];
  if (time >= times.at(-1)) return values.at(-1);
  const upper = times.findIndex((candidate) => candidate >= time);
  const width = times[upper] - times[upper - 1];
  const fraction = width === 0 ? 0 : (time - times[upper - 1]) / width;
  return values[upper - 1] + fraction * (values[upper] - values[upper - 1]);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function fail(issues) {
  process.stderr.write(
    `Asset manifest validation failed:\n${issues
      .map((issue) => `- ${issue}`)
      .join("\n")}\n`
  );
  process.exitCode = 1;
}

async function main() {
  const manifestPathArgument = argument("--manifest");
  if (!manifestPathArgument) {
    throw new Error(
      "Usage: node scripts/anatomy/validate-asset-manifest.mjs --manifest <path> [--allow-pending]"
    );
  }

  const manifestPath = path.resolve(process.cwd(), manifestPathArgument);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const issues = [];

  requiredManifestFields.forEach((field) => {
    if (!(field in manifest)) addIssue(issues, `missing manifest field: ${field}`);
  });
  if (manifest.schema_version !== "1.0") {
    addIssue(issues, 'schema_version must be "1.0"');
  }

  if (manifest.asset_id !== "heart.educational.v1") {
    addIssue(issues, 'asset_id must be "heart.educational.v1" for the Phase 2 heart gate');
  }
  const hasValidViewerFile = /^\/models\/[a-z0-9._/-]+\.glb$/u.test(
    manifest.file ?? ""
  );
  if (!hasValidViewerFile) {
    addIssue(issues, "file must be a viewer path such as /models/heart.educational.v1.glb");
  }
  if (!/^[a-f0-9]{64}$/u.test(manifest.sha256 ?? "")) {
    addIssue(issues, "sha256 must be a lowercase SHA-256 digest");
  }
  let hasValidSourceUrl = false;
  try {
    hasValidSourceUrl = Boolean(new URL(manifest.source?.url).protocol);
  } catch {
    hasValidSourceUrl = false;
  }
  if (
    !manifest.source?.revision ||
    !hasValidSourceUrl ||
    !manifest.source?.licence
  ) {
    addIssue(issues, "source revision, URL, and licence are required");
  }
  if (!manifest.source?.attribution) {
    addIssue(issues, "source attribution is required");
  }
  if (!Array.isArray(manifest.modifications) || manifest.modifications.length === 0) {
    addIssue(issues, "modifications must document the asset preparation history");
  }
  if (manifest.review?.status !== "approved" && !args.includes("--allow-pending")) {
    addIssue(issues, "review.status must be approved for production use");
  }
  if (
    manifest.review?.status === "approved" &&
    (!manifest.review.reviewer || !manifest.review.role || !manifest.review.date)
  ) {
    addIssue(issues, "approved assets require reviewer, role, and date");
  }

  if (!hasValidViewerFile) {
    fail(issues);
    return;
  }

  const modelsDirectoryArgument = argument("--models-dir");
  const modelsDirectory = modelsDirectoryArgument
    ? path.resolve(process.cwd(), modelsDirectoryArgument)
    : defaultModelsDirectory;
  const relativeAssetPath = String(manifest.file ?? "").replace(/^\/models\//u, "");
  const assetPath = path.resolve(modelsDirectory, relativeAssetPath);
  if (!assetPath.startsWith(`${modelsDirectory}${path.sep}`)) {
    addIssue(issues, "file resolves outside the configured models directory");
    fail(issues);
    return;
  }
  if (!(await fileExists(assetPath))) {
    addIssue(issues, `asset file does not exist: ${path.relative(repositoryRoot, assetPath)}`);
    fail(issues);
    return;
  }

  const buffer = await readFile(assetPath);
  const document = readGlbJson(buffer, path.basename(assetPath));
  const actualHash = createHash("sha256").update(buffer).digest("hex");
  if (manifest.sha256 !== actualHash) {
    addIssue(issues, `sha256 does not match the asset (actual ${actualHash})`);
  }
  if (manifest.performance?.bytes !== buffer.length) {
    addIssue(issues, "performance.bytes does not match the asset file");
  }
  if (buffer.length > maxAssetBytes) {
    addIssue(issues, "compressed asset exceeds the 20 MB Phase 2 budget");
  }

  const names = new Set([...uniqueNames(document.nodes), ...uniqueNames(document.meshes)]);
  const morphs = new Set(morphTargetNames(document));
  const animations = document.animations ?? [];
  const targets = manifest.targets ?? {};
  requiredHeartTargets.forEach((target) => {
    if (!(target in targets)) {
      addIssue(issues, `missing semantic target mapping: ${target}`);
      return;
    }
    const mapped = mappedNames(targets[target]);
    if (new Set(mapped).size !== mapped.length || mapped.some((name) => !names.has(name))) {
      addIssue(issues, `semantic target ${target} does not resolve to named GLB nodes`);
    }
  });

  const clipName = manifest.clips?.normal_cardiac_cycle;
  const cardiacCycle = animations.find((animation) => animation.name === clipName);
  if (clipName !== "CardiacCycle" || animations.length !== 1 || !cardiacCycle) {
    addIssue(issues, "asset must contain exactly one animation named CardiacCycle");
  } else if (Math.abs(animationDuration(document, cardiacCycle) - 0.8) > 0.01) {
    addIssue(issues, "CardiacCycle duration must be 0.8 seconds at 75 bpm");
  }

  const nodeIndexByName = new Map(
    (document.nodes ?? []).map((node, index) => [node.name, index])
  );
  const channelsByTarget = new Map();
  if (cardiacCycle) {
    for (const [targetId, morphName] of Object.entries(requiredAnimatedTargets)) {
      const groupName = manifest.targets?.[targetId];
      const groupIndex = nodeIndexByName.get(groupName);
      const groupNodes = Number.isInteger(groupIndex)
        ? descendants(document, groupIndex)
        : new Set();
      const matchingChannels = cardiacCycle.channels?.filter((channel) => {
        const nodeIndex = channel.target?.node;
        const meshIndex = document.nodes?.[nodeIndex]?.mesh;
        const targetNames = document.meshes?.[meshIndex]?.extras?.targetNames ?? [];
        return (
          channel.target?.path === "weights" &&
          groupNodes.has(nodeIndex) &&
          targetNames.includes(morphName)
        );
      }) ?? [];
      channelsByTarget.set(targetId, matchingChannels);
      if (matchingChannels.length === 0) {
        addIssue(issues, `${targetId} is missing its ${morphName} animation channel`);
      }
    }

    const valveTargetGroups = [
      ["heart.tricuspid_valve", "heart.mitral_valve"],
      ["heart.pulmonary_valve", "heart.aortic_valve"],
    ];
    const valveSeries = valveTargetGroups.map((targetIds) =>
      targetIds.flatMap((targetId) =>
        (channelsByTarget.get(targetId) ?? []).map((channel) => {
          const sampler = cardiacCycle.samplers[channel.sampler];
          const times = scalarFloatAccessorValues(buffer, document, sampler.input);
          const values = scalarFloatAccessorValues(buffer, document, sampler.output);
          if (times.length !== values.length) {
            addIssue(issues, `${targetId} must have one valve weight per keyframe`);
          }
          return { times, values };
        })
      )
    );
    if (valveSeries.every((series) => series.length > 0)) {
      const keyTimes = [
        ...new Set(valveSeries.flat(2).flatMap(({ times }) => times)),
      ].sort((left, right) => left - right);
      const sampleTimes = [
        ...keyTimes,
        ...keyTimes.slice(1).map((time, index) => (keyTimes[index] + time) / 2),
      ];
      if (
        sampleTimes.some(
          (time) =>
            Math.max(...valveSeries[0].map(({ times, values }) => sampleLinear(times, values, time))) > 1e-4 &&
            Math.max(...valveSeries[1].map(({ times, values }) => sampleLinear(times, values, time))) > 1e-4
        )
      ) {
        addIssue(issues, "AV and semilunar opening overlap; isovolumetric closure is missing");
      }
      const closedIntervals = keyTimes.slice(1).filter((end, index) => {
        const start = keyTimes[index];
        const midpoint = (start + end) / 2;
        const avOpen = Math.max(
          ...valveSeries[0].map(({ times, values }) => sampleLinear(times, values, midpoint))
        );
        const semilunarOpen = Math.max(
          ...valveSeries[1].map(({ times, values }) => sampleLinear(times, values, midpoint))
        );
        return end - start >= 0.025 && avOpen <= 1e-4 && semilunarOpen <= 1e-4;
      });
      if (closedIntervals.length < 2) {
        addIssue(
          issues,
          "CardiacCycle must contain two nonzero all-valves-closed isovolumetric intervals"
        );
      }
    }
  }

  for (const morphName of ["atrial_systole", "ventricular_systole", "valve_open"]) {
    if (!morphs.has(morphName)) addIssue(issues, `missing morph target: ${morphName}`);
  }

  requiredFlowPaths.forEach((pathId, index) => {
    const pathName = manifest.paths?.[pathId];
    const pathNode = document.nodes?.[nodeIndexByName.get(pathName)];
    const extras = pathNode?.extras ?? {};
    if (typeof pathName !== "string" || !pathNode) {
      addIssue(issues, `flow path ${pathId} does not resolve to a named GLB path node`);
    } else if (
      extras.semantic_id !== pathId ||
      extras.direction !== "forward" ||
      extras.oxygenation_state !== expectedPathState[pathId] ||
      extras.flow_order !== index + 1 ||
      extras.centerline_coordinate_system !== "y_up" ||
      extras.centerline_stride !== 3 ||
      !Array.isArray(extras.centerline_y_up) ||
      extras.centerline_y_up.length < 9 ||
      extras.centerline_y_up.length % 3 !== 0
    ) {
      addIssue(issues, `flow path ${pathId} has invalid traversal metadata`);
    }
  });

  for (const name of [
    "Anterior leaflet of left atrioventricular valve",
    "Anterior leaflet of right atrioventricular valve",
  ]) {
    const extras = document.nodes?.[nodeIndexByName.get(name)]?.extras ?? {};
    if (
      extras.generated_simplification !== true ||
      extras.review_status !== "pending_medical_review" ||
      typeof extras.derived_from !== "string" ||
      "source_hierarchy_repair" in extras
    ) {
      addIssue(issues, `generated leaflet disclosure is incomplete: ${name}`);
    }
  }

  if (
    document.extensionsUsed?.includes("KHR_draco_mesh_compression") ||
    document.extensionsRequired?.includes("KHR_draco_mesh_compression")
  ) {
    addIssue(issues, "asset must not use Draco until the viewer configures DRACOLoader");
  }

  const actualBounds = transformedSceneBounds(document);
  if (!closeBounds(actualBounds, manifest.bounds)) {
    addIssue(issues, "manifest bounds do not match transformed GLB scene bounds");
  }

  if (issues.length > 0) {
    fail(issues);
    return;
  }

  process.stdout.write(
    `Asset manifest valid: ${manifest.asset_id} (${path.relative(repositoryRoot, assetPath)})\n`
  );
}

main().catch((error) => {
  process.stderr.write(
    `Asset manifest validation failed: ${
      error instanceof Error ? error.message : String(error)
    }\n`
  );
  process.exitCode = 1;
});
