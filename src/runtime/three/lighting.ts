/**
 * KF-003C-B3 — Studio Lighting Rig & Production Camera Composition (Phases 2 & 6).
 *
 * Refines camera framing against actual KF-01 mechanical bounds (327 x 138 mm footprint,
 * 6.5 deg incline, -50 mm .. +158 mm exploded vertical range) and hero switch macro scale,
 * with lower-distortion product lenses, mobile-safe aspect fitting, and smooth interruptible
 * reduced-motion-compatible transitions.
 */
import * as THREE from 'three';
import { STUDIO_PROFILES, type StudioProfileId } from './studioProfiles';

export type CameraPresetId =
  | 'threeQuarter'
  | 'top'
  | 'macroRight'
  | 'sideProfile'
  | 'rearUsbc'
  | 'exploded'
  | 'heroSwitch';

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
  fitHalfW: number;
  fitHalfH: number;
}

/**
 * Calibrated production camera presets in glTF meters (+X right, +Y up, -Z rear).
 * Keyboard footprint: 0.327 x 0.138 m, resting on Y = 0, top ~0.0505 m.
 * Exploded stack vertical range: -0.050 m (bottom chassis) .. +0.158 m (keycaps).
 * Hero switch: 0.0153 x 0.0277 x 0.0153 m, centered at (0, 0.0125, 0).
 */
export const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  threeQuarter: {
    id: 'threeQuarter',
    label: 'Studio 3/4',
    position: [0.24, 0.31, 0.41],
    target: [0.0, 0.020, 0.004],
    fov: 28,
    near: 0.005,
    far: 5.0,
    fitHalfW: 0.190,
    fitHalfH: 0.095,
  },
  top: {
    id: 'top',
    label: 'Top Plan',
    position: [0.0, 0.68, 0.036],
    target: [0.0, 0.022, 0.0],
    fov: 26,
    near: 0.005,
    far: 5.0,
    fitHalfW: 0.184,
    fitHalfH: 0.088,
  },
  sideProfile: {
    id: 'sideProfile',
    label: 'Side 6.5°',
    position: [0.56, 0.036, 0.0],
    target: [0.0, 0.022, 0.0],
    fov: 20,
    near: 0.005,
    far: 5.0,
    fitHalfW: 0.096,
    fitHalfH: 0.044,
  },
  rearUsbc: {
    id: 'rearUsbc',
    label: 'Rear USB-C',
    position: [-0.235, 0.145, -0.435],
    target: [0.0, 0.020, -0.008],
    fov: 26,
    near: 0.004,
    far: 5.0,
    fitHalfW: 0.194,
    fitHalfH: 0.088,
  },
  macroRight: {
    id: 'macroRight',
    label: 'Encoder Macro',
    position: [0.235, 0.146, 0.136],
    target: [0.120, 0.026, -0.012],
    fov: 26,
    near: 0.002,
    far: 5.0,
    fitHalfW: 0.064,
    fitHalfH: 0.045,
  },
  exploded: {
    id: 'exploded',
    label: 'Exploded Stack',
    position: [0.36, 0.25, 0.49],
    target: [0.0, 0.048, -0.006],
    fov: 26,
    near: 0.005,
    far: 5.0,
    fitHalfW: 0.228,
    fitHalfH: 0.154,
  },
  heroSwitch: {
    id: 'heroSwitch',
    label: 'Hero Switch',
    position: [0.039, 0.029, 0.048],
    target: [0.0, 0.012, 0.0],
    fov: 26,
    near: 0.0005,
    far: 2.0,
    fitHalfW: 0.0155,
    fitHalfH: 0.0185,
  },
};

export interface StudioLights {
  group: THREE.Group;
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  setShadows(enabled: boolean, mapSize: number): void;
  configureForHeroSwitch(isHero: boolean): void;
  applyProfile(profileId: StudioProfileId, isHero: boolean): void;
}

export function createStudioLights(
  shadows: boolean,
  shadowMapSize = 1024,
  initialProfile: StudioProfileId = 'atelier',
): StudioLights {
  const group = new THREE.Group();
  group.name = 'KF003C_StudioLights';

  const hemi = new THREE.HemisphereLight(0xfaf8f2, 0xcbc6ba, 0.58);
  hemi.name = 'KF003C_Hemi';

  const key = new THREE.DirectionalLight(0xfffbf5, 1.85);
  key.name = 'KF003C_Key';
  key.position.set(-0.26, 0.58, 0.32);
  key.castShadow = shadows;
  key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.0014;
  key.shadow.radius = 2.6;
  const cam = key.shadow.camera;
  cam.left = -0.25;
  cam.right = 0.25;
  cam.top = 0.20;
  cam.bottom = -0.20;
  cam.near = 0.05;
  cam.far = 1.8;
  cam.updateProjectionMatrix();

  const fill = new THREE.DirectionalLight(0xf2f6fa, 0.68);
  fill.name = 'KF003C_Fill';
  fill.position.set(0.42, 0.34, 0.24);

  const rim = new THREE.DirectionalLight(0xfff4e6, 0.92);
  rim.name = 'KF003C_Rim';
  rim.position.set(0.06, 0.32, -0.44);

  group.add(hemi, key, fill, rim);

  let activeProfile: StudioProfileId = initialProfile;

  function applyProfile(profileId: StudioProfileId, isHero: boolean) {
    activeProfile = profileId;
    const spec = STUDIO_PROFILES[profileId];
    hemi.color.set(spec.hemi.skyHex);
    hemi.groundColor.set(spec.hemi.groundHex);
    hemi.intensity = isHero ? spec.heroLights.hemiIntensity : spec.hemi.intensity;

    const rig = isHero ? spec.heroLights : spec.lights;
    key.color.set(rig.key.color);
    key.intensity = rig.key.intensity;
    key.position.set(...rig.key.position);

    fill.color.set(rig.fill.color);
    fill.intensity = rig.fill.intensity;
    fill.position.set(...rig.fill.position);

    rim.color.set(rig.rim.color);
    rim.intensity = rig.rim.intensity;
    rim.position.set(...rig.rim.position);

    const c = key.shadow.camera;
    if (isHero) {
      c.left = -0.025;
      c.right = 0.025;
      c.top = 0.035;
      c.bottom = -0.02;
      c.near = 0.005;
      c.far = 0.25;
    } else {
      c.left = -0.26;
      c.right = 0.26;
      c.top = 0.22;
      c.bottom = -0.22;
      c.near = 0.05;
      c.far = 1.8;
    }
    c.updateProjectionMatrix();
  }

  applyProfile(initialProfile, false);

  return {
    group,
    key,
    fill,
    rim,
    hemi,
    setShadows(enabled: boolean, mapSize: number) {
      key.castShadow = enabled;
      if (key.shadow.mapSize.x !== mapSize) {
        key.shadow.mapSize.set(mapSize, mapSize);
        key.shadow.map?.dispose();
        key.shadow.map = null;
      }
    },
    configureForHeroSwitch(isHero: boolean) {
      applyProfile(activeProfile, isHero);
    },
    applyProfile,
  };
}

export function disposeStudioLights(lights: StudioLights) {
  lights.key.shadow.map?.dispose();
  lights.key.dispose();
  lights.fill.dispose();
  lights.rim.dispose();
  lights.hemi.dispose();
  lights.group.removeFromParent();
}

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  near: number;
  far: number;
}

export function solveCameraPresetPose(preset: CameraPreset, aspect: number): CameraPose {
  const safeAspect = Math.max(0.2, aspect);
  const target = new THREE.Vector3(...preset.target);
  const basePos = new THREE.Vector3(...preset.position);
  const dir = basePos.clone().sub(target);
  const baseDist = dir.length();
  dir.normalize();

  const vHalf = Math.tan(THREE.MathUtils.degToRad(preset.fov / 2));
  const hHalf = vHalf * safeAspect;
  // Slightly extra horizontal margin on narrow portrait/mobile viewports so edges never clip
  const margin = safeAspect < 0.85 ? 1.14 : 1.08;
  const solvedDist = Math.max(preset.fitHalfW / hHalf, preset.fitHalfH / vHalf) * margin;
  const dist = Math.max(baseDist * 0.90, solvedDist);

  return {
    position: target.clone().addScaledVector(dir, dist),
    target,
    fov: preset.fov,
    near: preset.near,
    far: preset.far,
  };
}

export function applyCameraPreset(
  camera: THREE.PerspectiveCamera,
  preset: CameraPreset,
  aspect: number,
  orbitTarget?: THREE.Vector3,
) {
  const pose = solveCameraPresetPose(preset, aspect);
  camera.fov = pose.fov;
  camera.near = pose.near;
  camera.far = pose.far;
  camera.aspect = Math.max(0.2, aspect);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  orbitTarget?.copy(pose.target);
}

/**
 * Interruptible, reduced-motion-compatible camera transition helper.
 * Driven strictly by the on-demand frame loop; returns false once settled so idle stays at 0 frames.
 */
export class CameraTransitionController {
  private active = false;
  private startMs = 0;
  private durationMs = 420;
  private fromPos = new THREE.Vector3();
  private toPos = new THREE.Vector3();
  private fromTarget = new THREE.Vector3();
  private toTarget = new THREE.Vector3();
  private fromFov = 28;
  private toFov = 28;
  private toNear = 0.005;
  private toFar = 5.0;

  start(
    camera: THREE.PerspectiveCamera,
    orbitTarget: THREE.Vector3 | undefined,
    preset: CameraPreset,
    aspect: number,
    options: { instant?: boolean; durationMs?: number } = {},
  ): boolean {
    const prefersReduced =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

    if (options.instant || prefersReduced) {
      this.active = false;
      applyCameraPreset(camera, preset, aspect, orbitTarget);
      return false;
    }

    const pose = solveCameraPresetPose(preset, aspect);
    this.fromPos.copy(camera.position);
    this.toPos.copy(pose.position);
    this.fromTarget.copy(orbitTarget ?? pose.target);
    this.toTarget.copy(pose.target);
    this.fromFov = camera.fov;
    this.toFov = pose.fov;
    this.toNear = pose.near;
    this.toFar = pose.far;
    this.durationMs = options.durationMs ?? 420;
    this.startMs = performance.now();
    this.active = true;
    return true;
  }

  cancel(): void {
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  update(now: number, camera: THREE.PerspectiveCamera, orbitTarget?: THREE.Vector3): boolean {
    if (!this.active) return false;
    const raw = Math.min(1, Math.max(0, (now - this.startMs) / Math.max(1, this.durationMs)));
    // Cubic ease-out
    const t = 1 - Math.pow(1 - raw, 3);
    camera.position.lerpVectors(this.fromPos, this.toPos, t);
    const curTarget = new THREE.Vector3().lerpVectors(this.fromTarget, this.toTarget, t);
    camera.fov = THREE.MathUtils.lerp(this.fromFov, this.toFov, t);
    camera.near = this.toNear;
    camera.far = this.toFar;
    camera.lookAt(curTarget);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    orbitTarget?.copy(curTarget);

    if (raw >= 1) {
      this.active = false;
      return false;
    }
    return true;
  }
}
