/**
 * KEYFORM — KF-006A Build Studio Live Configuration Runtime
 *
 * Lazy-loaded exclusively when Build Studio 3D activates so initial visitor JS
 * stays <= 90 kB gzip-9 and Switch Lab / Mechanical Anatomy never download Build
 * Studio material tables.
 *
 * Responsibilities:
 *   1. Canonical base keycap set grouping (Charcoal PBT, Porcelain PBT, Two-Tone Slate)
 *      derived strictly from manifest key semantics (alpha + convex Space vs modifier + Esc).
 *   2. Deterministic Escape accent precedence:
 *        base keycap set  <  explicit Escape accent  <  future per-key overrides (KF-006B).
 *   3. Calibrated per-key legend contrast (WCAG relative luminance threshold) for
 *      mixed light/dark sets and accents using the shader-side `kfLegendTint` attribute.
 *   4. Representative material-only installed switch profile preview (`GRP_03_Switches`
 *      isolated stem & opaque housing clones; zero transmission pass, zero stabilizer mutation).
 *   5. Calibrated switch plate PBR materials (`GRP_04_SwitchPlate` / `MAT_Plate_Active`;
 *      polycarbonate uses an opaque frosted dielectric approximation with transmission = 0).
 *   6. Deterministic dirty-tracked `applyBuildConfiguration` pipeline that avoids
 *      unnecessary material mutations, preserves camera/orbit, and applies internal
 *      configuration as soon as the lazy internal partition finishes loading.
 */
import * as THREE from 'three';
import type {
  AccentKeyId,
  BuildConfigState,
  EnclosureFinishId,
  KeycapSetId,
  PlateMaterialId,
  SwitchProfileId,
} from '../types';
import type { KeySpec } from '../types/manifest';
import type {
  InstalledSwitchMaterialSpec,
  PlateMaterialSpec,
  ProductionScene,
} from './ProductionScene';

/** Canonical dark charcoal legend tint (linear sRGB of #171B1A) for light/mid keycaps. */
export const DARK_LEGEND_LINEAR: readonly [number, number, number] = [0.008023, 0.010817, 0.010187];

/** Relative luminance threshold separating dark caps (light legend) from light/mid caps (dark legend). */
export const LEGEND_CONTRAST_LUMINANCE_THRESHOLD = 0.18;

export interface KeycapSetPalette {
  id: KeycapSetId;
  uniform: boolean;
  /** Null restores exact manifest Charcoal PBT linear baseline (#1A1F1E). */
  alphaHex: string | null;
  modifierHex: string | null;
}

export const KEYCAP_SET_PALETTES: Record<KeycapSetId, KeycapSetPalette> = {
  'charcoal-pbt': {
    id: 'charcoal-pbt',
    uniform: true,
    alphaHex: null,
    modifierHex: null,
  },
  'porcelain-pbt': {
    id: 'porcelain-pbt',
    uniform: false,
    alphaHex: '#ECE9DF',
    modifierHex: '#C2BEB2',
  },
  'two-tone-slate': {
    id: 'two-tone-slate',
    uniform: false,
    alphaHex: '#D9DDD8',
    modifierHex: '#434A46',
  },
};

export const ESCAPE_ACCENT_HEX: Record<AccentKeyId, string | null> = {
  matched: null,
  ivory: '#F2EFE6',
  'forest-accent': '#294B3B',
  'brass-accent': '#B49A70',
};

/**
 * Representative material-only installed switch finishes (`GRP_03_Switches` ONLY).
 * Stem linear colors align with `manifest.hero_switch.variants`; upper housings stay
 * strictly opaque (`transmission = 0`) to preserve the B1 opaque-housing optimization.
 */
export const INSTALLED_SWITCH_MATERIALS: Record<SwitchProfileId, InstalledSwitchMaterialSpec> = {
  'linear-45': {
    id: 'linear-45',
    stemLinear: [0.716484, 0.655799, 0.534301],
    stemRoughness: 0.34,
    housingLinear: [0.023182, 0.033444, 0.026861],
    housingRoughness: 0.31,
    housingClearcoat: 0.2,
    housingClearcoatRoughness: 0.22,
    housingEnvMapIntensity: 1.22,
  },
  'tactile-58': {
    id: 'tactile-58',
    stemLinear: [0.782619, 0.164817, 0.035528],
    stemRoughness: 0.34,
    housingLinear: [0.021119, 0.025639, 0.027779],
    housingRoughness: 0.48,
    housingClearcoat: 0.08,
    housingClearcoatRoughness: 0.28,
    housingEnvMapIntensity: 1.1,
  },
  'silent-50': {
    id: 'silent-50',
    stemLinear: [0.110489, 0.174292, 0.152663],
    stemRoughness: 0.385,
    housingLinear: [0.057805, 0.084376, 0.072272],
    housingRoughness: 0.42,
    housingClearcoat: 0.12,
    housingClearcoatRoughness: 0.26,
    housingEnvMapIntensity: 1.16,
  },
};

/**
 * Calibrated PBR specifications for `GRP_04_SwitchPlate` (`MAT_Plate_Active`).
 * Polycarbonate is intentionally represented as an opaque frosted dielectric
 * approximation (transmission = 0, transparent = false) to avoid transmission passes.
 */
export const PLATE_MATERIAL_SPECS: Record<PlateMaterialId, PlateMaterialSpec> = {
  aluminium: {
    id: 'aluminium',
    colorHex: '#9DA5A1',
    metalness: 0.88,
    roughness: 0.3,
    clearcoat: 0.06,
    clearcoatRoughness: 0.28,
    envMapIntensity: 1.38,
  },
  fr4: {
    id: 'fr4',
    colorHex: '#1F2422',
    metalness: 0.0,
    roughness: 0.58,
    clearcoat: 0.1,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.9,
  },
  polycarbonate: {
    id: 'polycarbonate',
    colorHex: '#D6DBD6',
    metalness: 0.0,
    roughness: 0.4,
    clearcoat: 0.22,
    clearcoatRoughness: 0.26,
    specularIntensity: 0.62,
    ior: 1.58,
    envMapIntensity: 1.12,
  },
  brass: {
    id: 'brass',
    colorHex: '#B89A68',
    metalness: 0.96,
    roughness: 0.28,
    clearcoat: 0.04,
    clearcoatRoughness: 0.24,
    envMapIntensity: 1.55,
  },
};

/**
 * Semantic keycap grouping policy using canonical manifest metadata:
 *   - Alphas (`semantic_finish_role === 'alpha'`) + convex Space (`is_convex_space === true`) -> 'alpha'
 *   - Outer modifiers + Esc (`accent_optional`) -> 'modifier'
 */
export function resolveKeycapSetRole(spec: KeySpec): 'alpha' | 'modifier' {
  if (spec.semantic_finish_role === 'alpha' || spec.is_convex_space === true) {
    return 'alpha';
  }
  return 'modifier';
}

const scratchColor = new THREE.Color();

/**
 * Compute deterministic legend contrast tint (linear RGB) for a cap color.
 * Returns `null` to use the canonical manifest light legend (`MAT_Legend_Light`),
 * or `DARK_LEGEND_LINEAR` for light/mid-value keycaps.
 */
export function resolveLegendTintForHex(
  hex: string | null,
): readonly [number, number, number] | null {
  if (!hex) return null;
  scratchColor.set(hex);
  const luminance = 0.2126 * scratchColor.r + 0.7152 * scratchColor.g + 0.0722 * scratchColor.b;
  return luminance >= LEGEND_CONTRAST_LUMINANCE_THRESHOLD ? DARK_LEGEND_LINEAR : null;
}

/**
 * Resolve the complete canonical per-key color map for a BuildConfig:
 *   Precedence: base keycap set -> explicit Escape accent -> optional per-key overrides (KF-006B).
 * Returns null for keys that stay at the canonical Charcoal PBT baseline.
 */
export function resolveKeycapAppearanceMap(
  keys: readonly KeySpec[],
  config: Pick<BuildConfigState, 'keycaps' | 'accent' | 'keyOverrides'>,
): Map<string, string | null> {
  const palette = KEYCAP_SET_PALETTES[config.keycaps] ?? KEYCAP_SET_PALETTES['charcoal-pbt'];
  const accentHex = ESCAPE_ACCENT_HEX[config.accent] ?? null;
  const overrides = config.keyOverrides;
  const resolved = new Map<string, string | null>();

  for (const spec of keys) {
    let hex: string | null = palette.uniform
      ? palette.alphaHex
      : resolveKeycapSetRole(spec) === 'alpha'
        ? palette.alphaHex
        : palette.modifierHex;

    if (spec.semantic_finish_role === 'accent_optional' && accentHex !== null) {
      hex = accentHex;
    }

    if (overrides && Object.prototype.hasOwnProperty.call(overrides, spec.id)) {
      hex = overrides[spec.id] ?? null;
    }

    resolved.set(spec.id, hex);
  }

  return resolved;
}

export interface AppliedConfigurationResult {
  enclosureChanged: boolean;
  keycapsChanged: boolean;
  switchChanged: boolean;
  plateChanged: boolean;
  anyVisualChange: boolean;
  exteriorApplied: boolean;
  internalApplied: boolean;
}

interface AppliedTracker {
  enclosure?: EnclosureFinishId;
  keycaps?: KeycapSetId;
  accent?: AccentKeyId;
  keyOverrides?: BuildConfigState['keyOverrides'];
  switchProfile?: SwitchProfileId;
  plate?: PlateMaterialId;
  exteriorApplied: boolean;
  internalApplied: boolean;
}

/**
 * Deterministic Build Studio configuration applier.
 * Tracks what has already been applied to each mounted partition so rapid updates,
 * lazy internal-partition loads, and repeated calls mutate only changed materials
 * and invalidate rendering only when a visible change occurred.
 */
export function createBuildConfigApplier() {
  const applied: AppliedTracker = {
    exteriorApplied: false,
    internalApplied: false,
  };

  return {
    apply(model: ProductionScene, config: BuildConfigState, force = false): AppliedConfigurationResult {
      const hasExterior = model.isExteriorLoaded();
      const hasInternal = model.isInternalLoaded();

      let enclosureChanged = false;
      let keycapsChanged = false;
      let switchChanged = false;
      let plateChanged = false;

      if (hasExterior) {
        if (force || !applied.exteriorApplied || applied.enclosure !== config.enclosure) {
          model.applyCasePreset(config.enclosure);
          applied.enclosure = config.enclosure;
          enclosureChanged = true;
        }

        if (
          force ||
          !applied.exteriorApplied ||
          applied.keycaps !== config.keycaps ||
          applied.accent !== config.accent ||
          applied.keyOverrides !== config.keyOverrides
        ) {
          const capColors = resolveKeycapAppearanceMap(model.manifest.keys, config);
          model.applyKeycapColorScheme(capColors, resolveLegendTintForHex);
          applied.keycaps = config.keycaps;
          applied.accent = config.accent;
          applied.keyOverrides = config.keyOverrides;
          keycapsChanged = true;
        }

        applied.exteriorApplied = true;
      }

      if (hasInternal) {
        if (force || !applied.internalApplied || applied.switchProfile !== config.switchProfile) {
          const swSpec = INSTALLED_SWITCH_MATERIALS[config.switchProfile];
          if (swSpec) {
            model.applyInstalledSwitchMaterial(swSpec);
            applied.switchProfile = config.switchProfile;
            switchChanged = true;
          }
        }

        if (force || !applied.internalApplied || applied.plate !== config.plate) {
          const plateSpec = PLATE_MATERIAL_SPECS[config.plate];
          if (plateSpec) {
            model.applyPlateMaterial(plateSpec);
            applied.plate = config.plate;
            plateChanged = true;
          }
        }

        applied.internalApplied = true;
      }

      return {
        enclosureChanged,
        keycapsChanged,
        switchChanged,
        plateChanged,
        anyVisualChange: enclosureChanged || keycapsChanged || switchChanged || plateChanged,
        exteriorApplied: applied.exteriorApplied,
        internalApplied: applied.internalApplied,
      };
    },
    resetTracking() {
      applied.enclosure = undefined;
      applied.keycaps = undefined;
      applied.accent = undefined;
      applied.keyOverrides = undefined;
      applied.switchProfile = undefined;
      applied.plate = undefined;
      applied.exteriorApplied = false;
      applied.internalApplied = false;
    },
  };
}

export type BuildConfigApplier = ReturnType<typeof createBuildConfigApplier>;
