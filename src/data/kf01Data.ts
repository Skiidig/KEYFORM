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
    purpose:
      'Row-sculpted R1–R4 key profiles guide fingertips across all 81 Charcoal keys, paired with a convex 6.25u spacebar and a dry matte texture that resists shine.',
    assemblyRelation:
      'Mounts directly onto all 81 MX cross stems, with recessed skirts that clear the top frame at full travel.',
    engineeringNote:
      '18.00 × 18.00 mm nominal 1u base with 1.05 mm minimum gap across the 19.05 mm standard grid (#1A1F1E Charcoal PBT).',
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
    purpose:
      'Shapes the outer profile of KF—01 with four separated function pockets, an integrated navigation bridge, a 1.2 mm 45° perimeter chamfer, and a 48-tooth knurled rotary dial.',
    assemblyRelation:
      'Secures downward to the bottom chassis via eight recessed underside screws, clamping the gasket channel without touching the switch plate.',
    engineeringNote:
      'Frozen Alternative A integrated deck geometry (KF-003A-R3); 48-tooth crossed-groove encoder knurling.',
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
    purpose:
      'Defines the feel and travel of every keystroke, swappable without soldering across three conceptual KEYFORM switch profiles.',
    assemblyRelation:
      'Snaps into the 1.50 mm switch plate cutouts and seats into south-facing hot-swap sockets on the PCB below.',
    engineeringNote:
      'Reference geometry aligns with standard Cherry MX 14.00 × 14.00 mm plate cutouts and 4.0 mm total travel.',
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
    purpose:
      'Keeps all 81 switches aligned while tuning typing firmness and acoustic response according to the selected plate material.',
    assemblyRelation:
      'Suspends inside the enclosure on 12 perimeter silicone gasket tabs with no metal-to-metal screw contact.',
    engineeringNote:
      'Rests 2.2 mm below the top deck datum with four stabilizer reliefs and rotary encoder clearance.',
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
    purpose:
      'Cushions vibration between the typing assembly and the solid aluminium case to reduce metallic resonance.',
    assemblyRelation:
      'Silicone gaskets wrap the plate perimeter tabs while the perforated Poron layer sits between the plate and PCB.',
    engineeringNote:
      '3.0 mm installed Poron damper within the 3.5 mm free stack; conceptual acoustic design, not lab-measured dBA data.',
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
    purpose:
      'Registers every key press and rotary detent reliably without RGB distraction, keeping only a subtle warm-white Caps Lock indicator.',
    assemblyRelation:
      'Supports four PCB-mounted stabilizers and connects to the rear USB-C board via a flexible internal cable.',
    engineeringNote:
      '5.00 mm nominal stack from switch plate top to PCB top; 23.8 mm short and 100.0 mm Spacebar stabilizer spans.',
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
    purpose:
      'Keeps the rear USB-C port centered in the case wall so gasket flex never transfers stress to the cable connector.',
    assemblyRelation:
      'Mounts directly to the lower chassis at the rear wall and bridges upward to the floating PCB.',
    engineeringNote:
      'Modeled to Unified Daughterboard throat guidance (9.70 × 4.22 mm case aperture for 8.94 × 3.46 mm shell).',
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
    purpose:
      'Places dense low-center mass beneath the typing zone so the keyboard stays planted on the desk while damping hollow reflections.',
    assemblyRelation:
      'Recesses flush into the lower aluminium pocket beneath the bottom acoustic sheet, secured with four countersunk screws.',
    engineeringNote:
      '4× M3 countersunk fasteners contributing to the ~1,680 g conceptual assembled weight target.',
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
    purpose:
      'Forms the 6.5° angled base, concealing all eight enclosure screws underneath and resting steadily on flush silicone feet.',
    assemblyRelation:
      'Houses the internal brass weight, lower gasket seats, daughterboard mounts, and top frame perimeter.',
    engineeringNote:
      '327.0 × 138.0 mm exterior plan; 18.5 mm front enclosure chin (19.5 mm on 1.0 mm proud feet) rising to 34.2 mm rear.',
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
    secondaryHex: '#D8D4C7',
    finishNote: 'Warm porcelain alphas paired with muted grey modifiers (saved in specification).',
  },
  {
    id: 'two-tone-slate',
    code: 'SLT',
    name: 'Two-Tone Slate',
    swatchHex: '#D9DDD8',
    secondaryHex: '#434A46',
    finishNote: 'Light slate alphas framed by deep graphite outer keys (saved in specification).',
  },
];

export const ACCENT_KEYS: StudioOption<AccentKeyId>[] = [
  {
    id: 'matched',
    code: 'MTC',
    name: 'Matched',
    swatchHex: CHARCOAL_PBT_BASELINE_HEX,
    finishNote: 'Uniform Escape keycap matching the selected keycap set.',
  },
  {
    id: 'ivory',
    code: 'IVR',
    name: 'Ivory Esc',
    swatchHex: '#F2EFE6',
    finishNote: 'Warm ivory Escape accent cap (saved in specification; live 3D preview forthcoming).',
  },
  {
    id: 'forest-accent',
    code: 'FRT',
    name: 'Forest Esc',
    swatchHex: '#294B3B',
    finishNote: 'Deep slate-pine Escape cap (saved in specification; live 3D preview forthcoming).',
  },
  {
    id: 'brass-accent',
    code: 'BRS',
    name: 'Brass Accent',
    swatchHex: '#B49A70',
    finishNote: 'Anodized brass-tone Escape cap (saved in specification; live 3D preview forthcoming).',
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
    role: 'Enclosure & top frame',
    description:
      'CNC-machined from solid 6063 billets with a crisp 1.2 mm perimeter chamfer and fine matte anodization. Light settles softly across the bead-blasted finish alongside the diamond-knurled rotary dial.',
    specs: ['Fine matte anodized', '1.2 mm 45° chamfer', '48-tooth knurled dial'],
  },
  {
    id: 'brushed-brass',
    index: '02',
    shotId: 'A07b',
    name: 'Brushed Solid Brass',
    role: 'Internal weight',
    description:
      'A solid machined brass bar recessed inside the lower cavity. Fine directional brushing and restrained dark engraving add quiet warmth and anchor the keyboard firmly on the desk.',
    specs: ['Recessed CNC pocket', '4× M3 countersunk', '~1,680 g target weight'],
  },
  {
    id: 'sculpted-pbt',
    index: '03',
    shotId: 'A07c',
    name: 'Sculpted Matte Charcoal PBT',
    role: 'Keycaps & legends',
    description:
      'Dry, finely textured 1.5 mm PBT shells in uniform Charcoal across all 81 keys, shaped in R1–R4 row profiles with restrained off-white legends that resist shine over years of typing.',
    specs: ['1.5 mm wall thickness', 'Uniform Charcoal PBT', 'R1–R4 sculpted profile'],
  },
  {
    id: 'acoustic-elastomers',
    index: '04',
    shotId: 'A07d',
    name: 'Poron, IXPE & Silicone',
    role: 'Gasket & acoustic stack',
    description:
      'Twelve molded silicone gaskets decouple the switch plate from the aluminium walls, supported by open-cell Poron liners and a 0.5 mm IXPE switch pad over the matte-black FR4 PCB.',
    specs: ['12× silicone gaskets', '3.0 mm + 2.0 mm Poron', '0.5 mm IXPE pad'],
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
      detailNote: `Showing the matched ${enclosure.name} aluminium and Charcoal PBT studio render. Open 3D to orbit or compare angles; switch (${sw.name}) and plate (${plate.name}) choices are saved in your build summary.`,
    };
  }

  if (camera.supportsEnclosureFallback) {
    return {
      shotId,
      sizes,
      alt: asset.defaultAlt,
      match: 'partial',
      statusLabel: `${enclosure.name} enclosure · Keycaps in spec`,
      detailNote: `Showing the ${enclosure.name} aluminium enclosure with Charcoal PBT keycaps. Your ${keycaps.name} / ${accent.name}, ${sw.name}, and ${plate.name} selections are saved in the build summary.`,
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
        ? `${camera.caption}. Static reference render—open 3D to orbit or switch enclosures from any angle.`
        : `${camera.caption}. Static secondary angles show the Forest reference finish—switch back to Studio ¾ or open 3D to view ${enclosure.name}.`,
  };
}
