import * as THREE from "three";
import { CameraController } from "../CameraController";
import { ParticleFlowRenderer } from "../flow/ParticleFlowRenderer";
import { SceneLabel, SceneLabelRenderer } from "../labels/SceneLabelRenderer";
import { SceneLayerManager, SceneLayer, ResolvedTarget } from "../scene/SceneLayerManager";
import { TimelinePlayer, TimelineState, TimelineWindow } from "../timeline/TimelinePlayer";
import {
  SemanticState,
  ScenePlan,
  SceneTrack,
} from "../visual-scene/scenePlan.generated";

export type ScenePlaybackProgress = {
  plan_id: string;
  time_ms: number;
  duration_ms: number;
  state: TimelineState;
  step_id?: string;
};

export type ScenePlanRuntimeCallbacks = {
  onProgress?: (progress: ScenePlaybackProgress) => void;
  onComplete?: (planId: string) => void;
  onError?: (message: string) => void;
};

const LABEL_TEXT: Record<string, string> = {
  "heart.right_atrium": "Right atrium",
  "heart.right_ventricle": "Right ventricle",
  "heart.left_atrium": "Left atrium",
  "heart.left_ventricle": "Left ventricle",
  "heart.tricuspid_valve": "Tricuspid valve",
  "heart.pulmonary_valve": "Pulmonary valve",
  "heart.mitral_valve": "Mitral valve",
  "heart.aortic_valve": "Aortic valve",
};

const STATE_COLORS: Partial<Record<SemanticState, number>> = {
  selected_structure: 0x4ed9c6,
  oxygen_poor_blood: 0x2e9bff,
  oxygen_rich_blood: 0xff5c65,
};

type RuntimeMaterialSnapshot = {
  original: THREE.Material | THREE.Material[];
  styled: THREE.Material | THREE.Material[];
};

/** Executes a validated ScenePlan against one shared timeline. */
export class ScenePlanRuntime {
  private layers: SceneLayerManager;
  private particles: ParticleFlowRenderer;
  private labels: SceneLabelRenderer;
  private timeline: TimelinePlayer;
  private camera: CameraController;
  private callbacks: ScenePlanRuntimeCallbacks;
  private plan: ScenePlan | null = null;
  private mixers = new Map<SceneLayer, THREE.AnimationMixer>();
  private clipActions = new Map<string, THREE.AnimationAction>();
  private materialSnapshots = new Map<THREE.Mesh, RuntimeMaterialSnapshot>();
  private morphSnapshots = new Map<THREE.Mesh, Map<number, number>>();
  private activeCameraTrackId: string | null = null;
  private cameraOrbitStartPosition: THREE.Vector3 | null = null;
  private reducedMotion = false;
  private loadSequence = 0;
  private lastProgressEmitTime = -Infinity;
  private lastProgressState: TimelineState | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    cameraController: CameraController,
    container: HTMLElement,
    callbacks: ScenePlanRuntimeCallbacks = {}
  ) {
    this.layers = new SceneLayerManager(scene);
    this.particles = new ParticleFlowRenderer(scene);
    this.labels = new SceneLabelRenderer(scene, camera, container);
    this.camera = cameraController;
    this.callbacks = callbacks;
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.particles.setReducedMotion(this.reducedMotion);
    this.timeline = new TimelinePlayer({
      onTime: (timeMs) => this.renderAt(timeMs),
      onStateChange: () => this.emitProgress(undefined, true),
      onComplete: () => {
        if (this.plan) this.callbacks.onComplete?.(this.plan.plan_id);
      },
    });
  }

  async load(plan: ScenePlan): Promise<boolean> {
    this.stop();
    const loadSequence = ++this.loadSequence;
    this.plan = plan;
    const loadedLayers = await Promise.all(
      plan.required_assets.map((assetId) => this.layers.load(assetId))
    );
    if (loadSequence !== this.loadSequence) return false;
    const unavailable = loadedLayers.find((layer) => !layer.available);
    if (unavailable) {
      this.callbacks.onError?.(
        unavailable.error ?? `Scene asset "${unavailable.assetId}" is unavailable.`
      );
      this.stop();
      return false;
    }

    this.layers.activate(loadedLayers);

    const tracks: TimelineWindow[] = plan.tracks.map((track) => ({
      id: track.id,
      start_ms: track.start_ms,
      duration_ms: track.duration_ms,
    }));
    this.timeline.load(plan.duration_ms, plan.loop, tracks);

    const preflightErrors = this.preflight(plan.tracks);
    if (preflightErrors.length > 0) {
      preflightErrors.forEach((error) => this.callbacks.onError?.(error));
      this.stop();
      return false;
    }

    this.timeline.play();
    return true;
  }

  update(deltaSeconds: number): void {
    this.timeline.update(deltaSeconds);
  }

  renderOverlay(): void {
    this.labels.render();
  }

  play(): void {
    this.timeline.play();
  }

  pause(): void {
    this.timeline.pause();
  }

  replay(): void {
    this.timeline.replay();
  }

  seek(timeMs: number): void {
    this.timeline.seek(timeMs);
    this.emitProgress(this.timeline.getTimeMs(), true);
  }

  setSpeed(speed: number): void {
    this.timeline.setSpeed(speed);
  }

  getProgress(): ScenePlaybackProgress | null {
    if (!this.plan) return null;
    return this.createProgress(this.timeline.getTimeMs());
  }

  stop(): void {
    this.loadSequence += 1;
    this.timeline?.pause();
    this.restoreMaterials();
    this.restoreMorphs();
    this.particles.clear();
    this.labels.clear();
    this.clipActions.forEach((action) => {
      action.stop();
      action.reset();
    });
    this.clipActions.clear();
    this.mixers.clear();
    this.layers.clear();
    this.activeCameraTrackId = null;
    this.cameraOrbitStartPosition = null;
    this.lastProgressEmitTime = -Infinity;
    this.lastProgressState = null;
    this.plan = null;
  }

  dispose(): void {
    this.stop();
    this.labels.dispose();
  }

  private renderAt(timeMs: number): void {
    if (!this.plan) return;
    const activeTracks = this.plan.tracks.filter(
      (track) => timeMs >= track.start_ms && timeMs < track.start_ms + track.duration_ms
    );

    this.applyClips(activeTracks, timeMs);
    this.applyMorphs(activeTracks, timeMs);
    this.applyMaterials(activeTracks);
    this.applyLabels(activeTracks);
    this.applyFlows(activeTracks, timeMs);
    this.applyCamera(activeTracks, timeMs);
    this.emitProgress(timeMs);
  }

  private applyClips(activeTracks: SceneTrack[], timeMs: number): void {
    const activeClipIds = new Set<string>();
    activeTracks.forEach((track) => {
      if (track.action !== "play_clip") return;
      activeClipIds.add(track.id);
      const resolved = this.layers.findClip(track.clip);
      if (!resolved) return;
      let action = this.clipActions.get(track.id);
      if (!action) {
        const mixer = this.mixers.get(resolved.layer) ?? new THREE.AnimationMixer(resolved.layer.root);
        this.mixers.set(resolved.layer, mixer);
        action = mixer.clipAction(resolved.clip);
        action.play();
        action.paused = true;
        this.clipActions.set(track.id, action);
      }
      action.enabled = true;
      action.paused = true;
      const localTime = Math.max(0, timeMs - track.start_ms) / 1000;
      action.time = track.loop && resolved.clip.duration > 0
        ? localTime % resolved.clip.duration
        : Math.min(localTime, resolved.clip.duration);
      this.mixers.get(resolved.layer)?.update(0);
    });

    this.clipActions.forEach((action, id) => {
      if (!activeClipIds.has(id)) {
        action.enabled = false;
        action.reset();
      }
    });
  }

  private applyMorphs(activeTracks: SceneTrack[], timeMs: number): void {
    this.restoreMorphs();
    activeTracks.forEach((track) => {
      if (track.action !== "play_morph") return;
      const resolved = this.layers.resolveMorph(track.target, track.morph);
      if (!resolved) return;
      const ratio = Math.max(0, Math.min(
        (timeMs - track.start_ms) / track.duration_ms,
        1
      ));
      const value = track.from + (track.to - track.from) * ratio;
      resolved.meshes.forEach((mesh) => {
        const index = mesh.morphTargetDictionary?.[resolved.morphName];
        if (index !== undefined && mesh.morphTargetInfluences) {
          const snapshots = this.morphSnapshots.get(mesh) ?? new Map<number, number>();
          if (!snapshots.has(index)) {
            snapshots.set(index, mesh.morphTargetInfluences[index] ?? 0);
            this.morphSnapshots.set(mesh, snapshots);
          }
          mesh.morphTargetInfluences[index] = this.reducedMotion ? track.from : value;
        }
      });
    });
  }

  private applyMaterials(activeTracks: SceneTrack[]): void {
    this.restoreMaterialAssignments();
    activeTracks.forEach((track) => {
      if (track.action !== "highlight" && track.action !== "set_material_state" && track.action !== "fade") {
        return;
      }
      const resolved = this.layers.resolveTarget(track.target);
      if (!resolved) return;
      const meshes: THREE.Mesh[] = [];
      resolved.object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
      });
      meshes.forEach((mesh) => {
        const snapshot = this.materialSnapshots.get(mesh) ?? this.snapshotMaterial(mesh);
        this.resetStyledMaterial(snapshot);
        if (track.action === "fade") {
          this.setOpacity(snapshot.styled, track.opacity);
        } else {
          this.setColor(snapshot.styled, STATE_COLORS[track.state]);
        }
        mesh.material = snapshot.styled;
      });
    });
  }

  private applyLabels(activeTracks: SceneTrack[]): void {
    const labels: SceneLabel[] = [];
    activeTracks.forEach((track) => {
      if (track.action !== "show_label") return;
      const resolved = this.layers.resolveTarget(track.target);
      if (!resolved) return;
      labels.push({
        id: track.id,
        text: LABEL_TEXT[track.text_key] ?? track.text_key,
        target: resolved.object,
      });
    });
    this.labels.setLabels(labels);
  }

  private applyFlows(activeTracks: SceneTrack[], timeMs: number): void {
    const flows = activeTracks.flatMap((track) => {
      if (track.action !== "particle_flow" && track.action !== "signal_propagation") return [];
      const resolved = this.layers.resolvePath(track.path);
      if (!resolved) return [];
      return [{
        id: track.id,
        path: track.path,
        pathObject: resolved.object,
        state: track.state,
        progress: Math.max(0, Math.min((timeMs - track.start_ms) / track.duration_ms, 1)),
      }];
    });
    const errors = this.particles.setActiveFlows(flows);
    errors.forEach((error) => this.callbacks.onError?.(error));
  }

  private applyCamera(activeTracks: SceneTrack[], timeMs: number): void {
    const track = activeTracks.find(
      (candidate) => candidate.action === "camera_focus" || candidate.action === "camera_orbit"
    );
    if (!track) {
      this.activeCameraTrackId = null;
      this.cameraOrbitStartPosition = null;
      return;
    }
    const resolved = this.layers.resolveTarget(track.target);
    if (!resolved) return;
    if (this.activeCameraTrackId !== track.id) {
      this.activeCameraTrackId = track.id;
      this.camera.focusObject(resolved.object);
      this.cameraOrbitStartPosition = this.camera.getPosition();
    }
    if (track.action === "camera_orbit") {
      this.camera.orbitAroundTarget(
        Math.PI / 4,
        this.reducedMotion
          ? 1
          : (timeMs - track.start_ms) / track.duration_ms,
        this.cameraOrbitStartPosition ?? undefined
      );
    }
  }

  private preflight(tracks: SceneTrack[]): string[] {
    const errors: string[] = [];
    tracks.forEach((track) => {
      if (track.action === "wait") return;
      if (track.action === "particle_flow" || track.action === "signal_propagation") {
        if (!this.layers.resolvePath(track.path)) {
          errors.push(`Flow path "${track.path}" is not available in the loaded scene layers.`);
        }
        return;
      }
      if (track.action === "play_clip") {
        if (!this.layers.findClip(track.clip)) {
          errors.push(`Animation clip "${track.clip}" is not available in the loaded scene layers.`);
        }
        return;
      }
      if (track.action === "play_morph") {
        if (!this.layers.resolveMorph(track.target, track.morph)) {
          errors.push(`Morph "${track.morph}" is not available for target "${track.target}".`);
        }
        return;
      }
      if (!this.layers.resolveTarget(track.target)) {
        errors.push(`Semantic target "${track.target}" is not available in the loaded scene layers.`);
      }
    });
    return [...new Set(errors)];
  }

  private snapshotMaterial(mesh: THREE.Mesh): RuntimeMaterialSnapshot {
    const original = mesh.material;
    const styled = Array.isArray(original)
      ? original.map((material) => material.clone())
      : original.clone();
    const snapshot = { original, styled };
    this.materialSnapshots.set(mesh, snapshot);
    return snapshot;
  }

  private restoreMaterials(): void {
    this.restoreMaterialAssignments();
    this.materialSnapshots.forEach((snapshot) => {
      if (Array.isArray(snapshot.styled)) snapshot.styled.forEach((material) => material.dispose());
      else snapshot.styled.dispose();
    });
    this.materialSnapshots.clear();
  }

  private restoreMorphs(): void {
    this.morphSnapshots.forEach((indices, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      indices.forEach((value, index) => {
        mesh.morphTargetInfluences![index] = value;
      });
    });
    this.morphSnapshots.clear();
  }

  private restoreMaterialAssignments(): void {
    this.materialSnapshots.forEach((snapshot, mesh) => {
      mesh.material = snapshot.original;
    });
  }

  private resetStyledMaterial(snapshot: RuntimeMaterialSnapshot): void {
    if (Array.isArray(snapshot.original) && Array.isArray(snapshot.styled)) {
      const original = snapshot.original as THREE.Material[];
      const styled = snapshot.styled as THREE.Material[];
      styled.forEach((material, index) => material.copy(original[index]));
      return;
    }
    if (!Array.isArray(snapshot.original) && !Array.isArray(snapshot.styled)) {
      snapshot.styled.copy(snapshot.original);
    }
  }

  private setColor(materials: THREE.Material | THREE.Material[], color?: number): void {
    if (color === undefined) return;
    const list = Array.isArray(materials) ? materials : [materials];
    list.forEach((material) => {
      if (!("color" in material)) return;
      const colorMaterial = material as THREE.MeshStandardMaterial;
      colorMaterial.color.setHex(color);
      if ("emissive" in colorMaterial) colorMaterial.emissive.setHex(color);
      if ("emissiveIntensity" in colorMaterial) colorMaterial.emissiveIntensity = 0.25;
    });
  }

  private setOpacity(materials: THREE.Material | THREE.Material[], opacity: number): void {
    const list = Array.isArray(materials) ? materials : [materials];
    list.forEach((material) => {
      material.transparent = opacity < 1;
      material.opacity = opacity;
    });
  }

  private emitProgress(timeMs = this.timeline.getTimeMs(), force = false): void {
    if (!this.plan) return;
    const state = this.timeline.getState();
    if (
      !force &&
      state === this.lastProgressState &&
      Math.abs(timeMs - this.lastProgressEmitTime) < 100
    ) {
      return;
    }
    this.lastProgressEmitTime = timeMs;
    this.lastProgressState = state;
    this.callbacks.onProgress?.(this.createProgress(timeMs));
  }

  private createProgress(timeMs: number): ScenePlaybackProgress {
    const step = this.plan?.steps.find(
      (candidate) => timeMs >= candidate.start_ms && timeMs < candidate.end_ms
    );
    return {
      plan_id: this.plan?.plan_id ?? "",
      time_ms: timeMs,
      duration_ms: this.plan?.duration_ms ?? 0,
      state: this.timeline.getState(),
      step_id: step?.id,
    };
  }
}
