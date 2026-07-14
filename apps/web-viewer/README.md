# Anatomy AI — Web Viewer

Three.js-based 3D anatomy viewer. Runs in a browser for development and inside an Expo React Native WebView in production.

---

## Quick start

```bash
cd apps/web-viewer
pnpm install
pnpm dev          # http://localhost:5173
```

---

## Asset setup (required before first run)

The viewer loads GLB anatomy models from `/models/*.glb`. These files live in `engines/anatomy-assets/models/` at the monorepo root. Vite's `publicDir` is set to `../../engines/anatomy-assets` so they are served automatically when you run from the monorepo.

**Expected model paths (relative to publicDir):**

```
models/full_body.glb
models/skeleton.glb
models/muscular.glb
models/nervous_system.glb
models/circulatory.glb
models/respiratory.glb
models/digestive.glb
models/brain.glb
models/heart.glb
models/spine.glb
```

**Missing models:** If a model file is missing, the viewer falls back to a placeholder silhouette. No crash occurs, but the `viewer_error` message is posted to the host.

**Standalone development (outside monorepo):**

```bash
mkdir -p apps/web-viewer/public/models
# copy your .glb files here, then change vite.config.ts publicDir to "public"
```

---

## Visual command API

The viewer accepts `VisualCommand` objects via `postMessage`. From React Native:

```ts
webViewRef.current.postMessage(JSON.stringify({
  focus_region: "heart",
  view_mode:    "heart",
  highlight:    ["Heart_Mesh", "Left_Ventricle"],
  animation:    "pulse",
  camera:       "zoom_in",
  confidence:   0.85,
}));
```

From the browser console:

```js
window.executeCommand({
  focus_region: "brain",
  view_mode:    "brain",
  highlight:    ["Brain_Mesh", "Cerebrum"],
  animation:    "wave",
  camera:       "reset",
  confidence:   1.0,
});
```

### VisualCommand type

| Field          | Type            | Required | Notes                                        |
|----------------|-----------------|----------|----------------------------------------------|
| `focus_region` | `string`        | ✅       | Anatomical region name                       |
| `view_mode`    | `ViewMode`      | ✅       | Body system to load                          |
| `highlight`    | `string[]`      | ✅       | GLTF mesh node names to highlight            |
| `animation`    | `AnimationType` | ✅       | Animation to apply to highlighted meshes     |
| `camera`       | `CameraAction`  | ❌       | Camera movement to execute                   |
| `opacity`      | `number`        | ❌       | Opacity of non-highlighted meshes (0–1)      |
| `confidence`   | `number`        | ✅       | Below 0.4: highlights and animation are skipped |

### Valid ViewMode values

`full_body` · `skeleton` · `muscular` · `nervous_system` · `circulatory` · `respiratory` · `digestive` · `brain` · `heart` · `spine`

### Valid AnimationType values

`none` · `pulse` · `wave` · `flow` · `highlight_flash` · `expand` · `contract`

### Valid CameraAction values

`reset` · `zoom_in` · `zoom_out` · `rotate_left` · `rotate_right` · `front` · `back` · `top`

---

## Viewer → Mobile message protocol

The viewer sends JSON messages back to the React Native host:

```ts
type ViewerToMobileMessage =
  | { type: "viewer_ready" }
  | { type: "model_loading"; view_mode: ViewMode }
  | { type: "model_loaded";  view_mode: ViewMode }
  | { type: "viewer_error";  message: string; view_mode?: ViewMode }
  | { type: "command_complete"; view_mode: ViewMode };
```

Listen in React Native:

```tsx
<WebView
  onMessage={(event) => {
    const msg = JSON.parse(event.nativeEvent.data);
    if (msg.type === "viewer_ready") { /* viewer bootstrapped */ }
    if (msg.type === "model_loaded") { /* hide loading state */ }
  }}
/>
```

---

## Adding anatomy models

1. Place the `.glb` file in `engines/anatomy-assets/models/`.
2. Add an entry to `engines/anatomy-assets/manifests/asset-registry.md`.
3. Add the `ViewMode` key to `apps/web-viewer/src/types.ts` and `apps/mobile-app/types/viewer.ts`.
4. Add GLTF mesh node names to `services/instruction-engine/src/types/regionMap.ts`.
5. Add an entry to `apps/mobile-app/constants/anatomy.ts`.

**Important:** Mesh node names in the `.glb` file must exactly match the strings used in `highlight[]` arrays. Inspect node names with `gltf-transform inspect file.glb` or Blender.

**Size guidance:** Keep each `.glb` under 20 MB for acceptable WebView load times on mobile. Files above this threshold (`full_body.glb` at 141 MB, `muscular.glb` at 56 MB, `circulatory.glb` at 35 MB) should be optimised using `gltf-transform optimize` or Draco compression before production distribution.

---

## Build

```bash
pnpm build    # outputs to dist/
pnpm preview  # serve the dist/ build locally
```

The built `dist/` directory can be deployed to any static host. The WebView URL is configured in the mobile app via `EXPO_PUBLIC_VIEWER_URL`.

---

## TypeScript check

```bash
pnpm tsc --noEmit
```

---

## Known limitations

- `skeleton.glb` and `spine.glb` are missing from the current asset set. The viewer falls back to a placeholder.
- `full_body.glb` (141 MB) and `muscular.glb` (56 MB) exceed the 20 MB mobile guidance. Optimise before production.
- `engines/anatomy-assets/models/isa_element_parts.txt` and `isa_parts_list_e.txt` are stray BodyParts3D metadata files that should be removed from the served directory.
- The viewer does not perform `event.origin` validation on incoming `postMessage` events. This is acceptable for a local WebView bridge but should be reviewed before any web-hosted deployment.
- License compatibility of bundled GLB assets must be verified before distributing a production app. See `engines/anatomy-assets/manifests/asset-registry.md` TODO note.
