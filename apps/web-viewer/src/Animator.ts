import * as THREE from "three";
import { AnimationType } from "./types";
import { ModelLoader } from "./ModelLoader";

type AnimState = {
  type:    AnimationType;
  meshes:  THREE.Mesh[];
  elapsed: number;
};

const PULSE_SPEED = 2.0;
const WAVE_SPEED  = 1.5;
const FLOW_SPEED  = 1.2;
const FLASH_SPEED = 4.0;
const EXPAND_SPEED = 1.2;

/**
 * Animator — drives frame-level animations on highlighted meshes.
 *
 * Bug fix (was in original): _animateWave previously did:
 *   mesh.position.y = mesh.userData["baseY"] ?? 0 + offset  // wrong precedence
 * Fixed to:
 *   mesh.position.y = (mesh.userData["baseY"] ?? 0) + offset // correct
 */
export class Animator {
  private loader:    ModelLoader;
  private current:   AnimState | null = null;
  private originals: Map<THREE.Mesh, { color: THREE.Color; emissive: THREE.Color }> = new Map();

  constructor(loader: ModelLoader) {
    this.loader = loader;
  }

  set(type: AnimationType, meshNames: string[]): void {
    this.stop();
    if (type === "none" || meshNames.length === 0) return;

    const meshes = meshNames
      .map((name) => this.loader.getMeshByName(name))
      .filter((m): m is THREE.Mesh => m !== null);

    if (meshes.length === 0) return;

    this._saveOriginals(meshes);
    this.current = { type, meshes, elapsed: 0 };
  }

  stop(): void {
    if (!this.current) return;
    this._restoreOriginals(this.current.meshes);
    this.current = null;
    this.originals.clear();
  }

  update(delta: number): void {
    if (!this.current) return;
    this.current.elapsed += delta;
    const t = this.current.elapsed;

    switch (this.current.type) {
      case "pulse":          this._animatePulse(t);          break;
      case "wave":           this._animateWave(t);           break;
      case "flow":           this._animateFlow(t);           break;
      case "highlight_flash":this._animateFlash(t);          break;
      case "expand":         this._animateExpand(t);         break;
      case "contract":       this._animateContract(t);       break;
    }
  }

  // ─── Animations ──────────────────────────────────────────────────────────

  private _animatePulse(t: number): void {
    const scale = 1.0 + 0.04 * Math.sin(t * PULSE_SPEED * Math.PI);
    for (const mesh of this.current!.meshes) {
      mesh.scale.setScalar(scale);
    }
  }

  private _animateWave(t: number): void {
    this.current!.meshes.forEach((mesh, i) => {
      const offset = 0.04 * Math.sin(t * WAVE_SPEED * Math.PI + i * 0.6);
      // FIX: parenthesise the nullish coalescing operand before adding offset
      mesh.position.y = (mesh.userData["baseY"] as number | undefined ?? 0) + offset;
    });
  }

  private _animateFlow(t: number): void {
    const intensity = 0.5 + 0.5 * Math.sin(t * FLOW_SPEED * Math.PI);
    const color = new THREE.Color(0x00d4ff).multiplyScalar(intensity * 0.6);
    for (const mesh of this.current!.meshes) {
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => { if ("emissive" in m) (m as THREE.MeshStandardMaterial).emissive.copy(color); });
      } else if ("emissive" in mat) {
        (mat as THREE.MeshStandardMaterial).emissive.copy(color);
      }
    }
  }

  private _animateFlash(t: number): void {
    const on = Math.sin(t * FLASH_SPEED * Math.PI) > 0;
    const color = new THREE.Color(on ? 0x00d4ff : 0x000000);
    for (const mesh of this.current!.meshes) {
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => { if ("emissive" in m) (m as THREE.MeshStandardMaterial).emissive.copy(color); });
      } else if ("emissive" in mat) {
        (mat as THREE.MeshStandardMaterial).emissive.copy(color);
      }
    }
  }

  private _animateExpand(t: number): void {
    const s = 1.0 + 0.06 * Math.abs(Math.sin(t * EXPAND_SPEED * Math.PI));
    for (const mesh of this.current!.meshes) mesh.scale.setScalar(s);
  }

  private _animateContract(t: number): void {
    const s = 1.0 - 0.06 * Math.abs(Math.sin(t * EXPAND_SPEED * Math.PI));
    for (const mesh of this.current!.meshes) mesh.scale.setScalar(Math.max(s, 0.88));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private _saveOriginals(meshes: THREE.Mesh[]): void {
    for (const mesh of meshes) {
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (mat && "color" in mat && "emissive" in mat) {
        const std = mat as THREE.MeshStandardMaterial;
        this.originals.set(mesh, {
          color:    std.color.clone(),
          emissive: std.emissive.clone(),
        });
      }
      // Store base Y for wave animation
      if (!("baseY" in mesh.userData)) {
        mesh.userData["baseY"] = mesh.position.y;
      }
    }
  }

  private _restoreOriginals(meshes: THREE.Mesh[]): void {
    for (const mesh of meshes) {
      const orig = this.originals.get(mesh);
      if (orig) {
        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (mat && "color" in mat && "emissive" in mat) {
          const std = mat as THREE.MeshStandardMaterial;
          std.color.copy(orig.color);
          std.emissive.copy(orig.emissive);
        }
      }
      // Restore Y position disturbed by wave
      if ("baseY" in mesh.userData) {
        mesh.position.y = mesh.userData["baseY"] as number;
      }
      mesh.scale.setScalar(1);
    }
  }
}
