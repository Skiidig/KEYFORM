/**
 * KF-003C-B1 — GPU instancing retrofit for the actual KF-01 production GLBs.
 *
 * The GLBs are NOT modified. After parsing, compatible production meshes are
 * replaced (visually) by InstancedMesh batches; the original nodes stay in the
 * scene graph as the authoritative semantic/transform source but are made
 * `visible = false`.
 *
 * Batching key = geometryContent | materialFamily | motionClass | motionOwnerNode
 *
 *  - geometryContent : full content hash (POSITION/NORMAL/UV/index) so only truly
 *                      identical geometry is merged (linked duplicates, not LOD).
 *  - materialFamily  : material name, except MAT_Keycap_Alpha / MAT_Keycap_Mod
 *                      which are byte-identical PBR definitions in the manifest
 *                      (unified Charcoal PBT) and therefore share one material.
 *  - motionClass     : static | press-translate | press-spring
 *  - motionOwnerNode : nearest animated ancestor (assembly group, gasket travel
 *                      pivot, encoder knob/shaft) so that explode motion, gasket
 *                      travel and encoder rotation remain owned by the original
 *                      hierarchy — instance matrices stay in that local frame.
 *
 * Stable product identity is NEVER derived from GLB node order: every instance
 * records the `keyId` / `kf01Role` / `assemblyGroup` values read from glTF
 * `extras`, so picking, per-key press and per-key overrides keep working even
 * when a future replacement GLB reorders nodes or changes triangulation.
 */
import * as THREE from 'three';
import type { AssetManifest } from '../types/manifest';

export type InstanceMotion = 'static' | 'press-translate' | 'press-spring';

/** Roles whose nodes translate along the press axis while a key is pressed. */
const PRESS_TRANSLATE_ROLES = new Set([
  'keycap',
  'keycap_mount',
  'keycap_legend',
  'stabilizer_cap_socket',
  'switch_stem',
  'stabilizer_slider',
]);

/** Spring nodes compress on local Y instead of translating. */
const SPRING_ROLES = new Set(['switch_spring']);

/** Roles that are fully enclosed by other parts while the deck is assembled. */
export const ENCLOSED_ROLES: readonly string[] = [
  'switch_spring',
  'hotswap_socket',
  'socket_lands',
  'keycap_mount',
  'stabilizer_cap_socket',
];

/** Ancestor roles that own an animated frame (explode / gasket travel / encoder). */
const MOTION_OWNER_ROLES = new Set(['assembly_group', 'gasket_travel_pivot', 'encoder_knob', 'encoder_shaft']);

export interface InstanceSemantic {
  keyId: string | null;
  role: string | null;
  assemblyGroup: string | null;
  heroSubgroup: string | null;
  /** Name of the source glTF node (mesh node) this instance came from. */
  nodeName: string;
  /** Name of the canonical keycap node for this instance, when applicable. */
  capNodeName: string | null;
}

export interface InstanceRecord {
  index: number;
  semantic: InstanceSemantic;
  restPos: THREE.Vector3;
  restQuat: THREE.Quaternion;
  restScale: THREE.Vector3;
  /** Unit press direction expressed in the batch owner's local space. */
  pressDir: THREE.Vector3;
  /** Spring compression divisor (metres) for press-spring instances. */
  springDivisor: number;
  sourceMesh: THREE.Mesh;
}

export interface InstanceBatch {
  id: string;
  key: string;
  mesh: THREE.InstancedMesh;
  owner: THREE.Object3D;
  geometryKey: string;
  geometryName: string;
  materialName: string;
  materialFamily: string;
  motion: InstanceMotion;
  assemblyGroup: string | null;
  trianglesPerInstance: number;
  submissions: number;
  occludedWhenAssembled: boolean;
  keyIds: string[];
  instances: InstanceRecord[];
}

/**
 * A source node that carried unbatched children (keycap legends, cap mounts) cannot
 * simply be hidden: visibility is inherited, so the whole subtree would vanish. The
 * children are re-parented onto this transform proxy, which reproduces the original
 * node transform and mirrors its press translation.
 */
export interface PressProxyRecord {
  keyId: string;
  group: THREE.Group;
  restPos: THREE.Vector3;
  pressDir: THREE.Vector3;
}

export interface BuildResult {
  batches: InstanceBatch[];
  pressProxies: PressProxyRecord[];
  sourceMeshNodes: number;
  replacedMeshNodes: number;
  duplicateGeometryMerges: number;
  elapsedMs: number;
  geometryContents: number;
}

function roleMotion(role: string | null): InstanceMotion {
  if (!role) return 'static';
  if (SPRING_ROLES.has(role)) return 'press-spring';
  if (PRESS_TRANSLATE_ROLES.has(role)) return 'press-translate';
  return 'static';
}

function materialFamily(mat: THREE.Material): string {
  // Unified Charcoal PBT: MAT_Keycap_Alpha and MAT_Keycap_Mod carry identical
  // PBR parameters in the manifest and the GLB, so one shared material is exact.
  if (mat.name === 'MAT_Keycap_Alpha' || mat.name === 'MAT_Keycap_Mod') return 'MAT_Keycap_PBT';
  return mat.name || mat.uuid;
}

function hashUint32(view: Uint32Array, stride: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < view.length; i += stride) {
    h ^= view[i];
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function attributeHash(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined, samples: number): string {
  if (!attr) return 'none';
  const raw = (attr as THREE.BufferAttribute).array as THREE.TypedArray | undefined;
  if (!raw) return 'none';
  const u32 =
    raw instanceof Uint32Array
      ? raw
      : new Uint32Array(raw.buffer, raw.byteOffset, Math.max(0, (raw.byteLength / 4) | 0));
  const stride = Math.max(1, Math.floor(u32.length / samples));
  return `${u32.length.toString(36)}.${hashUint32(u32, stride).toString(36)}`;
}

function sameFloatContent(a: THREE.BufferAttribute | undefined, b: THREE.BufferAttribute | undefined): boolean {
  if (!a || !b) return a === b;
  const av = a.array as ArrayLike<number>;
  const bv = b.array as ArrayLike<number>;
  if (av.length !== bv.length) return false;
  for (let i = 0; i < av.length; i += 1) {
    if (av[i] !== bv[i]) return false;
  }
  return true;
}

function geometryContentKey(geometry: THREE.BufferGeometry): string {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const bbKey = bb
    ? `${bb.min.x.toFixed(4)},${bb.min.y.toFixed(4)},${bb.min.z.toFixed(4)},${bb.max.x.toFixed(4)},${bb.max.y.toFixed(4)},${bb.max.z.toFixed(4)}`
    : 'nobbox';
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  const nor = geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
  return [
    pos ? pos.count : 0,
    geometry.index ? geometry.index.count : 0,
    bbKey,
    attributeHash(pos, 4096),
    attributeHash(nor, 1024),
    attributeHash(uv, 1024),
  ].join('|');
}

function countTriangles(geometry: THREE.BufferGeometry): number {
  const idx = geometry.index;
  const pos = geometry.getAttribute('position');
  return Math.round((idx ? idx.count : pos ? pos.count : 0) / 3);
}

function nearestMotionOwner(node: THREE.Object3D, fallback: THREE.Object3D): THREE.Object3D {
  let cur: THREE.Object3D | null = node;
  while (cur) {
    const role = (cur.userData ?? {}).kf01Role as string | undefined;
    if (role && MOTION_OWNER_ROLES.has(role)) return cur;
    cur = cur.parent;
  }
  return fallback;
}

interface RoleInfo {
  role: string | null;
  keyId: string | null;
  assemblyGroup: string | null;
  heroSubgroup: string | null;
  capNode: THREE.Object3D | null;
}

/** Read canonical identity from glTF extras while walking up the hierarchy. */
function readSemantics(mesh: THREE.Object3D, keysById: Map<string, THREE.Object3D>): RoleInfo {
  let cur: THREE.Object3D | null = mesh;
  let role: string | null = null;
  let keyId: string | null = null;
  let assemblyGroup: string | null = null;
  let heroSubgroup: string | null = null;
  let capNode: THREE.Object3D | null = null;
  while (cur) {
    const ud = cur.userData ?? {};
    if (!role && typeof ud.kf01Role === 'string') role = ud.kf01Role;
    if (!keyId && typeof ud.keyId === 'string') keyId = ud.keyId;
    if (!assemblyGroup && typeof ud.assemblyGroup === 'string') assemblyGroup = ud.assemblyGroup;
    if (!heroSubgroup && typeof ud.heroSubgroup === 'string') heroSubgroup = ud.heroSubgroup;
    if (!capNode && ud.kf01Role === 'keycap' && typeof ud.keyId === 'string') {
      capNode = cur;
    }
    cur = cur.parent;
  }
  if (!capNode && keyId) capNode = keysById.get(keyId) ?? null;
  return { role, keyId, assemblyGroup, heroSubgroup, capNode };
}

export interface BuildInstancesOptions {
  manifest: AssetManifest;
  /** Parsed GLB scene root for one asset partition. */
  root: THREE.Object3D;
  /** Fallback batch owner if a mesh has no animated ancestor. */
  fallbackOwner: THREE.Object3D;
  /** Highest keycap node per canonical key id (authoritative press owner). */
  keysById: Map<string, THREE.Object3D>;
  /** Roles that should be suppressed while the deck is assembled. */
  enclosedRoles?: ReadonlySet<string>;
}

/**
 * Build compatible instanced batches for one asset partition.
 * Original meshes that were replaced are hidden but kept for identity/disposal.
 */
export function buildInstanceBatches(options: BuildInstancesOptions): BuildResult {
  const t0 = performance.now();
  const { root, fallbackOwner, keysById } = options;
  const enclosedRoles = options.enclosedRoles ?? new Set(ENCLOSED_ROLES);
  root.updateMatrixWorld(true);

  interface Candidate {
    mesh: THREE.Mesh;
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    family: string;
    geometryKey: string;
    motion: InstanceMotion;
    owner: THREE.Object3D;
    ownerGroupId: string | null;
    semantic: InstanceSemantic;
    roleInfo: RoleInfo;
  }

  const candidates: Candidate[] = [];
  let sourceMeshNodes = 0;

  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    sourceMeshNodes += 1;
    if (Array.isArray(mesh.material)) return; // multi-material meshes keep their own draw
    const material = mesh.material as THREE.Material | undefined;
    if (!material) return;
    if (mesh.name.startsWith('KF003C_')) return;
    const roleInfo = readSemantics(mesh, keysById);
    const owner = nearestMotionOwner(mesh, fallbackOwner);
    const ownerRole = (owner.userData ?? {}).kf01Role as string | undefined;
    const ownerGroupId =
      ownerRole === 'assembly_group' && typeof (owner.userData ?? {}).assemblyGroup === 'string'
        ? ((owner.userData ?? {}).assemblyGroup as string)
        : roleInfo.assemblyGroup;
    candidates.push({
      mesh,
      geometry: mesh.geometry,
      material,
      family: materialFamily(material),
      geometryKey: geometryContentKey(mesh.geometry),
      motion: roleMotion(roleInfo.role),
      owner,
      ownerGroupId,
      semantic: {
        keyId: roleInfo.keyId,
        role: roleInfo.role,
        assemblyGroup: roleInfo.assemblyGroup,
        heroSubgroup: roleInfo.heroSubgroup,
        nodeName: mesh.name,
        capNodeName: roleInfo.capNode ? roleInfo.capNode.name : null,
      },
      roleInfo,
    });
  });

  // Group by (geometry content, material family, motion class, owner node).
  const buckets = new Map<string, Candidate[]>();
  const geometryByKey = new Map<string, THREE.BufferGeometry>();
  const seenGeometryKeys = new Set<string>();
  let duplicateGeometryMerges = 0;

  for (const cand of candidates) {
    if (!seenGeometryKeys.has(cand.geometryKey)) {
      seenGeometryKeys.add(cand.geometryKey);
      geometryByKey.set(cand.geometryKey, cand.geometry);
    } else {
      const same = geometryByKey.get(cand.geometryKey);
      if (same && !sameFloatContent(same.getAttribute('position') as THREE.BufferAttribute, cand.geometry.getAttribute('position') as THREE.BufferAttribute)) {
        // Hash collision or near-identical geometry: keep them apart.
        cand.geometryKey = `${cand.geometryKey}|x${cand.mesh.uuid}`;
      } else {
        duplicateGeometryMerges += 1;
      }
    }
    const ownerId = cand.owner.uuid;
    const key = `${cand.geometryKey}|${cand.family}|${cand.motion}|${ownerId}`;
    const list = buckets.get(key);
    if (list) list.push(cand);
    else buckets.set(key, [cand]);
  }

  const batches: InstanceBatch[] = [];
  const pressProxies: PressProxyRecord[] = [];
  let replacedMeshNodes = 0;
  let batchIndex = 0;

  for (const [key, list] of buckets.entries()) {
    if (list.length < 2) continue; // a single instance is already one draw call
    const first = list[0];
    const owner = first.owner;
    owner.updateWorldMatrix(true, false);
    const ownerWorldInverse = new THREE.Matrix4().copy(owner.matrixWorld).invert();
    const ownerWorldQuat = new THREE.Quaternion();
    owner.getWorldQuaternion(ownerWorldQuat);
    const ownerQuatInverse = ownerWorldQuat.clone().invert();

    const material = resolveBatchMaterial(first.material);
    const im = new THREE.InstancedMesh(first.geometry, material, list.length);
    im.name = `KF01_InstanceBatch_${batchIndex.toString().padStart(3, '0')}`;
    im.castShadow = true;
    im.receiveShadow = true;
    im.frustumCulled = true;
    if (first.motion !== 'static') im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Per-instance colour channel is always allocated for keycap shells so that
    // per-key colour overrides (Phase 3 requirement) survive shared materials.
    // Default instance colour is the original Charcoal PBT linear base colour:
    // the shared material itself is white, so `material.color * instanceColor`
    // reproduces the baseline exactly and an override is a single multiply.
    if (first.family === 'MAT_Keycap_PBT') {
      const host = material as THREE.MeshStandardMaterial;
      const base = (host.userData?.kf003cInstanceBaseColor as number[] | undefined) ?? [1, 1, 1];
      const colors = new Float32Array(list.length * 3);
      for (let i = 0; i < list.length * 3; i += 3) {
        colors[i] = base[0];
        colors[i + 1] = base[1];
        colors[i + 2] = base[2];
      }
      im.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      im.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }

    const records: InstanceRecord[] = [];
    const keyIds = new Set<string>();

    list.forEach((cand, i) => {
      cand.mesh.updateMatrixWorld(true);
      const local = new THREE.Matrix4().multiplyMatrices(ownerWorldInverse, cand.mesh.matrixWorld);
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      local.decompose(pos, quat, scale);
      im.setMatrixAt(i, local);

      // Press direction: baseline moves the driven node along its own local -Y.
      const parentWorldQuat = new THREE.Quaternion();
      (cand.mesh.parent ?? cand.mesh).getWorldQuaternion(parentWorldQuat);
      const pressDir = new THREE.Vector3(0, -1, 0)
        .applyQuaternion(parentWorldQuat)
        .applyQuaternion(ownerQuatInverse)
        .normalize();

      const spec = cand.semantic.keyId ? options.manifest.keys.find((k) => k.id === cand.semantic.keyId) : undefined;
      records.push({
        index: i,
        semantic: cand.semantic,
        restPos: pos,
        restQuat: quat,
        restScale: scale,
        pressDir,
        springDivisor: spec?.press.spring_compression_divisor_m ?? 0.00586,
        sourceMesh: cand.mesh,
      });
      if (cand.semantic.keyId) keyIds.add(cand.semantic.keyId);
      if (cand.mesh.children.length > 0 && cand.mesh.parent) {
        // Preserve the subtree: the batched shell is replaced by instances, but its
        // children (legends, mounts, stabiliser sockets) still need the shell's
        // transform and its press travel, so they move onto a transform-only proxy.
        const proxy = new THREE.Group();
        proxy.name = `${cand.mesh.name}__PressProxy`;
        proxy.position.copy(cand.mesh.position);
        proxy.quaternion.copy(cand.mesh.quaternion);
        proxy.scale.copy(cand.mesh.scale);
        cand.mesh.parent.add(proxy);
        for (const child of [...cand.mesh.children]) proxy.add(child);
        if (cand.semantic.keyId) {
          pressProxies.push({
            keyId: cand.semantic.keyId,
            group: proxy,
            restPos: proxy.position.clone(),
            pressDir: new THREE.Vector3(0, -1, 0),
          });
        }
      }
      cand.mesh.visible = false;
      replacedMeshNodes += 1;
    });

    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingBox();
    im.computeBoundingSphere();
    if (im.boundingSphere) im.boundingSphere.radius += 0.006; // press travel margin

    owner.add(im);
    im.updateMatrixWorld(true);

    const occludedWhenAssembled =
      first.semantic.role !== null && enclosedRoles.has(first.semantic.role) && first.ownerGroupId !== null;

    batches.push({
      id: im.name,
      key,
      mesh: im,
      owner,
      geometryKey: first.geometryKey,
      geometryName: first.geometry.name || first.mesh.name,
      materialName: material.name || first.material.name,
      materialFamily: first.family,
      motion: first.motion,
      assemblyGroup: first.ownerGroupId,
      trianglesPerInstance: countTriangles(first.geometry),
      submissions: list.length,
      occludedWhenAssembled,
      keyIds: [...keyIds],
      instances: records,
    });
    batchIndex += 1;
  }

  return {
    batches,
    pressProxies,
    sourceMeshNodes,
    replacedMeshNodes,
    duplicateGeometryMerges,
    elapsedMs: performance.now() - t0,
    geometryContents: seenGeometryKeys.size,
  };
}

/**
 * Material resolution for a batch. Keycap shells get one shared PBR material with a
 * white base colour so that `instanceColor` (default white = original Charcoal PBT
 * linear colour) reproduces the exact baseline shading and per-key overrides are
 * a pure multiply instead of a second colour multiplication.
 */
const sharedMaterials = new Map<string, THREE.Material>();

export function resetSharedBatchMaterials(): void {
  for (const mat of sharedMaterials.values()) mat.dispose();
  sharedMaterials.clear();
}

function resolveBatchMaterial(source: THREE.Material): THREE.Material {
  if (materialFamily(source) !== 'MAT_Keycap_PBT') return source;
  const existing = sharedMaterials.get('MAT_Keycap_PBT');
  if (existing) return existing;
  const clone = source.clone() as THREE.MeshStandardMaterial;
  clone.name = 'MAT_Keycap_PBT';
  const base = source as THREE.MeshStandardMaterial;
  // Preserve the exact linear base colour on the instances, not on the material.
  const [r, g, b] = [base.color.r, base.color.g, base.color.b];
  clone.color.setRGB(1, 1, 1, THREE.LinearSRGBColorSpace);
  clone.userData = { ...(clone.userData ?? {}), kf003cInstanceBaseColor: [r, g, b] };
  clone.needsUpdate = true;
  sharedMaterials.set('MAT_Keycap_PBT', clone);
  return clone;
}

export function getSharedBatchMaterials(): THREE.Material[] {
  return [...sharedMaterials.values()];
}

/** Serialisable batch inventory rows (used by the handoff reports). */
export function describeBatches(batches: InstanceBatch[]): Array<Record<string, unknown>> {
  return batches.map((b) => ({
    id: b.id,
    geometry: b.geometryName,
    geometryKey: b.geometryKey,
    material: b.materialName,
    materialFamily: b.materialFamily,
    motion: b.motion,
    assemblyGroup: b.assemblyGroup,
    instances: b.instances.length,
    sourceMeshNodes: b.submissions,
    trianglesPerInstance: b.trianglesPerInstance,
    submittedTriangles: b.trianglesPerInstance * b.instances.length,
    occludedWhenAssembled: b.occludedWhenAssembled,
    keyIds: b.keyIds,
    keyIdCount: b.keyIds.length,
  }));
}

/** Per-key colour override applied through `instanceColor` (linear RGB hex). */
export function setBatchInstanceColor(batch: InstanceBatch, index: number, color: THREE.Color | null): void {
  const attr = batch.mesh.instanceColor;
  if (!attr) return;
  const material = Array.isArray(batch.mesh.material) ? batch.mesh.material[0] : batch.mesh.material;
  const base =
    material && material.name === 'MAT_Keycap_PBT'
      ? (material.userData?.kf003cInstanceBaseColor as number[] | undefined)
      : undefined;
  if (color) {
    attr.setXYZ(index, color.r, color.g, color.b);
  } else if (base) {
    attr.setXYZ(index, base[0], base[1], base[2]);
  } else {
    attr.setXYZ(index, 1, 1, 1);
  }
  attr.needsUpdate = true;
}

/**
 * Runtime state for all instance batches across both loaded partitions.
 * Owns press synchronisation, assembled-visibility suppression and disposal.
 */
export class InstancingRuntime {
  readonly batches: InstanceBatch[] = [];
  readonly pressProxies = new Map<string, PressProxyRecord>();
  private byMesh = new Map<THREE.InstancedMesh, InstanceBatch>();
  private pressIndex = new Map<string, Array<{ batch: InstanceBatch; record: InstanceRecord }>>();
  private assembledHidden = false;
  private hiddenActive = false;
  private disposed = false;
  private readonly dummy = new THREE.Matrix4();

  add(result: BuildResult): void {
    for (const proxy of result.pressProxies) this.pressProxies.set(proxy.keyId, proxy);
    for (const batch of result.batches) {
      this.batches.push(batch);
      this.byMesh.set(batch.mesh, batch);
      for (const rec of batch.instances) {
        if (batch.motion === 'static' || !rec.semantic.keyId) continue;
        const list = this.pressIndex.get(rec.semantic.keyId) ?? [];
        list.push({ batch, record: rec });
        this.pressIndex.set(rec.semantic.keyId, list);
      }
    }
  }

  getBatchForMesh(mesh: THREE.InstancedMesh): InstanceBatch | undefined {
    return this.byMesh.get(mesh);
  }

  getRecord(mesh: THREE.InstancedMesh, instanceId: number): InstanceRecord | undefined {
    return this.byMesh.get(mesh)?.instances[instanceId];
  }

  /** Synchronise press-driven instance matrices for one canonical key. */
  syncKeyPress(keyId: string, pressM: number): void {
    const proxy = this.pressProxies.get(keyId);
    if (proxy) {
      proxy.group.position.copy(proxy.restPos).addScaledVector(proxy.pressDir, pressM);
    }
    const list = this.pressIndex.get(keyId);
    if (!list || !list.length) return;
    for (const { batch, record } of list) {
      if (batch.motion === 'press-spring') {
        const factor = Math.max(0.25, 1.0 - pressM / record.springDivisor);
        this.dummy.compose(
          record.restPos,
          record.restQuat,
          new THREE.Vector3(record.restScale.x, record.restScale.y * factor, record.restScale.z),
        );
      } else {
        this.dummy.compose(
          new THREE.Vector3().copy(record.restPos).addScaledVector(record.pressDir, pressM),
          record.restQuat,
          record.restScale,
        );
      }
      batch.mesh.setMatrixAt(record.index, this.dummy);
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Instance indices that carry a canonical key id (picking / overrides / tests). */
  instancesForKey(keyId: string): Array<{ batch: InstanceBatch; record: InstanceRecord }> {
    const out: Array<{ batch: InstanceBatch; record: InstanceRecord }> = [];
    for (const batch of this.batches) {
      for (const rec of batch.instances) {
        if (rec.semantic.keyId === keyId) out.push({ batch, record: rec });
      }
    }
    return out;
  }

  /**
   * Conservative visibility management: while the deck is assembled, parts that are
   * sealed inside the enclosure are not submitted. They are restored the moment the
   * exploded pose begins so exploded inspection is unaffected.
   */
  setAssembledVisibility(assembled: boolean, force = false): void {
    if (this.assembledHidden === assembled && !force) return;
    this.assembledHidden = assembled;
    for (const batch of this.batches) {
      if (!batch.occludedWhenAssembled) continue;
      batch.mesh.visible = !assembled;
    }
    this.hiddenActive = assembled;
  }

  isAssembledSuppressionActive(): boolean {
    return this.hiddenActive;
  }

  /** Per-batch inventory row for the handoff documents. */
  describe(): Array<Record<string, unknown>> {
    return describeBatches(this.batches);
  }

  totals() {
    let instances = 0;
    let replaced = 0;
    let triangles = 0;
    const motions = { static: 0, 'press-translate': 0, 'press-spring': 0 } as Record<InstanceMotion, number>;
    for (const b of this.batches) {
      instances += b.instances.length;
      replaced += b.submissions;
      triangles += b.trianglesPerInstance * b.instances.length;
      motions[b.motion] += 1;
    }
    return { batches: this.batches.length, instances, replacedMeshNodes: replaced, submittedTriangles: triangles, motions };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const batch of this.batches) {
      batch.mesh.dispose();
      batch.mesh.removeFromParent();
      if (batch.mesh.instanceColor) batch.mesh.instanceColor = null;
    }
    this.batches.length = 0;
    this.byMesh.clear();
    this.pressIndex.clear();
  }
}
