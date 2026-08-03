# Anatomy asset inventory

**Recorded:** 3 August 2026
**Command:** `node scripts/anatomy/inspect-assets.mjs --markdown --check-ledger`

| Asset | Size | Nodes / meshes | Primitives | Clips | Morph targets | Skins | Semantic nodes | Node names |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `brain.glb` | 4.68 MB | 1 / 1 | 64 | 0 | 0 | 0 | n/a | `FJ1842` |
| `circulatory.glb` | 34.44 MB | 1 / 1 | 1,022 | 0 | 0 | 0 | 0/2 | `FJ3659` |
| `digestive.glb` | 4.54 MB | 1 / 1 | 76 | 0 | 0 | 0 | n/a | `FJ3534` |
| `full_body.glb` | 140.89 MB | 2,234 / 2,234 | 2,234 | 0 | 0 | 0 | n/a | `FJ…` |
| `heart.educational.v1.glb` | 1.73 MB | 103 / 49 | 49 | 1 | 19 | 0 | 13/13 | stable semantic targets |
| `heart.glb` | 1.17 MB | 1 / 1 | 3 | 0 | 0 | 0 | 0/13 | `FJ2439` |
| `muscular.glb` | 55.95 MB | 1 / 1 | 411 | 0 | 0 | 0 | n/a | `FJ3131` |
| `nervous_system.glb` | 0.97 MB | 1 / 1 | 40 | 0 | 0 | 0 | n/a | `FJ1820` |
| `respiratory.glb` | 1.42 MB | 1 / 1 | 103 | 0 | 0 | 0 | n/a | `FJ3418` |
| `skeleton.glb` | 10.02 MB | 1 / 1 | 211 | 0 | 0 | 0 | n/a | `FJ3395` |
| `spine.glb` | 10.04 MB | 1 / 1 | 142 | 0 | 0 | 0 | n/a | `FJ3224` |

## Findings

- `heart.educational.v1.glb` is the approved cardiovascular development asset. Its 13
  required semantic targets resolve, it contains one cardiac-cycle clip and 19 morph
  targets, and it is below the provisional 20 MB mobile budget.
- The legacy `heart.glb` and `circulatory.glb` do not contain the semantic targets required
  by the cardiovascular scene and must not be used for the reviewed heart process.
- The legacy GLBs have no authored animation clips, morph targets, or skins.
- `circulatory.glb`, `full_body.glb`, and `muscular.glb` exceed the provisional 20 MB mobile
  payload budget.
- The inventory command verifies that every current GLB has a licence-ledger record and
  reports capability warnings. Use `--strict` during asset-pipeline work when warnings must
  fail the gate.
- Complete names and SHA-256 checksums remain reproducible with
  `node scripts/anatomy/inspect-assets.mjs --json`.

These findings block realistic motion for legacy assets. Renderer code must not substitute
whole-mesh scaling or emissive pulsing and describe it as realistic motion.
