# Engineering baseline

**Recorded:** 25 July 2026

| Application | Check | Result |
| --- | --- | --- |
| Instruction engine | `pnpm test` | Pass: 3 tests |
| Web viewer | `pnpm build` | Pass; existing bundle-size warning at 604.33 kB |
| API gateway | `pnpm build` | Pass |
| Mobile app | `pnpm test && pnpm type-check` | Pass: 35 tests and TypeScript |
| Full integration | `./scripts/test-integration.sh` | Not run; requires all local services, Ollama models, and indexed knowledge |

## Reference environments

- Desktop browser: pending engineering selection.
- Android device: pending engineering selection.

Performance budgets in Phase 3 remain provisional until both reference environments are
recorded. This does not block contract work, but it blocks Phase 0 exit.
