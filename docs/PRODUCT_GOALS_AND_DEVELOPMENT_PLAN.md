# Anatomy AI Product Goals and Development Plan

**Document status:** Source of truth  
**Version:** 1.0  
**Last updated:** 3 August 2026
**Applies to:** `apps/`, `services/`, `engines/`, `configs/`, `data/`, and `scripts/`  
**First product proof:** Interactive cardiovascular explanation

## 1. Purpose of this document

This document defines what Anatomy AI is intended to become and how the team will build it.
It is the primary reference for:

- Product purpose and boundaries.
- User experience and success criteria.
- Technical architecture.
- The first cardiovascular demonstration.
- Development phases and milestone gates.
- Testing and medical review requirements.
- External tools, anatomy assets, licences, and download steps.
- The process for adding each new anatomical system.

When another document conflicts with this one, this document takes priority unless a newer
architecture decision record explicitly changes it.

### 1.1 Roadmap status

Use only these status values: `not started`, `in progress`, `blocked`, or `complete`.
A phase becomes `complete` only when all of its exit criteria pass.

| Phase | Milestone | Status |
| --- | --- | --- |
| UX foundation | Responsive visual-first learning workspace | Complete |
| 0 | Baseline, governance, and licence gate | In progress |
| 1 | Versioned visual contracts and capability registry | In progress |
| 2 | Heart asset production pipeline | In progress |
| 3 | Timeline, multi-layer scene, and animation runtime | In progress |
| 4 | Reviewed cardiovascular vertical slice | In progress |
| 5 | AI scene planner integration | Not started |
| 6 | Mobile learning experience and optional narration | Not started |
| 7 | Release hardening | Not started |
| 8 | Add new processes one at a time | Not started |

As of 3 August 2026, Phase 0 has a reproducible GLB inspection command, an updated baseline
report, and a licence ledger. The heart development asset approval is recorded. Phase 0
remains in progress because the reference desktop and Android environments, final product
licence/distribution route, and remaining non-heart asset decisions are not recorded.

Phase 1 now has authoritative JSON schemas, a capability registry, generated TypeScript
contracts for all four consumers, instruction-engine and viewer validation, a legacy adapter,
invalid fixtures, and a deterministic cardiovascular fixture displayed as ordered viewer
steps. The current local evidence includes 11 instruction-engine tests and 12 viewer tests,
including explicit scene-plan validation, supersession cancellation, morph restoration, and
progress throttling. It remains `in progress` until the Phase 0 gate is cleared and the
contract is accepted for downstream runtime integration.

Phase 2 has an approved, served `heart.educational.v1` development asset with semantic targets,
the `CardiacCycle` clip, morph targets, directional flow paths, checksum, and manifest
validation. The asset inventory now reports 13/13 required semantic targets and the manifest
validator passes. Qualified medical reviewer sign-off, Android visual verification, and final
attribution/distribution packaging remain open, so the phase is not complete.

Phase 3 runtime work has started independently of the remaining reference-environment
approval. The web viewer now has a deterministic timeline and playback bridge,
manifest-based scene-layer loading, runtime capability hooks for clips, morphs, particle flow,
labels, materials, camera actions, reduced motion, cleanup, and static fallback handling. The
local viewer suite covers superseding-plan cancellation, morph cleanup, and throttled progress
updates. Its exit remains open until standalone playback, reference-device performance, and
full integration evidence are recorded, or an approved remediation plan is attached.

Phase 4 has started with the deterministic cardiovascular vertical slice. The standalone
viewer now provides a “Play heart explanation” launch action, synchronized step controls,
clickable step navigation for inspection, flow legend, evidence references, and visible
educational simplifications. The local viewer suite now includes a cardiovascular acceptance
fixture covering all four chambers, four valves, six directional flow paths, captions, and
the static fallback contract. Medical review, accessibility review, user comprehension
testing, and reference-device performance evidence remain open, so the phase is not complete.

## 2. Product vision

Anatomy AI is an evidence-grounded, interactive 3D anatomy explainer.

A person asks an anatomy or physiology question in natural language. Anatomy AI returns a
clear, sourced explanation and automatically presents a controlled 3D sequence showing the
relevant structures, movement, direction of flow, labels, colors, and camera changes over
time.

The intended experience is closer to an interactive educational video than a chatbot with a
static model.

> Do not only tell the learner what happens. Show the process, let the learner control it,
> and make every visual action traceable to reviewed knowledge and supported 3D capabilities.

## 3. Product mission

Anatomy AI will help learners understand how the human body is structured and how common
physiological processes work by combining:

- Evidence-grounded retrieval-augmented generation (RAG).
- Plain-language explanations and sources.
- Medically reviewed 3D assets and visual conventions.
- Deterministic, reusable animation capabilities.
- A validated scene planner that turns questions into timed visual explanations.
- User controls for pausing, replaying, slowing, rotating, and inspecting a sequence.

## 4. Intended users

### 4.1 Primary users

- Health and anatomy students who need to understand a process, not only memorize terms.
- Teachers and trainers who need a controllable visual explanation during instruction.
- Members of the public who want a plain-language anatomy explanation.

### 4.2 Secondary users

- Health practitioners using the product for general education or patient communication.
- Content reviewers who verify the accuracy of explanations and visual sequences.

### 4.3 Use boundary for practitioners

Anatomy AI is an educational tool. It is not a diagnostic system, treatment planner,
patient-specific simulator, surgical navigation system, or substitute for professional
clinical judgement.

## 5. Core user promise

For a supported question, Anatomy AI must:

1. Identify the anatomical subject and the process being asked about.
2. Retrieve relevant information from approved sources.
3. Give a clear explanation with visible sources.
4. Select a supported visual explanation.
5. Load all required 3D structures together.
6. Play a timed sequence that shows what changes and where movement or flow occurs.
7. Keep captions, labels, camera movement, and animation synchronized.
8. Let the user pause, replay, change speed, rotate, and inspect the scene.
9. State clearly when the requested process is not yet supported visually.

Loading a relevant model without showing the process does not satisfy this promise.

## 6. Product goals

### 6.1 Goal A: Visual-first answers

The visual sequence is part of the answer, not a decorative attachment. A supported question
must cause a meaningful change in the 3D scene.

### 6.2 Goal B: Evidence-grounded explanation

Text and visual behavior must be based on approved evidence. The system must preserve source
references used for both the written answer and the selected visual recipe.

### 6.3 Goal C: Video-like sequencing

The viewer must support:

- Timed steps.
- Concurrent animation tracks.
- Repeating physiological motion.
- Directional flow.
- Camera tracks.
- Labels and captions.
- Pause, replay, seek, and speed controls.

### 6.4 Goal D: Controlled generation

The language model may select supported targets, recipes, and semantic parameters. It must
not generate executable JavaScript, arbitrary shader code, unknown mesh names, unreviewed
medical facts, or unrestricted motion instructions.

### 6.5 Goal E: Reusable anatomy capabilities

New body systems should reuse shared capabilities such as:

- `play_clip`
- `play_morph`
- `particle_flow`
- `signal_propagation`
- `highlight`
- `set_material_state`
- `fade`
- `show_label`
- `camera_focus`
- `camera_orbit`
- `wait`

System-specific behavior belongs in reviewed assets and recipes, not in duplicated renderer
logic.

### 6.6 Goal F: Honest limitations

If a visual process is unsupported, the product must fall back to a relevant static view and
written explanation. It must never pretend that a generic pulse or glow is a realistic
simulation.

### 6.7 Goal G: Local-first operation

The existing local-first direction remains a goal. Core question answering and approved
visual recipes should work without a paid external inference API after models, knowledge,
and assets have been installed.

## 7. Non-goals

The first product versions will not:

- Generate a new medically reliable 3D model from text at runtime.
- Generate arbitrary physically correct anatomy animations with no prepared assets.
- Model patient-specific anatomy from medical scans.
- Diagnose disease or recommend treatment.
- Claim research-grade fluid, tissue, or biomechanical simulation.
- Cover every organ and physiological process before the first release.
- Use visual realism as a substitute for medical review.
- Allow the language model to bypass the capability validator.

## 8. Product principles

### 8.1 Build one complete process before broad coverage

The first proof is the cardiovascular explanation described in this document. The team will
not add shallow support for many systems before the complete heart sequence passes its
milestone gates.

### 8.2 Prefer authored and validated behavior

The renderer combines trusted assets and animation primitives. The language model plans
within those boundaries.

### 8.3 Separate meaning from rendering details

The planner uses semantic identifiers such as `left_ventricle` and `oxygenated`. The asset
registry resolves those identifiers to GLB nodes, materials, curves, clips, and colors.

### 8.4 Treat colors as semantics

The language model selects a state, not a hexadecimal color. For example:

```json
{
  "state": "oxygenated_blood"
}
```

The renderer maps that state to a reviewed palette and displays a legend. Colors used to
distinguish flow are educational conventions and must not imply that blood is literally
bright blue.

### 8.5 Keep text and visuals independently safe

A good written answer must not authorize an unsupported animation. A valid animation must
not make the written answer medically correct. Both outputs require validation.

### 8.6 Make every phase demonstrable

Each phase ends with a runnable artifact and explicit tests. Work does not move to the next
phase until the exit criteria pass.

### 8.7 Design for accessibility

Every visual explanation must also have:

- Captions or a text step list.
- Meaningful control labels.
- Keyboard and screen-reader support where the platform permits it.
- Information that does not depend on color alone.
- Reduced-motion behavior.
- A static explanation when animation cannot be used.

## 9. Definition of key terms

### 9.1 Visual command

The current single-action contract containing one view mode, highlight list, and animation.
It remains a legacy compatibility type during migration.

### 9.2 Scene plan

A versioned, validated description of a complete timed visual explanation. It references
semantic targets and approved actions.

### 9.3 Scene recipe

A reviewed template for a known anatomical process, such as normal blood circulation. A
planner may select and parameterize a recipe but cannot rewrite its medical truth.

### 9.4 Capability registry

The machine-readable list of actions, targets, assets, states, and recipes that the current
viewer can execute.

### 9.5 Asset manifest

Metadata describing one 3D asset, including semantic targets, actual GLB node names,
animations, morph targets, materials, paths, licence, attribution, version, and checksums.

### 9.6 Semantic target

A stable anatomy identifier such as `heart.left_ventricle`. It must not depend on a temporary
Blender or BodyParts3D object name.

### 9.7 Educational visualization

A medically reviewed representation intended to teach a structure or process. It may simplify
timing, scale, particle count, or color, but must disclose material simplifications.

### 9.8 Simulation

A model that calculates behavior from physical or physiological rules. Anatomy AI will not
call a sequence a simulation unless its underlying model and accuracy have been validated for
that claim.

## 10. Current system baseline

The existing repository has useful foundations:

- Expo React Native mobile application.
- Three.js WebView viewer.
- Node.js API gateway.
- Python RAG service using LlamaIndex, LanceDB, and Ollama.
- TypeScript instruction engine.
- Existing anatomy GLB assets.
- Basic highlighting, camera controls, and procedural animation effects.

The visual-first workspace foundation completed on 25 July 2026 also provides:

- A two-pane desktop workspace that keeps the explanation and sources beside the 3D scene.
- Separate 3D and explanation tabs on narrow screens so neither view obscures the other.
- A responsive browser iframe bridge in addition to the native WebView bridge.
- Readable answer, loading, empty, source, error, and education-boundary states.
- Consistent vector anatomy icons, visible focus treatment, labelled controls, and 44-pixel
  minimum touch targets.
- A dedicated 3D stage with model status, processing feedback, camera controls, and room for
  the timeline, captions, legend, and playback controls introduced by later phases.

This completed foundation establishes layout and interaction hierarchy. It does not mark
Phase 6 complete: synchronized captions, timeline playback, pause, seek, replay, speed
selection, and optional narration still depend on the scene-plan runtime.

### 10.1 Current request path

```text
Question
  -> RAG retrieval and text answer
  -> keyword parser reads answer and context
  -> one VisualCommand
  -> one model
  -> one highlight operation
  -> one looping effect
```

### 10.2 Current blocking gaps

| Gap | Current behavior | Required behavior |
| --- | --- | --- |
| Planning input | Instruction engine receives answer and context | Planner receives question, answer, evidence, and capabilities |
| Planning method | First matching region and animation keyword | Structured recipe selection and validated scene planning |
| Contract | One animation per response | Multiple timed and concurrent tracks |
| Scene composition | One current model replaces another | Multiple anatomy layers can coexist |
| Flow | Emissive color oscillation | Particles or directional markers follow reviewed paths |
| Heart motion | Uniform mesh scaling | Authored chamber-aware deformation or reviewed animation clip |
| Asset targeting | Hard-coded names such as `Heart_Mesh` | Semantic IDs resolved through a verified manifest |
| Synchronization | No timeline | Captions, camera, motion, and optional audio share one clock |
| Completion | Command completes after dispatch | Sequence exposes progress, pause, seek, replay, and completion |
| Safety | Confidence threshold only | Schema, capability, evidence, and recipe validation |

### 10.3 Current asset findings

The following findings were recorded on 25 July 2026:

| Asset | Current structure | Animation data | Main consequence |
| --- | --- | --- | --- |
| `heart.glb` | One node and mesh named `FJ2439` | No clips, morph targets, or skin | Cannot target chambers or show realistic contraction |
| `circulatory.glb` | One node and mesh named `FJ3659` | No clips, morph targets, or skin | Cannot target individual vessels by node name |
| `respiratory.glb` | One node and mesh named `FJ3418` | No clips, morph targets, or skin | Cannot target lungs or diaphragm independently |
| `full_body.glb` | 2,234 meshes | No animation data | Large mobile payload and no authored motion |

The existing region map expects names such as `Heart_Mesh`, `Left_Ventricle`, and
`Right_Ventricle`. Those names do not exist in the current heart asset. This mismatch must be
fixed before the existing highlight or animation behavior can be trusted.

## 11. Target experience for the first proof

### 11.1 Supported question

The first required demonstration will support questions with the meaning of:

> How does the heart pump blood? Show me how it moves and how blood circulates.

Wording may vary. The planner must recognize equivalent questions.

### 11.2 Required visual sequence

The sequence must:

1. Load a heart model and the required major vessels in the same scene.
2. Move the camera to a clear front or cutaway view.
3. Identify the four chambers.
4. Begin a repeating, reviewed heartbeat animation.
5. Show oxygen-poor flow from the body into the right side of the heart.
6. Show flow from the right ventricle toward the lungs.
7. Show oxygen-rich flow returning from the lungs to the left side of the heart.
8. Show flow from the left ventricle through the aorta toward the body.
9. Show valve locations or labels at the relevant steps.
10. Keep directional movement, captions, labels, and camera focus synchronized.
11. Display a legend explaining the flow colors.
12. Allow pause, replay, speed change, rotation, and step-by-step inspection.
13. Keep the written answer and its sources available without blocking the 3D view.

### 11.3 Motion requirement

The heart must not simply bob up and down. A production-approved sequence must use a reviewed
deformation, shape-key animation, or baked animation clip representing contraction and
relaxation at an educational level.

### 11.4 Flow requirement

Blood flow must be directional. A whole-mesh color pulse does not meet this requirement.
Acceptable methods include particles, animated markers, or a shader moving along reviewed
splines.

### 11.5 Accuracy reference

The sequence order must be reviewed against approved cardiovascular references. A useful
public review reference is the
[MedlinePlus heartbeat explainer](https://medlineplus.gov/ency/anatomyvideos/000067.htm).
Do not copy third-party media or narration without checking its reuse rights.

### 11.6 Explicit simplifications

The first proof may:

- Use fewer particles than real blood contains.
- Slow the sequence so learners can follow it.
- Use conventional contrasting colors with a legend.
- Emphasize chamber deformation for visibility.
- Show pulmonary and systemic circulation in successive teaching steps.

The product must label these as educational visual choices, not literal scale or timing.

## 12. Target architecture

### 12.1 End-to-end flow

```text
User question
  -> query validation
  -> evidence retrieval
  -> grounded text answer and sources
  -> scene intent classifier
  -> recipe and capability planner
  -> ScenePlan schema validation
  -> medical and capability policy validation
  -> semantic target resolution
  -> timeline player
       -> model and layer composer
       -> animation clip and morph player
       -> particle and signal renderer
       -> material state renderer
       -> camera controller
       -> label and caption renderer
       -> optional audio player
  -> viewer progress and completion events
```

### 12.2 Architecture boundaries

#### AI service

The AI service remains responsible for:

- Retrieval.
- Evidence-grounded written answers.
- Source extraction.
- Producing structured scene intent or recipe parameters.

It must not know raw GLB node names.

#### Instruction engine

The instruction engine evolves into the scene-planning and validation service. It will:

- Receive the original question, answer, evidence identifiers, and capability registry
  version.
- Select a supported recipe.
- Produce or compile a versioned `ScenePlan`.
- Validate all targets and actions.
- Reject unknown or unsafe behavior.
- Return an explicit visual fallback when no recipe is supported.

#### API gateway

The gateway will:

- Orchestrate the answer and visual planning requests.
- Preserve request and schema versions.
- Return `answer`, `sources`, `scenePlan`, and visual support status.
- Keep the legacy `visualCommand` only during migration.

#### Visual engine

The visual engine will:

- Load and retain multiple named scene layers.
- Resolve semantic targets through asset manifests.
- Execute scene plans against one timeline clock.
- Play baked clips and morph targets through Three.js animation support.
- Render particle flow along reviewed paths.
- Expose progress, pause, play, seek, speed, and replay.
- Report unsupported actions and missing assets instead of silently ignoring them.

#### Mobile application

The mobile application will:

- Submit the question.
- Present answer and sources.
- Send the scene plan to the viewer.
- Display playback controls, step captions, legends, loading, and fallback states.
- Keep text usable when 3D rendering is unavailable.

## 13. Scene plan contract

### 13.1 Contract requirements

The contract must be:

- Versioned.
- JSON-schema validated.
- Deterministic after compilation.
- Serializable through the existing WebView bridge.
- Independent of raw asset node names.
- Safe to store as a test fixture.
- Able to express concurrent and sequential actions.

### 13.2 Proposed shape

This example is illustrative. Phase 1 owns the final schema.

```json
{
  "schema_version": "1.0",
  "plan_id": "cardiovascular.normal-circulation.v1",
  "topic": "cardiovascular_system",
  "learning_objective": "Explain how the heart pumps blood through pulmonary and systemic circulation.",
  "duration_ms": 18000,
  "loop": false,
  "required_assets": [
    "heart.educational.v1",
    "circulation.major-vessels.v1"
  ],
  "tracks": [
    {
      "id": "heartbeat",
      "target": "heart",
      "action": "play_clip",
      "clip": "normal_cardiac_cycle",
      "start_ms": 0,
      "duration_ms": 18000,
      "loop": true
    },
    {
      "id": "pulmonary_flow",
      "target": "circulation.pulmonary",
      "action": "particle_flow",
      "path": "right_ventricle_to_lungs",
      "state": "oxygen_poor_blood",
      "start_ms": 3000,
      "duration_ms": 4500
    },
    {
      "id": "systemic_flow",
      "target": "circulation.systemic",
      "action": "particle_flow",
      "path": "left_ventricle_to_body",
      "state": "oxygen_rich_blood",
      "start_ms": 9000,
      "duration_ms": 4500
    },
    {
      "id": "left-ventricle-label",
      "target": "heart.left_ventricle",
      "action": "show_label",
      "text_key": "heart.left_ventricle",
      "start_ms": 8500,
      "duration_ms": 4000
    }
  ],
  "steps": [
    {
      "id": "right-heart",
      "start_ms": 2000,
      "end_ms": 7500,
      "caption": "The right side sends oxygen-poor blood toward the lungs."
    },
    {
      "id": "left-heart",
      "start_ms": 8000,
      "end_ms": 14500,
      "caption": "The left side sends oxygen-rich blood toward the body."
    }
  ],
  "evidence_refs": [
    "cardiovascular-source-id"
  ],
  "fallback": {
    "view_mode": "heart",
    "message": "The full motion sequence is unavailable. Showing the heart model instead."
  }
}
```

### 13.3 Allowed action policy

Version 1 should support only explicitly registered actions. A plan containing an unknown
action must fail validation before reaching the viewer.

### 13.4 No arbitrary text in renderer-critical fields

Targets, clips, paths, states, and recipes use controlled identifiers. User-facing captions
may contain generated text after content validation, but they cannot alter renderer behavior.

## 14. Asset manifest contract

Each production asset must have a machine-readable manifest with:

- Asset ID and version.
- GLB path and checksum.
- Source provider and source version.
- Original download location.
- Licence and required attribution.
- Modification history.
- Semantic target to node mapping.
- Available animation clips.
- Available morph targets.
- Available materials and semantic states.
- Available flow paths.
- Coordinate system, units, and scale.
- Bounding-box and performance metadata.
- Medical reviewer and review date.
- Known simplifications.

Example:

```json
{
  "asset_id": "heart.educational.v1",
  "file": "/models/heart/heart.educational.v1.glb",
  "sha256": "<generated-checksum>",
  "source": {
    "name": "Z-Anatomy",
    "revision": "<recorded-commit>",
    "licence": "CC-BY-SA-4.0"
  },
  "targets": {
    "heart": "HeartRoot",
    "heart.right_atrium": "RightAtrium",
    "heart.right_ventricle": "RightVentricle",
    "heart.left_atrium": "LeftAtrium",
    "heart.left_ventricle": "LeftVentricle",
    "heart.aorta": "Aorta"
  },
  "clips": {
    "normal_cardiac_cycle": "CardiacCycle"
  },
  "paths": {
    "right_ventricle_to_lungs": "PulmonaryOutflowCurve",
    "left_ventricle_to_body": "SystemicOutflowCurve"
  }
}
```

## 15. Planned repository structure

Do not create all paths before their owning milestone starts.

```text
docs/
  PRODUCT_GOALS_AND_DEVELOPMENT_PLAN.md
  architecture/
  decisions/
  medical-review/
  asset-licenses/

configs/
  visual-scene/
    scene-plan.schema.json
    asset-manifest.schema.json
    capability-registry.json
    semantic-states.json

engines/
  anatomy-assets/
    manifests/
    models/
      heart/
      circulatory/
    recipes/
      cardiovascular/
    source/              # local working sources; ignored by Git
    work/                # Blender working files; ignored unless approved

apps/
  web-viewer/
    src/
      scene/
      timeline/
      animation/
      flow/
      labels/

services/
  instruction-engine/
    src/
      planner/
      compiler/
      validators/
      recipes/
```

## 16. Development roadmap and milestone gates

### Phase 0: Baseline, governance, and licence gate

#### Objective

Create a reliable baseline before changing contracts or assets.

#### Work

- Adopt this document as the source of truth.
- Record the canonical application paths as `apps/`, `services/`, `engines/`, `configs/`,
  `data/`, and `scripts/`.
- Inventory every current GLB:
  - File size.
  - Node and mesh names.
  - Primitive count.
  - Animation clips.
  - Morph targets.
  - Skins.
  - Materials.
- Add an automated read-only asset inspection script.
- Record current test and build results for each application and service.
- Create an asset licence ledger.
- Confirm whether existing BodyParts3D and Z-Anatomy derivatives can be distributed under
  the intended product licence.
- Add `engines/anatomy-assets/source/` and `engines/anatomy-assets/work/` to `.gitignore`
  before downloading source archives.
- Select a reference Android device and desktop browser for performance testing.

#### Required tests

- Existing instruction-engine tests pass.
- Existing mobile tests and type checks pass.
- API gateway and web viewer build successfully.
- Asset inspection reports the current heart and circulatory limitations.
- No external asset enters a production folder without a licence record.

Run the current baseline checks from the repository root:

```bash
cd services/instruction-engine && pnpm test
cd ../../apps/web-viewer && pnpm build
cd ../../services/api-gateway && pnpm build
cd ../../apps/mobile-app && pnpm test && pnpm type-check
cd ../.. && ./scripts/test-integration.sh
```

The integration script requires the local services, viewer, Ollama models, and indexed
knowledge base to be running.

#### Exit criteria

- Baseline report is committed.
- Asset ledger exists.
- The heart asset source and licence route are approved.
- Reference test devices are recorded.

#### Milestone demonstration

Run one command that reports all anatomy assets and clearly flags missing semantic nodes and
animation data.

### Phase 1: Versioned visual contracts and capability registry

#### Objective

Replace ambiguous one-action instructions with a safe, testable scene contract.

#### Work

- Define `ScenePlan` version 1.
- Define `AssetManifest` version 1.
- Define the initial capability registry.
- Define semantic identifiers for the heart, chambers, valves, major vessels, flow states,
  labels, and camera targets.
- Add Zod validation in the instruction engine.
- Add equivalent viewer validation.
- Decide how TypeScript types are generated or shared so the gateway, viewer, instruction
  engine, and mobile app cannot drift.
- Keep a legacy adapter from `VisualCommand` to a minimal `ScenePlan` during migration.
- Add valid and invalid JSON fixtures.

#### Required tests

- Valid fixture passes service and viewer validation.
- Unknown action fails validation.
- Unknown semantic target fails validation.
- Negative duration, invalid timing, and overlapping invalid state changes fail validation.
- Valid concurrent tracks are accepted.
- Legacy commands compile to safe minimal plans.
- Schema version mismatch returns an actionable error.

#### Exit criteria

- One versioned schema is authoritative.
- All consumers use compatible generated or shared types.
- Invalid plans cannot reach renderer execution.
- The cardiovascular fixture is stored as a regression fixture.

#### Milestone demonstration

Load a hard-coded, schema-valid scene plan and display its ordered steps in the viewer without
using the language model.

### Phase 2: Heart asset production pipeline

#### Objective

Produce a targetable, licenced, optimized heart asset that can support the first sequence.

#### Work

- Acquire the approved source model.
- Isolate the required heart structures and major vessels.
- Use stable semantic names for:
  - Right atrium.
  - Right ventricle.
  - Left atrium.
  - Left ventricle.
  - Tricuspid valve.
  - Pulmonary valve.
  - Mitral valve.
  - Aortic valve.
  - Vena cavae.
  - Pulmonary artery.
  - Pulmonary veins.
  - Aorta.
- Author or obtain a reviewed cardiac-cycle deformation.
- Add reviewed flow curves.
- Normalize scale, orientation, transforms, materials, and origins.
- Export GLB with animations and required metadata.
- Optimize the GLB.
- Create the asset manifest and attribution record.
- Keep original source and Blender working files outside production bundles.

#### Required tests

- Khronos glTF validation reports no errors.
- Every required semantic target resolves to exactly one expected node or documented group.
- The cardiac-cycle clip or morph sequence is present and plays.
- Every required flow path is present and has a defined direction.
- Materials support the approved semantic states.
- Asset loads without console errors.
- Compressed heart scene payload is at most 20 MB unless an approved exception is recorded.
- Medical reviewer confirms structure names, flow direction, and stated simplifications.

#### Exit criteria

- `heart.educational.v1` is reproducible from documented sources.
- Licence and attribution requirements are recorded.
- Manifest, checksum, and reviewer sign-off are committed.
- No production logic depends on the original `FJ2439` name.

#### Milestone demonstration

In the standalone web viewer, select each named chamber and vessel, then play the reviewed
heartbeat clip and display every flow path.

### Phase 3: Timeline, multi-layer scene, and animation runtime

#### Objective

Build the video-like playback engine without depending on AI planning.

#### Work

- Replace the single-current-model approach with named scene layers.
- Add a central timeline clock.
- Add a `TimelinePlayer` with play, pause, seek, replay, and speed controls.
- Add clip playback using Three.js `AnimationMixer`.
- Add morph-target playback if the chosen asset uses morphs.
- Add particle flow along named curves.
- Add semantic material states and legends.
- Add timed labels and captions.
- Add timed camera focus and orbit actions.
- Add reduced-motion mode.
- Add structured progress and error events through the WebView bridge.
- Restore all original transforms and materials when a plan ends or is replaced.

#### Required tests

- Multiple scene layers remain loaded and correctly aligned.
- Two or more animation tracks can run concurrently.
- Pause freezes clips, particles, labels, and camera on the same frame.
- Replay produces the same event order.
- Seek restores the correct scene state.
- Speed change affects the whole timeline consistently.
- A superseding plan cancels and cleans up the old plan.
- Missing assets and targets produce visible fallback errors.
- Repeated playback does not leak scene objects, materials, or animation mixers.
- Reduced-motion mode preserves all learning content.

#### Provisional performance budgets

- At least 30 frames per second during the heart sequence on the agreed reference Android
  device.
- No uncontrolled increase in memory after ten replays.
- First useful heart frame appears within five seconds on the agreed test connection.
- Viewer remains responsive to pause within 150 milliseconds.

Phase 0 may adjust these budgets after measuring the selected reference device.

#### Exit criteria

- The cardiovascular fixture plays from start to finish without the AI service.
- Playback controls work in the standalone web viewer.
- Runtime tests cover cancellation and cleanup.
- Performance budgets pass or an approved remediation plan exists.

#### Milestone demonstration

Play, pause, seek, slow, rotate, and replay the complete cardiovascular fixture in the web
viewer.

### Phase 4: Reviewed cardiovascular vertical slice

#### Objective

Prove the intended product experience with one complete, deterministic explanation.

#### Work

- Implement the exact sequence in Section 11 as a reviewed scene recipe.
- Write concise step captions and a color legend.
- Add sources and a list of educational simplifications.
- Add camera framing suitable for a phone screen.
- Add step navigation.
- Add an unsupported-motion fallback.
- Conduct product, anatomy, accessibility, and performance review.

#### Required product acceptance tests

Given the cardiovascular recipe is selected:

- The heart and major vessels appear together.
- The heart visibly contracts and relaxes.
- Flow direction is visible without relying only on color.
- Pulmonary and systemic routes are shown in the correct order.
- The four chambers and four valves can be identified.
- Captions describe the action currently visible.
- The user can pause and inspect any step.
- Sources remain available.
- The sequence never uses the terms “patient-specific” or “clinical simulation.”

#### User comprehension test

Test with at least:

- Two health or anatomy students.
- One general learner.
- One anatomy or clinical reviewer.

After viewing, users should be able to explain the two main circulation routes and use the
controls without coaching. Record misunderstandings and revise the sequence.

#### Exit criteria

- All product acceptance tests pass.
- Medical review is signed and dated.
- No critical accessibility problem remains.
- User testing shows that the sequence communicates the intended flow.
- The product owner accepts the demonstration as the reference for future systems.

#### Milestone demonstration

A standalone “Play heart explanation” button launches the complete experience. This is the
first proof that Anatomy AI is more than text plus a static model.

### Phase 5: AI scene planner integration

#### Objective

Make natural-language questions select the correct reviewed recipe and safe parameters.

#### Work

- Pass the original question to the instruction engine.
- Include the grounded answer, evidence references, and capability-registry version.
- Add an intent classifier for:
  - Static anatomy.
  - Process or motion request.
  - Comparison.
  - Unsupported visual request.
- Make the planner select a recipe rather than invent low-level tracks when a reviewed recipe
  exists.
- Use structured JSON output.
- Validate and compile the result.
- Add deterministic fallback rules when the language model is unavailable.
- Log plan validation failures without exposing private user content unnecessarily.
- Preserve source references in the plan.

#### Golden question set

Include variations such as:

- “How does the heart pump blood?”
- “Show me blood moving through the heart.”
- “What happens when the heart beats?”
- “Show pulmonary and systemic circulation.”
- “Where does blood go after the right ventricle?”
- “Tell me about the liver.” as an unsupported-motion control case.

#### Required tests

- Every supported golden question selects the cardiovascular recipe.
- Static heart questions may use a static heart scene without forcing the full sequence.
- Unsupported processes return an honest visual fallback.
- Every returned plan passes schema and capability validation.
- Prompt injection in retrieved text cannot add actions or change asset paths.
- The planner cannot emit executable code.
- AI-service failure still returns a safe fallback.
- Instruction-engine failure does not block the written answer.

#### Initial quality targets

- 100% schema-valid output after compilation.
- 100% safe fallback for unsupported actions.
- At least 90% correct recipe selection on the reviewed supported-intent test set.
- No known case where retrieved content can bypass the action allowlist.

#### Exit criteria

- Asking the supported heart question launches the reviewed sequence automatically.
- Planner behavior passes the golden question suite.
- The same question produces functionally equivalent plans across repeated runs.
- Unsupported requests are clearly identified.

#### Milestone demonstration

Type the heart question in the application. The answer, sources, and cardiovascular sequence
appear automatically with no manual body-system selection.

### Phase 6: Mobile learning experience and optional narration

#### Objective

Deliver the complete experience inside the Expo application.

#### Work

- Replace the one-command bridge with scene-plan messages.
- Add playback controls to the mobile interface.
- Add current-step captions and a visible legend.
- Keep answer and sources available without obscuring the whole scene.
- Add loading progress for assets and plans.
- Add replay and “show steps” controls.
- Add reduced-motion and text-only modes.
- Add optional recorded or generated narration only after captions are stable.
- Synchronize audio to the same timeline clock.
- Handle app backgrounding, audio interruption, WebView reload, and device rotation.

#### Required tests

- End-to-end question-to-sequence test on Android.
- End-to-end test on iOS when an iOS test environment is available.
- WebView reload restores or safely restarts the sequence.
- Audio interruption does not desynchronize later playback.
- Screen readers can identify controls, current step, and sources.
- Text remains usable when WebGL is unavailable.
- All controls meet minimum touch-target requirements.
- Reduced-motion preference is respected.

#### Exit criteria

- The cardiovascular experience passes on the reference mobile device.
- The interface exposes all required learning content without requiring animation.
- Optional narration can be disabled independently.
- No microphone permission is requested for playback-only narration.

#### Milestone demonstration

Complete the full heart question and interactive explanation on a physical mobile device.

### Phase 7: Release hardening

#### Objective

Prepare the cardiovascular vertical slice for external educational testing.

#### Work

- Complete medical, licence, accessibility, privacy, and security review.
- Add telemetry only if a privacy plan approves it.
- Optimize asset delivery, caching, and memory use.
- Add visual regression baselines.
- Add integration tests to continuous integration.
- Document known limitations in the product interface.
- Add an asset and content update policy.
- Add schema migration policy.
- Create an incident process for incorrect medical or visual content.

#### Required tests

- Full automated test suite passes.
- No high-severity glTF validation issue exists.
- No unresolved critical or serious accessibility finding exists.
- Licence ledger covers every bundled asset and copied content item.
- Security review covers WebView messaging and plan validation.
- Ten repeated queries and replays remain stable.
- Offline behavior matches the documented product promise.

#### Exit criteria

- Product, engineering, medical, and licence owners approve the build.
- Known limitations are visible to testers.
- Rollback and content correction procedures exist.

#### Milestone demonstration

Distribute a controlled cardiovascular test build with a signed review record.

### Phase 8: Add new processes one at a time

#### Objective

Expand coverage without weakening quality.

#### Recommended order

1. Breathing: lung expansion, diaphragm motion, and airflow.
2. Joint movement: a selected joint with bones, muscles, and range of motion.
3. Nerve signal: propagation along a selected neural pathway.
4. Digestion: staged movement through major digestive organs.
5. Muscle contraction: one selected muscle group.
6. Additional cardiovascular topics.

The order may change after user research, but only one new process should be in active
vertical-slice development at a time.

#### Required gate for every new process

Each process needs:

- An approved learning objective.
- Approved evidence.
- Semantic target definitions.
- A licenced and targetable asset.
- Reviewed motion, flow, or signal paths.
- A versioned recipe.
- Golden questions.
- Contract, runtime, integration, visual, accessibility, performance, and medical tests.
- A declared fallback for unsupported variations.

#### Exit criteria

A new process is “supported” only when it reaches the same quality bar as the cardiovascular
reference slice.

## 17. Testing strategy

### 17.1 Unit tests

Cover:

- Schema validation.
- Timeline scheduling.
- State restoration.
- Recipe selection.
- Semantic target resolution.
- Fallback behavior.
- Flow-path interpolation.

### 17.2 Contract tests

Run the same fixtures against:

- Instruction engine.
- API gateway response types.
- Web viewer validation.
- Mobile bridge types.

### 17.3 Asset tests

Automate:

- glTF conformance.
- Required node names.
- Required clips and paths.
- File size.
- Checksum.
- Licence-manifest presence.
- No duplicate semantic identifiers.

### 17.4 Runtime integration tests

Verify:

- Multi-layer loading.
- Timeline execution.
- Concurrent actions.
- Cancellation.
- Cleanup.
- Viewer-to-mobile events.

### 17.5 Visual regression tests

Capture approved frames at fixed timestamps. Compare:

- Initial view.
- Right-heart flow.
- Pulmonary flow.
- Left-heart flow.
- Systemic flow.
- Final overview.

Visual diffs do not prove medical correctness. They detect unintended rendering changes.

### 17.6 End-to-end tests

Test the complete path:

```text
question -> RAG -> planner -> validated scene plan -> viewer -> completion event
```

### 17.7 Medical review

Automated tests cannot approve anatomy. Each recipe requires a reviewer record containing:

- Reviewer name and role.
- Reviewed source list.
- Asset and recipe versions.
- Review date.
- Approved simplifications.
- Required corrections.

### 17.8 User testing

Test whether users understand the process, not only whether the animation looks impressive.

## 18. Definition of done for a supported visual process

A process is complete only when:

- The written answer is evidence-grounded.
- The visual recipe references approved evidence.
- Every semantic target resolves.
- Every animation is supported by a reviewed asset or capability.
- Flow and movement direction are correct.
- Captions match the visible step.
- Controls work.
- Reduced-motion and text fallback work.
- Contract, asset, runtime, integration, and end-to-end tests pass.
- Performance budgets pass.
- Licence and attribution records are complete.
- Medical review is signed.
- Known simplifications are visible.
- Unsupported variations fall back honestly.

## 19. External tools and assets

External software and data must not be copied into production folders until the licence,
source revision, and intended use are recorded.

### 19.1 Blender

#### Why it is needed

Blender is required to:

- Separate and rename anatomy structures.
- Set origins and transforms.
- Create shape keys or animation clips.
- Create flow curves.
- Edit materials.
- Export GLB files.

#### How to get it

1. Download a stable or long-term-support release from the
   [official Blender download page](https://www.blender.org/download/).
2. Follow the installer instructions for the operating system.
3. Confirm installation:

   ```bash
   blender --version
   ```

Blender is GPL-licensed software. The licence of Blender does not automatically become the
licence of artwork created with it. The source model licence still controls the exported
anatomy asset.

### 19.2 Z-Anatomy

#### Why it may be needed

Z-Anatomy provides a Blender-based anatomy atlas derived partly from BodyParts3D. It may be a
useful source for separated structures and anatomical naming.

#### How to get it

1. Open the
   [official Z-Anatomy human-model repository](https://github.com/Z-Anatomy/Models-of-human-anatomy).
2. Read `Readme.md` and `License.txt` before downloading.
3. For a local evaluation copy, clone into the ignored source directory after Phase 0 updates
   `.gitignore`:

   ```bash
   git clone --depth 1 \
     https://github.com/Z-Anatomy/Models-of-human-anatomy.git \
     engines/anatomy-assets/source/z-anatomy
   ```

4. Record the exact commit:

   ```bash
   git -C engines/anatomy-assets/source/z-anatomy rev-parse HEAD
   ```

5. Follow the repository instructions to install the `Z-Anatomy.zip` application template in
   Blender.
6. Copy only required structures into a clean project scene.
7. Do not commit the downloaded repository or its large source archives.

#### Licence warning

Z-Anatomy states that its shared code and content use CC BY-SA 4.0 and requires attribution
and share-alike handling for derivatives. Some included structures have separate or
non-commercial terms. Confirm the licence for every selected object, not only the overall
repository, before product distribution.

### 19.3 BodyParts3D

#### Why it may be needed

BodyParts3D provides individual anatomy objects and mapping metadata. The repository already
contains models derived from this source.

#### How to get it

1. Visit the
   [official BodyParts3D information and download page](https://lifesciencedb.jp/bp3d/info/index.html).
2. Follow the linked archive download for the selected OBJ release.
3. Save the untouched archive under an ignored source directory.
4. Record:
   - Download URL.
   - Release number.
   - Download date.
   - SHA-256 checksum.
   - Licence text.
5. Use the BodyParts3D mapping tables to resolve `FJ` identifiers to anatomical concepts.
6. Import only required OBJ parts into Blender.

Example checksum command:

```bash
sha256sum engines/anatomy-assets/source/bodyparts3d/<downloaded-archive>
```

#### Licence warning

The official site states CC BY-SA 2.1 Japan terms for its contour data and rendered images.
Attribution and share-alike obligations must be reviewed before distribution. OBJ files are
static geometry; required animation still has to be authored and medically reviewed.

### 19.4 glTF Transform

#### Why it is needed

glTF Transform can inspect and optimize exported GLB files.

#### How to use it without a global install

Use `pnpm dlx` and a reviewed pinned version:

```bash
pnpm dlx @gltf-transform/cli@4.4.1 inspect \
  engines/anatomy-assets/models/heart/heart.educational.v1.glb
```

Create a separate optimized output so the source export is not overwritten:

```bash
pnpm dlx @gltf-transform/cli@4.4.1 optimize \
  engines/anatomy-assets/work/heart.educational.v1.source.glb \
  engines/anatomy-assets/models/heart/heart.educational.v1.glb \
  --texture-compress webp
```

Review the output visually after optimization. Optimization passing does not prove anatomical
or animation correctness. See the
[official glTF Transform command-line documentation](https://gltf-transform.dev/cli).

Before continuous integration uses this tool, add a reviewed pinned version to the appropriate
development package instead of relying on an unpinned download.

### 19.5 Khronos glTF Validator

#### Why it is needed

The validator checks GLB files against the glTF 2.0 specification and reports structural,
reference, and binary-data errors.

#### How to use it

For manual validation, use the
[official browser-based glTF Validator](https://github.khronos.org/glTF-Validator/). Validation
runs locally in the browser.

For automated validation, add the official package during Phase 2:

```bash
cd apps/web-viewer
pnpm add -D gltf-validator
```

Then implement a repository script that exits with a failure when a production asset contains
validator errors. The
[official glTF Validator repository](https://github.com/KhronosGroup/glTF-Validator)
documents the report format and validation behavior.

### 19.6 Three.js animation and path support

The web viewer already depends on Three.js. No additional runtime package is required for the
first implementation:

- Use
  [Three.js AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html)
  for exported animation clips.
- Use Three.js curves and
  [TubeGeometry](https://threejs.org/docs/pages/TubeGeometry.html)
  or points moving along curves for flow-path rendering.

Do not add another animation library until the timeline requirements prove that Three.js and a
small project-owned scheduler are insufficient.

### 19.7 Optional Expo audio

Audio is not required for the first web-viewer proof. Add it only during Phase 6 after captions
and timeline synchronization work.

Install the Expo-compatible version with the project package manager:

```bash
cd apps/mobile-app
pnpm exec expo install expo-audio
```

Follow the
[official Expo Audio documentation](https://docs.expo.dev/versions/latest/sdk/audio/).
For playback-only narration, configure the app so it does not request microphone permission
or enable background recording. Background playback should also remain disabled unless the
product explicitly needs it.

### 19.8 Medical references and RAG content

Do not assume that public web access permits copying, bundling, modifying, or RAG ingestion.
For every source:

1. Record publisher, title, URL, version or review date, and retrieval date.
2. Record the exact reuse and AI-ingestion terms.
3. Store the licence or permission evidence.
4. Keep copied text separate from unlicensed references.
5. Require review before adding it to `data/raw-docs/`.

The current OpenStax Anatomy and Physiology 2e page provides free access but applies
CC BY-NC-SA terms and currently states that ingestion into generative AI offerings requires
permission. Use it as a review reference only unless permission and intended product use are
resolved. See the
[OpenStax Anatomy and Physiology 2e terms](https://openstax.org/books/anatomy-and-physiology-2e/pages/preface).

MedlinePlus pages may contain material from third-party content providers. Verify the rights
for the specific page, image, or video before copying it. Linking to a review reference is not
the same as having permission to bundle its content.

## 20. External asset intake checklist

Complete this checklist before an asset is used:

- [ ] Source URL recorded.
- [ ] Provider and author recorded.
- [ ] Release, tag, or commit recorded.
- [ ] Original file checksum recorded.
- [ ] Licence text stored.
- [ ] Commercial-use terms reviewed.
- [ ] Modification and redistribution terms reviewed.
- [ ] Attribution text prepared.
- [ ] Share-alike or non-commercial effect reviewed.
- [ ] Anatomy reviewer confirms suitability.
- [ ] Source files stored in an ignored working directory.
- [ ] Production output has a manifest and checksum.
- [ ] glTF validation passes.
- [ ] Visual and animation review passes.

## 21. Medical and visual safety rules

The planner and recipes must follow these rules:

- Do not infer patient-specific anatomy.
- Do not visualize a diagnosis as fact.
- Do not present conventional colors as literal tissue or blood colors.
- Do not convert uncertain text into certain animation.
- Do not claim physical accuracy for procedural scaling, glow, or particle counts.
- Do not show a normal process when the question asks about a disease unless a reviewed disease
  recipe exists.
- Do not alter direction of flow to make a camera angle easier.
- Do not use a visual source outside its licence.
- Always provide an educational-use notice.
- Always preserve a text fallback.

## 22. Performance and delivery policy

- Optimize assets before bundling.
- Load the minimum assets needed for the current sequence.
- Cache versioned assets.
- Use level of detail where large systems require it.
- Avoid duplicating geometry between layers when a shared asset can be reused.
- Dispose geometries, materials, textures, mixers, and particle buffers when no longer needed.
- Measure on the reference mobile device, not only a desktop browser.
- Treat a visually richer effect that makes the interface unstable as a failed change.

## 23. Observability and debugging requirements

Development builds should expose:

- Question request ID.
- Selected recipe and version.
- Scene-plan schema version.
- Capability-registry version.
- Asset IDs and checksums.
- Missing target or action errors.
- Plan start, pause, seek, cancel, and completion events.
- Asset load duration.
- Frame-rate and memory samples during test runs.

Production logs must avoid storing sensitive free-text questions unless a privacy policy and
explicit retention purpose approve it.

## 24. Versioning and change control

### 24.1 Schema changes

- Backward-compatible additions increment the minor version.
- Breaking changes increment the major version.
- Viewer and planner must negotiate or reject incompatible versions.

### 24.2 Asset changes

- Geometry, naming, clips, paths, or materials that can change rendering require a new asset
  version and checksum.
- Replacing a file in place without a version change is not allowed.

### 24.3 Recipe changes

- Any change to anatomical sequence, direction, labels, timing meaning, or simplification
  requires a new review.

### 24.4 Product-goal changes

Changes to vision, supported-user claims, medical scope, or milestone exit criteria must update
this document in the same pull request.

## 25. Decisions already made

- The product is an interactive educational explainer, not a clinical simulator.
- Cardiovascular circulation is the first complete vertical slice.
- The renderer executes an allowlisted scene plan.
- The language model does not generate arbitrary renderer code.
- Semantic identifiers are separate from GLB node names.
- Reviewed recipes are preferred for known processes.
- The heart proof must work deterministically before AI planning is integrated.
- New systems enter one at a time through the same quality gates.
- Captions and text fallback are mandatory; narration is optional.
- External assets require a licence record before production use.

## 26. Open decisions that block later milestones

| Decision | Needed by | Resolution owner |
| --- | --- | --- |
| Final heart source asset | Phase 0 exit | Product and asset owners |
| Distribution model and compatible asset licence | Phase 0 exit | Product and legal/licence reviewer |
| Reference Android device | Phase 0 exit | Engineering |
| Final visual palette and legend language | Phase 4 | Medical and design reviewers |
| Whether narration is recorded, synthesized, or omitted | Phase 6 | Product |
| Named anatomy reviewer and sign-off format | Phase 2 exit | Product |
| Commercial or non-commercial product intent | Before accepting share-alike or NC assets | Product and licence reviewer |

## 27. Immediate development order

The first implementation work should happen in this order:

1. Complete Phase 0 asset inventory and licence ledger.
2. Implement the versioned scene and asset schemas.
3. Create the deterministic cardiovascular fixture.
4. Acquire and prepare the heart asset.
5. Build multi-layer loading and the timeline player.
6. Build the heartbeat clip player and directional flow renderer.
7. Complete and review the deterministic heart demonstration.
8. Integrate AI recipe selection.
9. Integrate the mobile playback experience.
10. Harden and release the cardiovascular test build.

Do not start with prompt changes. A better prompt cannot create missing chambers, animation
clips, flow paths, timeline behavior, or multi-model rendering.

## 28. First developer handoff

The first engineering task should produce:

- An asset inventory script and report.
- An asset licence ledger template.
- `ScenePlan` and `AssetManifest` draft schemas.
- A valid cardiovascular fixture.
- Tests proving that invalid actions and targets are rejected.

The first asset task should produce:

- A recorded source revision and licence review.
- A Blender working scene with required structures.
- Stable semantic names.
- A draft heartbeat animation.
- Draft pulmonary and systemic flow curves.

The first renderer task should consume the fixture directly. It must not wait for AI planner
integration.

## 29. Product success criteria

The cardiovascular proof succeeds when a user can ask how the heart pumps blood and:

- Receive a clear, grounded answer with sources.
- Automatically see the correct heart-focused sequence.
- Understand the direction of pulmonary and systemic circulation.
- See a credible educational heartbeat rather than a generic object pulse.
- Pause, replay, slow, rotate, and inspect the explanation.
- Read synchronized captions and a color legend.
- Understand what the visualization simplifies.
- Continue using the written explanation if 3D playback is unavailable.

The broader product succeeds when the team can add a new reviewed anatomical process through
the same contracts and gates without rewriting the whole pipeline.

## 30. Source-of-truth maintenance checklist

Review this document when:

- A milestone starts or completes.
- A contract version changes.
- A new asset provider is introduced.
- A new anatomical process is proposed.
- Product scope or medical claims change.
- Performance budgets change.
- A user test reveals a misunderstanding.
- A medical or licence review requires a correction.

Record completed milestones and approved decisions in linked architecture decision records
rather than silently changing implementation behavior.
