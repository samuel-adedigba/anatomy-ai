import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export type SceneLabel = {
  id: string;
  text: string;
  target: THREE.Object3D;
};

/** Renders timed semantic labels in a screen-reader-readable overlay. */
export class SceneLabelRenderer {
  private renderer: CSS2DRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private labels = new Map<string, CSS2DObject>();
  private resizeObserver?: ResizeObserver;

  constructor(scene: THREE.Scene, camera: THREE.Camera, container: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = new CSS2DRenderer();
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.inset = "0";
    this.renderer.domElement.style.pointerEvents = "none";
    this.renderer.domElement.style.zIndex = "6";
    container.appendChild(this.renderer.domElement);

    const resize = () => this.renderer.setSize(container.clientWidth, container.clientHeight);
    resize();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(resize);
      this.resizeObserver.observe(container);
    }
  }

  setLabels(labels: SceneLabel[]): void {
    const nextIds = new Set(labels.map((label) => label.id));
    this.labels.forEach((label, id) => {
      if (!nextIds.has(id)) {
        this.scene.remove(label);
        label.element.remove();
        this.labels.delete(id);
      }
    });

    labels.forEach((label) => {
      let screenLabel = this.labels.get(label.id);
      if (!screenLabel) {
        const element = document.createElement("span");
        element.className = "scene-label";
        element.setAttribute("role", "status");
        screenLabel = new CSS2DObject(element);
        this.labels.set(label.id, screenLabel);
        this.scene.add(screenLabel);
      }
      screenLabel.element.textContent = label.text;
      const box = new THREE.Box3().setFromObject(label.target);
      box.getCenter(screenLabel.position);
      screenLabel.position.y += box.getSize(new THREE.Vector3()).y * 0.15;
    });
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  clear(): void {
    this.setLabels([]);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.clear();
    this.renderer.domElement.remove();
  }
}
