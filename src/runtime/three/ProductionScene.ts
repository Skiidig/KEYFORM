/**
 * Production GLB asset controller from the approved KF-003C-B3 runtime.
 *
 * Loads the versioned production package:
 *   - Exterior (GRP_01, GRP_02, GRP_09) with cap-surface legends
 *   - Lazy internal (GRP_03 through GRP_08)
 *   - Standalone HERO_MX_Root switch
 *   - Optional macro encoder
 *   - Matched PNG atlas and legend JSON per tier
 *
 *   - Meshopt decodes the declared keyboard models. The standalone switch uses
 *     its own reference model. Loading failures surface to the static fallback.
 *   - Cap-surface legend masks are attached after instancing is built, so the extra
 *      `kfLegend*` instance attributes are sized per batch. No extra draw calls.
 *   - The geometric macro encoder is an explicit, optional detail presentation mounted
 *      under the existing `KF01_Knob_Rotary` owner; it never renders beside the baked
 *      standard encoder and never adds a second picking target.
 *
 * Key invariants enforced:
 *   1. Identity NEVER depends on GLB child ordering: all 81 keys, 1 encoder, and 9 assembly
 *      groups are indexed exclusively via glTF `extras` (`userData.keyId`, `userData.assemblyGroup`,
 *      `userData.kf01Role`).
 *   2. Exact piecewise-linear manifest keyframes drive assembled <-> exploded poses across
 *      all 9 groups plus `KF01_Gasket_TravelWithPlate` (+22 mm) and staged `GRP_07_USB_Daughterboard`
 *      withdrawal (frames 12 -> 24).
 *   3. Decorative selection helpers are explicitly excluded from raycasting (`raycast = () => {}`
 *      and omitted from the product pickable list).
 *   4. Enclosure finish switching mutates ONLY `MAT_Case_Anodized` and `MAT_Case_Mark`, leaving all
 *      81 Charcoal PBT keycaps, legends, knob, brass weight, and internals isolated.
 *   5. Complete GPU resource disposal on unmount/remount.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type {
  AssetManifest,
  AssetVariantPartitionKey,
  AssemblyGroupSpec,
  EnclosurePresetId,
  HeroSwitchVariantId,
  KeySpec,
  MotionKeyframe,
  Vec3,
} from '../types/manifest';
import {
  ENCLOSED_ROLES,
  InstancingRuntime,
  buildInstanceBatches,
  describeBatches,
  getSharedBatchMaterials,
  resetSharedBatchMaterials,
  setBatchInstanceColor,
  type BuildResult,
  type InstanceBatch,
  type InstanceRecord,
} from './instancing';
import {
  applyInstalledSwitchOpaqueOverride,
  type MaterialOverrideRecord,
  type OverrideInventory,
  type TransmissionInventory,
} from './materialOverrides';
import { attachLegendMask, readLegendTexture, type Inventory, type LegendMaskRuntime } from './legendMask';
import type { AssetPackage } from './assets';
import {
  StudioEnvironmentManager,
  type EnvironmentTelemetry,
  type StudioProfileId,
} from './studioProfiles';
import {
  ENCLOSURE_FINISH_CALIBRATION,
  applyCalibrationToMaterial,
  applySelectiveShadowPolicy,
  calibrateHeroLidVariant,
  calibratePartitionMaterials,
} from './materialCalibration';

export type AssetPartitionKey = 'exterior' | 'internal' | 'hero_switch';
export type ViewMode = 'exterior' | 'combined' | 'exploded' | 'hero_switch';
/** B3 quality policy tiers (plus B2.2 desktop/mobile aliases for backward compatibility). */
export type LookdevQualityTier = 'balanced' | 'standard' | 'high';
export type QualityTier = 'desktop' | 'mobile' | LookdevQualityTier;
/** Encoder presentation. `macro` is only valid while the optional asset is mounted. */
export type EncoderPresentation = 'standard' | 'macro';

export interface InstalledSwitchMaterialSpec {
  id: string;
  stemLinear: readonly [number, number, number];
  stemRoughness: number;
  housingLinear: readonly [number, number, number];
  housingRoughness: number;
  housingClearcoat: number;
  housingClearcoatRoughness: number;
  housingEnvMapIntensity: number;
}

export interface PlateMaterialSpec {
  id: string;
  colorHex: string;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  specularIntensity?: number;
  ior?: number;
  envMapIntensity: number;
}

export function resolveLookdevTier(tier: QualityTier): LookdevQualityTier {
  if (tier === 'mobile' || tier === 'balanced') return 'balanced';
  if (tier === 'high') return 'high';
  return 'standard';
}

export interface AssetLoadTiming {
  key: AssetPartitionKey | 'encoder_macro';
  url: string;
  bytes: number;
  fetchMs: number;
  parseMs: number;
  totalMs: number;
  uniqueGeometries: number;
  meshNodes: number;
  triangles: number;
  materials: number;
  /** Which asset variant actually served this partition. */
  tier: 'meshopt' | 'uncompressed';
}

export interface PickInfo {
  kind: 'key' | 'encoder' | 'assembly' | 'hero_switch';
  keyId: string | null;
  assemblyGroup: string | null;
  role: string | null;
  nodeName: string;
  materialName: string | null;
  keySpec: KeySpec | null;
}

export interface PickTestResult {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  failures: Array<{ keyId: string; got: string | null; reason: string }>;
}

/** KF-003C-B1 optimization telemetry for one asset partition. */
export interface InstancingPartitionReport {
  partition: AssetPartitionKey;
  sourceMeshNodes: number;
  replacedMeshNodes: number;
  batches: number;
  instances: number;
  duplicateGeometryMerges: number;
  geometryContents: number;
  elapsedMs: number;
  submittedTriangles: number;
  suppressedTriangles: number;
  motions: Record<string, number>;
  rows: Array<Record<string, unknown>>;
}

interface KeyRuntime {
  spec: KeySpec;
  capNode: THREE.Object3D;
  capRestPos: THREE.Vector3;
  capMeshes: THREE.Mesh[];
  stemNode: THREE.Object3D | null;
  stemRestPos: THREE.Vector3 | null;
  springNode: THREE.Object3D | null;
  springRestScaleY: number;
  stabSliders: Array<{ node: THREE.Object3D; restY: number }>;
  // Press envelope state
  pressing: boolean;
  pressStartMs: number;
  releaseStartMs: number;
  pressValue: number; // 0..1
}

const KEYPRESS_DOWN_MS = 45;
const KEYPRESS_UP_MS = 90;

/**
 * Validated standalone Hero Switch (HERO_MX_Root) mechanical geometry datums (m, glTF +Y up).
 * Measured directly from kf01_hero_switch_b21.reference.glb:
 *  - Lower housing rim top: 0.00489 m; spring seat floor: 0.00060..0.00300 m.
 *  - Upper housing cutaway t.y: 0.00980 m -> assembled seated t.y: 0.00489 m (lid top 0.01005 m).
 *  - Moving stem cutaway t.y: 0.01820 m -> assembled rest t.y: 0.00850 m (cross top 0.01570 m;
 *    center post bottom 0.00612 m rest, 0.00212 m at 4.0 mm bottom-out, clearing 0.00060 m floor).
 *  - HERO_MX_MoldedStemGuides sits at t=[0,0,0] inside the lower housing and MUST remain stationary.
 *  - Spring local Y spans [0.00464, 0.01012] m (5.48 mm free height); assembled base pins at Y=0.00100 m.
 */
const HERO_UPPER_NODES = new Set([
  'HERO_MX_PolycarbonateUpper',
  'HERO_MX_UpperCornerHooks',
  'HERO_MX_UpperReinforcingRibs',
]);
const HERO_STEM_NODES = new Set([
  'HERO_MX_POMCrossStem',
  'HERO_MX_POMSliderRunners',
  'HERO_MX_StemCenterPost',
]);
const HERO_SPRING_NODE = 'HERO_MX_VariablePitchSpring';
const HERO_GUIDES_NODE = 'HERO_MX_MoldedStemGuides';
const HERO_UPPER_ASSEMBLED_Y = 0.00489;
const HERO_STEM_ASSEMBLED_Y = 0.0085;
const HERO_SPRING_LOCAL_MIN_Y = 0.00464;
const HERO_SPRING_FREE_HEIGHT_M = 0.00548;
const HERO_SPRING_SEATED_BASE_Y = 0.001;
const HERO_POSE_MS = 220;

export const HERO_SWITCH_TRAVEL_SPECS: Record<
  HeroSwitchVariantId,
  { travelM: number; pretravelM: number; downMs: number; upMs: number }
> = {
  linear45: { travelM: 0.004, pretravelM: 0.002, downMs: 55, upMs: 95 },
  tactile58: { travelM: 0.0038, pretravelM: 0.002, downMs: 65, upMs: 105 },
  silent50: { travelM: 0.0037, pretravelM: 0.0019, downMs: 60, upMs: 115 },
};

export type HeroSwitchPose = 'cutaway' | 'assembled';
export type HeroSwitchPhase = 'idle' | 'pressing' | 'bottomed' | 'releasing';

function evalPiecewiseKeyframes(keyframes: MotionKeyframe[], tRaw: number): Vec3 {
  const t = Math.max(0, Math.min(1, tRaw));
  if (keyframes.length === 0) return [0, 0, 0];
  if (t <= keyframes[0].t) return keyframes[0].offset_gltf_m;
  const last = keyframes[keyframes.length - 1];
  if (t >= last.t) return last.offset_gltf_m;
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      const u = span > 1e-9 ? (t - a.t) / span : 0;
      return [
        a.offset_gltf_m[0] + u * (b.offset_gltf_m[0] - a.offset_gltf_m[0]),
        a.offset_gltf_m[1] + u * (b.offset_gltf_m[1] - a.offset_gltf_m[1]),
        a.offset_gltf_m[2] + u * (b.offset_gltf_m[2] - a.offset_gltf_m[2]),
      ];
    }
  }
  return last.offset_gltf_m;
}

function countSceneStats(root: THREE.Object3D) {
  const geoms = new Set<string>();
  const mats = new Set<string>();
  let meshNodes = 0;
  let triangles = 0;
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    meshNodes += 1;
    geoms.add(m.geometry.uuid);
    const idx = m.geometry.index;
    const pos = m.geometry.attributes.position;
    triangles += idx ? idx.count / 3 : pos ? pos.count / 3 : 0;
    const ml = Array.isArray(m.material) ? m.material : [m.material];
    ml.forEach((mat) => mat && mats.add(mat.uuid));
  });
  return {
    uniqueGeometries: geoms.size,
    meshNodes,
    triangles: Math.round(triangles),
    materials: mats.size,
  };
}

function disposeObjectTree(root: THREE.Object3D) {
  const geoms = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh || (obj as THREE.LineSegments).isLineSegments) {
      if (mesh.geometry) geoms.add(mesh.geometry);
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of list) {
        if (!m) continue;
        mats.add(m);
        for (const val of Object.values(m as unknown as Record<string, unknown>)) {
          if (val && typeof val === 'object' && (val as THREE.Texture).isTexture) {
            textures.add(val as THREE.Texture);
          }
        }
      }
    }
  });
  geoms.forEach((g) => g.dispose());
  const decodedImages = new Set<ImageBitmap>();
  textures.forEach((texture) => {
    const image: unknown = texture.source.data;
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) decodedImages.add(image);
    texture.dispose();
  });
  decodedImages.forEach((image) => image.close());
  mats.forEach((m) => m.dispose());
  root.clear();
}

export class ProductionScene {
  readonly root = new THREE.Group();
  readonly keyboardRoot = new THREE.Group();
  readonly heroRoot = new THREE.Group();
  readonly manifest: AssetManifest;

  // Meshopt decode path: the production exterior/internal/macro payloads are
  // EXT_meshopt_compression. The decoder is the only thing B2.2 adds to loading;
  // no coordinate, orientation or unit transforms are introduced.
  private loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  private exteriorScene: THREE.Group | null = null;
  private internalScene: THREE.Group | null = null;
  private heroScene: THREE.Group | null = null;

  private timings = new Map<AssetPartitionKey | 'encoder_macro', AssetLoadTiming>();
  private groupNodes = new Map<string, { node: THREE.Object3D; restPos: THREE.Vector3; spec: AssemblyGroupSpec }>();
  private gasketPivot: { node: THREE.Object3D; restPos: THREE.Vector3; keyframes: MotionKeyframe[] } | null = null;

  private keys = new Map<string, KeyRuntime>();
  private keysByDomCode = new Map<string, string>();
  private pickables: THREE.Object3D[] = [];

  private encoderKnob: { node: THREE.Object3D; restY: number } | null = null;
  private encoderShaft: { node: THREE.Object3D; restY: number } | null = null;
  private encoderDetent = 0;
  private encoderPushTarget = 0;
  private encoderPushCurrent = 0;

  private caseMaterials: THREE.MeshStandardMaterial[] = [];
  private caseMarkMaterials: THREE.MeshStandardMaterial[] = [];
  private keycapMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private plateMaterials: THREE.MeshStandardMaterial[] = [];
  private installedSwitchStemMaterial: THREE.MeshStandardMaterial | null = null;
  private installedSwitchHousingMaterial: THREE.MeshPhysicalMaterial | null = null;
  private activeInstalledSwitchSpec: InstalledSwitchMaterialSpec | null = null;
  private activePlateSpec: PlateMaterialSpec | null = null;
  private keycapSchemeColors: Map<string, string | null> | null = null;
  private keycapSchemeTintResolver: ((hex: string | null) => readonly [number, number, number] | null) | null = null;
  private heroLidMaterials: THREE.MeshPhysicalMaterial[] = [];
  private heroStemMaterials: THREE.MeshStandardMaterial[] = [];
  private heroUpperParts: Array<{ node: THREE.Object3D; cutawayY: number }> = [];
  private heroStemParts: Array<{ node: THREE.Object3D; cutawayY: number }> = [];
  private heroSpringPart: { node: THREE.Object3D; cutawayY: number; cutawayScaleY: number } | null = null;
  private heroGuidesPart: { node: THREE.Object3D; restY: number } | null = null;
  private heroPoseCurrent = 0; // 0 = cutaway, 1 = assembled
  private heroPoseTarget = 0;
  private heroPoseStartMs = 0;
  private heroPoseStartVal = 0;
  private heroPoseInstant = false;
  private heroPressCurrent = 0; // 0..1 normalized travel
  private heroPressTarget = 0;
  private heroPressStartMs = 0;
  private heroPressStartVal = 0;
  private heroPressInstant = false;
  private heroPhase: HeroSwitchPhase = 'idle';
  private heroTravelListener: ((travelMm: number, phase: HeroSwitchPhase) => void) | null = null;

  private focusedGroupId: string | null = null;
  private focusGhostMaterial: THREE.MeshStandardMaterial | null = null;
  private focusOrigMaterials = new Map<
    THREE.Mesh,
    { material: THREE.Material | THREE.Material[]; castShadow: boolean }
  >();

  private currentCasePreset: EnclosurePresetId = 'forest';
  private currentHeroVariant: HeroSwitchVariantId = 'linear45';
  private currentMode: ViewMode = 'exterior';
  private explodeCurrent = 0;
  private explodeTarget = 0;
  private explodeInstant = false;

  // Decorative selection helper — strictly excluded from raycast picking!
  private outlineHelper: THREE.Box3Helper;
  private outlineBox = new THREE.Box3();
  private selectedNode: THREE.Object3D | null = null;

  private envManager = new StudioEnvironmentManager();
  private studioProfile: StudioProfileId = 'atelier';
  private envTexture: THREE.Texture | null = null;
  private disposed = false;

  // ---- KF-003C-B1 runtime optimization state -------------------------------
  private instancing = new InstancingRuntime();
  private instancingReports: Partial<Record<AssetPartitionKey, InstancingPartitionReport>> = {};
  private housingOverride: { material: THREE.Material; record: MaterialOverrideRecord; transmission: TransmissionInventory } | null = null;
  private overrideRecords: MaterialOverrideRecord[] = [];
  private enclosedRoles: Set<string> = new Set(ENCLOSED_ROLES);
  private occlusionEnabled = true;
  private keyColorOverrides = new Map<string, string>();

  // ---- KF-003C-B2.2 production integration state ---------------------------
  private qualityTier: QualityTier = 'desktop';
  private legend: LegendMaskRuntime | null = null;
  private legendTier: 'mobile' | 'desktop' | null = null;
  private legendInventory: Inventory | null = null;
  private legendError: string | null = null;
  private macroScene: THREE.Group | null = null;
  private macroOwner: THREE.Object3D | null = null;
  private macroHiddenChildren: Array<{ node: THREE.Object3D; visible: boolean }> = [];
  private encoderPresentation: EncoderPresentation = 'standard';
  private macroTiming: AssetLoadTiming | null = null;
  private macroError: string | null = null;

  private loads = new Map<string, Promise<AssetLoadTiming>>();
  private legendGeneration = 0;
  private macroGeneration = 0;

  constructor(manifest: AssetManifest, private readonly assets: AssetPackage) {
    this.manifest = manifest;
    this.root.name = 'KF003C_ProductionRoot';
    this.keyboardRoot.name = 'KF003C_KeyboardAssembly';
    this.heroRoot.name = 'KF003C_HeroSwitchStage';
    this.heroRoot.visible = false;
    this.root.add(this.keyboardRoot, this.heroRoot);

    for (const k of manifest.keys) {
      this.keysByDomCode.set(k.dom_code, k.id);
    }

    this.outlineHelper = new THREE.Box3Helper(this.outlineBox, new THREE.Color('#F0793B'));
    this.outlineHelper.name = 'KF003C_SelectionHelper';
    this.outlineHelper.visible = false;
    // Explicit exclusion: Raycaster ignores `visible`, so disable raycast unconditionally.
    this.outlineHelper.raycast = () => {};
    this.root.add(this.outlineHelper);
  }

  ensureEnvironment(renderer: THREE.WebGLRenderer, profileId?: StudioProfileId): THREE.Texture {
    const targetProfile = profileId ?? this.studioProfile;
    this.studioProfile = targetProfile;
    this.envTexture = this.envManager.getEnvironment(renderer, targetProfile);
    return this.envTexture;
  }

  ensureBackdrop(profileId?: StudioProfileId): THREE.Texture | THREE.Color {
    const targetProfile = profileId ?? this.studioProfile;
    this.studioProfile = targetProfile;
    return this.envManager.getBackdrop(targetProfile);
  }

  getStudioProfile(): StudioProfileId {
    return this.studioProfile;
  }

  setStudioProfile(profileId: StudioProfileId): void {
    this.studioProfile = profileId;
  }

  getEnvironmentTelemetry(): EnvironmentTelemetry {
    return this.envManager.getTelemetry();
  }

  /** Current vertical offset (m) of GRP_09_BottomChassis for explode-safe grounding. */
  getBottomChassisOffsetY(): number {
    const entry = this.groupNodes.get('GRP_09_BottomChassis');
    if (!entry) return 0;
    return entry.node.position.y - entry.restPos.y;
  }


  private loadOnce(key: string, load: () => Promise<AssetLoadTiming>): Promise<AssetLoadTiming> {
    this.assets.signal.throwIfAborted();
    const pending = this.loads.get(key);
    if (pending) return pending;
    const operation = load().finally(() => this.loads.delete(key));
    this.loads.set(key, operation);
    return operation;
  }

  private async fetchAndParseGlb(key: AssetVariantPartitionKey): Promise<{ gltf: GLTF; timing: AssetLoadTiming }> {
    const variants = this.manifest.asset_variants?.[key];
    const tier = key === 'hero_switch' ? 'uncompressed' : 'meshopt';
    const model = variants?.[tier];
    if (!model) throw new Error('3D partition unavailable: ' + key);
    const started = performance.now();
    const buffer = await this.assets.bytes(model.relative_path, model.bytes, model.sha256);
    const header = new DataView(buffer);
    if (buffer.byteLength < 20 || header.getUint32(0, true) !== 0x46546c67
        || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) {
      throw new Error('Invalid GLB header');
    }
    this.assets.signal.throwIfAborted();
    const fetched = performance.now();
    const gltf = await this.loader.parseAsync(buffer, '');
    if (this.disposed || this.assets.signal.aborted) {
      disposeObjectTree(gltf.scene);
      throw new DOMException('3D mount canceled', 'AbortError');
    }
    const parsed = performance.now();
    return { gltf, timing: {
      key, tier, url: this.assets.resolve(model.relative_path).href, bytes: buffer.byteLength,
      fetchMs: fetched - started, parseMs: parsed - fetched, totalMs: parsed - started,
      ...countSceneStats(gltf.scene),
    }};
  }

  loadExterior(): Promise<AssetLoadTiming> {
    return this.loadOnce('exterior', () => this.mountExterior());
  }

  private async mountExterior(): Promise<AssetLoadTiming> {
    if (this.exteriorScene) {
      return this.timings.get('exterior')!;
    }
    const { gltf, timing } = await this.fetchAndParseGlb('exterior');
    if (this.disposed) {
      disposeObjectTree(gltf.scene);
      return timing;
    }

    if (this.exteriorScene) {
      // The mask owns shader hooks and augmented geometries of THIS scene: release it
      // before the partition is torn down, never after.
      this.detachLegendMask();
      this.keyboardRoot.remove(this.exteriorScene);
      disposeObjectTree(this.exteriorScene);
    }

    this.exteriorScene = gltf.scene;
    this.exteriorScene.name = 'KF01_Exterior_GLB';
    this.keyboardRoot.add(this.exteriorScene);
    this.timings.set('exterior', timing);
    this.indexExterior(this.exteriorScene);
    calibratePartitionMaterials(this.exteriorScene);
    this.applyCasePreset(this.currentCasePreset);
    this.retrofitInstancing('exterior', this.exteriorScene);
    applySelectiveShadowPolicy(this.keyboardRoot, false);
    this.applyExplodePose(this.explodeCurrent);
    this.rebuildPickables();
    return timing;
  }

  /**
   * Phase 8 controlled initialization: overlaps exterior GLB download with the
   * legend atlas+mapping fetch and attaches the legend BEFORE first render,
   * avoiding redundant pre-legend keycap shader compilation.
   */
  async loadExteriorWithLegend(tier?: 'mobile' | 'desktop'): Promise<{
    timing: AssetLoadTiming;
    legend: Awaited<ReturnType<ProductionScene['attachLegend']>> | null;
    legendError: string | null;
  }> {
    const wanted = tier ?? (resolveLookdevTier(this.qualityTier) === 'balanced' ? 'mobile' : 'desktop');
    const legendData = this.loadLegendData(wanted);

    // Keep keyboardRoot hidden until both exterior AND legend mask are bound so
    // no intermediate frame compiles/uploads pre-legend cap shaders or geometries.
    const prevVisible = this.keyboardRoot.visible;
    this.keyboardRoot.visible = false;
    try {
      const [timing, data] = await Promise.all([this.loadExterior(), legendData]);
      if (this.disposed) return { timing, legend: null, legendError: null };

      try {
        const legend = await this.attachLegend(wanted, data);
        this.keyboardRoot.visible = prevVisible && this.currentMode !== 'hero_switch';
        return { timing, legend, legendError: null };
      } catch (err) {
        this.keyboardRoot.visible = prevVisible && this.currentMode !== 'hero_switch';
        const msg = err instanceof Error ? err.message : String(err);
        this.legendError = msg;
        return { timing, legend: null, legendError: msg };
      }
    } catch (err) {
      this.keyboardRoot.visible = prevVisible && this.currentMode !== 'hero_switch';
      throw err;
    }
  }

  loadInternal(): Promise<AssetLoadTiming> {
    return this.loadOnce('internal', () => this.mountInternal());
  }

  private async mountInternal(): Promise<AssetLoadTiming> {
    if (this.internalScene) {
      return this.timings.get('internal')!;
    }
    const { gltf, timing } = await this.fetchAndParseGlb('internal');
    if (this.disposed) {
      disposeObjectTree(gltf.scene);
      return timing;
    }

    if (this.internalScene) {
      this.keyboardRoot.remove(this.internalScene);
      disposeObjectTree(this.internalScene);
    }

    this.internalScene = gltf.scene;
    this.internalScene.name = 'KF01_Internal_GLB';
    this.internalScene.visible = this.currentMode === 'combined' || this.currentMode === 'exploded';
    this.keyboardRoot.add(this.internalScene);
    this.timings.set('internal', timing);
    this.indexInternal(this.internalScene);
    calibratePartitionMaterials(this.internalScene);
    this.retrofitInstancing('internal', this.internalScene);
    applySelectiveShadowPolicy(this.internalScene, false);
    this.applyExplodePose(this.explodeCurrent);
    this.applyEncoderTransform();
    this.rebuildPickables();
    return timing;
  }

  loadHeroSwitch(): Promise<AssetLoadTiming> {
    return this.loadOnce('hero_switch', () => this.mountHeroSwitch());
  }

  private async mountHeroSwitch(): Promise<AssetLoadTiming> {
    if (this.heroScene) {
      return this.timings.get('hero_switch')!;
    }
    const { gltf, timing } = await this.fetchAndParseGlb('hero_switch');
    if (this.disposed) {
      disposeObjectTree(gltf.scene);
      return timing;
    }

    if (this.heroScene) {
      this.heroRoot.remove(this.heroScene);
      disposeObjectTree(this.heroScene);
    }

    this.heroScene = gltf.scene;
    this.heroScene.name = 'KF01_HeroSwitch_GLB';
    this.heroRoot.add(this.heroScene);
    this.timings.set('hero_switch', timing);
    this.indexHeroSwitch(this.heroScene);
    calibratePartitionMaterials(this.heroScene);
    applySelectiveShadowPolicy(this.heroScene, true);
    this.applyHeroSwitchVariant(this.currentHeroVariant);
    this.rebuildPickables();
    return timing;
  }

  private indexExterior(root: THREE.Object3D) {
    this.keys.clear();
    this.caseMaterials = [];
    this.caseMarkMaterials = [];
    this.keycapMaterials.clear();
    const seenCaseMats = new Set<string>();
    const seenMarkMats = new Set<string>();

    const keySpecById = new Map(this.manifest.keys.map((k) => [k.id, k]));
    const groupSpecById = new Map(this.manifest.assembly_groups.map((g) => [g.id, g]));

    root.traverse((node) => {
      const ud = node.userData ?? {};
      const mesh = node as THREE.Mesh;

      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!m) continue;
          const std = m as THREE.MeshStandardMaterial;
          if (m.name === 'MAT_Case_Anodized' && !seenCaseMats.has(m.uuid)) {
            seenCaseMats.add(m.uuid);
            this.caseMaterials.push(std);
          } else if (m.name === 'MAT_Case_Mark' && !seenMarkMats.has(m.uuid)) {
            seenMarkMats.add(m.uuid);
            this.caseMarkMaterials.push(std);
          } else if (m.name === 'MAT_Keycap_Alpha' || m.name === 'MAT_Keycap_Mod') {
            this.keycapMaterials.set(m.name, std);
          }
        }
      }

      if (ud.kf01Role === 'assembly_group' && typeof ud.assemblyGroup === 'string') {
        const spec = groupSpecById.get(ud.assemblyGroup);
        if (spec) {
          this.groupNodes.set(ud.assemblyGroup, {
            node,
            restPos: node.position.clone(),
            spec,
          });
        }
      }

      if (ud.kf01Role === 'keycap' && typeof ud.keyId === 'string') {
        const spec = keySpecById.get(ud.keyId);
        if (spec) {
          const capMeshes: THREE.Mesh[] = [];
          node.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) capMeshes.push(c as THREE.Mesh);
          });
          this.keys.set(ud.keyId, {
            spec,
            capNode: node,
            capRestPos: node.position.clone(),
            capMeshes,
            stemNode: null,
            stemRestPos: null,
            springNode: null,
            springRestScaleY: 1,
            stabSliders: [],
            pressing: false,
            pressStartMs: 0,
            releaseStartMs: 0,
            pressValue: 0,
          });
        }
      }

      if (ud.kf01Role === 'encoder_knob') {
        this.encoderKnob = { node, restY: node.position.y };
      }
    });

    // If internal was already loaded before exterior reloaded, re-link internal driven parts
    if (this.internalScene) {
      this.indexInternal(this.internalScene);
    }
  }

  private indexInternal(root: THREE.Object3D) {
    const groupSpecById = new Map(this.manifest.assembly_groups.map((g) => [g.id, g]));
    const grp05 = groupSpecById.get('GRP_05_AcousticAndGaskets');
    const gasketOverride = grp05?.child_motion_overrides?.find((c) => c.node === 'KF01_Gasket_TravelWithPlate');

    this.plateMaterials = [];
    const seenPlateMats = new Set<string>();

    // Reset internal links on keys before re-indexing
    for (const kr of this.keys.values()) {
      kr.stemNode = null;
      kr.stemRestPos = null;
      kr.springNode = null;
      kr.stabSliders = [];
    }

    root.traverse((node) => {
      const ud = node.userData ?? {};
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (ud.kf01Role === 'switch_plate') {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            if (m && m.name === 'MAT_Plate_Active' && !seenPlateMats.has(m.uuid)) {
              seenPlateMats.add(m.uuid);
              this.plateMaterials.push(m as THREE.MeshStandardMaterial);
            }
          }
        }
      }

      if (ud.kf01Role === 'assembly_group' && typeof ud.assemblyGroup === 'string') {
        const spec = groupSpecById.get(ud.assemblyGroup);
        if (spec) {
          this.groupNodes.set(ud.assemblyGroup, {
            node,
            restPos: node.position.clone(),
            spec,
          });
        }
      }

      if (ud.kf01Role === 'gasket_travel_pivot' && gasketOverride) {
        this.gasketPivot = {
          node,
          restPos: node.position.clone(),
          keyframes: gasketOverride.motion_keyframes,
        };
      }

      if (ud.kf01Role === 'switch_stem' && typeof ud.keyId === 'string') {
        const kr = this.keys.get(ud.keyId);
        if (kr) {
          kr.stemNode = node;
          kr.stemRestPos = node.position.clone();
        }
      }

      if (ud.kf01Role === 'switch_spring' && typeof ud.keyId === 'string') {
        const kr = this.keys.get(ud.keyId);
        if (kr) {
          kr.springNode = node;
          kr.springRestScaleY = node.scale.y || 1;
        }
      }

      if (ud.kf01Role === 'stabilizer_slider' && typeof ud.keyId === 'string') {
        const kr = this.keys.get(ud.keyId);
        if (kr) {
          kr.stabSliders.push({ node, restY: node.position.y });
        }
      }

      if (ud.kf01Role === 'encoder_shaft') {
        this.encoderShaft = { node, restY: node.position.y };
      }
    });
  }

  private indexHeroSwitch(root: THREE.Object3D) {
    this.heroLidMaterials = [];
    this.heroStemMaterials = [];
    this.heroUpperParts = [];
    this.heroStemParts = [];
    this.heroSpringPart = null;
    this.heroGuidesPart = null;
    const seenLid = new Set<string>();
    const seenStem = new Set<string>();

    root.traverse((node) => {
      const partId = typeof node.userData?.heroPart === 'string' ? node.userData.heroPart : node.name;
      if (HERO_UPPER_NODES.has(partId)) {
        this.heroUpperParts.push({ node, cutawayY: node.position.y });
      } else if (HERO_STEM_NODES.has(partId)) {
        this.heroStemParts.push({ node, cutawayY: node.position.y });
      } else if (partId === HERO_SPRING_NODE) {
        this.heroSpringPart = {
          node,
          cutawayY: node.position.y,
          cutawayScaleY: node.scale.y || 1,
        };
      } else if (partId === HERO_GUIDES_NODE) {
        this.heroGuidesPart = { node, restY: node.position.y };
      }

      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.name === 'MAT_Hero_PC_Lid' && !seenLid.has(m.uuid)) {
          seenLid.add(m.uuid);
          this.heroLidMaterials.push(m as THREE.MeshPhysicalMaterial);
        } else if (m.name === 'MAT_Switch_Stem' && !seenStem.has(m.uuid)) {
          seenStem.add(m.uuid);
          this.heroStemMaterials.push(m as THREE.MeshStandardMaterial);
        }
      }
    });
    this.applyHeroSwitchTransforms();
  }

  /**
   * KF-003C-B1 retrofit — runs once per partition after the GLB is parsed/indexed and
   * before the first submission.
   *
   *  1. Reset press state and pose to rest so instance rest matrices are exact.
   *  2. Phase 2: retarget installed switch housings to an opaque PBR clone.
   *  3. Phase 3: build geometry/material/motion-compatible InstancedMesh batches.
   *  4. Re-apply the saved pose, per-key colour overrides and assembled occlusion.
   */
  private retrofitInstancing(partition: AssetPartitionKey, scene: THREE.Object3D): void {
    if (this.disposed) return;
    const savedProgress = this.explodeCurrent;

    for (const kr of this.keys.values()) {
      kr.pressValue = 0;
      kr.pressing = false;
      kr.releaseStartMs = 0;
      this.applyKeyDisplacement(kr, 0);
    }
    this.applyExplodePose(0);

    if (partition === 'internal') {
      const res = applyInstalledSwitchOpaqueOverride(scene);
      if (res.material && res.record) {
        applyCalibrationToMaterial(res.material);
        this.housingOverride?.material.dispose();
        this.housingOverride = { material: res.material, record: res.record, transmission: res.inventory };
        this.overrideRecords = [res.record];
      }
    }

    const keysById = new Map<string, THREE.Object3D>();
    for (const [id, kr] of this.keys.entries()) keysById.set(id, kr.capNode);

    const build: BuildResult = buildInstanceBatches({
      manifest: this.manifest,
      root: scene,
      fallbackOwner: this.keyboardRoot,
      keysById,
      enclosedRoles: this.enclosedRoles,
    });
    this.instancing.add(build);
    for (const sharedMat of getSharedBatchMaterials()) {
      applyCalibrationToMaterial(sharedMat);
    }

    if (partition === 'internal') {
      this.isolateInstalledSwitchBatchMaterials(build.batches);
      if (this.activeInstalledSwitchSpec) {
        this.applyInstalledSwitchMaterial(this.activeInstalledSwitchSpec);
      }
      if (this.activePlateSpec) {
        this.applyPlateMaterial(this.activePlateSpec);
      }
    }

    let suppressed = 0;
    let submitted = 0;
    let instances = 0;
    for (const b of build.batches) {
      const tris = b.trianglesPerInstance * b.instances.length;
      submitted += tris;
      instances += b.instances.length;
      if (b.occludedWhenAssembled) suppressed += tris;
    }

    this.instancingReports[partition] = {
      partition,
      sourceMeshNodes: build.sourceMeshNodes,
      replacedMeshNodes: build.replacedMeshNodes,
      batches: build.batches.length,
      instances,
      duplicateGeometryMerges: build.duplicateGeometryMerges,
      geometryContents: build.geometryContents,
      elapsedMs: Number(build.elapsedMs.toFixed(2)),
      submittedTriangles: submitted,
      suppressedTriangles: suppressed,
      motions: this.instancing.totals().motions,
      rows: describeBatches(build.batches),
    };

    this.applyKeyColorOverrides();
    this.applyExplodePose(savedProgress);
    this.instancing.setAssembledVisibility(this.occlusionEnabled && savedProgress < 0.02, true);
    this.rebuildPickables();
  }

  private rebuildPickables() {
    this.pickables = [];
    const activeRoot = this.currentMode === 'hero_switch' ? this.heroRoot : this.keyboardRoot;
    activeRoot.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      // Exclude helper/decorative objects explicitly
      if (node.name.startsWith('KF003C_')) return;
      this.pickables.push(mesh);
    });
  }

  setViewMode(mode: ViewMode) {
    this.currentMode = mode;
    const isHero = mode === 'hero_switch';
    this.keyboardRoot.visible = !isHero;
    this.heroRoot.visible = isHero;
    if (this.internalScene) {
      this.internalScene.visible = mode === 'combined' || mode === 'exploded';
    }
    if (mode !== 'exploded' && mode !== 'combined') {
      this.setFocusedAssemblyGroup(null);
    }
    this.clearSelection();
    this.rebuildPickables();
  }

  private restoreFocusMaterials() {
    for (const [mesh, saved] of this.focusOrigMaterials.entries()) {
      mesh.material = saved.material;
      mesh.castShadow = saved.castShadow;
    }
    this.focusOrigMaterials.clear();
  }

  /**
   * Non-destructive Mechanical Anatomy layer emphasis.
   * Keeps the focused assembly group in its 100% calibrated B3 materials while
   * swapping non-focused groups onto a dedicated architectural context material
   * (single-pass Z-buffered ghost neutralizing per-instance keycap colors so no
   * internal triangle pile-up or dark instanced-mount specks appear).
   */
  setFocusedAssemblyGroup(groupId: string | null) {
    this.restoreFocusMaterials();
    if (!groupId || !this.groupNodes.has(groupId)) {
      this.focusedGroupId = null;
      return;
    }
    this.focusedGroupId = groupId;
    if (!this.focusGhostMaterial) {
      const ghost = new THREE.MeshStandardMaterial({
        name: 'KF01_AnatomyFocusGhost',
        color: new THREE.Color('#CFD2CB'),
        roughness: 0.90,
        metalness: 0.0,
        envMapIntensity: 0.35,
        transparent: true,
        opacity: 0.28,
        depthWrite: true,
      });
      ghost.customProgramCacheKey = () => 'kf01-anatomy-focus-ghost-v2';
      ghost.onBeforeCompile = (shader) => {
        // Ignore mesh.instanceColor (e.g., Charcoal #1A1F1E on MAT_Keycap_PBT batches) so
        // instanced 1u caps, mounts, and single-instance modifiers ghost uniformly.
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          'diffuseColor.rgb = diffuse;',
        );
      };
      this.focusGhostMaterial = ghost;
    }
    for (const [id, entry] of this.groupNodes.entries()) {
      if (id === groupId) continue;
      entry.node.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || mesh.name.startsWith('KF003C_')) return;
        if (!mesh.visible && !(mesh as THREE.InstancedMesh).isInstancedMesh) return;
        this.focusOrigMaterials.set(mesh, {
          material: mesh.material,
          castShadow: mesh.castShadow,
        });
        mesh.material = this.focusGhostMaterial!;
        mesh.castShadow = false;
      });
    }
  }

  getFocusedAssemblyGroup(): string | null {
    return this.focusedGroupId;
  }

  getAssemblyGroupFocusReport() {
    let focusedVisibleMeshes = 0;
    if (this.focusedGroupId) {
      const entry = this.groupNodes.get(this.focusedGroupId);
      entry?.node.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.visible && !mesh.name.startsWith('KF003C_')) focusedVisibleMeshes += 1;
      });
    }
    return {
      focusedGroupId: this.focusedGroupId,
      dimmedMeshCount: this.focusOrigMaterials.size,
      focusedVisibleMeshes,
      resolvedGroups: [...this.groupNodes.keys()].sort(),
    };
  }

  getViewMode(): ViewMode {
    return this.currentMode;
  }

  isExteriorLoaded(): boolean {
    return this.exteriorScene !== null;
  }

  isInternalLoaded(): boolean {
    return this.internalScene !== null;
  }

  isHeroLoaded(): boolean {
    return this.heroScene !== null;
  }

  setGroupVisibility(groupId: string, visible: boolean) {
    const entry = this.groupNodes.get(groupId);
    if (entry) {
      entry.node.visible = visible;
    }
  }

  setExplodeTarget(progress: number, instant = false) {
    this.explodeTarget = Math.max(0, Math.min(1, progress));
    this.explodeInstant = instant;
    if (instant) {
      this.explodeCurrent = this.explodeTarget;
      this.applyExplodePose(this.explodeCurrent);
    }
  }

  getExplodeProgress(): number {
    return this.explodeCurrent;
  }

  /**
   * Apply exact piecewise-linear manifest keyframes for all 9 groups + KF01_Gasket_TravelWithPlate.
   * Matches Blender R3 frames 1..101 (`frame = 1 + 100 * progress`).
   */
  applyExplodePose(progress: number) {
    this.explodeCurrent = Math.max(0, Math.min(1, progress));
    for (const entry of this.groupNodes.values()) {
      const offset = evalPiecewiseKeyframes(entry.spec.motion_keyframes, this.explodeCurrent);
      entry.node.position.set(
        entry.restPos.x + offset[0],
        entry.restPos.y + offset[1],
        entry.restPos.z + offset[2],
      );
    }
    if (this.gasketPivot) {
      const offset = evalPiecewiseKeyframes(this.gasketPivot.keyframes, this.explodeCurrent);
      this.gasketPivot.node.position.set(
        this.gasketPivot.restPos.x + offset[0],
        this.gasketPivot.restPos.y + offset[1],
        this.gasketPivot.restPos.z + offset[2],
      );
    }
    this.keyboardRoot.updateMatrixWorld(true);
    // KF-003C-B1 Phase 4: enclosed parts are only submitted while disassembled.
    this.instancing.setAssembledVisibility(this.occlusionEnabled && this.explodeCurrent < 0.02);
    this.refreshSelectionOutline();
  }

  getGroupWorldOffsets(): Record<string, Vec3> {
    const out: Record<string, Vec3> = {};
    for (const [id, entry] of this.groupNodes.entries()) {
      out[id] = [
        Number((entry.node.position.x - entry.restPos.x).toFixed(6)),
        Number((entry.node.position.y - entry.restPos.y).toFixed(6)),
        Number((entry.node.position.z - entry.restPos.z).toFixed(6)),
      ];
    }
    return out;
  }

  applyCasePreset(presetId: EnclosurePresetId) {
    const preset = this.manifest.materials.enclosure_presets[presetId];
    if (!preset) return;
    this.currentCasePreset = presetId;
    const cal = ENCLOSURE_FINISH_CALIBRATION[presetId];
    const [r, g, b] = preset.base_color_linear;
    for (const mat of this.caseMaterials) {
      mat.color.setRGB(r, g, b, THREE.LinearSRGBColorSpace);
      mat.metalness = cal.metalness;
      mat.roughness = cal.roughness;
      mat.envMapIntensity = cal.envMapIntensity;
      if ('clearcoat' in mat) {
        (mat as THREE.MeshPhysicalMaterial).clearcoat = cal.clearcoat;
        (mat as THREE.MeshPhysicalMaterial).clearcoatRoughness = cal.clearcoatRoughness;
      }
      mat.needsUpdate = true;
    }
    const markColor = new THREE.Color(preset.mark_color_srgb_hex);
    for (const mat of this.caseMarkMaterials) {
      mat.color.copy(markColor);
      mat.needsUpdate = true;
    }
  }

  getCasePreset(): EnclosurePresetId {
    return this.currentCasePreset;
  }

  /**
   * Isolate installed switch stem and opaque upper-housing materials strictly to
   * `GRP_03_Switches` batches so switching profiles never leaks onto PCB stabilizer
   * sliders/housings (`GRP_06_PCB_Assembly`) or the standalone Hero Switch.
   */
  private isolateInstalledSwitchBatchMaterials(batches: InstanceBatch[]): void {
    for (const batch of batches) {
      if (batch.assemblyGroup !== 'GRP_03_Switches') continue;
      const role = batch.instances[0]?.semantic.role;
      if (role === 'switch_stem') {
        if (!this.installedSwitchStemMaterial) {
          const src = Array.isArray(batch.mesh.material) ? batch.mesh.material[0] : batch.mesh.material;
          if (src) {
            const clone = src.clone() as THREE.MeshStandardMaterial;
            clone.name = 'MAT_Switch_Stem_Installed';
            this.installedSwitchStemMaterial = clone;
          }
        }
        if (this.installedSwitchStemMaterial) {
          batch.mesh.material = this.installedSwitchStemMaterial;
        }
      } else if (role === 'switch_lid') {
        if (!this.installedSwitchHousingMaterial) {
          const src = Array.isArray(batch.mesh.material) ? batch.mesh.material[0] : batch.mesh.material;
          if (src) {
            const clone = src.clone() as THREE.MeshPhysicalMaterial;
            clone.name = 'MAT_Switch_Housing_Installed_Opaque';
            clone.transmission = 0;
            if (typeof clone.thickness === 'number') clone.thickness = 0;
            clone.transparent = false;
            clone.opacity = 1;
            clone.depthWrite = true;
            this.installedSwitchHousingMaterial = clone;
          }
        }
        if (this.installedSwitchHousingMaterial) {
          batch.mesh.material = this.installedSwitchHousingMaterial;
        }
      }
    }
  }

  /**
   * Apply representative material-only installed switch profile to `GRP_03_Switches`
   * stems and opaque upper housings (preserving zero transmission and 4 mm travel).
   */
  applyInstalledSwitchMaterial(spec: InstalledSwitchMaterialSpec): void {
    this.activeInstalledSwitchSpec = spec;
    if (this.installedSwitchStemMaterial) {
      const [sr, sg, sb] = spec.stemLinear;
      this.installedSwitchStemMaterial.color.setRGB(sr, sg, sb, THREE.LinearSRGBColorSpace);
      this.installedSwitchStemMaterial.roughness = spec.stemRoughness;
      this.installedSwitchStemMaterial.metalness = 0;
      this.installedSwitchStemMaterial.envMapIntensity = 1.02;
      this.installedSwitchStemMaterial.needsUpdate = true;
    }
    if (this.installedSwitchHousingMaterial) {
      const [hr, hg, hb] = spec.housingLinear;
      const mat = this.installedSwitchHousingMaterial;
      mat.color.setRGB(hr, hg, hb, THREE.LinearSRGBColorSpace);
      mat.roughness = spec.housingRoughness;
      mat.metalness = 0;
      mat.transmission = 0;
      mat.transparent = false;
      mat.opacity = 1;
      mat.depthWrite = true;
      if ('clearcoat' in mat) {
        mat.clearcoat = spec.housingClearcoat;
        mat.clearcoatRoughness = spec.housingClearcoatRoughness;
      }
      mat.envMapIntensity = spec.housingEnvMapIntensity;
      mat.needsUpdate = true;
    }
  }

  /**
   * Apply calibrated PBR material to `GRP_04_SwitchPlate` (`MAT_Plate_Active`).
   * Keeps transmission disabled (polycarbonate uses an opaque frosted approximation).
   */
  applyPlateMaterial(spec: PlateMaterialSpec): void {
    this.activePlateSpec = spec;
    const color = new THREE.Color(spec.colorHex);
    for (const mat of this.plateMaterials) {
      mat.color.copy(color);
      mat.metalness = spec.metalness;
      mat.roughness = spec.roughness;
      mat.envMapIntensity = spec.envMapIntensity;
      const phys = mat as THREE.MeshPhysicalMaterial;
      if ('transmission' in phys) {
        phys.transmission = 0;
        phys.transparent = false;
        phys.opacity = 1;
        phys.depthWrite = true;
      }
      if ('clearcoat' in phys) {
        phys.clearcoat = spec.clearcoat ?? 0;
        phys.clearcoatRoughness = spec.clearcoatRoughness ?? 0.3;
      }
      if (typeof spec.specularIntensity === 'number' && 'specularIntensity' in phys) {
        phys.specularIntensity = spec.specularIntensity;
      }
      if (typeof spec.ior === 'number' && 'ior' in phys) {
        phys.ior = spec.ior;
      }
      mat.needsUpdate = true;
    }
  }

  /**
   * Apply resolved base keycap set + Escape accent colors and per-key legend contrast
   * tints across all 81 canonical keys without cloning instanced batches.
   * Respects explicit `keyColorOverrides` precedence (reserved for KF-006B / verify:mechanics).
   */
  applyKeycapColorScheme(
    capColors: ReadonlyMap<string, string | null>,
    resolveLegendTint: (hex: string | null) => readonly [number, number, number] | null,
  ): void {
    this.keycapSchemeColors = new Map(capColors);
    this.keycapSchemeTintResolver = resolveLegendTint;

    for (const [keyId, kr] of this.keys.entries()) {
      const effectiveHex = this.keyColorOverrides.has(keyId)
        ? this.keyColorOverrides.get(keyId)!
        : (capColors.get(keyId) ?? null);
      this.applyResolvedKeyColor(keyId, kr, effectiveHex);
      this.legend?.setKeyLegendTint(keyId, resolveLegendTint(effectiveHex));
    }
  }

  private applyResolvedKeyColor(keyId: string, kr: KeyRuntime, hex: string | null): void {
    const color = hex ? new THREE.Color(hex) : null;
    for (const { batch, record } of this.instancing.instancesForKey(keyId)) {
      if (batch.materialFamily !== 'MAT_Keycap_PBT') continue;
      setBatchInstanceColor(batch, record.index, color);
    }
    for (const mesh of kr.capMeshes) {
      if (!mesh.visible) continue;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mat) continue;
      const isKeycapMaterial = mat.name === 'MAT_Keycap_Alpha' || mat.name === 'MAT_Keycap_Mod';
      if (!isKeycapMaterial && !mesh.userData.kf003cCapOverride) continue;
      const ud = mesh.userData as Record<string, unknown>;
      if (!ud.kf003cCapOverride) {
        if (!color) continue;
        const base = mat.color.clone();
        const savedUserData = mat.userData;
        mat.userData = {};
        const clone = mat.clone() as THREE.MeshStandardMaterial;
        mat.userData = savedUserData;
        clone.onBeforeCompile = THREE.MeshStandardMaterial.prototype.onBeforeCompile;
        clone.customProgramCacheKey = THREE.MeshStandardMaterial.prototype.customProgramCacheKey;
        clone.name = `${mat.name}_KeyOverride_${keyId}`;
        ud.kf003cCapBaseColor = [base.r, base.g, base.b];
        ud.kf003cCapOverride = clone;
        mesh.material = clone;
        this.legend?.ensurePatched(keyId);
      }
      const target = ud.kf003cCapOverride as THREE.MeshStandardMaterial;
      if (color) {
        target.color.copy(color);
      } else {
        const base = ud.kf003cCapBaseColor as number[] | undefined;
        if (base) target.color.setRGB(base[0], base[1], base[2], THREE.LinearSRGBColorSpace);
      }
      target.needsUpdate = true;
    }
  }

  /**
   * Read-only runtime material snapshot for automated configuration verification
   * (used only by the test-only fixture; never exposed as a visitor global).
   */
  getBuildConfigMaterialAudit() {
    const keycapColors: Record<string, string> = {};
    const legendTints: Record<string, [number, number, number]> = {};
    const tmp = new THREE.Color();

    for (const [keyId, kr] of this.keys.entries()) {
      let found = false;
      for (const { batch, record } of this.instancing.instancesForKey(keyId)) {
        if (batch.materialFamily !== 'MAT_Keycap_PBT') continue;
        const attr = batch.mesh.instanceColor;
        if (attr) {
          tmp.setRGB(
            attr.getX(record.index),
            attr.getY(record.index),
            attr.getZ(record.index),
            THREE.LinearSRGBColorSpace,
          );
          keycapColors[keyId] = `#${tmp.getHexString()}`;
          found = true;
          break;
        }
      }
      if (!found) {
        for (const mesh of kr.capMeshes) {
          if (!mesh.visible) continue;
          const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
          if (mat?.color) {
            keycapColors[keyId] = `#${mat.color.getHexString()}`;
            break;
          }
        }
      }
      const tint = this.legend?.getKeyLegendTint(keyId);
      if (tint) {
        legendTints[keyId] = [
          Number(tint[0].toFixed(4)),
          Number(tint[1].toFixed(4)),
          Number(tint[2].toFixed(4)),
        ];
      }
    }

    let stabilizerSliderHex: string | null = null;
    let stabilizerHousingHex: string | null = null;
    for (const batch of this.instancing.batches) {
      if (batch.assemblyGroup !== 'GRP_06_PCB_Assembly') continue;
      const role = batch.instances[0]?.semantic.role;
      const mat = (Array.isArray(batch.mesh.material) ? batch.mesh.material[0] : batch.mesh.material) as
        | THREE.MeshStandardMaterial
        | undefined;
      if (role === 'stabilizer_slider' && mat?.color) stabilizerSliderHex = `#${mat.color.getHexString()}`;
      if (role === 'stabilizer_housing' && mat?.color) stabilizerHousingHex = `#${mat.color.getHexString()}`;
    }

    const plateMat = this.plateMaterials[0] as THREE.MeshPhysicalMaterial | undefined;
    return {
      exteriorLoaded: this.isExteriorLoaded(),
      internalLoaded: this.isInternalLoaded(),
      legendTier: this.legendTier,
      enclosurePreset: this.currentCasePreset,
      enclosureHex: this.caseMaterials[0] ? `#${this.caseMaterials[0].color.getHexString()}` : null,
      keycapColors,
      legendTints,
      installedSwitchStemHex: this.installedSwitchStemMaterial
        ? `#${this.installedSwitchStemMaterial.color.getHexString()}`
        : null,
      installedSwitchHousingHex: this.installedSwitchHousingMaterial
        ? `#${this.installedSwitchHousingMaterial.color.getHexString()}`
        : null,
      installedSwitchHousingTransmission: this.installedSwitchHousingMaterial?.transmission ?? null,
      stabilizerSliderHex,
      stabilizerHousingHex,
      plateHex: plateMat ? `#${plateMat.color.getHexString()}` : null,
      plateMetalness: plateMat ? Number(plateMat.metalness.toFixed(3)) : null,
      plateRoughness: plateMat ? Number(plateMat.roughness.toFixed(3)) : null,
      plateTransmission: plateMat && 'transmission' in plateMat ? plateMat.transmission : 0,
    };
  }

  getMaterialSnapshot() {
    const caseHex = this.caseMaterials[0] ? `#${this.caseMaterials[0].color.getHexString()}` : null;
    const alphaMat = this.keycapMaterials.get('MAT_Keycap_Alpha');
    const modMat = this.keycapMaterials.get('MAT_Keycap_Mod');
    return {
      casePreset: this.currentCasePreset,
      caseColorHex: caseHex,
      keycapAlphaHex: alphaMat ? `#${alphaMat.color.getHexString()}` : null,
      keycapModHex: modMat ? `#${modMat.color.getHexString()}` : null,
      escMaterial: this.keys.get('Esc')?.spec.default_material_slot ?? null,
    };
  }

  applyHeroSwitchVariant(variantId: HeroSwitchVariantId) {
    const variant = this.manifest.hero_switch.variants[variantId];
    if (!variant) return;
    const changed = this.currentHeroVariant !== variantId;
    this.currentHeroVariant = variantId;
    if (changed && (this.heroPressTarget > 0 || this.heroPressCurrent > 0)) {
      // Policy: variant change during a press cleanly releases and restores exact rest transforms.
      this.heroPressTarget = 0;
      this.heroPressCurrent = 0;
      this.heroPressStartVal = 0;
      this.heroPhase = 'idle';
      this.applyHeroSwitchTransforms();
      this.heroTravelListener?.(0, 'idle');
    }
    const [lr, lg, lb] = variant.lid_pbr.base_color_linear;
    for (const mat of this.heroLidMaterials) {
      mat.color.setRGB(lr, lg, lb, THREE.LinearSRGBColorSpace);
      mat.roughness = variant.lid_pbr.roughness;
      mat.metalness = variant.lid_pbr.metallic;
      if ('transmission' in mat) {
        mat.transmission = variant.lid_pbr.transmission;
        mat.ior = variant.lid_pbr.ior;
      }
      calibrateHeroLidVariant(mat, variantId);
    }
    const [sr, sg, sb] = variant.stem_pbr.base_color_linear;
    for (const mat of this.heroStemMaterials) {
      mat.color.setRGB(sr, sg, sb, THREE.LinearSRGBColorSpace);
      mat.roughness = variant.stem_pbr.roughness;
      mat.envMapIntensity = 1.02;
      mat.needsUpdate = true;
    }
  }

  setHeroTravelListener(listener: ((travelMm: number, phase: HeroSwitchPhase) => void) | null) {
    this.heroTravelListener = listener;
  }

  setHeroSwitchPresentation(pose: HeroSwitchPose, instant = false, now = performance.now()) {
    const nextTarget = pose === 'assembled' ? 1 : 0;
    if (pose === 'cutaway' && (this.heroPressTarget > 0 || this.heroPressCurrent > 0)) {
      this.heroPressTarget = 0;
      this.heroPressCurrent = 0;
      this.heroPressStartVal = 0;
      this.heroPhase = 'idle';
      this.heroTravelListener?.(0, 'idle');
    }
    this.heroPoseTarget = nextTarget;
    this.heroPoseInstant = instant;
    this.heroPoseStartVal = this.heroPoseCurrent;
    this.heroPoseStartMs = now;
    if (instant) {
      this.heroPoseCurrent = nextTarget;
      this.applyHeroSwitchTransforms();
    }
  }

  setHeroSwitchPressed(pressed: boolean, instant = false, now = performance.now()) {
    const nextTarget = pressed ? 1 : 0;
    if (pressed && this.heroPoseTarget < 1) {
      // Actuation always runs on the assembled switch, never on floating cutaway parts.
      this.heroPoseTarget = 1;
      this.heroPoseCurrent = 1;
      this.heroPoseStartVal = 1;
      this.heroPoseInstant = true;
    }
    if (nextTarget === this.heroPressTarget && !instant) return;
    this.heroPressTarget = nextTarget;
    this.heroPressInstant = instant;
    this.heroPressStartVal = this.heroPressCurrent;
    this.heroPressStartMs = now;
    if (instant) {
      this.heroPressCurrent = nextTarget;
      this.heroPhase = nextTarget >= 1 ? 'bottomed' : 'idle';
      this.applyHeroSwitchTransforms();
      const spec = HERO_SWITCH_TRAVEL_SPECS[this.currentHeroVariant];
      this.heroTravelListener?.(this.heroPressCurrent * spec.travelM * 1000, this.heroPhase);
    } else {
      this.heroPhase = pressed ? 'pressing' : 'releasing';
      const spec = HERO_SWITCH_TRAVEL_SPECS[this.currentHeroVariant];
      this.heroTravelListener?.(this.heroPressCurrent * spec.travelM * 1000, this.heroPhase);
    }
  }

  /** Deterministic travel setter (0..variant total travel mm) for regression tests. */
  setHeroSwitchTravelMm(mm: number) {
    const spec = HERO_SWITCH_TRAVEL_SPECS[this.currentHeroVariant];
    const maxMm = spec.travelM * 1000;
    const clamped = Math.max(0, Math.min(maxMm, mm));
    this.heroPoseTarget = 1;
    this.heroPoseCurrent = 1;
    this.heroPressTarget = clamped / maxMm;
    this.heroPressCurrent = this.heroPressTarget;
    this.heroPhase = clamped >= maxMm - 1e-4 ? 'bottomed' : clamped <= 1e-4 ? 'idle' : 'pressing';
    this.applyHeroSwitchTransforms();
    this.heroTravelListener?.(clamped, this.heroPhase);
  }

  getHeroPoseProgress(): number {
    return this.heroPoseCurrent;
  }

  getHeroSwitchMechanicalState() {
    const spec = HERO_SWITCH_TRAVEL_SPECS[this.currentHeroVariant];
    const firstStem = this.heroStemParts[0];
    const firstUpper = this.heroUpperParts[0];
    const assembledStemRestY = firstStem
      ? THREE.MathUtils.lerp(firstStem.cutawayY, HERO_STEM_ASSEMBLED_Y, this.heroPoseCurrent)
      : 0;
    return {
      variant: this.currentHeroVariant,
      pose: (this.heroPoseTarget >= 0.5 ? 'assembled' : 'cutaway') as HeroSwitchPose,
      poseProgress: Number(this.heroPoseCurrent.toFixed(4)),
      pressProgress: Number(this.heroPressCurrent.toFixed(4)),
      phase: this.heroPhase,
      travelMm: Number((this.heroPressCurrent * spec.travelM * 1000).toFixed(4)),
      totalTravelMm: Number((spec.travelM * 1000).toFixed(4)),
      stemDeltaY: firstStem ? Number((firstStem.node.position.y - assembledStemRestY).toFixed(6)) : 0,
      stemCutawayDeltaY: firstStem ? Number((firstStem.node.position.y - firstStem.cutawayY).toFixed(6)) : 0,
      upperDeltaY: firstUpper ? Number((firstUpper.node.position.y - firstUpper.cutawayY).toFixed(6)) : 0,
      springScaleY: this.heroSpringPart ? Number(this.heroSpringPart.node.scale.y.toFixed(6)) : 1,
      guidesDeltaY: this.heroGuidesPart
        ? Number((this.heroGuidesPart.node.position.y - this.heroGuidesPart.restY).toFixed(6))
        : 0,
      stemNodeCount: this.heroStemParts.length,
      upperNodeCount: this.heroUpperParts.length,
    };
  }

  private applyHeroSwitchTransforms() {
    const spec = HERO_SWITCH_TRAVEL_SPECS[this.currentHeroVariant];
    const p = this.heroPoseCurrent;
    const pressM = p >= 0.99 ? this.heroPressCurrent * spec.travelM : 0;

    for (const part of this.heroUpperParts) {
      part.node.position.y = THREE.MathUtils.lerp(part.cutawayY, HERO_UPPER_ASSEMBLED_Y, p);
    }
    for (const part of this.heroStemParts) {
      const restY = THREE.MathUtils.lerp(part.cutawayY, HERO_STEM_ASSEMBLED_Y, p);
      part.node.position.y = restY - pressM;
    }
    if (this.heroSpringPart) {
      const scaleY = p >= 0.99
        ? this.heroSpringPart.cutawayScaleY * Math.max(0.35, 1.0 - pressM / HERO_SPRING_FREE_HEIGHT_M)
        : this.heroSpringPart.cutawayScaleY;
      const seatedY = HERO_SPRING_SEATED_BASE_Y - HERO_SPRING_LOCAL_MIN_Y * scaleY;
      this.heroSpringPart.node.scale.y = scaleY;
      this.heroSpringPart.node.position.y = THREE.MathUtils.lerp(this.heroSpringPart.cutawayY, seatedY, p);
    }
    this.heroRoot.updateMatrixWorld(true);
  }

  pressKey(keyId: string, now = performance.now(), hold = false): boolean {
    const kr = this.keys.get(keyId);
    if (!kr) return false;
    kr.pressing = true;
    kr.pressStartMs = now;
    kr.releaseStartMs = hold ? 0 : now + KEYPRESS_DOWN_MS + 65;
    return true;
  }

  releaseKey(keyId: string, now = performance.now()): boolean {
    const kr = this.keys.get(keyId);
    if (!kr) return false;
    kr.pressing = false;
    kr.releaseStartMs = now;
    return true;
  }

  /** Set a deterministic press displacement (0..4 mm) directly for automated validation. */
  setKeyPressMm(keyId: string, mm: number): { capDeltaY: number; stemDeltaY: number | null; springScaleY: number | null } | null {
    const kr = this.keys.get(keyId);
    if (!kr) return null;
    const clampedMm = Math.max(0, Math.min(4.0, mm));
    kr.pressing = false;
    kr.releaseStartMs = 0;
    kr.pressValue = clampedMm / 4.0;
    this.applyKeyDisplacement(kr, clampedMm / 1000);
    return {
      capDeltaY: Number((kr.capNode.position.y - kr.capRestPos.y).toFixed(6)),
      stemDeltaY:
        kr.stemNode && kr.stemRestPos
          ? Number((kr.stemNode.position.y - kr.stemRestPos.y).toFixed(6))
          : null,
      springScaleY: kr.springNode ? Number(kr.springNode.scale.y.toFixed(6)) : null,
    };
  }

  private applyKeyDisplacement(kr: KeyRuntime, pressM: number) {
    kr.capNode.position.set(kr.capRestPos.x, kr.capRestPos.y - pressM, kr.capRestPos.z);
    if (kr.stemNode && kr.stemRestPos) {
      kr.stemNode.position.set(kr.stemRestPos.x, kr.stemRestPos.y - pressM, kr.stemRestPos.z);
    }
    if (kr.springNode) {
      const div = kr.spec.press.spring_compression_divisor_m;
      kr.springNode.scale.y = kr.springRestScaleY * Math.max(0.25, 1.0 - pressM / div);
    }
    for (const s of kr.stabSliders) {
      s.node.position.y = s.restY - pressM;
    }
    // KF-003C-B1: the same displacement is applied to the instanced batch copies.
    this.instancing.syncKeyPress(kr.spec.id, pressM);
  }

  rotateEncoder(deltaDetents: number) {
    this.encoderDetent += deltaDetents;
    this.applyEncoderTransform();
  }

  pushEncoder(pushed: boolean) {
    this.encoderPushTarget = pushed ? 1 : 0;
    this.encoderPushCurrent = this.encoderPushTarget;
    this.applyEncoderTransform();
  }

  getEncoderState() {
    const stepDeg = this.manifest.encoder.rotation.step_deg;
    return {
      detent: this.encoderDetent,
      angleDeg: Number((this.encoderDetent * stepDeg).toFixed(2)),
      pushMm: Number((this.encoderPushCurrent * this.manifest.encoder.push.travel_max_m * 1000).toFixed(3)),
      knobNodePresent: Boolean(this.encoderKnob),
      shaftNodePresent: Boolean(this.encoderShaft),
    };
  }

  private applyEncoderTransform() {
    const angleRad = this.encoderDetent * this.manifest.encoder.rotation.step_rad;
    const pushM = this.encoderPushCurrent * this.manifest.encoder.push.travel_max_m;
    if (this.encoderKnob) {
      this.encoderKnob.node.rotation.y = angleRad;
      this.encoderKnob.node.position.y = this.encoderKnob.restY - pushM;
    }
    if (this.encoderShaft) {
      this.encoderShaft.node.rotation.y = angleRad;
      this.encoderShaft.node.position.y = this.encoderShaft.restY - pushM;
    }
  }

  keyIdForDomCode(code: string): string | null {
    return this.keysByDomCode.get(code) ?? null;
  }

  /** Advance active keypress and explode animations; returns true iff another frame must be scheduled. */
  update(now: number): boolean {
    let active = false;

    if (!this.explodeInstant && Math.abs(this.explodeCurrent - this.explodeTarget) > 0.0005) {
      const diff = this.explodeTarget - this.explodeCurrent;
      const step = diff * 0.18;
      const next = Math.abs(diff) < 0.002 ? this.explodeTarget : this.explodeCurrent + step;
      this.applyExplodePose(next);
      active = Math.abs(this.explodeCurrent - this.explodeTarget) > 0.0005;
    }

    for (const kr of this.keys.values()) {
      if (!kr.pressing && kr.pressValue <= 0 && kr.releaseStartMs === 0) continue;

      let v = kr.pressValue;
      if (kr.pressing) {
        const dt = now - kr.pressStartMs;
        v = Math.min(1, dt / KEYPRESS_DOWN_MS);
        // Smooth ease-out cubic
        v = 1 - Math.pow(1 - v, 3);
        if (kr.releaseStartMs > 0 && now >= kr.releaseStartMs) {
          kr.pressing = false;
        }
        active = true;
      } else if (kr.releaseStartMs > 0) {
        const dt = now - kr.releaseStartMs;
        const u = Math.min(1, Math.max(0, dt / KEYPRESS_UP_MS));
        v = 1 - (1 - Math.pow(1 - u, 3));
        if (u >= 1) {
          v = 0;
          kr.releaseStartMs = 0;
        } else {
          active = true;
        }
      }

      kr.pressValue = v;
      this.applyKeyDisplacement(kr, v * kr.spec.press.travel_max_m);
    }

    let heroChanged = false;
    if (!this.heroPoseInstant && this.heroPoseCurrent !== this.heroPoseTarget) {
      const u = Math.min(1, Math.max(0, (now - this.heroPoseStartMs) / HERO_POSE_MS));
      const eased = 1 - Math.pow(1 - u, 3);
      this.heroPoseCurrent =
        u >= 1 ? this.heroPoseTarget : THREE.MathUtils.lerp(this.heroPoseStartVal, this.heroPoseTarget, eased);
      heroChanged = true;
      if (u < 1) active = true;
    }
    if (!this.heroPressInstant && (this.heroPhase === 'pressing' || this.heroPhase === 'releasing')) {
      const spec = HERO_SWITCH_TRAVEL_SPECS[this.currentHeroVariant];
      const dur = this.heroPressTarget > this.heroPressStartVal ? spec.downMs : spec.upMs;
      const u = Math.min(1, Math.max(0, (now - this.heroPressStartMs) / Math.max(1, dur)));
      const eased = 1 - Math.pow(1 - u, 3);
      const done = u >= 1;
      this.heroPressCurrent = done
        ? this.heroPressTarget
        : THREE.MathUtils.lerp(this.heroPressStartVal, this.heroPressTarget, eased);
      heroChanged = true;
      if (done) {
        this.heroPhase = this.heroPressTarget >= 1 ? 'bottomed' : 'idle';
      } else {
        active = true;
      }
      this.heroTravelListener?.(this.heroPressCurrent * spec.travelM * 1000, this.heroPhase);
    }
    if (heroChanged) {
      this.applyHeroSwitchTransforms();
    }

    if (active) {
      this.refreshSelectionOutline();
    }
    return active;
  }

  pickFromRay(ray: THREE.Ray): PickInfo | null {
    const raycaster = new THREE.Raycaster();
    raycaster.ray.copy(ray);
    // Filter visible pickables only
    const activePickables = this.pickables.filter((o) => {
      let cur: THREE.Object3D | null = o;
      while (cur) {
        if (!cur.visible) return false;
        cur = cur.parent;
      }
      return true;
    });

    const hits = raycaster.intersectObjects(activePickables, false);
    if (!hits.length) return null;

    const hitObj = hits[0].object;
    const instanced = hitObj as THREE.InstancedMesh;
    if (instanced.isInstancedMesh && typeof hits[0].instanceId === 'number') {
      const rec = this.instancing.getRecord(instanced, hits[0].instanceId);
      if (rec) {
        const im = instanced.material as THREE.Material | THREE.Material[] | undefined;
        const imMat = Array.isArray(im) ? im[0] : im;
        return this.pickInfoFromInstance(rec, imMat?.name ?? null);
      }
    }
    const mesh = hitObj as THREE.Mesh;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const matName = mat?.name || null;

    // Walk up ancestry to find canonical identity from glTF extras (NEVER node order!)
    let cur: THREE.Object3D | null = hitObj;
    let keyId: string | null = null;
    let assemblyGroup: string | null = null;
    let role: string | null = null;
    let semanticNode: THREE.Object3D = hitObj;

    while (cur) {
      const ud = cur.userData ?? {};
      if (!keyId && typeof ud.keyId === 'string') {
        keyId = ud.keyId;
        if (ud.kf01Role === 'keycap') semanticNode = cur;
      }
      if (!assemblyGroup && typeof ud.assemblyGroup === 'string') {
        assemblyGroup = ud.assemblyGroup;
      }
      if (!role && typeof ud.kf01Role === 'string') {
        role = ud.kf01Role;
      }
      if (ud.kf01Role === 'encoder_knob' || ud.kf01Role === 'encoder_shaft') {
        this.setSelectedNode(cur);
        return {
          kind: 'encoder',
          keyId: null,
          assemblyGroup: assemblyGroup ?? 'GRP_02_TopEnclosure',
          role: ud.kf01Role,
          nodeName: cur.name,
          materialName: matName,
          keySpec: null,
        };
      }
      if (ud.kf01Role === 'hero_switch_part') {
        this.setSelectedNode(cur);
        return {
          kind: 'hero_switch',
          keyId: null,
          assemblyGroup: 'HERO_MX_Root',
          role: ud.heroSubgroup ?? ud.kf01Role,
          nodeName: cur.name,
          materialName: matName,
          keySpec: null,
        };
      }
      cur = cur.parent;
    }

    if (keyId) {
      const kr = this.keys.get(keyId);
      this.setSelectedNode(kr?.capNode ?? semanticNode);
      return {
        kind: 'key',
        keyId,
        assemblyGroup: assemblyGroup ?? 'GRP_01_Keycaps',
        role: role ?? 'keycap',
        nodeName: kr?.capNode.name ?? hitObj.name,
        materialName: matName,
        keySpec: kr?.spec ?? null,
      };
    }

    this.setSelectedNode(hitObj);
    return {
      kind: 'assembly',
      keyId: null,
      assemblyGroup,
      role,
      nodeName: hitObj.name,
      materialName: matName,
      keySpec: null,
    };
  }

  /**
   * Map an instanced-batch hit back to the exact baseline PickInfo contract.
   * Identity comes from the stored glTF extras snapshot, never from node order.
   */
  private pickInfoFromInstance(rec: InstanceRecord, materialName: string | null): PickInfo {
    const sem = rec.semantic;
    const kr = sem.keyId ? this.keys.get(sem.keyId) : undefined;

    if (sem.role === 'encoder_knob' || sem.role === 'encoder_shaft') {
      this.setSelectedNode(rec.sourceMesh);
      return {
        kind: 'encoder',
        keyId: null,
        assemblyGroup: sem.assemblyGroup ?? 'GRP_02_TopEnclosure',
        role: sem.role,
        nodeName: sem.nodeName,
        materialName,
        keySpec: null,
      };
    }
    if (sem.role === 'hero_switch_part' || sem.heroSubgroup) {
      this.setSelectedNode(rec.sourceMesh);
      return {
        kind: 'hero_switch',
        keyId: null,
        assemblyGroup: 'HERO_MX_Root',
        role: sem.heroSubgroup ?? sem.role,
        nodeName: sem.nodeName,
        materialName,
        keySpec: null,
      };
    }
    if (kr) {
      this.setSelectedNode(kr.capNode);
      return {
        kind: 'key',
        keyId: kr.spec.id,
        assemblyGroup: sem.assemblyGroup ?? 'GRP_01_Keycaps',
        role: sem.role ?? 'keycap',
        nodeName: kr.capNode.name,
        materialName,
        keySpec: kr.spec,
      };
    }
    this.setSelectedNode(rec.sourceMesh);
    return {
      kind: 'assembly',
      keyId: null,
      assemblyGroup: sem.assemblyGroup,
      role: sem.role,
      nodeName: sem.capNodeName ?? sem.nodeName,
      materialName,
      keySpec: null,
    };
  }

  selectKeyById(keyId: string): PickInfo | null {
    const kr = this.keys.get(keyId);
    if (!kr) return null;
    this.setSelectedNode(kr.capNode);
    return {
      kind: 'key',
      keyId,
      assemblyGroup: 'GRP_01_Keycaps',
      role: 'keycap',
      nodeName: kr.capNode.name,
      materialName: kr.spec.default_material_slot,
      keySpec: kr.spec,
    };
  }

  private setSelectedNode(node: THREE.Object3D | null) {
    this.selectedNode = node;
    this.refreshSelectionOutline();
  }

  clearSelection() {
    this.selectedNode = null;
    this.outlineHelper.visible = false;
  }

  private refreshSelectionOutline() {
    if (!this.selectedNode) {
      this.outlineHelper.visible = false;
      return;
    }
    this.selectedNode.updateMatrixWorld(true);
    this.outlineBox.setFromObject(this.selectedNode);
    if (this.outlineBox.isEmpty()) {
      this.outlineHelper.visible = false;
      return;
    }
    this.outlineHelper.visible = true;
    this.outlineHelper.updateMatrixWorld(true);
  }

  /** World-space crown center of a canonical key for pointer projection tests. */
  keyCrownWorldPosition(keyId: string): THREE.Vector3 | null {
    const kr = this.keys.get(keyId);
    if (!kr) return null;
    kr.capNode.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(kr.capNode);
    if (box.isEmpty()) return null;
    return new THREE.Vector3((box.min.x + box.max.x) * 0.5, box.max.y, (box.min.z + box.max.z) * 0.5);
  }

  /**
   * Deterministic 81-key overhead picking audit through the exact same raycast path the pointer uses.
   * Ensures all 81 canonical keys resolve cleanly and zero helper meshes intercept rays.
   */
  run81KeyPickingTest(width: number, height: number): PickTestResult {
    const t0 = performance.now();
    const cam = new THREE.PerspectiveCamera(30, Math.max(0.2, width / Math.max(1, height)), 0.01, 4);
    // Overhead test camera aligned perpendicular to 6.5° inclined deck
    const elev = THREE.MathUtils.degToRad(88);
    const dist = 0.68;
    cam.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist);
    cam.lookAt(0, 0.025, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);

    const failures: PickTestResult['failures'] = [];
    let passed = 0;
    const prevSel = this.selectedNode;

    for (const k of this.manifest.keys) {
      const world = this.keyCrownWorldPosition(k.id);
      if (!world) {
        failures.push({ keyId: k.id, got: null, reason: 'missing cap node' });
        continue;
      }
      const ndc = world.clone().project(cam);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), cam);
      const hit = this.pickFromRay(raycaster.ray);
      if (hit?.keyId === k.id) {
        passed += 1;
      } else {
        failures.push({
          keyId: k.id,
          got: hit?.keyId ?? hit?.nodeName ?? null,
          reason: hit ? 'wrong hit' : 'miss',
        });
      }
    }

    this.setSelectedNode(prevSel);
    return {
      total: this.manifest.keys.length,
      passed,
      failed: failures.length,
      durationMs: performance.now() - t0,
      failures,
    };
  }

  getResolvedSummary() {
    return {
      resolvedKeycaps: this.keys.size,
      resolvedSwitchStems: [...this.keys.values()].filter((k) => k.stemNode !== null).length,
      resolvedGroups: [...this.groupNodes.keys()].sort(),
      encoderKnob: Boolean(this.encoderKnob),
      encoderShaft: Boolean(this.encoderShaft),
      timings: Object.fromEntries(this.timings.entries()),
      keyboardBoundsM: this.computeActiveBounds(),
      instancing: {
        totals: this.instancing.totals(),
        partitions: this.instancingReports,
        occlusionEnabled: this.occlusionEnabled,
      },
      production: {
        qualityTier: this.qualityTier,
        legendTier: this.legendTier,
        legendKeys: this.legend?.keys.size ?? 0,
        macroMounted: Boolean(this.macroScene),
        encoderPresentation: this.encoderPresentation,
      },
    };
  }

  // -------------------------------------------------------------------------
  // KF-003C-B1 optimization reporting / controls
  // -------------------------------------------------------------------------

  /** Full instancing + batch inventory (machine readable). */
  getInstancingReport() {
    return {
      schema: 'kf-003c-b1-instancing/1' as const,
      generatedAt: new Date().toISOString(),
      assetVersion: this.manifest.asset_version,
      occlusionEnabled: this.occlusionEnabled,
      assembledSuppressionActive: this.instancing.isAssembledSuppressionActive(),
      explodeProgress: Number(this.explodeCurrent.toFixed(4)),
      totals: this.instancing.totals(),
      partitions: this.instancingReports,
      batches: this.instancing.describe(),
      keyColorOverrides: Object.fromEntries(this.keyColorOverrides),
      production: {
        qualityTier: this.qualityTier,
        legend: this.getLegendReport(),
        encoder: this.getEncoderReport(),
      },
    };
  }

  /**
   * Pickable-list audit: hidden helper meshes must never be raycast candidates.
   * `KF003C_*` names (selection outline, gizmos) are excluded at rebuild time.
   */
  getPickableStats(): { total: number; helperNamed: number; hidden: number; instanced: number } {
    let helperNamed = 0;
    let hidden = 0;
    let instanced = 0;
    for (const object of this.pickables) {
      if (object.name.startsWith('KF003C_')) helperNamed += 1;
      if (!object.visible) hidden += 1;
      if ((object as THREE.InstancedMesh).isInstancedMesh) instanced += 1;
    }
    return { total: this.pickables.length, helperNamed, hidden, instanced };
  }

  /**
   * Live transmission scan of everything currently mounted. Unlike the recorded
   * override inventory (captured at install time, internal partition only), this
   * proves which transmissive materials remain at the moment of the call — e.g.
   * that the editorial hero switch still keeps `MAT_Hero_PC_Lid`.
   */
  scanTransmissiveMaterials(): Array<{ name: string; transmission: number; meshes: number; roles: string[] }> {
    const byName = new Map<string, { name: string; transmission: number; meshes: number; roles: Set<string> }>();
    this.root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of list) {
        const host = material as THREE.MeshPhysicalMaterial | undefined;
        if (!host || typeof host.transmission !== 'number' || host.transmission <= 0) continue;
        const entry = byName.get(host.name) ?? {
          name: host.name,
          transmission: host.transmission,
          meshes: 0,
          roles: new Set<string>(),
        };
        entry.meshes += 1;
        const role = (mesh.userData ?? {}).kf01Role;
        if (typeof role === 'string') entry.roles.add(role);
        byName.set(host.name, entry);
      }
    });
    return [...byName.values()].map((entry) => ({
      name: entry.name,
      transmission: entry.transmission,
      meshes: entry.meshes,
      roles: [...entry.roles].sort(),
    }));
  }

  /** Material override inventory, including measured transmission materials. */
  getOverrideInventory(): OverrideInventory {
    return {
      schema: 'kf-003c-b1-material-overrides/1',
      generatedAt: new Date().toISOString(),
      overrides: this.overrideRecords,
      transmission:
        this.housingOverride?.transmission ??
        {
          materialsWithTransmission: [],
          removedMaterialNames: [],
          preservedMaterialNames: [],
          transmissionEnabledAfterOverride: false,
        },
      liveScan: this.scanTransmissiveMaterials(),
    };
  }

  /** Visibility management toggle (kept switchable for A/B measurement). */
  setOcclusionEnabled(enabled: boolean): boolean {
    this.occlusionEnabled = enabled;
    this.instancing.setAssembledVisibility(enabled && this.explodeCurrent < 0.02, true);
    return this.occlusionEnabled;
  }

  isOcclusionEnabled(): boolean {
    return this.occlusionEnabled;
  }

  getKeyColorOverrides(): Record<string, string> {
    return Object.fromEntries(this.keyColorOverrides);
  }

  /**
   * Per-key cap colour override that survives shared-material changes.
   * Batched caps use `instanceColor`; single-instance caps get a private material clone.
   */
  setKeyColorOverride(
    keyId: string,
    hex: string | null,
  ): { keyId: string; hex: string | null; instancedApplied: number; meshApplied: number } {
    const kr = this.keys.get(keyId);
    const color = hex ? new THREE.Color(hex) : null;
    let instancedApplied = 0;
    let meshApplied = 0;

    if (kr) {
      for (const { batch, record } of this.instancing.instancesForKey(keyId)) {
        if (batch.materialFamily !== 'MAT_Keycap_PBT') continue;
        setBatchInstanceColor(batch, record.index, color);
        instancedApplied += 1;
      }
      for (const mesh of kr.capMeshes) {
        if (!mesh.visible) continue; // batched shells are driven through instanceColor
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (!mat) continue;
        const isKeycapMaterial = mat.name === 'MAT_Keycap_Alpha' || mat.name === 'MAT_Keycap_Mod';
        if (!isKeycapMaterial && !mesh.userData.kf003cCapOverride) continue;
        const ud = mesh.userData as Record<string, unknown>;
        if (!ud.kf003cCapOverride) {
          const base = mat.color.clone();
          const savedUserData = mat.userData;
          mat.userData = {};
          const clone = mat.clone() as THREE.MeshStandardMaterial;
          mat.userData = savedUserData;
          clone.onBeforeCompile = THREE.MeshStandardMaterial.prototype.onBeforeCompile;
          clone.customProgramCacheKey = THREE.MeshStandardMaterial.prototype.customProgramCacheKey;
          clone.name = `${mat.name}_KeyOverride_${keyId}`;
          ud.kf003cCapBaseColor = [base.r, base.g, base.b];
          ud.kf003cCapOverride = clone;
          mesh.material = clone;
        }
        const target = ud.kf003cCapOverride as THREE.MeshStandardMaterial;
        if (color) {
          target.color.copy(color);
        } else {
          const base = ud.kf003cCapBaseColor as number[] | undefined;
          if (base) target.color.setRGB(base[0], base[1], base[2], THREE.LinearSRGBColorSpace);
        }
        target.needsUpdate = true;
        meshApplied += 1;
      }
    }

    if (hex) this.keyColorOverrides.set(keyId, hex);
    else this.keyColorOverrides.delete(keyId);
    return { keyId, hex, instancedApplied, meshApplied };
  }

  private applyKeyColorOverrides(): void {
    if (!this.keyColorOverrides.size) return;
    for (const [keyId, hex] of [...this.keyColorOverrides.entries()]) {
      this.setKeyColorOverride(keyId, hex);
    }
  }


  // -------------------------------------------------------------------------
  // KF-003C-B2.2 — production runtime integration
  // -------------------------------------------------------------------------

  /** Typed seam required by the cap-mask adapter: instanced mesh → batch (identity, not order). */
  getInstanceBatch(mesh: THREE.InstancedMesh): InstanceBatch | undefined {
    return this.instancing.getBatchForMesh(mesh);
  }

  getQualityTier(): QualityTier {
    return this.qualityTier;
  }

  getLegendTier(): 'mobile' | 'desktop' | null {
    return this.legendTier;
  }

  getLegendError(): string | null {
    return this.legendError;
  }

  /**
   * Explicit quality policy. No distance heuristics, no speculative switching:
   * `desktop` pairs the 2048 mask with the standard baked encoder, `mobile` the
   * 1024 mask. DPR, shadow size and manual activation of expensive 3D views are
   * owned by the host page so the policy stays auditable.
   */
  async setQualityTier(tier: QualityTier): Promise<{
    tier: QualityTier;
    lookdevTier: LookdevQualityTier;
    legendTier: 'mobile' | 'desktop' | null;
  }> {
    this.qualityTier = tier;
    const lookdevTier = resolveLookdevTier(tier);
    const legendTier: 'mobile' | 'desktop' = lookdevTier === 'balanced' ? 'mobile' : 'desktop';
    if (this.legend && this.legendTier !== legendTier) {
      await this.attachLegend(legendTier);
    } else {
      this.legendGeneration++;
    }
    return { tier, lookdevTier, legendTier: this.legendTier };
  }

  /**
   * Attach (or swap) the cap-surface legend mask. Must run AFTER instancing: the
   * adapter injects per-instance `kfLegendRect|Bounds|CrownMin` attributes sized to
   * each batch, and the batch geometry is shared with the source meshes.
   */
  private async loadLegendData(tier: 'mobile' | 'desktop') {
    const spec = this.manifest.legend_atlas?.tiers.find((entry) => entry.tier === tier);
    if (!spec) throw new Error('Missing 3D legend tier');
    const [bytes, png] = await Promise.all([
      this.assets.bytes(spec.mapping, spec.mapping_bytes, spec.mapping_sha256),
      this.assets.bytes(spec.file, spec.bytes, spec.sha256),
    ]);
    const inventory = JSON.parse(new TextDecoder().decode(bytes)) as Inventory;
    if (inventory.textureSha256 !== spec.sha256 || inventory.file !== spec.file
        || inventory.resolution !== spec.resolution) {
      throw new Error('Legend mapping and PNG disagree with the manifest tier');
    }
    return { inventory, png };
  }

  async attachLegend(
    tier?: 'mobile' | 'desktop', prepared?: Awaited<ReturnType<ProductionScene['loadLegendData']>>,
  ): Promise<{
    tier: 'mobile' | 'desktop';
    resolution: number;
    keys: number;
    capDrawObjects: number;
    capBatches: number;
    texture: LegendMaskRuntime['texture'];
  }> {
    const wanted = tier ?? (resolveLookdevTier(this.qualityTier) === 'balanced' ? 'mobile' : 'desktop');
    if (!this.exteriorScene) throw new Error('Legend mask requires a loaded exterior partition');
    const generation = ++this.legendGeneration;
    const exterior = this.exteriorScene;
    try {
      const { inventory, png } = prepared ?? await this.loadLegendData(wanted);
      const texture = await readLegendTexture(png, inventory.resolution);
      if (this.disposed || this.assets.signal.aborted || generation !== this.legendGeneration
          || exterior !== this.exteriorScene) {
        texture.dispose();
        throw new DOMException('Legend load superseded', 'AbortError');
      }
      this.detachLegendMask();
      let runtime;
      try {
        runtime = attachLegendMask(this, inventory, texture);
      } catch (error) {
        texture.dispose();
        throw error;
      }
      this.legend = runtime;
      this.legendInventory = inventory;
      this.legendTier = wanted;
      this.legendError = null;
      if (this.keycapSchemeColors && this.keycapSchemeTintResolver) {
        this.applyKeycapColorScheme(this.keycapSchemeColors, this.keycapSchemeTintResolver);
      } else if (this.keyColorOverrides.size) {
        this.applyKeyColorOverrides();
      }
      return {
        tier: wanted,
        resolution: inventory.resolution,
        keys: runtime.keys.size,
        capDrawObjects: runtime.capDrawObjects,
        capBatches: runtime.capBatches,
        texture: runtime.texture,
      };
    } catch (err) {
      if (generation === this.legendGeneration && !this.disposed) {
        this.legendError = err instanceof Error ? err.message : String(err);
      }
      throw err;
    }
  }

  /** Release the mask before the exterior partition is replaced or the scene is disposed. */
  detachLegendMask(): void {
    const savedFocus = this.focusedGroupId;
    this.restoreFocusMaterials();
    if (!this.legend) {
      this.legendTier = null;
      if (savedFocus) this.setFocusedAssemblyGroup(savedFocus);
      return;
    }
    this.legend.dispose();
    this.legend = null;
    this.legendInventory = null;
    this.legendTier = null;
    if (savedFocus && !this.disposed) this.setFocusedAssemblyGroup(savedFocus);
  }

  /** Machine-readable legend state for regression and benchmark reporting. */
  getLegendReport() {
    const inventory = this.legendInventory;
    return {
      schema: 'kf-003c-b2.2-legend/1' as const,
      attached: Boolean(this.legend),
      tier: this.legendTier,
      resolution: inventory?.resolution ?? null,
      assetVersion: inventory?.assetVersion ?? null,
      textureSha256: inventory?.textureSha256 ?? null,
      texture: this.legend?.texture ?? null,
      keys: this.legend ? [...this.legend.keys.keys()] : [],
      keyCount: this.legend?.keys.size ?? 0,
      pixelIds: this.legend ? Object.fromEntries(this.legend.pixelIds) : {},
      blankKeys: inventory ? Object.entries(inventory.keys).filter(([, v]) => v.blank).map(([id]) => id) : [],
      labeledKeys: inventory ? Object.entries(inventory.keys).filter(([, v]) => !v.blank).length : 0,
      capDrawObjects: this.legend?.capDrawObjects ?? 0,
      capBatches: this.legend?.capBatches ?? 0,
      materialId: inventory?.material.id ?? null,
      error: this.legendError,
    };
  }

  /** Per-key colour override that also repatches the legend shader for that draw. */
  setKeyColorOverrideWithLegend(keyId: string, hex: string | null) {
    const result = this.legend ? this.legend.setKeyColor(keyId, hex) : this.setKeyColorOverride(keyId, hex);
    if (this.keycapSchemeColors && this.keycapSchemeTintResolver) {
      const kr = this.keys.get(keyId);
      const effectiveHex = hex ?? (this.keycapSchemeColors.get(keyId) ?? null);
      if (kr && hex === null) {
        this.applyResolvedKeyColor(keyId, kr, effectiveHex);
      }
      this.legend?.setKeyLegendTint(keyId, this.keycapSchemeTintResolver(effectiveHex));
    }
    return result;
  }

  /** Shared Charcoal PBT recolour that preserves independent per-key overrides. */
  setSharedKeycapColor(hex: string | null) {
    if (this.legend) {
      this.legend.setSharedCapColor(hex);
      return { ok: true, mode: 'legend' as const };
    }
    for (const batch of this.instancing.batches) {
      if (batch.materialFamily !== 'MAT_Keycap_PBT') continue;
      const color = hex ? new THREE.Color(hex) : null;
      const base = (batch.mesh.material as THREE.MeshStandardMaterial).userData.kf003cInstanceBaseColor as number[] | undefined;
      const target = color ?? (base ? new THREE.Color().fromArray(base) : new THREE.Color('#1a1f1e'));
      batch.instances.forEach(({ semantic, index }) => {
        if (semantic.keyId && this.keyColorOverrides.has(semantic.keyId)) return;
        setBatchInstanceColor(batch, index, target);
      });
    }
    return { ok: true, mode: 'instancing' as const };
  }

  isMacroEncoderAvailable(): boolean {
    return Boolean(this.manifest.asset_variants?.encoder_macro);
  }

  getEncoderPresentation(): EncoderPresentation {
    return this.encoderPresentation;
  }

  getMacroError(): string | null {
    return this.macroError;
  }

  private encoderOwnerNode(): THREE.Object3D | null {
    const name = this.manifest.encoder.knob_node;
    const owner = this.keyboardRoot.getObjectByName(name);
    if (!owner || (owner as THREE.Mesh).isMesh) return null;
    return owner;
  }

  /**
   * Mount the optional geometric macro encoder under the EXISTING knob owner at
   * identity: same pivot, same rest transform, same rotation/push state. While it is
   * the active presentation the baked standard encoder's visual children are hidden,
   * so the two representations never render together and never duplicate pick targets.
   */
  loadMacroEncoder(): Promise<AssetLoadTiming> {
    const generation = this.macroGeneration;
    return this.loadOnce('encoder_macro:' + generation, () => this.mountMacroEncoder(generation));
  }

  private async mountMacroEncoder(generation: number): Promise<AssetLoadTiming> {
    if (this.macroScene) return this.macroTiming!;
    if (!this.isMacroEncoderAvailable()) throw new Error('Manifest registers no encoder_macro variant');
    const owner = this.encoderOwnerNode();
    if (!owner) throw new Error(`Encoder knob owner ${this.manifest.encoder.knob_node} is not mounted`);

    const { gltf, timing } = await this.fetchAndParseGlb('encoder_macro');
    if (this.disposed || generation !== this.macroGeneration) {
      disposeObjectTree(gltf.scene);
      throw new DOMException('Macro request superseded', 'AbortError');
    }
    const scene = gltf.scene;
    scene.name = 'KF01_Encoder_Macro_GLB';
    calibratePartitionMaterials(scene);
    scene.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // The macro asset is decorative detail: it must never become a pick target.
        mesh.raycast = () => {};
      }
    });
    this.macroHiddenChildren = owner.children.map((node) => ({ node, visible: node.visible }));
    for (const { node } of this.macroHiddenChildren) node.visible = false;
    owner.add(scene);
    this.macroScene = scene;
    this.macroOwner = owner;
    this.macroTiming = timing;
    this.macroError = null;
    this.timings.set('encoder_macro', timing);
    this.encoderPresentation = 'macro';
    this.applyEncoderPresentation();
    this.applyEncoderTransform();
    return timing;
  }

  /** Explicit activation. `standard` keeps the macro asset mounted (hidden) for fast swaps. */
  async setEncoderPresentation(presentation: EncoderPresentation): Promise<{
    presentation: EncoderPresentation;
    macroLoaded: boolean;
    error: string | null;
  }> {
    const generation = presentation === 'standard' ? ++this.macroGeneration : this.macroGeneration;
    if (presentation === 'macro') {
      if (!this.macroScene) {
        try {
          await this.loadMacroEncoder();
        } catch (err) {
          if (this.disposed || generation !== this.macroGeneration) throw err;
          this.macroError = err instanceof Error ? err.message : String(err);
          this.encoderPresentation = 'standard';
          this.applyEncoderPresentation();
          return { presentation: this.encoderPresentation, macroLoaded: false, error: this.macroError };
        }
      }
      this.encoderPresentation = 'macro';
    } else {
      this.encoderPresentation = 'standard';
    }
    if (this.disposed || generation !== this.macroGeneration) throw new DOMException('Macro request superseded', 'AbortError');
    this.applyEncoderPresentation();
    this.applyEncoderTransform();
    return { presentation: this.encoderPresentation, macroLoaded: Boolean(this.macroScene), error: this.macroError };
  }

  /** Full release of the optional detail asset (quality-tier change / teardown). */
  unloadMacroEncoder(): void {
    this.macroGeneration++;
    if (!this.macroScene) return;
    this.encoderPresentation = 'standard';
    this.applyEncoderPresentation();
    this.macroScene.removeFromParent();
    disposeObjectTree(this.macroScene);
    this.macroScene = null;
    this.macroOwner = null;
    this.macroHiddenChildren = [];
    this.macroTiming = null;
    this.timings.delete('encoder_macro');
    this.applyEncoderTransform();
  }

  private applyEncoderPresentation(): void {
    const useMacro = this.encoderPresentation === 'macro' && this.macroScene !== null;
    for (const { node, visible } of this.macroHiddenChildren) node.visible = useMacro ? false : visible;
    if (this.macroScene) this.macroScene.visible = useMacro;
  }

  getEncoderReport() {
    const owner = this.macroOwner ?? this.encoderOwnerNode();
    return {
      schema: 'kf-003c-b2.2-encoder/1' as const,
      presentation: this.encoderPresentation,
      available: this.isMacroEncoderAvailable(),
      macroMounted: Boolean(this.macroScene),
      macroVisible: Boolean(this.macroScene?.visible),
      standardVisible: this.macroHiddenChildren.length
        ? this.macroHiddenChildren.some(({ node }) => node.visible)
        : Boolean(owner?.children.some((node) => node.visible)),
      macroPivot: this.macroScene?.parent?.name ?? null,
      macroSamePivotAsStandard: this.macroScene ? this.macroScene.parent === this.encoderOwnerNode() : null,
      knobNode: this.manifest.encoder.knob_node,
      shaftNode: this.manifest.encoder.shaft_node,
      knobAngleDeg: THREE.MathUtils.radToDeg((this.encoderKnob?.node.rotation.y ?? 0) - (this.encoderKnob?.restY ?? 0)),
      pushMm: Number((this.encoderPushCurrent * this.manifest.encoder.push.travel_max_m * 1000).toFixed(3)),
      macroBytes: this.macroTiming?.bytes ?? null,
      macroTier: this.macroTiming?.tier ?? null,
      macroTriangles: this.macroTiming?.triangles ?? null,
      error: this.macroError,
    };
  }

  computeActiveBounds() {
    const target = this.currentMode === 'hero_switch' ? this.heroRoot : this.keyboardRoot;
    target.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(target);
    if (box.isEmpty()) return null;
    const size = new THREE.Vector3();
    box.getSize(size);
    return {
      min: box.min.toArray().map((n) => Number(n.toFixed(6))),
      max: box.max.toArray().map((n) => Number(n.toFixed(6))),
      size: size.toArray().map((n) => Number(n.toFixed(6))),
    };
  }

  getTimings(): AssetLoadTiming[] {
    return [...this.timings.values()];
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.heroTravelListener = null;
    this.restoreFocusMaterials();
    this.focusGhostMaterial?.dispose();
    this.focusGhostMaterial = null;
    this.focusedGroupId = null;
    this.detachLegendMask();
    this.unloadMacroEncoder();
    this.clearSelection();
    this.instancing.dispose();
    resetSharedBatchMaterials();
    this.installedSwitchStemMaterial?.dispose();
    this.installedSwitchStemMaterial = null;
    this.installedSwitchHousingMaterial?.dispose();
    this.installedSwitchHousingMaterial = null;
    this.plateMaterials = [];
    this.activeInstalledSwitchSpec = null;
    this.activePlateSpec = null;
    this.keycapSchemeColors = null;
    this.keycapSchemeTintResolver = null;
    this.housingOverride?.material.dispose();
    this.housingOverride = null;
    this.instancingReports = {};
    this.overrideRecords = [];
    this.keyColorOverrides.clear();
    if (this.exteriorScene) {
      disposeObjectTree(this.exteriorScene);
      this.exteriorScene = null;
    }
    if (this.internalScene) {
      disposeObjectTree(this.internalScene);
      this.internalScene = null;
    }
    if (this.heroScene) {
      disposeObjectTree(this.heroScene);
      this.heroScene = null;
    }
    this.outlineHelper.geometry.dispose();
    (this.outlineHelper.material as THREE.Material).dispose();
    this.envManager.dispose();
    this.envTexture = null;
    this.keys.clear();
    this.groupNodes.clear();
    this.pickables = [];
    this.root.clear();
  }
}
