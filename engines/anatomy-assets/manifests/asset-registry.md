# Anatomy Assets

## Model Registry
All `.glb` / `.gltf` files belong in `engines/anatomy-assets/models/`.
Current filenames must match `apps/web-viewer/src/ModelLoader.ts` → `ASSET_MAP`.
Production scene plans use semantic targets from
`configs/visual-scene/capability-registry.json`; an approved versioned asset manifest resolves
those targets to real GLB nodes.

| File | View Mode Key | Source |
|------|--------------|--------|
| full_body.glb | full_body | BodyParts3D / Z-Anatomy |
| skeleton.glb | skeleton | BodyParts3D |
| muscular.glb | muscular | BodyParts3D |
| nervous_system.glb | nervous_system | BodyParts3D |
| circulatory.glb | circulatory | BodyParts3D |
| respiratory.glb | respiratory | BodyParts3D |
| digestive.glb | digestive | BodyParts3D |
| brain.glb | brain | Visible Human Project / BodyParts3D |
| heart.glb | heart | BodyParts3D |
| spine.glb | spine | BodyParts3D |

## Recommended Sources
- **BodyParts3D** — https://lifesciencedb.jp/bp3d/ (CC BY-SA 2.1 JP)
- **Z-Anatomy** — https://www.z-anatomy.com/ (CC BY-SA 4.0)
- **Visible Human Project** — https://www.nlm.nih.gov/research/visible/ (Public domain datasets)
- **3D Slicer** — can export segmented anatomy as GLTF

## Notes
- Models are canonical adult anatomy — do not imply patient-specific accuracy
- Do not add new production logic that depends on provider names such as `FJ2439`
- Keep each `.glb` under 20MB for acceptable WebView load time on mobile
- Run `node scripts/anatomy/inspect-assets.mjs --markdown --check-ledger` after every asset
  change
- Distribution is blocked until `asset-licence-ledger.md` records an approval
