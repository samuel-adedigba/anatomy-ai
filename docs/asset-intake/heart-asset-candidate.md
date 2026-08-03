# Phase 2 heart asset intake

**Status:** Approved for the current development build by product-owner authorization on 3 August 2026

## Candidate source

- Provider: [Z-Anatomy Models of human anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy)
- Immutable source revision: `c46e965d0bc7f1ce5de205b5a85db8c2c92bf827` (2026-07-27)
- Source archive: `Z-Anatomy.zip` at that revision; declared download size 86,734,957 bytes
- Published licence: CC BY-SA 4.0, subject to attribution and ShareAlike obligations
- Source attribution: BodyParts3D, Z-Anatomy, and any additional upstream contributors named by the selected revision

The Z-Anatomy repository states that its content is distributed under CC BY-SA 4.0 and
identifies BodyParts3D as an upstream model source. The current development build accepts this
asset under the recorded CC BY-SA 4.0 attribution and ShareAlike obligations.

The source transfer and technical preparation are now complete in the ignored working area.
The local zstd-wrapped Blender source is 33,115,736 bytes with SHA-256
`dc4a6c7fedb4968f3785c0ee5ee3bd2684a0f3ae8c6c8636bc2279320e24e887`. The generated
`heart.educational.v1.glb` has been promoted to the served development model directory.

On a clean checkout, acquire the source at the revision above, verify its provenance, and set
`ANATOMY_HEART_SOURCE=/absolute/path/to/heart.educational.v1.blend` when running the preparation
wrapper. The ignored working source is deliberately not distributed with the repository.

## Required Phase 2 evidence

The current development approval records the following asset evidence:

- Exact source URL and immutable revision or archive checksum.
- Distribution model decision (commercial or non-commercial).
- Complete attribution and ShareAlike handling.
- Blender/source working file outside the production bundle.
- Stable semantic mappings for all required chambers, valves, vessels, and flow paths.
- Reviewed cardiac-cycle clip or morph sequence.
- Medical reviewer name, role, date, corrections, and approved simplifications.
- GLB validator result, checksum, and compressed payload size.

## Current blockers

Technical preparation now establishes semantic chamber, valve, vessel, and six directional
flow-path nodes; one 0.8-second `CardiacCycle`; a non-Draco GLB under 20 MB; and an approved
manifest with checksum and simplification disclosures. The following release-hardening items
remain:

- Flow-runtime and Android visual verification.
- Final distribution packaging and attribution presentation.

The existing BodyParts3D metadata does show separately identifiable source structures in the
local full-body export, including `FJ2439`/`FJ2438` for the atrial walls,
`FJ2424`/`FJ2425` for atrial cavities, `FJ2423`/`FJ2422` for ventricular cavities,
and named valve/vessel components. These provider names are intake evidence only; they must
be replaced by stable semantic names in a prepared asset.

Use the Phase 2 gate after a manifest and asset have been prepared:

```bash
node scripts/anatomy/validate-asset-manifest.mjs \
  --manifest engines/anatomy-assets/manifests/heart.educational.v1.json
```

The development approval does not remove the asset's educational simplification notes or its
recorded attribution obligations.
