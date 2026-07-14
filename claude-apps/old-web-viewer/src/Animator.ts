import * as THREE from "three";
import { AnimationType } from "./types";
import { ModelLoader } from "./ModelLoader";

/**
 * Animator drives per-frame animation on named meshes.
 * Called from the SceneManager update loop with delta time.
 *
 * Each AnimationType maps to a pure mesh transform/material change.
 * No physics — lightweight enough for CPU-only targets.
 */
export class Animator {
  private loader: ModelLoader;
  private activeAnimation: AnimationType = "none";
  private targetMeshes: THREE.Mesh[] = [];
  private elapsed = 0;

  constructor(loader: ModelLoader) {
    this.loader = loader;
  }

  /** Set animation type and target meshes. Called when a new command arrives. */
  set(animation: AnimationType, meshNames: string[]): void {
    this.activeAnimation = animation;
    this.elapsed = 0;
    this.targetMeshes = meshNames
      .map((name) => this.loader.getMeshByName(name))
      .filter((m): m is THREE.Mesh => m !== null);
  }

  stop(): void {
    this.activeAnimation = "none";
    this.targetMeshes = [];
    this.elapsed = 0;
  }

  /** Called every frame by SceneManager. */
  update(delta: number): void {
    if (this.activeAnimation === "none" || this.targetMeshes.length === 0) return;
    this.elapsed += delta;

    switch (this.activeAnimation) {
      case "pulse":
        this._animatePulse();
        break;
      case "wave":
        this._animateWave();
        break;
      case "flow":
        this._animateFlow();
        break;
      case "highlight_flash":
        this._animateFlash();
        break;
      case "expand":
        this._animateScale(1.0, 1.08);
        break;
      case "contract":
        this._animateScale(1.08, 1.0);
        break;
    }
  }

  // ─── Animation implementations ─────────────────────────────────

  private _animatePulse(): void {
    // Emissive intensity oscillates — simulates biological pulsing
    const intensity = 0.2 + Math.sin(this.elapsed * 3) * 0.2;
    for (const mesh of this.targetMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = intensity;
      }
    }
  }

  private _animateWave(): void {
    // Y-axis position oscillates slightly
    const offset = Math.sin(this.elapsed * 2) * 0.02;
    for (const mesh of this.targetMeshes) {
      mesh.position.y = mesh.userData["baseY"] ?? 0 + offset;
    }
  }

  private _animateFlow(): void {
    // Opacity cycles — simulates fluid/blood flow
    const opacity = 0.5 + Math.sin(this.elapsed * 4) * 0.4;
    for (const mesh of this.targetMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.transparent) mat.opacity = Math.max(0.1, opacity);
    }
  }

  private _animateFlash(): void {
    // Rapid emissive flash — draws attention to region
    const intensity = this.elapsed % 0.5 < 0.25 ? 0.6 : 0.1;
    for (const mesh of this.targetMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = intensity;
    }
  }

  private _animateScale(from: number, to: number): void {
    const t = Math.min(this.elapsed * 2, 1);
    const scale = from + (to - from) * t;
    for (const mesh of this.targetMeshes) {
      mesh.scale.setScalar(scale);
    }
  }
}
