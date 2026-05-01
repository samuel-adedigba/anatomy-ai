# Anatomy Assets

## Model Registry
All `.glb` / `.gltf` files belong in `engines/anatomy-assets/models/`.
The names here MUST match entries in `apps/web-viewer/src/ModelLoader.ts` → `ASSET_MAP`
and `services/instruction-engine/src/types/regionMap.ts` → `REGION_TO_MESHES`.

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
- All meshes must have named nodes matching REGION_TO_MESHES keys
- Keep each `.glb` under 20MB for acceptable WebView load time on mobile
- TODO: verify — confirm license compatibility before distributing bundled app
