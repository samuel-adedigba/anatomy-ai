# Heart animation physiology audit

**Audit date:** 3 August 2026  
**Asset:** `heart.educational.v1.glb`  
**Status:** Approved for the current development build; educational simplifications remain disclosed

## Evidence baseline

- [American Heart Association: healthy heart flow](https://www.heart.org/en/health-topics/congenital-heart-defects/about-congenital-heart-defects/how-the-healthy-heart-works)
  establishes body → right heart → lungs → left heart → body and the four valve crossings.
- [NCBI Bookshelf: cardiac cycle physiology](https://www.ncbi.nlm.nih.gov/books/NBK459327/)
  establishes atrial-before-ventricular contraction and pressure-dependent valve phases.
- [Visualizing the Cardiac Cycle](https://pmc.ncbi.nlm.nih.gov/articles/PMC3577223/)
  provides the educational 75 bpm, 0.8-second cycle and approximate phase timing.
- [Strain Echocardiography and Myocardial Mechanics](https://pmc.ncbi.nlm.nih.gov/articles/PMC5353453/)
  establishes longitudinal, circumferential, radial, and shear deformation.
- [Speckle-tracking echocardiography](https://pmc.ncbi.nlm.nih.gov/articles/PMC3860973/)
  describes opposing apical/basal rotation and ventricular wringing motion.

## Re-audit

| Requirement | Result | Evidence in the asset |
| --- | --- | --- |
| Normal resting timing | Pass | One `CardiacCycle`, 0.8 seconds, 75 bpm |
| Atria before ventricles | Pass | Atrial peak at frame 6; ventricular peak at frame 14 at 30 fps |
| Left/right synchronization | Pass | Both atria and both ventricles share phase keys |
| Ventricular shortening | Pass as educational approximation | LV 14% and RV 10% longitudinal target shortening |
| Circumferential/radial deformation | Pass as educational approximation | Separate LV and RV radial deformation targets |
| Ventricular twist | Pass as educational approximation | Z-dependent LV 8° and RV 4° twist morphs |
| AV valve phase | Pass as educational approximation | Mitral/tricuspid use hinge-articulated leaflet morphs, close by frame 7, remain closed through frame 19, and reopen at frame 20 |
| Semilunar valve phase | Pass as educational approximation | Aortic/pulmonary leaflets remain closed through frame 9, open for ejection, and close by frame 17 |
| Isovolumetric intervals | Pass | Both valve sets are closed between AV closure and semilunar opening, and again between semilunar closure and AV opening; the exporter rejects overlap |
| Valve leaflet count | Conditional | Aortic 3, pulmonary 3, mitral 2, tricuspid 3; two source-derived leaflets remain review-pending |
| Complete circulation order | Pass | Six paths include both atrium-to-ventricle valve crossings |
| Oxygenation state | Pass | Blue convention for oxygen-poor paths; red convention for oxygen-rich paths |
| Direction visibility | Pass | Forward metadata, runtime-readable Y-up centerlines, and arrowheads on every path segment |
| Real fluid dynamics | Not claimed | Phase 3 particles will traverse reviewed paths; no CFD claim is made |
| Performance | Pass | 1.82 MB, 103 nodes, 49 meshes/primitives, no Draco requirement |

## Claim boundary

The candidate may be described as a **research-aligned educational cardiac motion** after a
qualified reviewer accepts the deformation and the two derived valve leaflets. It must not be
described as patient-specific, diagnostic, CFD-based, quantitatively predictive, or a perfect
replica of living myocardial mechanics.

The automated and visual checks establish timing, ordering, target availability, deformation
continuity, and flow semantics. They cannot replace review by a cardiologist, cardiac
physiologist, anatomist, or qualified medical-animation reviewer.
