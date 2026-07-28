# Anatomy asset inventory

**Recorded:** 25 July 2026  
**Command:** `node scripts/anatomy/inspect-assets.mjs --markdown --check-ledger`

| Asset | Size | Nodes / meshes | Primitives | Clips | Morph targets | Skins | Node names |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `brain.glb` | 4.68 MB | 1 / 1 | 64 | 0 | 0 | 0 | `FJ1842` |
| `circulatory.glb` | 34.44 MB | 1 / 1 | 1,022 | 0 | 0 | 0 | `FJ3659` |
| `digestive.glb` | 4.54 MB | 1 / 1 | 76 | 0 | 0 | 0 | `FJ3534` |
| `full_body.glb` | 140.89 MB | 2,234 / 2,234 | 2,234 | 0 | 0 | 0 | 2,234 `FJ…` names |
| `heart.glb` | 1.17 MB | 1 / 1 | 3 | 0 | 0 | 0 | `FJ2439` |
| `muscular.glb` | 55.95 MB | 1 / 1 | 411 | 0 | 0 | 0 | `FJ3131` |
| `nervous_system.glb` | 0.97 MB | 1 / 1 | 40 | 0 | 0 | 0 | `FJ1820` |
| `respiratory.glb` | 1.42 MB | 1 / 1 | 103 | 0 | 0 | 0 | `FJ3418` |
| `skeleton.glb` | 10.02 MB | 1 / 1 | 211 | 0 | 0 | 0 | `FJ3395` |
| `spine.glb` | 10.04 MB | 1 / 1 | 142 | 0 | 0 | 0 | `FJ3224` |

## Findings

- None of the current GLBs contains animation clips, morph targets, or skins.
- `heart.glb` exposes only `FJ2439`; chamber, valve, and vessel targets cannot resolve.
- `circulatory.glb` exposes only `FJ3659`; reviewed flow routes cannot resolve.
- The inspection command now checks all current GLBs have a licence-ledger record and reports
  required cardiovascular semantic-node coverage. Use `--strict` to make capability warnings
  fail the command during asset-pipeline work.
- `circulatory.glb`, `full_body.glb`, and `muscular.glb` exceed the provisional 20 MB mobile
  payload budget.
- Complete names and SHA-256 checksums remain reproducible with
  `node scripts/anatomy/inspect-assets.mjs --json`.

These findings block realistic chamber contraction and directional circulation. Renderer code
must not substitute whole-mesh scaling or emissive pulsing and describe it as realistic motion.
