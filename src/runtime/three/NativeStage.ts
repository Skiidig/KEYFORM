import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ViewportMount } from '../types';
import type { AssetPackage } from './assets';
import { ProductionScene, type LookdevQualityTier, type ViewMode } from './ProductionScene';
import { StudioGroundSystem } from './contactShadow';
import { CAMERA_PRESETS, CameraTransitionController, createStudioLights, disposeStudioLights, type CameraPresetId } from './lighting';
import { effectiveExposure, STUDIO_PROFILES, type StudioProfileId } from './studioProfiles';

const ORBIT_DAMPING_HALF_LIFE_MS = 45;
const ORBIT_MAX_SETTLE_MS = 250;
const ORBIT_ANGLE_EPSILON = 0.0004;
const ORBIT_TARGET_EPSILON = 0.0002;
const ORBIT_MAX_DT_MS = 64;

export class NativeStage {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly model: ProductionScene;
  readonly ground: StudioGroundSystem;
  readonly controls: OrbitControls;
  private readonly orbitInputCamera = new THREE.PerspectiveCamera();
  private readonly displayedTarget = new THREE.Vector3();
  private readonly lights: ReturnType<typeof createStudioLights>;
  private readonly transition = new CameraTransitionController();
  private readonly observer?: ResizeObserver;
  private readonly scratchDesiredOffset = new THREE.Vector3();
  private readonly scratchCurrentOffset = new THREE.Vector3();
  private readonly scratchDesiredSpherical = new THREE.Spherical();
  private readonly scratchCurrentSpherical = new THREE.Spherical();
  private frame = 0;
  private presented = false;
  private disposed = false;
  private shadowDirty = true;
  private aspect = 1;
  private width = 1;
  private height = 1;
  private bottomInsetPx = 0;
  private userOrbited = false;
  private preset: CameraPresetId = 'threeQuarter';
  private profile?: StudioProfileId;
  private reduced: boolean;
  private tier: LookdevQualityTier = 'standard';
  private syncingControls = false;
  private orbitSmoothingActive = false;
  private orbitLastFrameMs: number | null = null;
  private orbitInputEventMs: number | null = null;
  private wheelEvent?: WheelEvent;

  constructor(
    readonly renderer: THREE.WebGLRenderer,
    container: HTMLElement,
    assets: AssetPackage,
    private readonly lifetime: ViewportMount,
  ) {
    this.reduced = lifetime.reducedMotion;
    this.model = new ProductionScene(assets.manifest, assets);
    this.ground = new StudioGroundSystem('atelier');
    this.lights = createStudioLights(false, 1024, 'atelier');
    this.scene.add(this.model.root, this.ground.group, this.lights.group);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.className = 'kf-runtime-canvas';
    renderer.domElement.setAttribute('aria-label', 'Interactive product preview. Drag to orbit, scroll to zoom, or use Shift and arrow keys.');
    renderer.domElement.tabIndex = 0;
    renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    container.append(renderer.domElement);
    // OrbitControls drives an input camera so displayed camera smoothing runs purely on elapsed time
    // inside the demand frame loop with zero drift and exact convergence snapping.
    this.controls = new OrbitControls(this.orbitInputCamera, renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.listenToKeyEvents(renderer.domElement);
    this.controls.addEventListener('change', this.onControlsChange);
    this.controls.addEventListener('start', this.interrupt);
    renderer.domElement.addEventListener('wheel', this.captureWheel, { capture: true, passive: true });
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = container;
      if (!width || !height || this.disposed) return;
      const aspect = width / height;
      const sizeChanged = aspect !== this.aspect || width !== this.width || height !== this.height;
      this.width = width;
      this.height = height;
      this.aspect = aspect;
      if (this.presented && sizeChanged && !this.userOrbited) {
        // Refit the canonical framing on orientation/viewport changes unless user orbited manually.
        this.setCamera(this.preset, true);
      } else {
        this.applyProjection(this.camera);
        this.applyProjection(this.orbitInputCamera);
      }
      renderer.setSize(width, height, false);
      this.invalidate();
    };
    try {
      this.observer = new ResizeObserver(resize);
      this.observer.observe(container);
      resize();
    } catch (error) {
      this.disposeStageResources();
      throw error;
    }
  }

  private applyViewOffset(targetCamera: THREE.PerspectiveCamera): void {
    if (this.bottomInsetPx > 0 && this.height > this.bottomInsetPx + 40) {
      targetCamera.setViewOffset(
        this.width,
        this.height,
        0,
        Math.round(this.bottomInsetPx * 0.5),
        this.width,
        this.height,
      );
    } else {
      targetCamera.clearViewOffset();
    }
  }

  private applyProjection(targetCamera: THREE.PerspectiveCamera): void {
    targetCamera.aspect = this.aspect;
    this.applyViewOffset(targetCamera);
    targetCamera.updateProjectionMatrix();
  }

  private syncInputFromDisplayed(): void {
    this.syncingControls = true;
    try {
      this.orbitInputCamera.fov = this.camera.fov;
      this.orbitInputCamera.near = this.camera.near;
      this.orbitInputCamera.far = this.camera.far;
      this.orbitInputCamera.position.copy(this.camera.position);
      this.applyProjection(this.orbitInputCamera);
      this.controls.target.copy(this.displayedTarget);
      this.controls.update();
    } finally {
      this.syncingControls = false;
    }
  }

  private snapDisplayedToInput(): void {
    this.camera.position.copy(this.orbitInputCamera.position);
    this.displayedTarget.copy(this.controls.target);
    this.camera.lookAt(this.displayedTarget);
    this.camera.updateMatrixWorld(true);
    this.clearOrbitSmoothing();
  }

  private clearOrbitSmoothing(): void {
    this.orbitSmoothingActive = false;
    this.orbitLastFrameMs = null;
    this.orbitInputEventMs = null;
  }

  setBottomInset(insetPx: number) {
    const next = Math.max(0, Math.round(insetPx));
    if (next === this.bottomInsetPx) return;
    this.bottomInsetPx = next;
    if (this.presented && !this.userOrbited) {
      this.setCamera(this.preset, true);
    } else {
      this.applyProjection(this.camera);
      this.applyProjection(this.orbitInputCamera);
      this.invalidate();
    }
  }

  resetView() {
    this.userOrbited = false;
    this.setCamera(this.preset, false);
  }

  setFocusedGroup(groupId: string | null) {
    if (this.model.getFocusedAssemblyGroup() === groupId) return;
    this.model.setFocusedAssemblyGroup(groupId);
    this.invalidate();
  }

  setHeroPresentation(pose: 'cutaway' | 'assembled', instant = false) {
    this.model.setHeroSwitchPresentation(pose, instant || this.reduced);
    this.shadowDirty = true;
    this.invalidate();
  }

  setHeroPressed(pressed: boolean, instant = false) {
    this.model.setHeroSwitchPressed(pressed, instant || this.reduced);
    this.invalidate();
  }

  setHeroTravelListener(listener: ((travelMm: number, phase: 'idle' | 'pressing' | 'bottomed' | 'releasing') => void) | null) {
    this.model.setHeroTravelListener(listener);
  }

  async setQuality(tier: 'balanced' | 'standard') {
    this.tier = tier;
    // Balanced mobile tier caps DPR at 1.25 (1.56x pixels vs 1.0, avoiding 2.25x DPR 1.5
    // active-orbit fill cost while eliminating blurry 1x upscaling on 2x/3x phones).
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === 'balanced' ? 1.25 : 1.5));
    this.ground.setMode(tier === 'balanced' ? 'procedural' : 'cached');
    this.shadowDirty = true;
    await this.model.setQualityTier(tier);
    this.invalidate();
  }

  setView(mode: ViewMode, profile: StudioProfileId, camera: CameraPresetId, instant = false) {
    const priorMode = this.model.getViewMode();
    const changed = priorMode !== mode;
    const profileChanged = this.profile !== profile || (priorMode === 'hero_switch') !== (mode === 'hero_switch');
    if (changed) this.model.setViewMode(mode);
    if (profileChanged) {
      const spec = STUDIO_PROFILES[profile];
      const hero = mode === 'hero_switch';
      this.scene.environment = this.model.ensureEnvironment(this.renderer, profile);
      this.scene.environmentIntensity = hero ? spec.heroEnvIntensity : spec.envIntensity;
      this.scene.background = this.model.ensureBackdrop(profile);
      this.renderer.toneMappingExposure = effectiveExposure(spec, 'agx');
      this.lights.applyProfile(profile, hero);
      this.ground.applyProfile(profile);
      this.profile = profile;
    }
    if (changed || !this.presented) {
      this.model.setExplodeTarget(mode === 'exploded' ? 1 : 0, instant || this.reduced);
    }
    if (camera !== this.preset || !this.presented) this.setCamera(camera, instant || !this.presented);
    this.shadowDirty ||= changed || profileChanged;
    this.invalidate();
  }

  setCamera(preset: CameraPresetId, instant = false, now?: number) {
    this.preset = preset;
    this.userOrbited = false;
    // Orbit damping and preset transitions are mutually exclusive.
    this.clearOrbitSmoothing();
    this.controls.minDistance = preset === 'heroSwitch' ? 0.015 : 0.08;
    this.controls.maxDistance = preset === 'heroSwitch' ? 0.25 : 1.6;
    const basePreset = CAMERA_PRESETS[preset];
    // When a floating bottom HUD overlays the stage, solve against the usable open height
    // and shift the frustum optical center cleanly into the open area above the HUD.
    const solvePreset =
      this.bottomInsetPx > 0 && this.height > this.bottomInsetPx + 40
        ? {
            ...basePreset,
            fitHalfH: basePreset.fitHalfH * (this.height / (this.height - this.bottomInsetPx)),
          }
        : basePreset;
    this.transition.start(this.camera, this.displayedTarget, solvePreset, this.aspect, {
      instant: instant || this.reduced,
      now,
    });
    this.applyProjection(this.camera);
    this.syncInputFromDisplayed();
    this.invalidate();
  }

  setReducedMotion(value: boolean) {
    this.reduced = value;
    if (!value) return;
    if (this.orbitSmoothingActive) this.snapDisplayedToInput();
    if (this.transition.isActive()) this.setCamera(this.preset, true);
    if (this.model.isExplodeAnimating()) {
      const previousPose = this.model.getExplodeProgress();
      this.model.setExplodeTarget(this.model.getExplodeTarget(), true);
      this.shadowDirty ||= this.model.getExplodeProgress() !== previousPose;
    }
    if (this.model.getViewMode() === 'hero_switch') {
      const previousPose = this.model.getHeroPoseProgress();
      const state = this.model.getHeroSwitchMechanicalState();
      this.model.setHeroSwitchPresentation(state.pose, true);
      this.model.setHeroSwitchPressed(state.phase === 'pressing' || state.phase === 'bottomed', true);
      this.shadowDirty ||= this.model.getHeroPoseProgress() !== previousPose;
    }
    this.invalidate();
  }

  isMotionActive(): boolean {
    return this.orbitSmoothingActive || this.transition.isActive() || this.model.isExplodeAnimating();
  }

  getTransitionDurationMs(): number {
    return this.transition.getDurationMs();
  }

  present() {
    this.lifetime.signal.throwIfAborted();
    if (this.renderer.getContext().isContextLost()) throw new Error('WebGL context lost before first frame');
    this.render(performance.now());
    this.presented = true;
  }

  /** Advance one deterministic frame at timestamp `now` (returns true while motion remains active). */
  step(now: number): boolean {
    if (this.disposed) return false;
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    return this.render(now, false);
  }

  invalidate = () => {
    if (this.frame || !this.presented || this.disposed) return;
    this.frame = requestAnimationFrame((now) => {
      this.frame = 0;
      if (this.disposed) return;
      try {
        this.render(now, true);
      } catch {
        this.lifetime.fail('renderer');
      }
    });
  };

  private updateOrbitDamping(now: number): boolean {
    if (!this.orbitSmoothingActive) return false;
    if (this.reduced) {
      this.snapDisplayedToInput();
      return false;
    }

    const lastInput = this.orbitInputEventMs ?? now;
    if (now - lastInput >= ORBIT_MAX_SETTLE_MS) {
      this.snapDisplayedToInput();
      return false;
    }
    const dt = Math.min(ORBIT_MAX_DT_MS, Math.max(0, now - (this.orbitLastFrameMs ?? lastInput)));
    this.orbitLastFrameMs = now;

    this.scratchDesiredOffset.copy(this.orbitInputCamera.position).sub(this.controls.target);
    this.scratchCurrentOffset.copy(this.camera.position).sub(this.displayedTarget);
    this.scratchDesiredSpherical.setFromVector3(this.scratchDesiredOffset);
    this.scratchCurrentSpherical.setFromVector3(this.scratchCurrentOffset);

    const dPhi = this.scratchDesiredSpherical.phi - this.scratchCurrentSpherical.phi;
    const dTheta = Math.atan2(
      Math.sin(this.scratchDesiredSpherical.theta - this.scratchCurrentSpherical.theta),
      Math.cos(this.scratchDesiredSpherical.theta - this.scratchCurrentSpherical.theta),
    );
    const targetDist = this.displayedTarget.distanceTo(this.controls.target);
    if (
      Math.abs(dPhi) < ORBIT_ANGLE_EPSILON &&
      Math.abs(dTheta) < ORBIT_ANGLE_EPSILON &&
      targetDist < ORBIT_TARGET_EPSILON
    ) {
      this.snapDisplayedToInput();
      return false;
    }

    const alpha = 1 - Math.pow(0.5, dt / ORBIT_DAMPING_HALF_LIFE_MS);
    const nextPhi = this.scratchCurrentSpherical.phi + dPhi * alpha;
    const nextTheta = this.scratchCurrentSpherical.theta + dTheta * alpha;
    // Zoom radius stays direct; only orbit orientation and pan target damp.
    const directRadius = this.scratchDesiredSpherical.radius;
    this.displayedTarget.lerp(this.controls.target, alpha);
    this.scratchCurrentSpherical.set(directRadius, nextPhi, nextTheta);
    this.scratchCurrentOffset.setFromSpherical(this.scratchCurrentSpherical);
    this.camera.position.copy(this.displayedTarget).add(this.scratchCurrentOffset);
    this.camera.lookAt(this.displayedTarget);
    this.camera.updateMatrixWorld(true);
    return true;
  }

  private render(now: number, scheduleNext = true): boolean {
    if (this.disposed) return false;
    let cameraMoving = false;
    if (this.transition.isActive()) {
      cameraMoving = this.transition.update(now, this.camera, this.displayedTarget);
      this.applyProjection(this.camera);
      this.syncInputFromDisplayed();
    } else if (this.orbitSmoothingActive) {
      cameraMoving = this.updateOrbitDamping(now);
    }

    const previousPose = this.model.getExplodeProgress();
    const previousHeroPose = this.model.getHeroPoseProgress();
    const moving = this.model.update(now);
    const pose = this.model.getExplodeProgress();
    this.shadowDirty ||= pose !== previousPose || this.model.getHeroPoseProgress() !== previousHeroPose;
    this.ground.updateLayout({
      isHero: this.model.getViewMode() === 'hero_switch',
      explodeProgress: pose,
      bottomOffsetY: this.model.getBottomChassisOffsetY(),
    });
    // Coalesce pose changes into one bake at rest. Orbit, finish and key motion never invalidate it.
    if (this.shadowDirty && !moving && this.model.getTimings().length) {
      if (this.tier === 'standard') this.ground.bakeCachedShadow(this.renderer, this.scene);
      this.shadowDirty = false;
    }
    this.renderer.render(this.scene, this.camera);
    const needsMore = moving || cameraMoving || this.transition.isActive() || this.orbitSmoothingActive;
    if (scheduleNext && needsMore) this.invalidate();
    return needsMore;
  }

  private onControlsChange = () => {
    if (this.syncingControls || this.disposed) return;
    this.userOrbited = true;
    if (this.transition.isActive()) {
      this.transition.cancel();
    }
    if (this.reduced) {
      this.snapDisplayedToInput();
      this.invalidate();
      return;
    }

    // Apply zoom radius immediately so wheel/pinch zoom stays direct while orbit angles smooth.
    this.scratchDesiredOffset.copy(this.orbitInputCamera.position).sub(this.controls.target);
    this.scratchCurrentOffset.copy(this.camera.position).sub(this.displayedTarget);
    const desiredRadius = this.scratchDesiredOffset.length();
    const currentRadius = this.scratchCurrentOffset.length();
    if (currentRadius > 1e-6 && Math.abs(desiredRadius - currentRadius) > 1e-6) {
      this.scratchCurrentOffset.multiplyScalar(desiredRadius / currentRadius);
      this.camera.position.copy(this.displayedTarget).add(this.scratchCurrentOffset);
      this.camera.lookAt(this.displayedTarget);
      this.camera.updateMatrixWorld(true);
    }

    // Check whether only zoom changed (already applied directly -> snap cleanly with 0 damping tail).
    this.scratchDesiredSpherical.setFromVector3(this.scratchDesiredOffset);
    this.scratchCurrentSpherical.setFromVector3(this.scratchCurrentOffset);
    const dPhi = Math.abs(this.scratchDesiredSpherical.phi - this.scratchCurrentSpherical.phi);
    const dTheta = Math.abs(
      Math.atan2(
        Math.sin(this.scratchDesiredSpherical.theta - this.scratchCurrentSpherical.theta),
        Math.cos(this.scratchDesiredSpherical.theta - this.scratchCurrentSpherical.theta),
      ),
    );
    const targetDist = this.displayedTarget.distanceTo(this.controls.target);
    if (dPhi < ORBIT_ANGLE_EPSILON && dTheta < ORBIT_ANGLE_EPSILON && targetDist < ORBIT_TARGET_EPSILON) {
      this.snapDisplayedToInput();
      this.invalidate();
      return;
    }

    this.orbitSmoothingActive = true;
    this.orbitInputEventMs = performance.now();
    this.invalidate();
  };

  // OrbitControls emits the same start event for a wheel tick and a new drag.
  private captureWheel = (event: WheelEvent) => { this.wheelEvent = event; };

  private interrupt = () => {
    if (this.syncingControls || this.disposed) return;
    this.userOrbited = true;
    const fromWheel = Boolean(this.wheelEvent?.eventPhase);
    this.wheelEvent = undefined;
    const wasTransitioning = this.transition.isActive();
    if (fromWheel && !wasTransitioning) return;
    const wasAnimating = wasTransitioning || this.orbitSmoothingActive;
    this.transition.cancel();
    this.clearOrbitSmoothing();
    // Rebase OrbitControls from the displayed camera pose so interruptions never jump.
    if (wasAnimating) {
      this.syncInputFromDisplayed();
    }
  };

  private contextLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.transition.cancel();
    this.clearOrbitSmoothing();
    this.lifetime.fail('context-lost');
  };

  dispose() {
    if (this.disposed) return;
    this.disposeStageResources();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private disposeStageResources() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.transition.cancel();
    this.clearOrbitSmoothing();
    this.observer?.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    this.renderer.domElement.removeEventListener('wheel', this.captureWheel, true);
    this.wheelEvent = undefined;
    this.controls.removeEventListener('change', this.onControlsChange);
    this.controls.removeEventListener('start', this.interrupt);
    this.controls.dispose();
    this.scene.environment = null;
    this.scene.background = null;
    this.ground.dispose();
    disposeStudioLights(this.lights);
    this.model.dispose();
  }
}
