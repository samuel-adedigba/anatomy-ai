import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Asset manifest — maps view_mode keys to GLTF file paths
// Models live in engines/anatomy-assets/models/ and are served statically
const ASSET_MAP: Record<string, string> = {
  full_body: "/models/full_body.glb",
  skeleton: "/models/skeleton.glb",
  muscular: "/models/muscular.glb",
  nervous_system: "/models/nervous_system.glb",
  circulatory: "/models/circulatory.glb",
  respiratory: "/models/respiratory.glb",
  digestive: "/models/digestive.glb",
  brain: "/models/brain.glb",
  heart: "/models/heart.glb",
  spine: "/models/spine.glb",
};

export class ModelLoader {
  private loader = new GLTFLoader();
  private cache = new Map<string, THREE.Group>();
  private scene: THREE.Scene;
  private currentModel: THREE.Group | null = null;
  private activeRequestId = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Load a model by view_mode key. Caches after first load.
   * Removes the current model before adding the new one.
   */
  async load(viewMode: string): Promise<THREE.Group> {
    const path = ASSET_MAP[viewMode] ?? ASSET_MAP["full_body"];
    const requestId = ++this.activeRequestId;

    // Return from cache if already loaded
    if (this.cache.has(path)) {
      const model = this.cache.get(path)!;
      this._swap(model);
      return model;
    }

    return new Promise((resolve) => {
      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          let meshCount = 0;
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              meshCount += 1;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          console.info(`[ModelLoader] Loaded ${path} with ${meshCount} meshes.`);
          this.cache.set(path, model);
          if (requestId === this.activeRequestId) {
            this._swap(model);
          }
          resolve(model);
        },
        undefined,
        (err) => {
          console.warn(`[ModelLoader] Failed to load ${path}. Using placeholder model.`, err);
          const placeholder = this._createPlaceholderModel(viewMode);
          this.cache.set(path, placeholder);
          if (requestId === this.activeRequestId) {
            this._swap(placeholder);
          }
          resolve(placeholder);
        }
      );
    });
  }

  /** Returns a mesh by name from the current model (for highlighting). */
  getMeshByName(name: string): THREE.Mesh | null {
    if (!this.currentModel) return null;
    let found: THREE.Mesh | null = null;
    this.currentModel.traverse((child) => {
      if (child.name === name && (child as THREE.Mesh).isMesh) {
        found = child as THREE.Mesh;
      }
    });
    return found;
  }

  /** Returns all meshes in the current model. */
  getAllMeshes(): THREE.Mesh[] {
    if (!this.currentModel) return [];
    const meshes: THREE.Mesh[] = [];
    this.currentModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });
    return meshes;
  }

  private _swap(model: THREE.Group): void {
    if (this.currentModel) this.scene.remove(this.currentModel);
    this.scene.add(model);
    this.currentModel = model;
  }

  private _createPlaceholderModel(viewMode: string): THREE.Group {
    // Simple, readable human-like silhouette for development/testing
    const group = new THREE.Group();
    group.name = `placeholder_${viewMode}`;

    const baseColor = new THREE.Color(0x6fb1ff);
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.6,
      metalness: 0.1,
    });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), material.clone());
    head.name = "head";
    head.position.set(0, 1.75, 0);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 6, 12), material.clone());
    torso.name = "torso";
    torso.position.set(0, 1.15, 0);

    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16), material.clone());
    leftArm.name = "left_arm";
    leftArm.position.set(-0.45, 1.2, 0);
    leftArm.rotation.z = Math.PI / 12;

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16), material.clone());
    rightArm.name = "right_arm";
    rightArm.position.set(0.45, 1.2, 0);
    rightArm.rotation.z = -Math.PI / 12;

    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), material.clone());
    leftLeg.name = "left_leg";
    leftLeg.position.set(-0.18, 0.55, 0);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), material.clone());
    rightLeg.name = "right_leg";
    rightLeg.position.set(0.18, 0.55, 0);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshStandardMaterial({
      color: 0x1a1f2a,
      roughness: 1.0,
      metalness: 0.0,
    }));
    ground.name = "ground";
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0.05, 0);
    ground.receiveShadow = true;

    group.add(head, torso, leftArm, rightArm, leftLeg, rightLeg, ground);
    return group;
  }
}
