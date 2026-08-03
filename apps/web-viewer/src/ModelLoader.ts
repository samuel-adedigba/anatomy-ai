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
    const path = ASSET_MAP[viewMode];
    if (!path) {
      throw new Error(`Unsupported anatomy view mode "${viewMode}".`);
    }
    const requestId = ++this.activeRequestId;

    // Return from cache if already loaded
    if (this.cache.has(path)) {
      const model = this.cache.get(path)!;
      this._swap(model);
      return model;
    }

    return new Promise((resolve, reject) => {
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
          console.warn(`[ModelLoader] Failed to load ${path}.`, err);
          reject(new Error(`The anatomy model could not be loaded from ${path}.`));
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

}
