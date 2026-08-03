import * as THREE from "three";
import { SceneManager } from "./SceneManager";
import { ModelLoader } from "./ModelLoader";
import { Highlighter } from "./Highlighter";
import { Animator } from "./Animator";
import { CameraController } from "./CameraController";
import { ScenePlanRuntime, ScenePlaybackProgress } from "./runtime/ScenePlanRuntime";
import { ViewMode, VisualCommand } from "./types";
import { ScenePlan } from "./visual-scene/scenePlan.generated";

export type VisualEngineCallbacks = {
  onModelLoading?: (viewMode: string) => void;
  onModelLoaded?: (viewMode: string) => void;
  onError?: (message: string, viewMode?: string) => void;
  onSceneProgress?: (progress: ScenePlaybackProgress) => void;
  onSceneComplete?: (planId: string) => void;
  onSceneFallback?: (planId: string, message: string) => void;
};

/**
 * VisualEngine is the top-level orchestrator.
 * Flow: VisualCommand → load model → highlight meshes → trigger animation → move camera
 */
export class VisualEngine {
  private scene: SceneManager;
  private loader: ModelLoader;
  private highlighter: Highlighter;
  private animator: Animator;
  private camera: CameraController;
  private sceneRuntime: ScenePlanRuntime;
  private currentModel: THREE.Group | null = null;
  private currentViewMode: ViewMode | null = null;
  private commandId = 0;
  private callbacks: VisualEngineCallbacks;

  constructor(container: HTMLElement, callbacks: VisualEngineCallbacks = {}) {
    this.callbacks = callbacks;
    this.scene = new SceneManager(container);
    this.loader = new ModelLoader(this.scene.scene);
    this.highlighter = new Highlighter(this.loader);
    this.animator = new Animator(this.loader);
    this.camera = new CameraController(this.scene.camera, this.scene.controls);
    this.sceneRuntime = new ScenePlanRuntime(
      this.scene.scene,
      this.scene.camera,
      this.camera,
      container,
      {
        onProgress: (progress) => this.callbacks.onSceneProgress?.(progress),
        onComplete: (planId) => this.callbacks.onSceneComplete?.(planId),
        onError: (message) => this.callbacks.onError?.(message),
      }
    );

    // Wire animator into the scene update loop
    this.scene.addUpdateCallback((delta) => this.animator.update(delta));
    this.scene.addUpdateCallback((delta) => this.sceneRuntime.update(delta));
    this.scene.addRenderCallback(() => this.sceneRuntime.renderOverlay());
    this.scene.start();
  }

  async executeCommand(command: VisualCommand): Promise<void> {
    this.sceneRuntime.stop();
    const commandId = ++this.commandId;
    const { view_mode, highlight, animation, camera, opacity, confidence } = command;
    const shouldLoadModel = this.currentModel === null || this.currentViewMode !== view_mode;
    const shouldFrameModel = shouldLoadModel || camera === "reset";

    // ─── Load the correct body system model ──────────────────────────────────
    if (shouldLoadModel) {
      this.callbacks.onModelLoading?.(view_mode);
      try {
        const model = await this.loader.load(view_mode);
        if (commandId !== this.commandId) return; // superseded by newer command

        this.currentModel = model;
        this.currentViewMode = view_mode;
        this._normalizeModel(model);
        this.callbacks.onModelLoaded?.(view_mode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Model load failed";
        this.callbacks.onError?.(msg, view_mode);
        return;
      }
    }

    if (this.currentModel && shouldFrameModel) {
      this.camera.frameObject(this.currentModel);
    }

    // ─── Highlight or clear ───────────────────────────────────────────────────
    if (confidence >= 0.4 && highlight.length > 0) {
      this.highlighter.highlight(highlight, opacity ?? 0.15);
    } else {
      this.highlighter.clear();
    }

    // ─── Animation ───────────────────────────────────────────────────────────
    if (confidence >= 0.4 && animation !== "none") {
      this.animator.set(animation, highlight);
    } else {
      this.animator.stop();
    }

    // ─── Camera ──────────────────────────────────────────────────────────────
    this.camera.execute(camera);
  }

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

  async executeScenePlan(plan: ScenePlan): Promise<void> {
    const commandId = ++this.commandId;
    this.highlighter.clear();
    this.animator.stop();
    if (this.currentModel) this.scene.scene.remove(this.currentModel);
    this.currentModel = null;
    this.currentViewMode = null;
    const started = await this.sceneRuntime.load(plan);
    if (commandId !== this.commandId) return;
    if (started) return;

    this.callbacks.onSceneFallback?.(plan.plan_id, plan.fallback.message);
    await this.executeCommand({
      focus_region: plan.fallback.view_mode,
      view_mode: plan.fallback.view_mode,
      highlight: [],
      animation: "none",
      camera: "reset",
      confidence: 1,
    });
  }

  playScene(): void {
    this.sceneRuntime.play();
  }

  pauseScene(): void {
    this.sceneRuntime.pause();
  }

  replayScene(): void {
    this.sceneRuntime.replay();
  }

  seekScene(timeMs: number): void {
    this.sceneRuntime.seek(timeMs);
  }

  setSceneSpeed(speed: number): void {
    this.sceneRuntime.setSpeed(speed);
  }

  getSceneProgress(): ScenePlaybackProgress | null {
    return this.sceneRuntime.getProgress();
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
