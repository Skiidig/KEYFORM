import { KF003B_ASSETS, type ShotId } from '../assets/kf003bManifest';
import type {
  AccentKeyId,
  AssemblyGroupId,
  BuildConfigState,
  EnclosureFinishId,
  KeycapSetId,
  PlateMaterialId,
  StaticFallbackDescriptor,
  StudioCameraPresetId,
  SwitchProfileId,
} from '../runtime/types';

export type BuildConfig = BuildConfigState;

export interface AnatomyLayer {
  id: string;
  index: string;
  groupName: AssemblyGroupId;
  title: string;
  shortRole: string;
  parent: string;
  explodeOffset: string;
  material: string;
  purpose: string;
  assemblyRelation: string;
  engineeringNote: string;
  /** Approximate vertical percentage along the A05 exploded stack render */
  stratumY: number;
}

export interface SwitchProfile {
  id: SwitchProfileId;
  shotId: ShotId;
  code: string;
  name: string;
  archetype: string;
  nominalForce: string;
  nominalPretravel: string;
  nominalTotalTravel: string;
  stemColorHex: string;
  stemColorName: string;
  housingDesc: string;
  character: string;
  bestFor: string;
  pressDurationMs: number;
  returnDurationMs: number;
}

export interface StudioOption<TId extends string = string> {
  id: TId;
  code: string;
  name: string;
  swatchHex: string;
  secondaryHex?: string;
  finishNote: string;
}

/**
 * Definitive Charcoal PBT baseline color (#1A1F1E) per KF-003B / KF-004A policy.
 */
export const CHARCOAL_PBT_BASELINE_HEX = '#1A1F1E';

/**
 * Default product configuration: Forest anodized 6063 aluminium + uniform
 * Charcoal PBT across all 81 keycaps (including Esc — Matched).
 */
export const DEFAULT_BUILD_CONFIG: BuildConfig = {
  enclosure: 'forest',
  keycaps: 'charcoal-pbt',
  accent: 'matched',
  switchProfile: 'linear-45',
  plate: 'aluminium',
};

export const ENCLOSURE_PREVIEW_SHOTS: Record<EnclosureFinishId, ShotId> = {
  forest: 'A03',
  obsidian: 'B01',
  carbon: 'B02',
  titanium: 'B03',
};

export const HERO_DATUMS = [
  { key: 'Layout', value: '75%, 81 keys + rotary dial' },
  { key: 'Enclosure', value: 'CNC 6063 aluminium' },
  { key: 'Typing angle', value: '6.5° incline' },
  { key: 'Key spacing', value: '19.05 mm pitch' },
] as const;

export const ANATOMY_LAYERS: AnatomyLayer[] = [
  {
    id: 'keycaps',
    index: '01',
    groupName: 'GRP_01_Keycaps',
    title: 'Sculpted PBT Keycaps',
    shortRole: 'Touch surface',
    parent: 'Tilt Pivot (+6.5°)',
    explodeOffset: 'Z +108 mm',
    material: '1.5 mm matte Charcoal PBT with subtle off-white legends',
    purpose: 'Row-sculpted R1–R4 keycaps and a convex 6.25u spacebar in dry matte Charcoal PBT that resists shine.',
    assemblyRelation: 'Seats onto all 81 MX cross stems with recessed skirts that clear the top frame at full travel.',
    engineeringNote: '18.0 × 18.0 mm nominal 1u base on the 19.05 mm MX grid (#1A1F1E Charcoal PBT).',
    stratumY: 22,
  },
  {
    id: 'top-enclosure',
    index: '02',
    groupName: 'GRP_02_TopEnclosure',
    title: 'Integrated Top Frame & Rotary Dial',
    shortRole: 'Exterior frame',
    parent: 'Tilt Pivot (+6.5°)',
    explodeOffset: 'Z +84 mm',
    material: 'Bead-blasted 6063 aluminium with diamond-knurled metal dial',
    purpose: 'Frames separated function pockets, an integrated navigation bridge, a 1.2 mm chamfer, and a 48-tooth knurled dial.',
    assemblyRelation: 'Bolts downward to the bottom chassis via eight concealed underside screws around the gasket channel.',
    engineeringNote: 'Frozen Alternative A integrated deck geometry (KF-003A-R3).',
    stratumY: 32,
  },
  {
    id: 'switches',
    index: '03',
    groupName: 'GRP_03_Switches',
    title: '81 Mechanical Switches',
    shortRole: 'Actuation',
    parent: 'Tilt Pivot (+6.5°)',
    explodeOffset: 'Z +64 mm',
    material: 'Polycarbonate upper housing, POM stem, copper contact leaves',
    purpose: 'Defines the tactile character of every press, hot-swappable across three conceptual KEYFORM profiles.',
    assemblyRelation: 'Snaps into 1.50 mm plate cutouts and seats into south-facing PCB sockets below.',
    engineeringNote: 'Standard Cherry MX 14.0 × 14.0 mm plate cutouts and 4.0 mm nominal travel.',
    stratumY: 41,
  },
  {
    id: 'switch-plate',
    index: '04',
    groupName: 'GRP_04_SwitchPlate',
    title: 'Isolated Switch Plate',
    shortRole: 'Core structure',
    parent: 'Tilt Pivot (+6.5°)',
    explodeOffset: 'Z +42 mm',
    material: '1.50 mm aluminium, FR4, polycarbonate, or brushed brass',
    purpose: 'Aligns all 81 switches while tuning typing firmness and acoustic response by plate material.',
    assemblyRelation: 'Floats on 12 perimeter silicone gasket tabs with zero metal-to-metal screw contact.',
    engineeringNote: '2.2 mm below top deck datum with four stabilizer reliefs and dial clearance.',
    stratumY: 49,
  },
  {
    id: 'acoustic-gaskets',
    index: '05',
    groupName: 'GRP_05_AcousticAndGaskets',
    title: 'Poron Plate Foam & Silicone Gaskets',
    shortRole: 'Isolation',
    parent: 'Tilt Pivot (+6.5°)',
    explodeOffset: 'Z +20 mm',
    material: 'Open-cell Poron acoustic foam and 12 molded silicone gaskets',
    purpose: 'Decouples typing vibration from the aluminium shell to soften harsh metallic resonance.',
    assemblyRelation: 'Silicone gaskets wrap plate perimeter tabs while Poron sits between plate and PCB.',
    engineeringNote: '3.0 mm installed Poron damper; conceptual acoustic design, not lab-measured dBA.',
    stratumY: 57,
  },
  {
    id: 'pcb-assembly',
    index: '06',
    groupName: 'GRP_06_PCB_Assembly',
    title: 'Hot-Swap PCB, Stabilizers & Dial',
    shortRole: 'Electronics',
    parent: 'Tilt Pivot (+6.5°)',
    explodeOffset: 'Datum (0 mm)',
    material: '1.60 mm matte-black FR4 with 0.5 mm IXPE switch pad',
    purpose: 'Registers every keystroke and rotary detent without RGB distraction, keeping only a warm-white Caps indicator.',
    assemblyRelation: 'Carries four PCB-mounted stabilizers and links to the rear USB-C board via flex harness.',
    engineeringNote: '5.0 mm plate-to-PCB stack; 23.8 mm short and 100.0 mm spacebar stabilizer spans.',
    stratumY: 64,
  },
  {
    id: 'usb-daughterboard',
    index: '07',
    groupName: 'GRP_07_USB_Daughterboard',
    title: 'Decoupled USB-C Daughterboard',
    shortRole: 'Connectivity',
    parent: 'Root (Desk Plane)',
    explodeOffset: 'Y +20 mm, Z −18 mm',
    material: 'FR4 carrier board, USB-C receptacle, flexible harness',
    purpose: 'Keeps the rear USB-C port centered so gasket flex never stresses the cable connector.',
    assemblyRelation: 'Bolts directly to the lower chassis rear wall and bridges upward to the floating PCB.',
    engineeringNote: 'Unified Daughterboard throat clearance (9.70 × 4.22 mm case aperture).',
    stratumY: 71,
  },
  {
    id: 'internal-weight',
    index: '08',
    groupName: 'GRP_08_InternalWeight',
    title: 'Internal Brushed Brass Weight',
    shortRole: 'Mass anchor',
    parent: 'Root (Desk Plane)',
    explodeOffset: 'Z −33 mm',
    material: 'CNC-machined brushed brass with 2.0 mm Poron case liner',
    purpose: 'Anchors low-center mass beneath the typing zone so KF—01 stays planted and damps hollow reflections.',
    assemblyRelation: 'Recesses flush into the lower aluminium pocket beneath the bottom acoustic sheet.',
    engineeringNote: '4× M3 countersunk screws contributing to the ~1,680 g conceptual weight target.',
    stratumY: 78,
  },
  {
    id: 'bottom-chassis',
    index: '09',
    groupName: 'GRP_09_BottomChassis',
    title: 'CNC Bottom Chassis & Silicone Feet',
    shortRole: 'Foundation',
    parent: 'Root (Desk Plane)',
    explodeOffset: 'Z −50 mm',
    material: '6063 aluminium with recessed silicone feet',
    purpose: 'Forms the 6.5° angled base, concealing all eight fasteners underneath on flush silicone feet.',
    assemblyRelation: 'Houses the brass weight, lower gasket seats, daughterboard mounts, and top frame.',
    engineeringNote: '327 × 138 mm plan; 18.5 mm front edge rising to 34.2 mm rear.',
    stratumY: 85,
  },
];

export const SWITCH_PROFILES: SwitchProfile[] = [
  {
    id: 'linear-45',
    shotId: 'A06a',
    code: 'SW—L45',
    name: 'KF—Linear 45',
    archetype: 'Linear',
    nominalForce: '45 gf',
    nominalPretravel: '2.0 mm',
    nominalTotalTravel: '4.0 mm',
    stemColorHex: '#F2F1EB',
    stemColorName: 'Porcelain POM',
    housingDesc: 'Smoked translucent polycarbonate top over an obsidian lower housing',
    character:
      'Smooth, consistent travel from initial press to bottom-out, with no tactile bump to interrupt typing rhythm.',
    bestFor: 'Fluid daily typing and quiet, steady studio work',
    pressDurationMs: 55,
    returnDurationMs: 95,
  },
  {
    id: 'tactile-58',
    shotId: 'A06b',
    code: 'SW—T58',
    name: 'KF—Tactile 58',
    archetype: 'Tactile',
    nominalForce: '58 gf',
    nominalPretravel: '2.0 mm',
    nominalTotalTravel: '3.8 mm',
    stemColorHex: '#F0793B',
    stemColorName: 'Signal POM',
    housingDesc: 'Matte carbon upper housing over an obsidian base with an early tactile leaf',
    character:
      'A crisp tactile bump near the top of the keystroke for deliberate pacing and unmistakable key confirmation.',
    bestFor: 'Long-form writing, editing, and deliberate feedback',
    pressDurationMs: 65,
    returnDurationMs: 105,
  },
  {
    id: 'silent-50',
    shotId: 'A06c',
    code: 'SW—S50',
    name: 'KF—Silent 50',
    archetype: 'Dampened linear',
    nominalForce: '50 gf',
    nominalPretravel: '1.9 mm',
    nominalTotalTravel: '3.7 mm',
    stemColorHex: '#294B3B',
    stemColorName: 'Forest POM',
    housingDesc: 'Frosted smoke upper housing over an obsidian base with elastomer-cushioned guide rails',
    character:
      'Cushioned guide rails soften both bottom-out and return so late-night work stays quiet without feeling mushy.',
    bestFor: 'Shared studios, late-night sessions, and open microphones',
    pressDurationMs: 60,
    returnDurationMs: 115,
  },
];

export const ENCLOSURE_FINISHES: StudioOption<EnclosureFinishId>[] = [
  {
    id: 'forest',
    code: 'FOR',
    name: 'Forest',
    swatchHex: '#294B3B',
    finishNote: 'Bead-blasted slate-pine anodized 6063 aluminium.',
  },
  {
    id: 'obsidian',
    code: 'OBS',
    name: 'Obsidian',
    swatchHex: '#151817',
    finishNote: 'Deep matte charcoal anodization with understated specular edges.',
  },
  {
    id: 'carbon',
    code: 'CRB',
    name: 'Carbon',
    swatchHex: '#353B38',
    finishNote: 'Fine matte graphite anodization with soft chamfer highlights.',
  },
  {
    id: 'titanium',
    code: 'TIT',
    name: 'Titanium',
    swatchHex: '#AEB6B2',
    finishNote: 'Bead-blasted silver-grey finish with bright edge definition.',
  },
];

export const KEYCAP_SETS: StudioOption<KeycapSetId>[] = [
  {
    id: 'charcoal-pbt',
    code: 'CHR',
    name: 'Charcoal PBT',
    swatchHex: CHARCOAL_PBT_BASELINE_HEX,
    secondaryHex: '#262C2A',
    finishNote: 'Uniform matte Charcoal PBT across all 81 keys with subtle off-white legends.',
  },
  {
    id: 'porcelain-pbt',
    code: 'PRC',
    name: 'Porcelain PBT',
    swatchHex: '#ECE9DF',
    secondaryHex: '#C2BEB2',
    finishNote: 'Warm porcelain alphas and spacebar paired with muted grey modifiers.',
  },
  {
    id: 'two-tone-slate',
    code: 'SLT',
    name: 'Two-Tone Slate',
    swatchHex: '#D9DDD8',
    secondaryHex: '#434A46',
    finishNote: 'Light slate alphas and spacebar framed by deep graphite modifiers.',
  },
];

export const ACCENT_KEYS: StudioOption<AccentKeyId>[] = [
  {
    id: 'matched',
    code: 'MTC',
    name: 'Matched',
    swatchHex: CHARCOAL_PBT_BASELINE_HEX,
    finishNote: 'Escape keycap matches the active keycap set.',
  },
  {
    id: 'ivory',
    code: 'IVR',
    name: 'Ivory Esc',
    swatchHex: '#F2EFE6',
    finishNote: 'Warm ivory Escape accent cap with dark legend.',
  },
  {
    id: 'forest-accent',
    code: 'FRT',
    name: 'Forest Esc',
    swatchHex: '#294B3B',
    finishNote: 'Deep slate-pine Escape accent cap with light legend.',
  },
  {
    id: 'brass-accent',
    code: 'BRS',
    name: 'Brass Accent',
    swatchHex: '#B49A70',
    finishNote: 'Warm brass-tone Escape accent cap with dark legend.',
  },
];

export const PLATE_MATERIALS: StudioOption<PlateMaterialId>[] = [
  {
    id: 'aluminium',
    code: 'ALU',
    name: 'Brushed Aluminium',
    swatchHex: '#B7BDB9',
    finishNote: '1.50 mm plate for balanced, crisp feedback.',
  },
  {
    id: 'fr4',
    code: 'FR4',
    name: 'Matte FR4',
    swatchHex: '#242825',
    finishNote: '1.50 mm matte-black fiberglass for a softer, rounded tone.',
  },
  {
    id: 'polycarbonate',
    code: 'PC',
    name: 'Polycarbonate',
    swatchHex: '#E0E3DF',
    finishNote: '1.50 mm frosted translucent plate with gentle flex.',
  },
  {
    id: 'brass',
    code: 'BRS',
    name: 'Sandblasted Brass',
    swatchHex: '#B49A70',
    finishNote: '1.50 mm high-mass plate for firm bottom-out.',
  },
];

export interface StudioCameraView {
  id: StudioCameraPresetId;
  label: string;
  referenceShotId: ShotId;
  /** True when the angle switches dynamically across all four enclosure renders */
  supportsEnclosureFallback: boolean;
  caption: string;
}

export const STUDIO_CAMERA_VIEWS: readonly StudioCameraView[] = [
  {
    id: 'studio-three-quarter',
    label: 'Studio ¾',
    referenceShotId: 'A03',
    supportsEnclosureFallback: true,
    caption: 'Studio three-quarter angle across all four enclosure finishes',
  },
  {
    id: 'after-hours-front',
    label: 'Low light',
    referenceShotId: 'A01',
    supportsEnclosureFallback: false,
    caption: 'Low-light hero view in the Forest reference finish',
  },
  {
    id: 'rear-usb',
    label: 'Rear',
    referenceShotId: 'A08',
    supportsEnclosureFallback: false,
    caption: 'Rear view showing the recessed USB-C port in Forest',
  },
  {
    id: 'exploded',
    label: 'Exploded',
    referenceShotId: 'A05',
    supportsEnclosureFallback: false,
    caption: 'Exploded assembly view showing all nine internal layers',
  },
] as const;

export interface MaterialPlate {
  id: string;
  index: string;
  shotId: ShotId;
  name: string;
  role: string;
  description: string;
  specs: readonly string[];
}

export const MATERIALS_LIBRARY: readonly MaterialPlate[] = [
  {
    id: 'aluminium-6063',
    index: '01',
    shotId: 'A07a',
    name: '6063 Bead-Blasted Aluminium',
    role: 'Enclosure & dial',
    description:
      'Fine matte anodization softens reflections across the chamfered billet shell, contrasting the sharper grip of the diamond-knurled rotary dial.',
    specs: ['Matte anodized 6063', '1.2 mm 45° chamfer', '48-tooth knurled dial'],
  },
  {
    id: 'brushed-brass',
    index: '02',
    shotId: 'A07b',
    name: 'Brushed Solid Brass',
    role: 'Internal mass',
    description:
      'Directionally brushed brass recessed into the lower cavity adds quiet low-center heft and subtle metallic warmth beneath the acoustic liner.',
    specs: ['Brushed CNC bar', 'Flush lower cavity', '~1,680 g target build'],
  },
  {
    id: 'sculpted-pbt',
    index: '03',
    shotId: 'A07c',
    name: 'Sculpted Matte Charcoal PBT',
    role: 'Touch surface',
    description:
      'Dry, finely textured PBT shells in uniform Charcoal resist shine over years of typing, finished with restrained off-white legends.',
    specs: ['1.5 mm PBT wall', 'Uniform Charcoal', 'R1–R4 sculpted profile'],
  },
  {
    id: 'acoustic-elastomers',
    index: '04',
    shotId: 'A07d',
    name: 'Poron, IXPE & Silicone',
    role: 'Acoustic isolation',
    description:
      'Perimeter silicone gaskets suspend the typing core away from the aluminium walls while layered Poron and IXPE damp hollow case resonance.',
    specs: ['12× silicone gaskets', 'Poron plate & case foam', '0.5 mm IXPE pad'],
  },
] as const;

export function getBuildCode(config: BuildConfig): string {
  const enc = ENCLOSURE_FINISHES.find((o) => o.id === config.enclosure)?.code ?? 'FOR';
  const cap = KEYCAP_SETS.find((o) => o.id === config.keycaps)?.code ?? 'CHR';
  const acc = ACCENT_KEYS.find((o) => o.id === config.accent)?.code ?? 'MTC';
  const sw =
    config.switchProfile === 'linear-45'
      ? 'L45'
      : config.switchProfile === 'tactile-58'
        ? 'T58'
        : 'S50';
  const plt = PLATE_MATERIALS.find((o) => o.id === config.plate)?.code ?? 'ALU';
  return `KF01-${enc}-${cap}-${acc}-${sw}-${plt}`;
}

/**
 * Resolves the active Build Studio static fallback image and transparent
 * preview-match status so the UI never overstates static render capabilities.
 */
export function resolveBuildStudioPreview(
  config: BuildConfig,
  cameraId: StudioCameraPresetId,
): StaticFallbackDescriptor {
  const camera =
    STUDIO_CAMERA_VIEWS.find((v) => v.id === cameraId) ?? STUDIO_CAMERA_VIEWS[0];
  const enclosure =
    ENCLOSURE_FINISHES.find((o) => o.id === config.enclosure) ?? ENCLOSURE_FINISHES[0];
  const keycaps =
    KEYCAP_SETS.find((o) => o.id === config.keycaps) ?? KEYCAP_SETS[0];
  const accent =
    ACCENT_KEYS.find((o) => o.id === config.accent) ?? ACCENT_KEYS[0];
  const sw =
    SWITCH_PROFILES.find((o) => o.id === config.switchProfile) ?? SWITCH_PROFILES[0];
  const plate =
    PLATE_MATERIALS.find((o) => o.id === config.plate) ?? PLATE_MATERIALS[0];

  const shotId: ShotId = camera.supportsEnclosureFallback
    ? ENCLOSURE_PREVIEW_SHOTS[config.enclosure]
    : camera.referenceShotId;
  const asset = KF003B_ASSETS[shotId];
  const sizes = '(min-width: 1024px) 62vw, 100vw';

  const hasUniformCharcoalCaps =
    config.keycaps === 'charcoal-pbt' && config.accent === 'matched';

  if (camera.supportsEnclosureFallback && hasUniformCharcoalCaps) {
    return {
      shotId,
      sizes,
      alt: asset.defaultAlt,
      match: 'matched',
      statusLabel: `${enclosure.name} finish preview`,
      detailNote: `Matched ${enclosure.name} aluminium and Charcoal PBT photo. Open 3D for live orbit and Exploded ${sw.name} / ${plate.name} material preview.`,
    };
  }

  if (camera.supportsEnclosureFallback) {
    return {
      shotId,
      sizes,
      alt: asset.defaultAlt,
      match: 'partial',
      statusLabel: `${enclosure.name} photo · Spec updated`,
      detailNote: `Static photo shows ${enclosure.name} with Charcoal PBT. Open 3D to preview ${keycaps.name}, ${accent.name}, ${sw.name}, and ${plate.name} live.`,
    };
  }

  return {
    shotId,
    sizes,
    alt: asset.defaultAlt,
    match: 'reference',
    statusLabel: `Reference view · Forest finish`,
    detailNote:
      config.enclosure === 'forest' && hasUniformCharcoalCaps
        ? `${camera.caption}. Open 3D to orbit or inspect live ${sw.name} and ${plate.name} finishes.`
        : `${camera.caption}. Static secondary angles show Forest / Charcoal—open 3D to preview your active build live.`,
  };
}
