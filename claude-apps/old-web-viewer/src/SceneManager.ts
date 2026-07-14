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
  private animationId: number = 0;
  private updateCallbacks: Array<(delta: number) => void> = [];
  private clock = new THREE.Clock();
  private resizeObserver?: ResizeObserver;

  constructor(container: HTMLElement) {
    const { width, height } = this._getViewportSize(container);

    // ─── Scene ────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

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
    this.renderer.setPixelRatio(window.devicePixelRatio);
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
    window.addEventListener("resize", () => this._onResize(container));
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this._onResize(container));
      this.resizeObserver.observe(container);
    }
    requestAnimationFrame(() => this._onResize(container));
  }

  /** Register a callback to run every animation frame. */
  addUpdateCallback(fn: (delta: number) => void): void {
    this.updateCallbacks.push(fn);
  }

  start(): void {
    const loop = () => {
      this.animationId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();
      this.updateCallbacks.forEach((fn) => fn(delta));
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
  }

  private _onResize(container: HTMLElement): void {
    const { width, height } = this._getViewportSize(container);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private _getViewportSize(container: HTMLElement): { width: number; height: number } {
    return {
      width: Math.max(container.clientWidth, window.innerWidth, 1),
      height: Math.max(container.clientHeight, window.innerHeight, 1),
    };
  }
}
