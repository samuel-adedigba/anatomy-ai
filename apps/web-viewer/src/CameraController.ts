import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CameraAction } from "./types";

const FRAME_PADDING = 1.35;
const MIN_DISTANCE = 0.2;
const ZOOM_SCALE = 0.82;
const ROTATE_STEP = Math.PI / 8;

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private defaultPosition = new THREE.Vector3(0, 1.5, 4);
  private defaultTarget = new THREE.Vector3(0, 0, 0);
  private target = new THREE.Vector3(0, 0, 0);
  private minDistance = MIN_DISTANCE;
  private maxDistance = 200;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
  }

  execute(action?: CameraAction): void {
    if (!action) return;
    switch (action) {
      case "zoom_in":
        this._zoom(ZOOM_SCALE);
        break;
      case "zoom_out":
        this._zoom(1 / ZOOM_SCALE);
        break;
      case "rotate_left":
        this._rotateAroundY(ROTATE_STEP);
        break;
      case "rotate_right":
        this._rotateAroundY(-ROTATE_STEP);
        break;
      case "front":
        this._setViewDirection(0, 0, 1);
        break;
      case "back":
        this._setViewDirection(0, 0, -1);
        break;
      case "top":
        this._setViewDirection(0, 1, 0.001);
        break;
      case "reset":
        this.camera.position.copy(this.defaultPosition);
        this.target.copy(this.defaultTarget);
        break;
    }
    this._syncControls();
  }

  frameObject(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect = Number.isFinite(this.camera.aspect) && this.camera.aspect > 0
      ? this.camera.aspect : 1;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const fitHeightDistance = (size.y / 2) / Math.tan(verticalFov / 2);
    const fitWidthDistance = (size.x / 2) / Math.tan(horizontalFov / 2);
    const distance = Math.max(fitHeightDistance, fitWidthDistance, size.z) * FRAME_PADDING;
    const modelRadius = size.length() / 2;

    this.target.copy(center);
    this.defaultTarget.copy(center);
    this.defaultPosition.set(center.x, center.y + size.y * 0.06, center.z + distance);
    this.camera.position.copy(this.defaultPosition);

    this.minDistance = Math.max(MIN_DISTANCE, modelRadius * 0.08);
    this.maxDistance = Math.max(distance * 4, modelRadius * 4, 10);
    this.controls.minDistance = this.minDistance;
    this.controls.maxDistance = this.maxDistance;
    this.camera.near = Math.max(0.01, distance / 100);
    this.camera.far = Math.max(distance * 100, modelRadius * 20);
    this.camera.updateProjectionMatrix();
    this._syncControls();
  }

  focusObject(object: THREE.Object3D): void {
    this.frameObject(object);
  }

  orbitAroundTarget(angle: number): void {
    this._rotateAroundY(angle);
    this._syncControls();
  }

  private _setViewDirection(dx: number, dy: number, dz: number): void {
    const offset = this.camera.position.clone().sub(this.target);
    const distance = offset.length();
    this.camera.position.copy(this.target).add(
      new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(distance)
    );
  }

  private _rotateAroundY(angle: number): void {
    const offset = this.camera.position.clone().sub(this.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    this.camera.position.copy(this.target).add(offset);
  }

  private _zoom(scale: number): void {
    const offset = this.camera.position.clone().sub(this.target);
    const nextDistance = THREE.MathUtils.clamp(
      offset.length() * scale,
      this.minDistance,
      this.maxDistance
    );
    offset.setLength(nextDistance);
    this.camera.position.copy(this.target).add(offset);
  }

  private _syncControls(): void {
    this.controls.target.copy(this.target);
    this.camera.lookAt(this.target);
    this.controls.update();
  }
}
