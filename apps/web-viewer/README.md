# web-viewer

Three.js / TypeScript / Vite — the 3D rendering engine for Anatomy AI.

## Responsibility
- Loads GLTF anatomy models from `engines/anatomy-assets/models/`
- Executes `VisualCommand` JSON from the instruction engine
- Receives commands via `postMessage` from the React Native WebView
- Highlights meshes, triggers animations, controls camera

## Architecture
```
VisualEngine (orchestrator)
├── SceneManager    — Three.js scene, camera, renderer, loop
├── ModelLoader     — GLTF loading + mesh lookup + caching
├── Highlighter     — Material-based mesh highlighting + dimming
├── Animator        — Per-frame animation (pulse, flow, wave...)
└── CameraController — Deterministic camera actions
```

## Setup
```bash
npm install
npm run dev
```

## Dev testing in browser
Open http://localhost:5173 then run in the console:
```js
executeCommand({
  focus_region: "brain",
  view_mode: "brain",
  highlight: ["Brain_Mesh", "Cerebrum"],
  animation: "pulse",
  confidence: 0.9
})
```

## Adding models
1. Place `.glb` file in `engines/anatomy-assets/models/`
2. Symlink or copy to `public/models/` (Vite serves from `public/`)
3. Add entry to `ASSET_MAP` in `src/ModelLoader.ts`
4. Add mesh names to `regionMap.ts` in the instruction engine
