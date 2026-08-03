import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * SceneManager owns the Three.js scene, camera, renderer, and animation loop.
 * All other modules receive a reference to this — they never create their own scene.
 */
export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  private animationId = 0;
  private updateCallbacks: Array<(delta: number) => void> = [];
  private renderCallbacks: Array<() => void> = [];
  private clock = new THREE.Clock();
  private resizeObserver?: ResizeObserver;
  private readonly resizeHandler: () => void;
  private readonly visibilityHandler: () => void;
  private readonly controlsStartHandler: () => void;
  private readonly controlsEndHandler: () => void;
  private readonly controlsChangeHandler: () => void;
  private running = false;
  private continuousRendering = false;
  private needsRender = true;

  constructor(container: HTMLElement) {
    const { width, height } = this._getViewportSize(container);

    // ─── Scene ────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04090e);

    // ─── Camera ───────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(
      50,
      width / height,
      0.1,
      100
    );
    this.camera.position.set(0, 1.5, 4);

    // ─── Renderer ─────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.domElement.style.touchAction = "none";
    container.appendChild(this.renderer.domElement);

    // ─── Controls ─────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = true;
    this.controls.enableRotate = true;
    this.controls.enableZoom = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.7;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // ─── Lighting ─────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 5, 3);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-3, 2, -4);
    this.scene.add(fillLight);

    // ─── Resize handler ───────────────────────────────────────────
    this.resizeHandler = () => this._onResize(container);
    this.visibilityHandler = () => {
      if (!document.hidden) {
        this.clock.start();
        this.requestRender();
      }
    };
    this.controlsStartHandler = () => this.setContinuousRendering(true);
    this.controlsEndHandler = () => {
      this.setContinuousRendering(false);
      this.requestRender();
    };
    this.controlsChangeHandler = () => this.requestRender();

    window.addEventListener("resize", this.resizeHandler);
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.controls.addEventListener("start", this.controlsStartHandler);
    this.controls.addEventListener("end", this.controlsEndHandler);
    this.controls.addEventListener("change", this.controlsChangeHandler);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this._onResize(container));
      this.resizeObserver.observe(container);
    }
    this._onResize(container);
  }

  /** Register a callback to run every animation frame. */
  addUpdateCallback(fn: (delta: number) => void): void {
    this.updateCallbacks.push(fn);
  }

  /** Register a callback that runs after the WebGL scene has rendered. */
  addRenderCallback(fn: () => void): void {
    this.renderCallbacks.push(fn);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this._scheduleFrame();
  }

  setContinuousRendering(enabled: boolean): void {
    this.continuousRendering = enabled;
    if (enabled) this._scheduleFrame();
  }

  requestRender(): void {
    this.needsRender = true;
    this._scheduleFrame();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    this.animationId = 0;
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.resizeHandler);
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.controls.removeEventListener("start", this.controlsStartHandler);
    this.controls.removeEventListener("end", this.controlsEndHandler);
    this.controls.removeEventListener("change", this.controlsChangeHandler);
  }

  private _scheduleFrame(): void {
    if (
      !this.running ||
      document.hidden ||
      (!this.continuousRendering && !this.needsRender) ||
      this.animationId !== 0
    ) {
      return;
    }

    this.animationId = requestAnimationFrame(() => {
      this.animationId = 0;
      if (!this.running || document.hidden) return;
      if (!this.continuousRendering && !this.needsRender) return;

      this.needsRender = false;
      const delta = this.clock.getDelta();
      this.updateCallbacks.forEach((fn) => fn(delta));
      const controlsChanged = this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.renderCallbacks.forEach((fn) => fn());
      if (controlsChanged) this.needsRender = true;
      this._scheduleFrame();
    });
  }

  private _onResize(container: HTMLElement): void {
    const { width, height } = this._getViewportSize(container);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.requestRender();
  }

  private _getViewportSize(container: HTMLElement): { width: number; height: number } {
    return {
      width: Math.max(container.clientWidth, 1),
      height: Math.max(container.clientHeight, 1),
    };
  }
}
