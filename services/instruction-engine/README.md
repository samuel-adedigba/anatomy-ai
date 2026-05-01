# instruction-engine

TypeScript / Node.js — **the core differentiator** of Anatomy AI.

## Responsibility
Converts raw AI text answers into deterministic, structured `VisualCommand` JSON objects that the Three.js visual engine can execute directly. No rendering logic lives here — only parsing and command construction.

## Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /parse | AI answer → VisualCommand |
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
