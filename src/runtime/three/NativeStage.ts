import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ViewportMount } from '../types';
import type { AssetPackage } from './assets';
import { ProductionScene, type LookdevQualityTier, type ViewMode } from './ProductionScene';
import { StudioGroundSystem } from './contactShadow';
import { CAMERA_PRESETS, CameraTransitionController, createStudioLights, disposeStudioLights, type CameraPresetId } from './lighting';
import { effectiveExposure, STUDIO_PROFILES, type StudioProfileId } from './studioProfiles';

export class NativeStage {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly model: ProductionScene;
  readonly ground: StudioGroundSystem;
  readonly controls: OrbitControls;
  private readonly lights: ReturnType<typeof createStudioLights>;
  private readonly transition = new CameraTransitionController();
  private readonly observer: ResizeObserver;
  private frame = 0;
  private presented = false;
  private disposed = false;
  private shadowDirty = true;
  private aspect = 1;
  private preset: CameraPresetId = 'threeQuarter';
  private profile?: StudioProfileId;
  private reduced: boolean;
  private tier: LookdevQualityTier = 'standard';

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
    renderer.domElement.setAttribute('aria-label', 'Interactive product preview. Use Shift and arrow keys to orbit.');
    renderer.domElement.tabIndex = 0;
    renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    container.append(renderer.domElement);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    // Change events invalidate one frame. Damping would require a separate settle loop.
    this.controls.enableDamping = false;
    this.controls.listenToKeyEvents(renderer.domElement);
    this.controls.addEventListener('change', this.invalidate);
    this.controls.addEventListener('start', this.interrupt);
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = container;
      if (!width || !height || this.disposed) return;
      const aspect = width / height;
      if (this.presented && aspect !== this.aspect) {
        // Refit the canonical framing on orientation/viewport changes.
        this.aspect = aspect;
        this.setCamera(this.preset, true);
      } else {
        this.aspect = aspect;
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
      }
      renderer.setSize(width, height, false);
      this.invalidate();
    };
    this.observer = new ResizeObserver(resize);
    this.observer.observe(container);
    resize();
  }

  async setQuality(tier: 'balanced' | 'standard') {
    this.tier = tier;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === 'balanced' ? 1 : 1.5));
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
      this.scene.background = new THREE.Color(spec.backgroundHex);
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

  setCamera(preset: CameraPresetId, instant = false) {
    this.preset = preset;
    this.controls.minDistance = preset === 'heroSwitch' ? 0.015 : 0.08;
    this.controls.maxDistance = preset === 'heroSwitch' ? 0.25 : 1.6;
    this.transition.start(this.camera, this.controls.target, CAMERA_PRESETS[preset], this.aspect, {
      instant: instant || this.reduced,
    });
    if (!this.transition.isActive()) this.controls.update();
    this.invalidate();
  }

  setReducedMotion(value: boolean) {
    this.reduced = value;
    if (!value) return;
    if (this.transition.isActive()) this.setCamera(this.preset, true);
    this.model.setExplodeTarget(this.model.getViewMode() === 'exploded' ? 1 : 0, true);
    this.shadowDirty = true;
    this.invalidate();
  }

  present() {
    this.lifetime.signal.throwIfAborted();
    if (this.renderer.getContext().isContextLost()) throw new Error('WebGL context lost before first frame');
    this.render(performance.now());
    this.presented = true;
  }

  invalidate = () => {
    if (this.frame || !this.presented || this.disposed) return;
    this.frame = requestAnimationFrame((now) => {
      this.frame = 0;
      try {
        this.render(now);
      } catch {
        this.lifetime.fail('renderer');
      }
    });
  };

  private render(now: number) {
    const cameraMoving = this.transition.isActive();
    this.transition.update(now, this.camera, this.controls.target);
    if (cameraMoving) this.controls.update();
    const previousPose = this.model.getExplodeProgress();
    const moving = this.model.update(now);
    const pose = this.model.getExplodeProgress();
    this.shadowDirty ||= pose !== previousPose;
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
    if (moving || this.transition.isActive()) this.invalidate();
  }

  private interrupt = () => this.transition.cancel();

  private contextLost = (event: Event) => {
    event.preventDefault();
    this.lifetime.fail('context-lost');
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    this.controls.dispose();
    this.scene.environment = null;
    this.scene.background = null;
    this.ground.dispose();
    disposeStudioLights(this.lights);
    this.model.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
