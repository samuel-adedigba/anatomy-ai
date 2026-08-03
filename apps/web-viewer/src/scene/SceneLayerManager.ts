import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  AnimationClip,
  AnimationMorph,
  FlowPath,
  SceneAssetId,
  SemanticTarget,
} from "../visual-scene/scenePlan.generated";

type ManifestTarget = string | string[];

export type AssetManifest = {
  asset_id: SceneAssetId;
  file: string;
  targets: Partial<Record<SemanticTarget, ManifestTarget>>;
  clips: Partial<Record<AnimationClip, string>>;
  morphs: Partial<Record<AnimationMorph, string>>;
  paths: Partial<Record<FlowPath, string>>;
};

export type SceneLayer = {
  assetId: SceneAssetId;
  root: THREE.Group;
  animations: THREE.AnimationClip[];
  manifest: AssetManifest;
  available: boolean;
  error?: string;
};

export type ResolvedTarget = {
  layer: SceneLayer;
  object: THREE.Object3D;
};

const ASSET_FILES: Record<SceneAssetId, string> = {
  "heart.educational.v1": "/models/heart.educational.v1.glb",
  "circulation.major-vessels.v1": "/models/circulation.major-vessels.v1.glb",
};

const MANIFEST_FILES: Record<SceneAssetId, string> = {
  "heart.educational.v1": "/manifests/heart.educational.v1.json",
  "circulation.major-vessels.v1": "/manifests/circulation.major-vessels.v1.json",
};

const CAMERA_TARGET_ALIASES: Record<string, SemanticTarget> = {
  "camera.heart_overview": "heart",
  "camera.right_heart": "heart.right_ventricle",
  "camera.left_heart": "heart.left_ventricle",
};

/** Loads semantic scene assets without replacing already loaded layers. */
export class SceneLayerManager {
  private loader = new GLTFLoader();
  private scene: THREE.Scene;
  private cache = new Map<SceneAssetId, SceneLayer>();
  private activeLayers = new Map<SceneAssetId, SceneLayer>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async load(assetId: SceneAssetId): Promise<SceneLayer> {
    const cached = this.cache.get(assetId);
    if (cached) return cached;

    const [modelResult, manifestResult] = await Promise.all([
      this.loadModel(ASSET_FILES[assetId]),
      this.loadManifest(MANIFEST_FILES[assetId]),
    ]);

    const root = new THREE.Group();
    root.name = `scene-layer:${assetId}`;
    const animations = modelResult.gltf?.animations ?? [];
    if (modelResult.gltf) root.add(modelResult.gltf.scene);
    else root.add(this.createPlaceholder(assetId));

    const manifest = manifestResult.manifest ?? this.emptyManifest(assetId);
    const errors = [modelResult.error, manifestResult.error].filter(Boolean);
    const layer: SceneLayer = {
      assetId,
      root,
      animations,
      manifest,
      available: errors.length === 0,
      error: errors.join(" "),
    };

    this.cache.set(assetId, layer);
    return layer;
  }

  activate(layers: SceneLayer[]): void {
    this.clear();
    layers.forEach((layer) => this.attach(layer));
  }

  clear(): void {
    this.activeLayers.forEach((layer) => this.scene.remove(layer.root));
    this.activeLayers.clear();
  }

  getActiveLayers(): SceneLayer[] {
    return [...this.activeLayers.values()];
  }

  resolveTarget(target: SemanticTarget): ResolvedTarget | null {
    const aliasedTarget = CAMERA_TARGET_ALIASES[target] ?? target;
    for (const layer of this.activeLayers.values()) {
      const names = layer.manifest.targets[aliasedTarget];
      if (!names) continue;
      const objectNames = Array.isArray(names) ? names : [names];
      for (const objectName of objectNames) {
        const object = layer.root.getObjectByName(objectName);
        if (object) return { layer, object };
      }
    }
    return null;
  }

  resolvePath(pathId: FlowPath): ResolvedTarget | null {
    for (const layer of this.activeLayers.values()) {
      const objectName = layer.manifest.paths[pathId];
      if (!objectName) continue;
      const object = layer.root.getObjectByName(objectName);
      if (object) return { layer, object };
    }
    return null;
  }

  findClip(clipId: AnimationClip): { layer: SceneLayer; clip: THREE.AnimationClip } | null {
    for (const layer of this.activeLayers.values()) {
      const clipName = layer.manifest.clips[clipId] ?? clipId;
      const clip = layer.animations.find((candidate) => candidate.name === clipName);
      if (clip) return { layer, clip };
    }
    return null;
  }

  resolveMorph(
    target: SemanticTarget,
    morphId: AnimationMorph
  ): { layer: SceneLayer; meshes: THREE.Mesh[]; morphName: string } | null {
    const resolved = this.resolveTarget(target);
    if (!resolved) return null;

    const morphName = resolved.layer.manifest.morphs[morphId] ?? morphId;
    const meshes: THREE.Mesh[] = [];
    resolved.object.traverse((child) => {
      if (
        (child as THREE.Mesh).isMesh &&
        (child as THREE.Mesh).morphTargetDictionary?.[morphName] !== undefined
      ) {
        meshes.push(child as THREE.Mesh);
      }
    });
    return meshes.length > 0
      ? { layer: resolved.layer, meshes, morphName }
      : null;
  }

  private attach(layer: SceneLayer): void {
    this.activeLayers.set(layer.assetId, layer);
    if (layer.root.parent !== this.scene) this.scene.add(layer.root);
  }

  private async loadModel(
    path: string
  ): Promise<{ gltf?: GLTF; error?: string }> {
    try {
      return { gltf: await this.loader.loadAsync(path) };
    } catch {
      return { error: `The scene asset could not be loaded from ${path}.` };
    }
  }

  private async loadManifest(
    path: string
  ): Promise<{ manifest?: AssetManifest; error?: string }> {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Manifest request failed with ${response.status}.`);
      return { manifest: (await response.json()) as AssetManifest };
    } catch {
      return { error: `The scene asset manifest could not be loaded from ${path}.` };
    }
  }

  private emptyManifest(assetId: SceneAssetId): AssetManifest {
    return { asset_id: assetId, file: ASSET_FILES[assetId], targets: {}, clips: {}, morphs: {}, paths: {} };
  }

  private createPlaceholder(assetId: SceneAssetId): THREE.Group {
    const group = new THREE.Group();
    group.name = `unavailable:${assetId}`;
    const material = new THREE.MeshStandardMaterial({
      color: 0x385363,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });
    const geometry = new THREE.SphereGeometry(0.8, 16, 12);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "unavailable_asset_placeholder";
    group.add(mesh);
    return group;
  }
}
