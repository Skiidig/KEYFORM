/**
 * KEYFORM — Future WebGL Integration Boundaries (KF-004A)
 *
 * Lightweight, zero-Three.js interface contract separating visitor UI &
 * product configuration state from future Three.js / GLB scene controllers.
 *
 * Aligned with KF-003C-B1 canonical identifiers:
 *  - Assembly groups: GRP_01_Keycaps .. GRP_09_BottomChassis
 *  - Stable material / colorway IDs preserved verbatim from kf01Data.ts
 */

import type { ShotId } from '../assets/kf003bManifest';

export type ViewportStationId = 'mechanical-anatomy' | 'switch-lab' | 'build-studio';

export type ViewportMode =
  | 'static-fallback'
  | 'loading-runtime'
  | 'interactive-3d'
  | 'runtime-error';

export type StaticPreviewMatch = 'matched' | 'partial' | 'reference';

export type EnclosureFinishId = 'forest' | 'obsidian' | 'carbon' | 'titanium';
export type KeycapSetId = 'charcoal-pbt' | 'porcelain-pbt' | 'two-tone-slate';
export type AccentKeyId = 'matched' | 'ivory' | 'forest-accent' | 'brass-accent';
export type SwitchProfileId = 'linear-45' | 'tactile-58' | 'silent-50';
export type PlateMaterialId = 'aluminium' | 'fr4' | 'polycarbonate' | 'brass';

export type StudioCameraPresetId =
  | 'studio-three-quarter'
  | 'after-hours-front'
  | 'rear-usb'
  | 'exploded';

export const KF01_ASSEMBLY_GROUPS = [
  'GRP_01_Keycaps',
  'GRP_02_TopEnclosure',
  'GRP_03_Switches',
  'GRP_04_SwitchPlate',
  'GRP_05_AcousticAndGaskets',
  'GRP_06_PCB_Assembly',
  'GRP_07_USB_Daughterboard',
  'GRP_08_InternalWeight',
  'GRP_09_BottomChassis',
] as const;

export type AssemblyGroupId = (typeof KF01_ASSEMBLY_GROUPS)[number];

export interface BuildConfigState {
  enclosure: EnclosureFinishId;
  keycaps: KeycapSetId;
  accent: AccentKeyId;
  switchProfile: SwitchProfileId;
  plate: PlateMaterialId;
}

export interface AnatomyViewportState {
  activeGroup: AssemblyGroupId;
  exploded: boolean;
}

export interface SwitchLabViewportState {
  switchProfile: SwitchProfileId;
  pressed: boolean;
}

export interface BuildStudioViewportState {
  config: BuildConfigState;
  cameraPreset: StudioCameraPresetId;
}

export interface RuntimeCapability {
  webgl2Supported: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  /** True only after a future milestone registers a real 3D adapter */
  runtimeAdapterRegistered: boolean;
}

export interface RuntimeAvailability {
  available: boolean;
  reason: string;
  capability: RuntimeCapability;
}

export interface ViewportLoadProgress {
  phase: 'idle' | 'fetching-manifest' | 'loading-glb' | 'compiling' | 'ready' | 'error';
  percent?: number;
  message?: string;
}

export interface StaticFallbackDescriptor {
  shotId: ShotId;
  sizes: string;
  alt: string;
  match: StaticPreviewMatch;
  statusLabel: string;
  detailNote: string;
}

/**
 * Simple adapter boundary that future KF-003C / KF-006 Three.js controllers
 * will implement without rewriting UI sections or product state.
 */
export interface StationState {
  'mechanical-anatomy': AnatomyViewportState;
  'switch-lab': SwitchLabViewportState;
  'build-studio': BuildStudioViewportState;
}

export interface ViewportMount {
  signal: AbortSignal;
  reducedMotion: boolean;
  progress(message: string): void;
  fail(code: 'context-lost' | 'asset' | 'renderer'): void;
}

export interface ViewportRuntimeAdapter<TState> {
  mount(container: HTMLElement, initialState: TState, lifetime: ViewportMount): Promise<void>;
  update(nextState: TState): void;
  setReducedMotion(reduced: boolean): void;
  resetView?(): void;
  dispose(): void;
}
