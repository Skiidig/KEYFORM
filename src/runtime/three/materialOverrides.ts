/**
 * KF-003C-B1 — runtime material overrides (Phase 2).
 *
 * Scope: installed keyboard switch housings ONLY.
 *
 * Baseline cost: `MAT_Switch_Housing` carries `transmission = 0.18` and is used by
 * 81 installed switch lids plus 8 stabiliser housings. Any transmissive material in
 * the scene forces three.js `WebGLRenderer` to run `renderTransmissionPass`, which
 * re-submits the entire opaque render list into an offscreen target every frame.
 * That single parameter is responsible for roughly +861 draw calls and
 * +1,009,748 submitted triangles in the combined assembled benchmark.
 *
 * This module clones the material (the GLB is never touched), sets transmission to 0
 * and keeps every other PBR parameter identical so the housing remains a recognisable
 * matte semi-gloss housing. `MAT_Hero_PC_Lid` (editorial hero switch) keeps its
 * transmission — the hero cutaway look is untouched.
 */
import * as THREE from 'three';

export interface MaterialOverrideRecord {
  id: string;
  scope: string;
  sourceMaterial: string;
  overrideMaterial: string;
  change: Array<{ parameter: string; before: number | string; after: number | string }>;
  meshesRetargeted: number;
  roles: string[];
  rationale: string;
  restorable: boolean;
}

export interface TransmissionInventory {
  materialsWithTransmission: Array<{ name: string; transmission: number; meshes: number; roles: string[] }>;
  removedMaterialNames: string[];
  preservedMaterialNames: string[];
  transmissionEnabledAfterOverride: boolean;
}

export interface OverrideInventory {
  schema: 'kf-003c-b1-material-overrides/1';
  generatedAt: string;
  overrides: MaterialOverrideRecord[];
  transmission: TransmissionInventory;
  /** Live scan of everything mounted at call time (includes the hero partition). */
  liveScan?: Array<{ name: string; transmission: number; meshes: number; roles: string[] }>;
}

interface HostMaterial extends THREE.MeshStandardMaterial {
  transmission?: number;
  thickness?: number;
  attenuationDistance?: number;
  attenuationColor?: THREE.Color;
  ior?: number;
  clearcoat?: number;
}

function hasTransmission(mat: THREE.Material): boolean {
  return typeof (mat as HostMaterial).transmission === 'number' && (mat as HostMaterial).transmission! > 0;
}

function readTransmissionMaterials(root: THREE.Object3D) {
  const byName = new Map<string, { name: string; transmission: number; meshes: number; roles: Set<string> }>();
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of list) {
      if (!mat || !hasTransmission(mat)) continue;
      const entry = byName.get(mat.name) ?? {
        name: mat.name,
        transmission: (mat as HostMaterial).transmission ?? 0,
        meshes: 0,
        roles: new Set<string>(),
      };
      entry.meshes += 1;
      const role = (mesh.userData ?? {}).kf01Role;
      if (typeof role === 'string') entry.roles.add(role);
      byName.set(mat.name, entry);
    }
  });
  return byName;
}

export interface ApplyHousingOverrideResult {
  material: THREE.MeshPhysicalMaterial | null;
  retargeted: number;
  inventory: TransmissionInventory;
  record: MaterialOverrideRecord | null;
}

/**
 * Replace the installed switch housing material with an opaque PBR approximation on
 * every mesh that currently uses it. Returns the exact inventory needed for the
 * handoff report. The original material object is left intact (it is simply no
 * longer referenced by these meshes) and is restorable via `restoreHousingOverride`.
 */
export function applyInstalledSwitchOpaqueOverride(
  root: THREE.Object3D,
  options: { sourceMaterialName?: string; overrideName?: string } = {},
): ApplyHousingOverrideResult {
  const sourceName = options.sourceMaterialName ?? 'MAT_Switch_Housing';
  const overrideName = options.overrideName ?? 'MAT_Switch_Housing_Opaque';
  const before = readTransmissionMaterials(root);

  let source: HostMaterial | null = null;
  const targets: THREE.Mesh[] = [];
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const mat = mesh.material as HostMaterial | undefined;
    if (!mat || mat.name !== sourceName) return;
    source = mat;
    targets.push(mesh);
  });

  const preserved = [...before.values()].filter((m) => m.name !== sourceName);
  if (!source || !targets.length) {
    return {
      material: null,
      retargeted: 0,
      inventory: {
        materialsWithTransmission: [...before.values()].map((m) => ({
          name: m.name,
          transmission: m.transmission,
          meshes: m.meshes,
          roles: [...m.roles].sort(),
        })),
        removedMaterialNames: [],
        preservedMaterialNames: preserved.map((m) => m.name),
        transmissionEnabledAfterOverride: before.size > 0,
      },
      record: null,
    };
  }

  const src = source as HostMaterial;
  const opaque = src.clone() as THREE.MeshPhysicalMaterial;
  opaque.name = overrideName;
  const transmissionBefore = src.transmission ?? 0;
  opaque.transmission = 0;
  if (typeof opaque.thickness === 'number') opaque.thickness = 0;
  if (opaque.attenuationColor) opaque.attenuationDistance = Number.POSITIVE_INFINITY;
  opaque.transparent = false;
  opaque.opacity = 1;
  opaque.depthWrite = true;
  opaque.userData = {
    ...(opaque.userData ?? {}),
    kf003cOverride: 'installed-switch-housing-opaque',
    kf003cSourceMaterial: sourceName,
    kf003cOriginalTransmission: transmissionBefore,
  };
  opaque.needsUpdate = true;

  for (const mesh of targets) {
    mesh.material = opaque;
  }

  const roles = new Set<string>();
  for (const mesh of targets) {
    const role = (mesh.userData ?? {}).kf01Role;
    if (typeof role === 'string') roles.add(role);
  }

  const after = readTransmissionMaterials(root);
  const inventory: TransmissionInventory = {
    materialsWithTransmission: [...before.values()].map((m) => ({
      name: m.name,
      transmission: m.transmission,
      meshes: m.meshes,
      roles: [...m.roles].sort(),
    })),
    removedMaterialNames: after.has(sourceName) ? [] : [sourceName],
    preservedMaterialNames: [...after.keys()].sort(),
    transmissionEnabledAfterOverride: after.size > 0,
  };

  const record: MaterialOverrideRecord = {
    id: 'OVR_KF003C_B1_01',
    scope: 'installed switch housings (81 lids + 8 stabiliser housings)',
    sourceMaterial: sourceName,
    overrideMaterial: overrideName,
    change: [
      { parameter: 'transmission', before: transmissionBefore, after: 0 },
      { parameter: 'thickness', before: Number(src.thickness ?? 0), after: 0 },
      { parameter: 'transparent', before: String(src.transparent), after: 'false' },
    ],
    meshesRetargeted: targets.length,
    roles: [...roles].sort(),
    rationale:
      'Removes the three.js renderTransmissionPass re-submission of the full opaque render list ' +
      'while preserving the matte housing appearance. Hero switch transmission is untouched.',
    restorable: true,
  };

  return { material: opaque, retargeted: targets.length, inventory, record };
}

/** Restore the original housing material (used by tests and by the override toggle). */
export function restoreHousingOverride(root: THREE.Object3D, sourceMaterial: THREE.Material): number {
  let restored = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const mat = mesh.material as THREE.Material | undefined;
    if (mat && mat.name === 'MAT_Switch_Housing_Opaque') {
      mesh.material = sourceMaterial;
      restored += 1;
    }
  });
  return restored;
}
