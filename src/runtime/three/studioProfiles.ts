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
    floorCenterHex: '#F6F4EE',
    floorEdgeHex: '#ECE9E1',
    shadowColorHex: '#23221D',
    shadowOpacity: 0.56,
    envIntensity: 1.14,
    heroEnvIntensity: 1.18,
    exposure: 1.04,
    toneMappingExposureScale: { agx: 1.0, neutral: 0.96, aces: 0.95 },
    hemi: { skyHex: '#FDFBF6', groundHex: '#D6D2C7', intensity: 0.64 },
    lights: {
      key: { color: '#FFFDF8', intensity: 2.05, position: [-0.26, 0.58, 0.30] },
      fill: { color: '#F3F7FB', intensity: 0.78, position: [0.44, 0.34, 0.24] },
      rim: { color: '#FFF5E8', intensity: 1.12, position: [0.06, 0.34, -0.44] },
    },
    heroLights: {
      key: { color: '#FFFDF8', intensity: 2.05, position: [-0.04, 0.06, 0.045] },
      fill: { color: '#F0F5FA', intensity: 0.78, position: [0.045, 0.032, 0.032] },
      rim: { color: '#FFF2E0', intensity: 1.18, position: [-0.02, 0.038, -0.045] },
      hemiIntensity: 0.68,
    },
  },
  formFunction: {
    id: 'formFunction',
    label: 'Form / Function',
    destination: 'Mechanical Anatomy',
    envFamily: 'neutralStudio',
    backgroundHex: '#F1F1EC',
    floorCenterHex: '#F8F8F4',
    floorEdgeHex: '#F1F1EC',
    shadowColorHex: '#262A27',
    shadowOpacity: 0.44,
    envIntensity: 1.20,
    heroEnvIntensity: 1.22,
    exposure: 1.06,
    toneMappingExposureScale: { agx: 1.0, neutral: 0.96, aces: 0.95 },
    hemi: { skyHex: '#FFFFFF', groundHex: '#DCDED7', intensity: 0.84 },
    lights: {
      key: { color: '#FAFDFF', intensity: 1.88, position: [-0.24, 0.64, 0.30] },
      fill: { color: '#FAF9F4', intensity: 0.96, position: [0.46, 0.36, 0.26] },
      rim: { color: '#FFF8EE', intensity: 1.10, position: [0.04, 0.36, -0.44] },
    },
    heroLights: {
      key: { color: '#FAFDFF', intensity: 2.0, position: [-0.042, 0.064, 0.042] },
      fill: { color: '#FAF9F4', intensity: 0.92, position: [0.048, 0.036, 0.030] },
      rim: { color: '#FFF6EA', intensity: 1.12, position: [-0.018, 0.040, -0.046] },
      hemiIntensity: 0.82,
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
    // Warm architectural neutral studio cyclorama enclosing the dome
    const roomMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#D4D2CA'),
      side: THREE.BackSide,
      toneMapped: false,
    });
    materials.push(roomMat);
    const room = new THREE.Mesh(roomGeom, roomMat);
    room.position.set(0, 2.5, 0);
    scene.add(room);

    // Bright neutral studio tabletop bounce in the lower hemisphere so metals never reflect black underneath
    const floorMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#E6E3DA'),
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    materials.push(floorMat);
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -3.2, 0);
    scene.add(floor);

    // Controlled negative-fill flags give anodized aluminium & titanium crisp sculptural metallic contrast
    const negFlagMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#5A605D'),
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    materials.push(negFlagMat);
    const negLeft = new THREE.Mesh(planeGeom, negFlagMat);
    negLeft.position.set(-7.8, 1.3, 4.2);
    negLeft.scale.set(4.8, 3.6, 1);
    negLeft.lookAt(0, 0, 0);
    scene.add(negLeft);

    const negFront = new THREE.Mesh(planeGeom, negFlagMat);
    negFront.position.set(1.6, 0.6, 8.4);
    negFront.scale.set(5.4, 2.2, 1);
    negFront.lookAt(0, 0, 0);
    scene.add(negFront);

    // Photographic softbox bank (matched to Form/Function + Atelier Cycles light layout)
    const cards: LightCardSpec[] = [
      // Primary broad overhead silk softbox (luminous satin sweep across bezel, Titanium & brass weight)
      { position: [-1.4, 6.0, 1.4], lookAt: [0, 0, 0], scale: [10.6, 5.8], color: '#FAFDFF', intensity: 5.4 },
      // Wide warm rear grazing strip (sculpts top chamfer, encoder crown, rear edge)
      { position: [0.4, 3.8, -6.2], lookAt: [0, 0, 0], scale: [11.2, 3.4], color: '#FFF7EB', intensity: 4.3 },
      // Tall right vertical fill panel (illuminates encoder knurling & right side bevel)
      { position: [6.6, 2.9, 1.2], lookAt: [0, 0, 0], scale: [5.2, 6.4], color: '#F4F9FE', intensity: 3.4 },
      // Warm broad front bounce card (keeps Charcoal PBT and front seam tactile and readable)
      { position: [-0.8, 2.4, 6.8], lookAt: [0, 0, 0], scale: [8.8, 3.0], color: '#FFFBF4', intensity: 2.1 },
      // Soft left upper bounce
      { position: [-6.4, 4.4, -1.8], lookAt: [0, 0, 0], scale: [6.0, 4.6], color: '#F6FAF8', intensity: 2.4 },
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
 * Owns procedural studio PMREM generation, caching, and deterministic GPU disposal.
 * Never generates PMREM textures per frame; lazily bakes each family at most once per mount.
 */
export class StudioEnvironmentManager {
  private targets = new Map<EnvironmentFamilyId, THREE.WebGLRenderTarget>();
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
    // Low blur sigma preserves crisp softbox gradients while keeping rough metals smooth
    const target = pmrem.fromScene(built.scene, 0.032);
    built.dispose();
    pmrem.dispose();

    this.targets.set(family, target);
    this.bakeCount += 1;
    this.bakeTimingsMs[family] = Number((performance.now() - t0).toFixed(2));
    return target.texture;
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
    this.activeFamily = null;
  }
}
