# instruction-engine

TypeScript / Node.js — **the core differentiator** of Anatomy AI.

## Responsibility
Converts the original question and grounded answer into deterministic, validated visual output. It selects reviewed scene recipes for supported processes, returns static anatomy commands for supported structure questions, and reports honest fallbacks for unsupported visual requests. No rendering logic lives here — only intent classification, recipe selection, validation, and command construction.

## Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /parse | Question and grounded answer → VisualCommand and optional validated ScenePlan |
| POST | /direct | Region/mode tap → VisualCommand |

## Output shape
```json
{
  "focus_region": "brain",
  "view_mode": "brain",
  "highlight": ["Brain_Mesh", "Cerebrum", "Cerebellum"],
  "animation": "pulse",
  "camera": "zoom_in",
  "confidence": 0.8
}
```

Supported cardiovascular process questions select the reviewed
`cardiovascular.normal-circulation.v1` recipe. Retrieved context is treated as evidence only;
it cannot add renderer actions, asset paths, or executable code.

## Setup
```bash
cp ../../.env.example .env
npm install
npm run dev
```

## Extending the parser
- Add anatomy terms to `src/types/regionMap.ts` → `REGION_TO_VIEW_MODE`
- Add mesh names to `REGION_TO_MESHES` (must match GLTF asset names)
- Add animation keywords to `src/parsers/answerParser.ts` → `ANIMATION_KEYWORDS`
