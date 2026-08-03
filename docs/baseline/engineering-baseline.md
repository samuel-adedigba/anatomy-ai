# Engineering baseline

**Recorded:** 3 August 2026

| Application | Check | Result |
| --- | --- | --- |
| Instruction engine | `pnpm test` | Pass: 16 tests |
| Web viewer | `pnpm type-check` | Pass |
| Web viewer | `pnpm test` | Pass: 14 tests, including timeline controls, reduced motion, runtime supersession, morph cleanup, and progress throttling |
| Web viewer | `pnpm build` | Pass; lazy bootstrap, engine, and Three.js vendor chunks; no chunk warning |
| API gateway | `pnpm build` | Pass |
| Mobile app | `pnpm exec jest --watchAll=false --runInBand` | Pass: 39 tests, including embedded scene progress, fallback messages, and persistent accessibility preferences |
| Mobile app | `pnpm type-check` | Pass |
| Asset inventory | `node scripts/anatomy/inspect-assets.mjs --markdown --check-ledger` | Pass; legacy capability warnings recorded |
| Heart manifest | `node scripts/anatomy/validate-asset-manifest.mjs --manifest engines/anatomy-assets/manifests/heart.educational.v1.json` | Pass |
| Full integration | `./scripts/test-integration.sh` | Not run; requires all local services, Ollama models, and indexed knowledge |

## Reference environments

- Desktop browser: pending engineering selection.
- Android device: pending engineering selection.

## Gate status

The code and local-test portions of the Phase 0–3 gates are reproducible. Phase 0 remains
open until reference environments and distribution/licence decisions are recorded. Phase 2
remains open until qualified medical review, Android visual verification, and final
attribution/distribution packaging are recorded. Phase 3 performance budgets remain open
until measured on the selected Android device and desktop browser.
