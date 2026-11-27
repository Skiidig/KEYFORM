/**
 * KF-003C-B3 — Reference-Driven Material Calibration (Phase 4).
 *
 * Calibrates real-time PBR materials against the frozen KF-003B Cycles production
 * renders (`D:/Assets/KEYFORM/renders/cycles-raw/kf003b-prod`) and Blender master
 * (`kf01_kf003b_prod.blend`) while strictly preserving:
 *   - Canonical manifest linear base colors (especially Forest enclosure and uniform
 *     Charcoal PBT `#1A1F1E` across all 81 keys including Esc).
 *   - Dielectric matte behavior on Charcoal PBT keycaps (never metallic or glossy).
 *   - B1 installed-switch opaque override (`MAT_Switch_Housing_Opaque`, transmission = 0).
 *   - Standalone Hero Switch transmission (`MAT_Hero_PC_Lid`, transmission = 0.72 on Linear 45).
 *   - Zero new large texture maps (pure shader/PBR parameter calibration).
 */
import * as THREE from 'three';
import type { EnclosurePresetId, HeroSwitchVariantId } from '../types/manifest';

export interface EnclosureFinishCalibration {
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
  note: string;
}

/**
 * Per-finish anodized aluminium calibrations.
 * Base linear colors ALWAYS come from `manifest.materials.enclosure_presets[id].base_color_linear`.
 * Each finish gets tailored roughness/clearcoat/metalness so Forest, Obsidian, Carbon, and
 * Titanium remain clearly distinct under identical Atelier lighting & fixed exposure.
 */
export const ENCLOSURE_FINISH_CALIBRATION: Record<EnclosurePresetId, EnclosureFinishCalibration> = {
  forest: {
    metalness: 0.85,
    roughness: 0.28,
    clearcoat: 0.16,
    clearcoatRoughness: 0.24,
    envMapIntensity: 1.50,
    note: 'Bead-blasted deep Forest 6063 anodized aluminium with luminous satin sheen and crisp chamfer highlights.',
  },
  obsidian: {
    metalness: 0.78,
    roughness: 0.24,
    clearcoat: 0.26,
    clearcoatRoughness: 0.20,
    envMapIntensity: 1.56,
    note: 'Sleek satin black anodized aluminium; controlled clearcoat separates grazing bevels from Carbon without crushing.',
  },
  carbon: {
    metalness: 0.84,
    roughness: 0.34,
    clearcoat: 0.10,
    clearcoatRoughness: 0.32,
    envMapIntensity: 1.48,
    note: 'Cool graphite bead-blasted matte aluminium; visibly lighter and cooler-slate than Obsidian.',
  },
  titanium: {
    metalness: 0.94,
    roughness: 0.24,
    clearcoat: 0.06,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.72,
    note: 'High-metalness bead-blasted silver-titanium; catches crisp studio gradients and bright chamfer sheen, never grey plastic.',
  },
};

export interface MaterialCalibrationEntry {
  metalness?: number;
  roughness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  specularIntensity?: number;
  ior?: number;
  envMapIntensity?: number;
  normalScale?: number;
  thickness?: number;
  attenuationDistance?: number;
}

/**
 * Runtime material calibrations keyed by canonical GLB material name.
 * Values start from `kf01_kf003b_prod.blend` Principled BSDF definitions and apply
 * justified real-time IBL compensations (single-bounce PMREM vs multi-bounce Cycles).
 */
export const MATERIAL_CALIBRATIONS: Record<string, MaterialCalibrationEntry> = {
  // ---- Keycaps (canonical Charcoal PBT #1A1F1E preserved; matte dielectric only) ----
  MAT_Keycap_Alpha: {
    metalness: 0.0,
    roughness: 0.58,
    clearcoat: 0.0,
    specularIntensity: 0.38,
    ior: 1.50,
    envMapIntensity: 0.86,
  },
  MAT_Keycap_Mod: {
    metalness: 0.0,
    roughness: 0.58,
    clearcoat: 0.0,
    specularIntensity: 0.38,
    ior: 1.50,
    envMapIntensity: 0.86,
  },
  MAT_Keycap_PBT: {
    metalness: 0.0,
    roughness: 0.58,
    clearcoat: 0.0,
    specularIntensity: 0.38,
    ior: 1.50,
    envMapIntensity: 0.86,
  },

  // ---- Rotary Encoder (standard baked 512 normal + geometric macro + top face) ----
  MAT_Knob_Metal_Baked_512: {
    metalness: 0.96,
    roughness: 0.19,
    clearcoat: 0.18,
    clearcoatRoughness: 0.16,
    normalScale: 1.85,
    envMapIntensity: 1.85,
  },
  MAT_Knob_Metal: {
    metalness: 0.96,
    roughness: 0.19,
    clearcoat: 0.16,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.80,
  },
  MAT_Knob_Face: {
    metalness: 0.95,
    roughness: 0.24,
    clearcoat: 0.08,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.65,
  },

  // ---- Enclosure Engraving Mark ----
  MAT_Case_Mark: {
    metalness: 0.15,
    roughness: 0.50,
    envMapIntensity: 0.95,
  },

  // ---- Internal Mechanical Assembly (clear visual separation across all 9 groups) ----
  MAT_Weight_Metal: {
    metalness: 1.0,
    roughness: 0.21,
    clearcoat: 0.08,
    clearcoatRoughness: 0.20,
    envMapIntensity: 1.85,
  },
  MAT_Weight_Mark: {
    metalness: 0.18,
    roughness: 0.56,
    envMapIntensity: 0.85,
  },
  MAT_Plate_Active: {
    metalness: 0.82,
    roughness: 0.34,
    envMapIntensity: 1.28,
  },
  MAT_PCB_FR4: {
    metalness: 0.0,
    roughness: 0.44,
    clearcoat: 0.22,
    clearcoatRoughness: 0.28,
    envMapIntensity: 1.12,
  },
  MAT_PCB_Metal: {
    metalness: 0.98,
    roughness: 0.24,
    envMapIntensity: 1.45,
  },
  MAT_Fastener_Steel: {
    metalness: 1.0,
    roughness: 0.19,
    envMapIntensity: 1.52,
  },
  MAT_USB_Housing: {
    metalness: 1.0,
    roughness: 0.21,
    envMapIntensity: 1.48,
  },
  MAT_Switch_Housing_Opaque: {
    // Retains B1 opaque override (transmission = 0) with realistic smoked-PC sheen
    metalness: 0.0,
    roughness: 0.31,
    clearcoat: 0.20,
    clearcoatRoughness: 0.22,
    specularIntensity: 0.62,
    ior: 1.57,
    envMapIntensity: 1.22,
  },
  MAT_Switch_Stem: {
    metalness: 0.0,
    roughness: 0.32,
    specularIntensity: 0.55,
    ior: 1.48,
    envMapIntensity: 1.02,
  },
  MAT_Switch_Base: {
    metalness: 0.0,
    roughness: 0.42,
    specularIntensity: 0.48,
    ior: 1.54,
    envMapIntensity: 1.05,
  },
  MAT_Silicone: {
    metalness: 0.0,
    roughness: 0.72,
    specularIntensity: 0.30,
    envMapIntensity: 0.82,
  },
  MAT_Acoustic_IXPE: {
    metalness: 0.0,
    roughness: 0.82,
    specularIntensity: 0.22,
    envMapIntensity: 0.82,
  },
  MAT_Acoustic_Poron: {
    metalness: 0.0,
    roughness: 0.86,
    specularIntensity: 0.20,
    envMapIntensity: 0.80,
  },
  MAT_Harness: {
    metalness: 0.0,
    roughness: 0.65,
    envMapIntensity: 0.88,
  },

  // ---- Standalone Hero Switch (preserves transmission = 0.72 on Linear 45!) ----
  MAT_Hero_PC_Lid: {
    clearcoat: 0.20,
    clearcoatRoughness: 0.12,
    specularIntensity: 0.88,
    thickness: 0.0045,
    attenuationDistance: 0.022,
    envMapIntensity: 1.38,
  },
  MAT_Hero_Contact_Copper: {
    metalness: 1.0,
    roughness: 0.20,
    envMapIntensity: 1.52,
  },
  MAT_Hero_Contact_Tip: {
    metalness: 1.0,
    roughness: 0.18,
    envMapIntensity: 1.55,
  },
};

export function applyCalibrationToMaterial(mat: THREE.Material): boolean {
  const cal = MATERIAL_CALIBRATIONS[mat.name];
  if (!cal) return false;
  const std = mat as THREE.MeshStandardMaterial;
  const phys = mat as THREE.MeshPhysicalMaterial;

  if (typeof cal.metalness === 'number' && 'metalness' in std) std.metalness = cal.metalness;
  if (typeof cal.roughness === 'number' && 'roughness' in std) std.roughness = cal.roughness;
  if (typeof cal.envMapIntensity === 'number' && 'envMapIntensity' in std) std.envMapIntensity = cal.envMapIntensity;
  if (typeof cal.normalScale === 'number' && std.normalMap && std.normalScale) {
    std.normalScale.set(cal.normalScale, cal.normalScale);
  }
  if (typeof cal.clearcoat === 'number' && 'clearcoat' in phys) phys.clearcoat = cal.clearcoat;
  if (typeof cal.clearcoatRoughness === 'number' && 'clearcoatRoughness' in phys) {
    phys.clearcoatRoughness = cal.clearcoatRoughness;
  }
  if (typeof cal.specularIntensity === 'number' && 'specularIntensity' in phys) {
    phys.specularIntensity = cal.specularIntensity;
  }
  if (typeof cal.ior === 'number' && 'ior' in phys) phys.ior = cal.ior;
  if (typeof cal.thickness === 'number' && 'thickness' in phys) phys.thickness = cal.thickness;
  if (typeof cal.attenuationDistance === 'number' && 'attenuationDistance' in phys) {
    phys.attenuationDistance = cal.attenuationDistance;
  }
  // Ensure normal maps, roughness maps, metalness maps remain non-color data
  if (std.normalMap) std.normalMap.colorSpace = THREE.NoColorSpace;
  if (std.roughnessMap) std.roughnessMap.colorSpace = THREE.NoColorSpace;
  if (std.metalnessMap) std.metalnessMap.colorSpace = THREE.NoColorSpace;

  mat.needsUpdate = true;
  return true;
}

export function calibratePartitionMaterials(root: THREE.Object3D): number {
  const seen = new Set<string>();
  let calibrated = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m || seen.has(m.uuid)) continue;
      seen.add(m.uuid);
      if (applyCalibrationToMaterial(m)) calibrated += 1;
    }
  });
  return calibrated;
}

/**
 * Calibrate Hero Switch lid physical properties after variant switch without altering
 * manifest transmission (0.72 Linear 45, 0.0 Tactile 58, 0.50 Silent 50).
 */
export function calibrateHeroLidVariant(mat: THREE.MeshPhysicalMaterial, variantId: HeroSwitchVariantId): void {
  if (variantId === 'linear45') {
    mat.clearcoat = 0.22;
    mat.clearcoatRoughness = 0.11;
    mat.thickness = 0.0045;
    mat.attenuationDistance = 0.024;
    mat.attenuationColor.setRGB(0.45, 0.62, 0.54, THREE.LinearSRGBColorSpace);
    mat.envMapIntensity = 1.42;
  } else if (variantId === 'tactile58') {
    // Matte carbon upper housing (opaque in manifest)
    mat.clearcoat = 0.10;
    mat.clearcoatRoughness = 0.26;
    mat.thickness = 0;
    mat.envMapIntensity = 1.24;
  } else {
    // Silent 50 frosted smoke upper housing (transmission 0.50 in manifest)
    mat.clearcoat = 0.14;
    mat.clearcoatRoughness = 0.24;
    mat.thickness = 0.0045;
    mat.attenuationDistance = 0.018;
    mat.attenuationColor.setRGB(0.42, 0.52, 0.48, THREE.LinearSRGBColorSpace);
    mat.envMapIntensity = 1.32;
  }
  mat.needsUpdate = true;
}

/**
 * Selective shadow-casting policy (Phase 5):
 * Do not enable expensive shadow casting on tiny hidden/internal fasteners, sockets,
 * springs, or acoustic pads. Keep shadow casting strictly on major structural silhouettes.
 */
const NON_SHADOW_CASTER_ROLES = new Set([
  'switch_spring',
  'hotswap_socket',
  'socket_lands',
  'keycap_mount',
  'stabilizer_cap_socket',
  'stabilizer_slider',
  'fastener',
  'gasket',
  'acoustic_pad',
]);

export function applySelectiveShadowPolicy(root: THREE.Object3D, isHero = false): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (isHero) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return;
    }
    const role = (mesh.userData?.kf01Role as string | undefined) ?? null;
    const isSmallInternal = role !== null && NON_SHADOW_CASTER_ROLES.has(role);
    mesh.castShadow = !isSmallInternal;
    mesh.receiveShadow = true;
  });
}
