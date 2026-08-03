import * as THREE from "three";
import { FlowPath, SemanticState } from "../visual-scene/scenePlan.generated";

type ActiveFlow = {
  id: string;
  path: FlowPath;
  pathObject: THREE.Object3D;
  state: SemanticState;
  progress: number;
};

type FlowVisual = {
  root: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  particles: THREE.Group[];
};

const PARTICLE_COUNT = 10;
const FLOW_COLORS: Record<string, number> = {
  oxygen_poor_blood: 0x2e9bff,
  oxygen_rich_blood: 0xff5c65,
};

/** Draws directional educational markers along reviewed path nodes. */
export class ParticleFlowRenderer {
  private scene: THREE.Scene;
  private visuals = new Map<string, FlowVisual>();
  private reducedMotion = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;
  }

  setActiveFlows(flows: ActiveFlow[]): string[] {
    const activeIds = new Set(flows.map((flow) => flow.id));
    this.visuals.forEach((visual, id) => {
      if (!activeIds.has(id)) {
        this.scene.remove(visual.root);
        this.disposeVisual(visual);
        this.visuals.delete(id);
      }
    });

    const errors: string[] = [];
    flows.forEach((flow) => {
      let visual = this.visuals.get(flow.id);
      if (!visual) {
        const created = this.createVisual(flow);
        if (!created) {
          errors.push(`Flow path "${flow.path}" could not be rendered.`);
          return;
        }
        visual = created;
        this.visuals.set(flow.id, visual);
        this.scene.add(visual.root);
      }
      this.updateVisual(visual, flow.progress);
    });
    return errors;
  }

  clear(): void {
    this.visuals.forEach((visual) => {
      this.scene.remove(visual.root);
      this.disposeVisual(visual);
    });
    this.visuals.clear();
  }

  private createVisual(flow: ActiveFlow): FlowVisual | null {
    const points = this.extractPoints(flow.pathObject);
    if (points.length < 2) return null;

    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const root = new THREE.Group();
    root.name = `particle-flow:${flow.id}`;

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: FLOW_COLORS[flow.state] ?? 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    root.add(new THREE.Line(lineGeometry, lineMaterial));

    const color = FLOW_COLORS[flow.state] ?? 0xffffff;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => {
      const particle = new THREE.Group();
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 6),
        new THREE.MeshBasicMaterial({ color })
      );
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.026, 0.09, 6),
        new THREE.MeshBasicMaterial({ color })
      );
      arrow.rotation.x = Math.PI / 2;
      arrow.position.z = 0.045;
      particle.add(sphere, arrow);
      root.add(particle);
      return particle;
    });

    return { root, curve, particles };
  }

  private updateVisual(visual: FlowVisual, progress: number): void {
    const movement = this.reducedMotion ? 0.5 : Math.max(0, Math.min(progress, 1));
    visual.particles.forEach((particle, index) => {
      const pointProgress = (movement + index / visual.particles.length) % 1;
      const point = visual.curve.getPointAt(pointProgress);
      const tangent = visual.curve.getTangentAt(pointProgress).normalize();
      particle.position.copy(point);
      particle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    });
  }

  private extractPoints(object: THREE.Object3D): THREE.Vector3[] {
    const userPoints =
      object.userData["points"] ??
      object.userData["centerline"] ??
      object.userData["centerline_y_up"];
    if (Array.isArray(userPoints)) {
      const pointList = typeof userPoints[0] === "number"
        ? Array.from({ length: Math.floor(userPoints.length / 3) }, (_, index) => [
            userPoints[index * 3],
            userPoints[index * 3 + 1],
            userPoints[index * 3 + 2],
          ])
        : userPoints;
      const points = pointList
        .filter((point): point is number[] => Array.isArray(point) && point.length >= 3)
        .map((point) => object.localToWorld(new THREE.Vector3(point[0], point[1], point[2])));
      if (points.length >= 2) return points;
    }

    let positions: THREE.Vector3[] = [];
    object.traverse((child) => {
      if (positions.length > 1 || !(child as THREE.Line).isLine) return;
      const geometry = (child as THREE.Line).geometry;
      const attribute = geometry.getAttribute("position");
      if (!attribute || attribute.count < 2) return;
      positions = Array.from({ length: attribute.count }, (_, index) =>
        child.localToWorld(new THREE.Vector3(
          attribute.getX(index),
          attribute.getY(index),
          attribute.getZ(index)
        ))
      );
    });
    return positions;
  }

  private disposeVisual(visual: FlowVisual): void {
    visual.root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh && !(child as THREE.Line).isLine) return;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });
  }
}
