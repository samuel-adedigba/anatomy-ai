# Content correction and rollback

**Owner:** Product and engineering  
**Applies to:** Scene plans, reviewed recipes, anatomy assets, evidence content, and generated contracts

## Release records

Every test build must record the application revision, schema version, capability-registry
version, asset manifest versions and checksums, recipe identifiers, and evidence-set revision.
Known visual and educational limitations must be visible in the interface or the release notes.

## Correcting content

1. Record the affected process, recipe or asset identifier, observed behavior, source revision,
   severity, and the person who reported it. Do not include private question text.
2. Disable automatic selection of the affected recipe when the issue could teach an incorrect
   sequence. Continue to return the written answer and declared static fallback.
3. Correct the authoritative recipe, evidence source, manifest, or asset working file. Do not
   patch generated contracts or production GLBs directly.
4. Increment the applicable recipe, asset, schema, or registry version and regenerate derived
   files.
5. Run contract, runtime, integration, accessibility, and visual checks relevant to the change.
6. Publish the corrected build with a short correction note and retain the superseded release
   record for traceability.

## Rollback

Rollback restores the last release record whose schema, registry, recipe, and asset checksums
were tested together. Never roll back only one member of an incompatible contract set.

- Stop distribution of the affected build.
- Restore the previous application and content bundle as one versioned unit.
- Verify the supported heart question, unsupported fallback, static text path, and ten replays.
- Record the rollback reason, revisions, verification result, and follow-up owner.

## Severity and response

| Severity | Example | Response |
| --- | --- | --- |
| Critical | Incorrect flow direction or unsafe executable renderer input | Disable the affected recipe immediately and roll back. |
| High | Missing required structure, caption contradicts the scene, or repeated crash | Stop distribution and correct before further testing. |
| Medium | A step is difficult to inspect or a non-critical label is unavailable | Record, prioritize, and correct in the next test build. |
| Low | Cosmetic issue that does not change meaning or access | Track for normal maintenance. |

## Privacy and diagnostics

Diagnostics may include request identifiers, plan identifiers, schema versions, validation
codes, timing, and dependency status. Do not log full user questions, retrieved passages, or
answer text by default. Any future telemetry requires a separately approved privacy plan.
