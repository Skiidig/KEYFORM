/**
 * KF-003C-B3 — Modular Studio Environment & Color Pipeline Architecture.
 *
 * Implements the three established KEYFORM HYBRID visual directions:
 *   1. `atelier`      — The Atelier (Build Studio reference, warm limestone studio)
 *   2. `formFunction` — Form / Function (Mechanical Anatomy, bright architectural neutral)
 *   3. `afterHours`   — After Hours (Switch Lab / editorial hero, dark neutral-green studio)
 *
 * Resource discipline:
 *   - Procedural studio light-card environments with soft-feathered silk diffusers
 *     (zero external HDRI files, zero extra network transfer).
 *   - `formFunction` and `atelier` share a single cached `neutralStudio` PMREM cubemap.
 *   - `afterHours` uses a dedicated `afterHours` PMREM cubemap, lazily generated on first use.
 *   - Zero per-frame PMREM generation. Explicit ownership and complete GPU disposal.
 *   - Exposure is fixed per studio profile and NEVER changes when enclosure finishes switch.
 */
import * as THREE from 'three';

export type StudioProfileId = 'atelier' | 'formFunction' | 'afterHours';
export type EnvironmentFamilyId = 'neutralStudio' | 'afterHours';
export type ToneMappingMode = 'agx' | 'neutral' | 'aces';

export interface DirectionalRigSpec {
  color: string;
  intensity: number;
  position: [number, number, number];
}

export interface StudioProfileSpec {
  id: StudioProfileId;
  label: string;
  destination: string;
  envFamily: EnvironmentFamilyId;
  /** Solid backdrop clear color (also blends seamlessly with the cyclorama ground edge). */
  backgroundHex: string;
  /** Center luminous tint of the studio floor sweep directly beneath the product. */
  floorCenterHex: string;
  /** Outer sweep tint fading into backgroundHex. */
  floorEdgeHex: string;
  /** Soft shadow tint multiplied into the studio floor / contact shadow. */
  shadowColorHex: string;
  /** Overall contact shadow opacity for assembled state. */
  shadowOpacity: number;
  /** Environment IBL intensity (keyboard vs hero switch). */
  envIntensity: number;
  heroEnvIntensity: number;
  /** Fixed exposure per profile (never auto-adjusted by enclosure preset). */
  exposure: number;
  /** Slight exposure tweak per tone mapper so A/B/C operator comparisons stay fair. */
  toneMappingExposureScale: Record<ToneMappingMode, number>;
  /** Hemisphere fill light. */
  hemi: { skyHex: string; groundHex: string; intensity: number };
  /** Keyboard directional rig (positions in glTF meters, +X right, +Y up, -Z rear). */
  lights: {
    key: DirectionalRigSpec;
    fill: DirectionalRigSpec;
    rim: DirectionalRigSpec;
  };
  /** Hero switch directional rig (calibrated for 15.3 mm switch macro scale). */
  heroLights: {
    key: DirectionalRigSpec;
    fill: DirectionalRigSpec;
    rim: DirectionalRigSpec;
    hemiIntensity: number;
  };
}

export const STUDIO_PROFILES: Record<StudioProfileId, StudioProfileSpec> = {
  atelier: {
    id: 'atelier',
    label: 'The Atelier',
    destination: 'Build Studio',
    envFamily: 'neutralStudio',
    backgroundHex: '#ECE9E1',
    floorCenterHex: '#F4F2EC',
    floorEdgeHex: '#DCD9D0',
    shadowColorHex: '#201F1B',
    shadowOpacity: 0.40,
    envIntensity: 1.28,
    heroEnvIntensity: 1.22,
    exposure: 1.04,
    toneMappingExposureScale: { agx: 1.0, neutral: 0.96, aces: 0.95 },
    hemi: { skyHex: '#FDFBF6', groundHex: '#C5C0B4', intensity: 0.36 },
    lights: {
      key: { color: '#FFFDF8', intensity: 2.38, position: [-0.28, 0.56, 0.30] },
      fill: { color: '#F0F5FA', intensity: 0.60, position: [0.44, 0.32, 0.26] },
      rim: { color: '#FFF3E2', intensity: 1.44, position: [0.08, 0.34, -0.44] },
    },
    heroLights: {
      key: { color: '#FFFDF8', intensity: 2.15, position: [-0.04, 0.06, 0.045] },
      fill: { color: '#F0F5FA', intensity: 0.72, position: [0.045, 0.032, 0.032] },
      rim: { color: '#FFF2E0', intensity: 1.26, position: [-0.02, 0.038, -0.045] },
      hemiIntensity: 0.54,
    },
  },
  formFunction: {
    id: 'formFunction',
    label: 'Form / Function',
    destination: 'Mechanical Anatomy',
    envFamily: 'neutralStudio',
    backgroundHex: '#F1F1EC',
    floorCenterHex: '#F6F6F2',
    floorEdgeHex: '#E0E1DB',
    shadowColorHex: '#222624',
    shadowOpacity: 0.34,
    envIntensity: 1.32,
    heroEnvIntensity: 1.24,
    exposure: 1.05,
    toneMappingExposureScale: { agx: 1.0, neutral: 0.96, aces: 0.95 },
    hemi: { skyHex: '#FFFFFF', groundHex: '#CFD2CA', intensity: 0.44 },
    lights: {
      key: { color: '#FAFDFF', intensity: 2.22, position: [-0.26, 0.62, 0.30] },
      fill: { color: '#FAF8F2', intensity: 0.72, position: [0.46, 0.34, 0.26] },
      rim: { color: '#FFF6E8', intensity: 1.38, position: [0.06, 0.36, -0.44] },
    },
    heroLights: {
      key: { color: '#FAFDFF', intensity: 2.08, position: [-0.042, 0.064, 0.042] },
      fill: { color: '#FAF9F4', intensity: 0.84, position: [0.048, 0.036, 0.030] },
      rim: { color: '#FFF6EA', intensity: 1.20, position: [-0.018, 0.040, -0.046] },
      hemiIntensity: 0.64,
    },
  },
  afterHours: {
    id: 'afterHours',
    label: 'After Hours',
    destination: 'Switch Lab',
    envFamily: 'afterHours',
    backgroundHex: '#080A09',
    floorCenterHex: '#1F2523',
    floorEdgeHex: '#080A09',
    shadowColorHex: '#020303',
    shadowOpacity: 0.86,
    envIntensity: 1.08,
    heroEnvIntensity: 1.32,
    exposure: 1.08,
    toneMappingExposureScale: { agx: 1.0, neutral: 0.97, aces: 0.96 },
    hemi: { skyHex: '#A2B6AD', groundHex: '#121715', intensity: 0.34 },
    lights: {
      // Mirrors kf01_kf003b_prod.blend KF01 | AFTER HOURS Set: crisp cool overhead key,
      // restrained warm grazing rear rim, controlled cool right edge, low warm front lift.
      key: { color: '#ECF6FF', intensity: 2.40, position: [-0.28, 0.52, 0.24] },
      fill: { color: '#FFF6EA', intensity: 0.68, position: [-0.18, 0.18, 0.44] },
      rim: { color: '#FFE0BA', intensity: 1.78, position: [0.10, 0.26, -0.42] },
    },
    heroLights: {
      // Mirrors KF01 | AFTER HOURS Switch Set: cool top key, warm copper rim, cool rear edge.
      key: { color: '#EEF7FF', intensity: 2.45, position: [-0.036, 0.048, 0.036] },
      fill: { color: '#FFF7EC', intensity: 0.68, position: [0.008, 0.016, 0.046] },
      rim: { color: '#FFD8A8', intensity: 2.05, position: [0.038, 0.022, -0.026] },
      hemiIntensity: 0.40,
    },
  },
};

export function resolveThreeToneMapping(mode: ToneMappingMode): THREE.ToneMapping {
  switch (mode) {
    case 'neutral':
      return THREE.NeutralToneMapping;
    case 'aces':
      return THREE.ACESFilmicToneMapping;
    case 'agx':
    default:
      return THREE.AgXToneMapping;
  }
}

export function effectiveExposure(profile: StudioProfileSpec, toneMapping: ToneMappingMode): number {
  return Number((profile.exposure * profile.toneMappingExposureScale[toneMapping]).toFixed(4));
}

/**
 * Create a tiny 64x64 procedural silk-diffused softbox falloff alpha/intensity texture.
 * Soft-edged studio light cards eliminate harsh rectangular "window" reflections on
 * curved anodized aluminium chamfers and the rotary encoder top.
 */
function createSoftboxTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let y = 0; y < size; y += 1) {
    const ny = (y / (size - 1)) * 2 - 1;
    const fy = Math.pow(Math.max(0, 1 - ny * ny), 0.72);
    for (let x = 0; x < size; x += 1) {
      const nx = (x / (size - 1)) * 2 - 1;
      const fx = Math.pow(Math.max(0, 1 - nx * nx), 0.72);
      // Slight bright core rolloff like a diffused double-baffle photographic softbox
      const v = Math.min(1, fx * fy * 1.12);
      const byte = Math.round(Math.pow(v, 0.85) * 255);
      const idx = 4 * (y * size + x);
      data[idx] = byte;
      data[idx + 1] = byte;
      data[idx + 2] = byte;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

interface LightCardSpec {
  position: [number, number, number];
  lookAt: [number, number, number];
  scale: [number, number];
  color: string;
  intensity: number;
}

function addSoftboxCard(
  scene: THREE.Scene,
  geom: THREE.PlaneGeometry,
  softboxTex: THREE.Texture,
  materials: THREE.Material[],
  spec: LightCardSpec,
) {
  const col = new THREE.Color(spec.color).multiplyScalar(spec.intensity);
  const mat = new THREE.MeshBasicMaterial({
    color: col,
    map: softboxTex,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  materials.push(mat);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...spec.position);
  mesh.scale.set(spec.scale[0], spec.scale[1], 1);
  mesh.lookAt(...spec.lookAt);
  scene.add(mesh);
}

/**
 * Build a procedural studio environment scene for PMREM baking.
 * Positions are expressed on a ~10 m studio dome surrounding the origin so reflections
 * remain crisp and physically proportioned for desktop product photography.
 */
function buildStudioEnvironmentScene(family: EnvironmentFamilyId): {
  scene: THREE.Scene;
  dispose: () => void;
} {
  const scene = new THREE.Scene();
  const planeGeom = new THREE.PlaneGeometry(1, 1);
  const roomGeom = new THREE.BoxGeometry(22, 16, 22);
  const floorGeom = new THREE.CircleGeometry(10, 32);
  const softboxTex = createSoftboxTexture();
  const materials: THREE.Material[] = [];

  if (family === 'neutralStudio') {
    // Controlled architectural neutral studio dome: dark enough to sculpt anodized chamfers,
    // Titanium sidewalls, Brass weight, and knurled encoder without pulling Titanium too dark.
    const roomMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#727774'),
      side: THREE.BackSide,
      toneMapped: false,
    });
    materials.push(roomMat);
    const room = new THREE.Mesh(roomGeom, roomMat);
    room.position.set(0, 2.5, 0);
    scene.add(room);

    // Balanced tabletop bounce in the lower hemisphere keeps undersides sculptural and bright silver on Titanium.
    const floorMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#B5B2A9'),
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    materials.push(floorMat);
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -3.2, 0);
    scene.add(floor);

    // Deliberate negative-fill studio flags placed at grazing reflection angles for
    // anodized bevels, Titanium sidewalls, and the rear USB-C wall.
    const negFlagMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#262B28'),
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    materials.push(negFlagMat);
    const negLeft = new THREE.Mesh(planeGeom, negFlagMat);
    negLeft.position.set(-7.6, 1.4, 3.8);
    negLeft.scale.set(5.8, 4.2, 1);
    negLeft.lookAt(0, 0, 0);
    scene.add(negLeft);

    const negFront = new THREE.Mesh(planeGeom, negFlagMat);
    negFront.position.set(2.4, 0.7, 8.4);
    negFront.scale.set(5.8, 2.4, 1);
    negFront.lookAt(0, 0, 0);
    scene.add(negFront);

    const negRearLeft = new THREE.Mesh(planeGeom, negFlagMat);
    negRearLeft.position.set(-6.4, 1.2, -5.8);
    negRearLeft.scale.set(5.2, 3.8, 1);
    negRearLeft.lookAt(0, 0, 0);
    scene.add(negRearLeft);

    // Deliberate photographic linear softbox bank (narrower ribbons, stronger contrast
    // matching Cycles A03 / B03 / A07b metal reflection gradients)
    const cards: LightCardSpec[] = [
      // Primary overhead linear silk softbox (luminous satin sweep across bezel, Titanium & brass weight)
      { position: [-1.4, 6.2, 1.4], lookAt: [0, 0, 0], scale: [11.4, 4.2], color: '#FAFDFF', intensity: 8.2 },
      // Crisp warm rear grazing strip (ignites 1.2 mm perimeter chamfer, rear edge & brass weight)
      { position: [0.6, 3.5, -6.4], lookAt: [0, 0, 0], scale: [12.0, 2.4], color: '#FFF5E6', intensity: 6.6 },
      // Focused right vertical specular strip (rakes across 48-tooth knurled encoder & right chamfer)
      { position: [6.4, 2.8, 1.0], lookAt: [0, 0, 0], scale: [3.4, 6.4], color: '#EEF6FF', intensity: 5.8 },
      // Front-right grazing kicker (catches visible front-right diamond knurl facets on the rotary dial)
      { position: [5.0, 1.9, 4.8], lookAt: [0, 0, 0], scale: [2.4, 3.4], color: '#F5F9FD', intensity: 4.4 },
      // Controlled warm front-left fill card (keeps Titanium bright-silver and dark finishes sculptural)
      { position: [-1.6, 2.5, 6.8], lookAt: [0, 0, 0], scale: [7.8, 2.8], color: '#FFFBF2', intensity: 3.6 },
      // Cool left-upper accent panel (sculpts left bevel & exploded switch plate strata)
      { position: [-6.4, 4.8, -1.2], lookAt: [0, 0, 0], scale: [4.6, 3.6], color: '#F2F7FA', intensity: 3.6 },
    ];
    for (const card of cards) addSoftboxCard(scene, planeGeom, softboxTex, materials, card);
  } else {
    // After Hours — dark architectural obsidian-green studio with controlled precision light strips
    const roomMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#0E1311'),
      side: THREE.BackSide,
      toneMapped: false,
    });
    materials.push(roomMat);
    const room = new THREE.Mesh(roomGeom, roomMat);
    room.position.set(0, 2.5, 0);
    scene.add(room);

    // Subtle matte obsidian tabletop bounce so dark metals keep dimension underneath
    const floorMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#1B221F'),
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    materials.push(floorMat);
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -3.2, 0);
    scene.add(floor);

    const cards: LightCardSpec[] = [
      // Long cool-neutral overhead linear softbox (hero specular ribbon across bevel, keycaps & PC lid)
      { position: [-2.4, 5.4, 1.8], lookAt: [0, 0, 0], scale: [10.4, 3.5], color: '#ECF6FF', intensity: 6.4 },
      // Restrained warm grazing rear strip (separates silhouette + warms brass & copper accents)
      { position: [0.3, 2.9, -6.3], lookAt: [0, 0, 0], scale: [11.2, 2.0], color: '#FFDFB5', intensity: 5.2 },
      // Crisp cool right edge strip (sculpts rotary encoder knurl & right anodized bezel like A01)
      { position: [6.2, 2.5, 1.2], lookAt: [0, 0, 0], scale: [4.0, 3.0], color: '#E0F2FF', intensity: 4.6 },
      // Low warm front lift bounce (keeps dark anodized Forest and Charcoal PBT legible, never crushed)
      { position: [-2.0, 1.9, 6.5], lookAt: [0, 0, 0], scale: [7.0, 2.6], color: '#FFF4E4', intensity: 2.1 },
      // Cool left-rear secondary rim (adds glass-like sheen to translucent hero switch lid)
      { position: [-6.0, 3.1, -3.2], lookAt: [0, 0, 0], scale: [4.2, 3.2], color: '#D6EBFF', intensity: 3.4 },
    ];
    for (const card of cards) addSoftboxCard(scene, planeGeom, softboxTex, materials, card);
  }

  return {
    scene,
    dispose() {
      planeGeom.dispose();
      roomGeom.dispose();
      floorGeom.dispose();
      softboxTex.dispose();
      for (const m of materials) m.dispose();
      scene.clear();
    },
  };
}

export interface EnvironmentTelemetry {
  activeFamily: EnvironmentFamilyId | null;
  cachedFamilies: EnvironmentFamilyId[];
  bakeCount: number;
  bakeTimingsMs: Partial<Record<EnvironmentFamilyId, number>>;
}

/**
 * Build a subtle, seamless photographic studio cyclorama sweep texture for light studios.
 * Mirrors Cycles A03 / B03 / A05 infinity-paper tonal roll-off (gentle upper studio shadow
 * transitioning into a luminous neutral tabletop pool) with zero horizon line or glow.
 */
function createStudioCycloramaTexture(profile: StudioProfileSpec): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const topCol = profile.id === 'formFunction' ? '#C7CAC4' : '#C9C7BE';
  const upperMid = profile.id === 'formFunction' ? '#E4E5DF' : '#E3E0D7';
  const centerPool = profile.floorCenterHex;
  const lowerEdge = profile.floorEdgeHex;

  // Gentle vertical infinity-paper studio falloff
  const vGrad = ctx.createLinearGradient(0, 0, 0, h);
  vGrad.addColorStop(0.0, topCol);
  vGrad.addColorStop(0.28, upperMid);
  vGrad.addColorStop(0.62, centerPool);
  vGrad.addColorStop(1.0, lowerEdge);
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle off-center overhead softbox pool behind the product silhouette
  const rGrad = ctx.createRadialGradient(w * 0.52, h * 0.56, w * 0.04, w * 0.52, h * 0.56, w * 0.68);
  rGrad.addColorStop(0.0, 'rgba(255, 254, 250, 0.36)');
  rGrad.addColorStop(0.55, 'rgba(255, 254, 250, 0.08)');
  rGrad.addColorStop(1.0, 'rgba(32, 34, 31, 0.06)');
  ctx.fillStyle = rGrad;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Owns procedural studio PMREM generation, light-studio cyclorama backdrops, caching,
 * and deterministic GPU disposal. Never generates textures per frame.
 */
export class StudioEnvironmentManager {
  private targets = new Map<EnvironmentFamilyId, THREE.WebGLRenderTarget>();
  private backdrops = new Map<StudioProfileId, THREE.CanvasTexture>();
  private activeFamily: EnvironmentFamilyId | null = null;
  private bakeCount = 0;
  private bakeTimingsMs: Partial<Record<EnvironmentFamilyId, number>> = {};
  private disposed = false;

  getEnvironment(renderer: THREE.WebGLRenderer, profileId: StudioProfileId): THREE.Texture {
    if (this.disposed) {
      throw new Error('StudioEnvironmentManager used after dispose');
    }
    const family = STUDIO_PROFILES[profileId].envFamily;
    this.activeFamily = family;
    const cached = this.targets.get(family);
    if (cached) return cached.texture;

    const t0 = performance.now();
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const built = buildStudioEnvironmentScene(family);
    // Tighter blur sigma on neutralStudio keeps metallic reflection strips crisp on Titanium,
    // Brass, and the knurled encoder while staying silky smooth on bead-blasted surfaces.
    const sigma = family === 'neutralStudio' ? 0.018 : 0.032;
    const target = pmrem.fromScene(built.scene, sigma);
    built.dispose();
    pmrem.dispose();

    this.targets.set(family, target);
    this.bakeCount += 1;
    this.bakeTimingsMs[family] = Number((performance.now() - t0).toFixed(2));
    return target.texture;
  }

  getBackdrop(profileId: StudioProfileId): THREE.Texture | THREE.Color {
    if (this.disposed) {
      throw new Error('StudioEnvironmentManager used after dispose');
    }
    const spec = STUDIO_PROFILES[profileId];
    if (profileId === 'afterHours') {
      return new THREE.Color(spec.backgroundHex);
    }
    const cached = this.backdrops.get(profileId);
    if (cached) return cached;
    const tex = createStudioCycloramaTexture(spec);
    this.backdrops.set(profileId, tex);
    return tex;
  }

  getTelemetry(): EnvironmentTelemetry {
    return {
      activeFamily: this.activeFamily,
      cachedFamilies: [...this.targets.keys()],
      bakeCount: this.bakeCount,
      bakeTimingsMs: { ...this.bakeTimingsMs },
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const target of this.targets.values()) {
      target.dispose();
    }
    this.targets.clear();
    for (const tex of this.backdrops.values()) {
      tex.dispose();
    }
    this.backdrops.clear();
    this.activeFamily = null;
  }
}
