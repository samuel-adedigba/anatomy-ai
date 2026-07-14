import * as THREE from "three";
import { ModelLoader } from "./ModelLoader";

const HIGHLIGHT_COLOR = new THREE.Color(0x00e5ff);   // cyan — medical feel
const DEFAULT_COLOR   = new THREE.Color(0xcccccc);
const DIMMED_OPACITY  = 0.15;

/**
 * Highlighter manages visual focus:
 * - Highlights named meshes with the accent color
 * - Dims all other meshes to reduce visual noise
 * - Restores all meshes on clear()
 */
export class Highlighter {
  private loader: ModelLoader;
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  constructor(loader: ModelLoader) {
    this.loader = loader;
  }

  /**
   * Apply highlight to meshes by name. Dims everything else.
   * @param meshNames - list matching GLTF mesh names from regionMap
   * @param opacity - dimming level for non-highlighted meshes (default 0.15)
   */
  highlight(meshNames: string[], opacity: number = DIMMED_OPACITY): void {
    this.clear();

    const allMeshes = this.loader.getAllMeshes();

    for (const mesh of allMeshes) {
      // Save original material before modifying
      this.originalMaterials.set(mesh, mesh.material);

      const isTarget = meshNames.includes(mesh.name);

      if (isTarget) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: HIGHLIGHT_COLOR,
          emissive: HIGHLIGHT_COLOR,
          emissiveIntensity: 0.3,
          transparent: false,
        });
      } else {
        const dimmed = new THREE.MeshStandardMaterial({
          color: DEFAULT_COLOR,
          transparent: true,
          opacity,
        });
        mesh.material = dimmed;
      }
    }
  }

  /** Restore all meshes to their original materials. */
  clear(): void {
    for (const [mesh, material] of this.originalMaterials.entries()) {
      mesh.material = material;
    }
    this.originalMaterials.clear();
  }
}
