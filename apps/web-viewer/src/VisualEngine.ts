import * as THREE from "three";
import { SceneManager } from "./SceneManager";
import { ModelLoader } from "./ModelLoader";
import { Highlighter } from "./Highlighter";
import { Animator } from "./Animator";
import { CameraController } from "./CameraController";
import { ViewMode, VisualCommand } from "./types";

/**
 * VisualEngine is the top-level orchestrator.
 * It owns all subsystems and exposes one public method: executeCommand().
 *
 * Flow:
 *   VisualCommand → load model → highlight meshes → trigger animation → move camera
 */
export class VisualEngine {
  private scene: SceneManager;
  private loader: ModelLoader;
  private highlighter: Highlighter;
  private animator: Animator;
  private camera: CameraController;
  private currentModel: THREE.Group | null = null;
  private currentViewMode: ViewMode | null = null;
  private commandId = 0;

  constructor(container: HTMLElement) {
    this.scene = new SceneManager(container);
    this.loader = new ModelLoader(this.scene.scene);
    this.highlighter = new Highlighter(this.loader);
    this.animator = new Animator(this.loader);
    this.camera = new CameraController(this.scene.camera, this.scene.controls);

    // Wire animator into the scene update loop
    this.scene.addUpdateCallback((delta) => this.animator.update(delta));
    this.scene.start();
  }

  /**
   * Primary entry point. Called whenever a new VisualCommand arrives.
   * Low confidence commands fall back to full_body mode without highlight.
   */
  async executeCommand(command: VisualCommand): Promise<void> {
    const commandId = ++this.commandId;
    const { view_mode, highlight, animation, camera, opacity, confidence } = command;
    const shouldLoadModel = this.currentModel === null || this.currentViewMode !== view_mode;
    const shouldFrameModel = shouldLoadModel || camera === "reset";

    // ─── Load the correct body system model ───────────────────────
    if (shouldLoadModel) {
      const model = await this.loader.load(view_mode);
      if (commandId !== this.commandId) return;

      this.currentModel = model;
      this.currentViewMode = view_mode;
      this._normalizeModel(model);
    }

    if (this.currentModel && shouldFrameModel) {
      this.camera.frameObject(this.currentModel);
    }

    // ─── Apply highlight or clear if low confidence ────────────────
    if (confidence >= 0.4 && highlight.length > 0) {
      this.highlighter.highlight(highlight, opacity ?? 0.15);
    } else {
      this.highlighter.clear();
    }

    // ─── Trigger animation on highlighted meshes ──────────────────
    if (confidence >= 0.4 && animation !== "none") {
      this.animator.set(animation, highlight);
    } else {
      this.animator.stop();
    }

    // ─── Execute camera movement ──────────────────────────────────
    this.camera.execute(camera);
  }

  /** Reset to default state. */
  async reset(): Promise<void> {
    await this.executeCommand({
      focus_region: "full_body",
      view_mode: "full_body",
      highlight: [],
      animation: "none",
      camera: "reset",
      confidence: 1.0,
    });
  }

  private _normalizeModel(model: THREE.Group): void {
    this._restoreOriginalTransform(model);

    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    box.getSize(size);

    if (this._looksZUp(size)) {
      model.rotation.x = -Math.PI / 2;
    }

    const centeredBox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    centeredBox.getCenter(center);
    model.position.sub(center);
  }

  private _restoreOriginalTransform(model: THREE.Group): void {
    if (!model.userData["originalTransform"]) {
      model.userData["originalTransform"] = {
        position: model.position.clone(),
        rotation: model.rotation.clone(),
        scale: model.scale.clone(),
      };
    }

    const original = model.userData["originalTransform"] as {
      position: THREE.Vector3;
      rotation: THREE.Euler;
      scale: THREE.Vector3;
    };
    model.position.copy(original.position);
    model.rotation.copy(original.rotation);
    model.scale.copy(original.scale);
  }

  private _looksZUp(size: THREE.Vector3): boolean {
    return size.z > size.y * 1.2 && size.z >= size.x;
  }
}
