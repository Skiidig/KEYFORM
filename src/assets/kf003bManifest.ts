/**
 * KEYFORM KF-003B Production Asset Registry
 *
 * Mirrors D:\Assets\KEYFORM\kf003b\validation\production-asset-manifest.json
 * strictly using responsive AVIF + WebP web derivatives (zero raw PNG masters).
 * Descriptive placement/material metadata lives only in the external manifest
 * to keep the shipped visitor bundle minimal.
 *
 * KF-ART-002A approved derivatives (H02, C02) are versioned under
 * /media/kf-art-002a/ and preserve all original KF-003B assets.
 *
 * Canonical default keyboard imagery uses Forest anodized 6063 aluminium with uniform
 * Charcoal PBT (#1A1F1E) across all 81 keycaps including Esc.
 */

export type ShotId =
  | 'A01'
  | 'A02'
  | 'A03'
  | 'A04a'
  | 'A04b'
  | 'A04c'
  | 'A05'
  | 'A06a'
  | 'A06b'
  | 'A06c'
  | 'A07a'
  | 'A07b'
  | 'A07c'
  | 'A07d'
  | 'A08'
  | 'B01'
  | 'B02'
  | 'B03'
  | 'H02'
  | 'C02'
  | 'C02Mobile'
  | 'OR01'
  | 'OR04'
  | 'OR05'
  | 'OR07'
  | 'OR08'
  | 'OR09'
  | 'OR10'
  | 'OR11'
  | 'OR12'
  | 'OR13'
  | 'OR14';

export interface ImageVariant {
  width: number;
  height: number;
  avif: string;
  webp: string;
}

export interface ProductionAsset {
  shotId: ShotId;
  intrinsicWidth: number;
  intrinsicHeight: number;
  defaultAlt: string;
  variants: readonly ImageVariant[];
  /** Default fallback URL (primary WebP variant for <img src>) */
  fallbackSrc: string;
}

const BASE = '/media/kf003b';
const ART_002A_BASE = '/media/kf-art-002a';
const OWNER_BASE = '/media/kf-008a';

const mkVariants = (
  base: string,
  slug: string,
  dims: readonly (readonly [number, number])[],
): readonly ImageVariant[] =>
  dims.map(([width, height]) => ({
    width,
    height,
    avif: `${base}/avif/${slug}-${width}w.avif`,
    webp: `${base}/webp/${slug}-${width}w.webp`,
  }));

export const KF003B_ASSETS: Record<ShotId, ProductionAsset> = {
  A01: {
    shotId: 'A01',
    intrinsicWidth: 1600,
    intrinsicHeight: 900,
    defaultAlt:
      'KEYFORM KF—01 studio render in dark After Hours lighting showing Forest anodized 6063 aluminium enclosure, uniform Charcoal PBT keycaps across all 81 keys, and diamond-knurled rotary encoder',
    variants: [
      {
        width: 960,
        height: 540,
        avif: `${BASE}/avif/A01-desktop-hero-960w.avif`,
        webp: `${BASE}/webp/A01-desktop-hero-960w.webp`,
      },
      {
        width: 1600,
        height: 900,
        avif: `${BASE}/avif/A01-desktop-hero-1600w.avif`,
        webp: `${BASE}/webp/A01-desktop-hero-1600w.webp`,
      },
      {
        width: 2560,
        height: 1440,
        avif: `${BASE}/avif/A01-desktop-hero-2560w.avif`,
        webp: `${BASE}/webp/A01-desktop-hero-2560w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A01-desktop-hero-1600w.webp`,
  },
  A02: {
    shotId: 'A02',
    intrinsicWidth: 800,
    intrinsicHeight: 800,
    defaultAlt:
      'KEYFORM KF—01 dark After Hours square composition framing the complete Forest anodized 6063 aluminium keyboard with uniform Charcoal PBT keycaps and knurled rotary encoder',
    variants: [
      {
        width: 800,
        height: 800,
        avif: `${BASE}/avif/A02-mobile-hero-800w.avif`,
        webp: `${BASE}/webp/A02-mobile-hero-800w.webp`,
      },
      {
        width: 1280,
        height: 1280,
        avif: `${BASE}/avif/A02-mobile-hero-1280w.avif`,
        webp: `${BASE}/webp/A02-mobile-hero-1280w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A02-mobile-hero-800w.webp`,
  },
  A03: {
    shotId: 'A03',
    intrinsicWidth: 1200,
    intrinsicHeight: 800,
    defaultAlt:
      'KEYFORM KF—01 neutral studio three-quarter render in Forest anodized 6063 aluminium with uniform Charcoal PBT keycaps across all 81 keys',
    variants: [
      {
        width: 1200,
        height: 800,
        avif: `${BASE}/avif/A03-form-function-forest-1200w.avif`,
        webp: `${BASE}/webp/A03-form-function-forest-1200w.webp`,
      },
      {
        width: 1920,
        height: 1280,
        avif: `${BASE}/avif/A03-form-function-forest-1920w.avif`,
        webp: `${BASE}/webp/A03-form-function-forest-1920w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A03-form-function-forest-1200w.webp`,
  },
  A04a: {
    shotId: 'A04a',
    intrinsicWidth: 960,
    intrinsicHeight: 720,
    defaultAlt:
      'Macro studio detail of KF—01 Forest anodized 6063 aluminium top chamfer, uniform Charcoal PBT keycaps, and 48-tooth diamond-knurled rotary encoder',
    variants: [
      {
        width: 960,
        height: 720,
        avif: `${BASE}/avif/A04a-engineering-macro-960w.avif`,
        webp: `${BASE}/webp/A04a-engineering-macro-960w.webp`,
      },
      {
        width: 1600,
        height: 1200,
        avif: `${BASE}/avif/A04a-engineering-macro-1600w.avif`,
        webp: `${BASE}/webp/A04a-engineering-macro-1600w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A04a-engineering-macro-960w.webp`,
  },
  A04b: {
    shotId: 'A04b',
    intrinsicWidth: 1200,
    intrinsicHeight: 675,
    defaultAlt:
      'Orthographic side profile render of KF—01 showing the 6.5 degree typing incline, sculpted Charcoal PBT keycap rows, and knurled rotary encoder',
    variants: [
      {
        width: 1200,
        height: 675,
        avif: `${BASE}/avif/A04b-side-profile-1200w.avif`,
        webp: `${BASE}/webp/A04b-side-profile-1200w.webp`,
      },
      {
        width: 1920,
        height: 1080,
        avif: `${BASE}/avif/A04b-side-profile-1920w.avif`,
        webp: `${BASE}/webp/A04b-side-profile-1920w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A04b-side-profile-1200w.webp`,
  },
  A04c: {
    shotId: 'A04c',
    intrinsicWidth: 960,
    intrinsicHeight: 720,
    defaultAlt:
      'Macro view of the centered recessed rear USB-C daughterboard port housed inside the Forest anodized 6063 aluminium enclosure wall',
    variants: [
      {
        width: 960,
        height: 720,
        avif: `${BASE}/avif/A04c-rear-usbc-960w.avif`,
        webp: `${BASE}/webp/A04c-rear-usbc-960w.webp`,
      },
      {
        width: 1600,
        height: 1200,
        avif: `${BASE}/avif/A04c-rear-usbc-1600w.avif`,
        webp: `${BASE}/webp/A04c-rear-usbc-1600w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A04c-rear-usbc-960w.webp`,
  },
  A05: {
    shotId: 'A05',
    intrinsicWidth: 1000,
    intrinsicHeight: 900,
    defaultAlt:
      'Exploded studio render of KF—01 revealing all nine mechanical strata stacked vertically from uniform Charcoal PBT keycaps down to the Forest aluminium bottom chassis and brass weight',
    variants: [
      {
        width: 1000,
        height: 900,
        avif: `${BASE}/avif/A05-exploded-anatomy-1000w.avif`,
        webp: `${BASE}/webp/A05-exploded-anatomy-1000w.webp`,
      },
      {
        width: 1600,
        height: 1440,
        avif: `${BASE}/avif/A05-exploded-anatomy-1600w.avif`,
        webp: `${BASE}/webp/A05-exploded-anatomy-1600w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A05-exploded-anatomy-1000w.webp`,
  },
  A06a: {
    shotId: 'A06a',
    intrinsicWidth: 960,
    intrinsicHeight: 960,
    defaultAlt:
      'Dark studio macro of the KF—Linear 45 switch with smoked translucent polycarbonate upper housing, Porcelain POM cross stem, steel spring, and obsidian base',
    variants: [
      {
        width: 960,
        height: 960,
        avif: `${BASE}/avif/A06a-switch-linear45-960w.avif`,
        webp: `${BASE}/webp/A06a-switch-linear45-960w.webp`,
      },
      {
        width: 1600,
        height: 1600,
        avif: `${BASE}/avif/A06a-switch-linear45-1600w.avif`,
        webp: `${BASE}/webp/A06a-switch-linear45-1600w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A06a-switch-linear45-960w.webp`,
  },
  A06b: {
    shotId: 'A06b',
    intrinsicWidth: 960,
    intrinsicHeight: 960,
    defaultAlt:
      'Dark studio macro of the KF—Tactile 58 switch featuring a matte carbon upper housing, Signal POM cross stem, coil spring, and copper tactile contact leaf',
    variants: [
      {
        width: 960,
        height: 960,
        avif: `${BASE}/avif/A06b-switch-tactile58-960w.avif`,
        webp: `${BASE}/webp/A06b-switch-tactile58-960w.webp`,
      },
      {
        width: 1600,
        height: 1600,
        avif: `${BASE}/avif/A06b-switch-tactile58-1600w.avif`,
        webp: `${BASE}/webp/A06b-switch-tactile58-1600w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A06b-switch-tactile58-960w.webp`,
  },
  A06c: {
    shotId: 'A06c',
    intrinsicWidth: 960,
    intrinsicHeight: 960,
    defaultAlt:
      'Dark studio macro of the KF—Silent 50 switch featuring a frosted smoke housing, Forest dampened POM cross stem, and cushioned lower housing',
    variants: [
      {
        width: 960,
        height: 960,
        avif: `${BASE}/avif/A06c-switch-silent50-960w.avif`,
        webp: `${BASE}/webp/A06c-switch-silent50-960w.webp`,
      },
      {
        width: 1600,
        height: 1600,
        avif: `${BASE}/avif/A06c-switch-silent50-1600w.avif`,
        webp: `${BASE}/webp/A06c-switch-silent50-1600w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A06c-switch-silent50-960w.webp`,
  },
  A07a: {
    shotId: 'A07a',
    intrinsicWidth: 960,
    intrinsicHeight: 600,
    defaultAlt:
      'Extreme macro surface study of bead-blasted Forest anodized 6063 aluminium bezel chamfer alongside the machined diamond-knurled encoder',
    variants: [
      {
        width: 960,
        height: 600,
        avif: `${BASE}/avif/A07a-mat-aluminium-960w.avif`,
        webp: `${BASE}/webp/A07a-mat-aluminium-960w.webp`,
      },
      {
        width: 1600,
        height: 1000,
        avif: `${BASE}/avif/A07a-mat-aluminium-1600w.avif`,
        webp: `${BASE}/webp/A07a-mat-aluminium-1600w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A07a-mat-aluminium-960w.webp`,
  },
  A07b: {
    shotId: 'A07b',
    intrinsicWidth: 960,
    intrinsicHeight: 600,
    defaultAlt:
      'Close-up of the recessed directional brushed solid brass internal weight with dark engraving nested inside the Forest lower chassis pocket',
    variants: [
      {
        width: 960,
        height: 600,
        avif: `${BASE}/avif/A07b-mat-brass-weight-960w.avif`,
        webp: `${BASE}/webp/A07b-mat-brass-weight-960w.webp`,
      },
      {
        width: 1600,
        height: 1000,
        avif: `${BASE}/avif/A07b-mat-brass-weight-1600w.avif`,
        webp: `${BASE}/webp/A07b-mat-brass-weight-1600w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A07b-mat-brass-weight-960w.webp`,
  },
  A07c: {
    shotId: 'A07c',
    intrinsicWidth: 960,
    intrinsicHeight: 600,
    defaultAlt:
      'Macro study of uniform sculpted Charcoal PBT keycaps showing fine matte micro-grain and subtle off-white legends',
    variants: [
      {
        width: 960,
        height: 600,
        avif: `${BASE}/avif/A07c-mat-charcoal-pbt-960w.avif`,
        webp: `${BASE}/webp/A07c-mat-charcoal-pbt-960w.webp`,
      },
      {
        width: 1600,
        height: 1000,
        avif: `${BASE}/avif/A07c-mat-charcoal-pbt-1600w.avif`,
        webp: `${BASE}/webp/A07c-mat-charcoal-pbt-1600w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A07c-mat-charcoal-pbt-960w.webp`,
  },
  A07d: {
    shotId: 'A07d',
    intrinsicWidth: 960,
    intrinsicHeight: 600,
    defaultAlt:
      'Detailed cutaway study of the internal silicone gaskets, open-cell Poron acoustic damper, switch plate, and matte-black FR4 PCB assembly',
    variants: [
      {
        width: 960,
        height: 600,
        avif: `${BASE}/avif/A07d-mat-acoustic-stack-960w.avif`,
        webp: `${BASE}/webp/A07d-mat-acoustic-stack-960w.webp`,
      },
      {
        width: 1600,
        height: 1000,
        avif: `${BASE}/avif/A07d-mat-acoustic-stack-1600w.avif`,
        webp: `${BASE}/webp/A07d-mat-acoustic-stack-1600w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A07d-mat-acoustic-stack-960w.webp`,
  },
  A08: {
    shotId: 'A08',
    intrinsicWidth: 1200,
    intrinsicHeight: 800,
    defaultAlt:
      'Rear three-quarter After Hours studio silhouette of KF—01 showing the centered recessed USB-C port, Forest anodized seam, uniform Charcoal PBT keycaps, and knurled rotary encoder',
    variants: [
      {
        width: 1200,
        height: 800,
        avif: `${BASE}/avif/A08-closing-statement-1200w.avif`,
        webp: `${BASE}/webp/A08-closing-statement-1200w.webp`,
      },
      {
        width: 1920,
        height: 1280,
        avif: `${BASE}/avif/A08-closing-statement-1920w.avif`,
        webp: `${BASE}/webp/A08-closing-statement-1920w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/A08-closing-statement-1200w.webp`,
  },
  B01: {
    shotId: 'B01',
    intrinsicWidth: 1200,
    intrinsicHeight: 800,
    defaultAlt:
      'KEYFORM KF—01 studio beauty render in Obsidian anodized 6063 aluminium with uniform Charcoal PBT keycaps across all 81 keys',
    variants: [
      {
        width: 1200,
        height: 800,
        avif: `${BASE}/avif/B01-fallback-obsidian-1200w.avif`,
        webp: `${BASE}/webp/B01-fallback-obsidian-1200w.webp`,
      },
      {
        width: 1920,
        height: 1280,
        avif: `${BASE}/avif/B01-fallback-obsidian-1920w.avif`,
        webp: `${BASE}/webp/B01-fallback-obsidian-1920w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/B01-fallback-obsidian-1200w.webp`,
  },
  B02: {
    shotId: 'B02',
    intrinsicWidth: 1200,
    intrinsicHeight: 800,
    defaultAlt:
      'KEYFORM KF—01 studio beauty render in Carbon matte graphite anodized aluminium with uniform Charcoal PBT keycaps across all 81 keys',
    variants: [
      {
        width: 1200,
        height: 800,
        avif: `${BASE}/avif/B02-fallback-carbon-1200w.avif`,
        webp: `${BASE}/webp/B02-fallback-carbon-1200w.webp`,
      },
      {
        width: 1920,
        height: 1280,
        avif: `${BASE}/avif/B02-fallback-carbon-1920w.avif`,
        webp: `${BASE}/webp/B02-fallback-carbon-1920w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/B02-fallback-carbon-1200w.webp`,
  },
  B03: {
    shotId: 'B03',
    intrinsicWidth: 1200,
    intrinsicHeight: 800,
    defaultAlt:
      'KEYFORM KF—01 studio beauty render in Titanium bead-blasted silver-grey aluminium with uniform Charcoal PBT keycaps across all 81 keys',
    variants: [
      {
        width: 1200,
        height: 800,
        avif: `${BASE}/avif/B03-fallback-titanium-1200w.avif`,
        webp: `${BASE}/webp/B03-fallback-titanium-1200w.webp`,
      },
      {
        width: 1920,
        height: 1280,
        avif: `${BASE}/avif/B03-fallback-titanium-1920w.avif`,
        webp: `${BASE}/webp/B03-fallback-titanium-1920w.webp`,
      },
    ],
    fallbackSrc: `${BASE}/webp/B03-fallback-titanium-1200w.webp`,
  },
  H02: {
    shotId: 'H02',
    intrinsicWidth: 1600,
    intrinsicHeight: 1060,
    defaultAlt:
      'KEYFORM KF—01 with a Forest aluminium enclosure, Charcoal keycaps and a knurled rotary dial.',
    variants: mkVariants(ART_002A_BASE, 'H02-mobile-hero', [
      [800, 530],
      [1280, 848],
      [1600, 1060],
    ]),
    fallbackSrc: `${ART_002A_BASE}/webp/H02-mobile-hero-800w.webp`,
  },
  C02: {
    shotId: 'C02',
    intrinsicWidth: 2560,
    intrinsicHeight: 1400,
    defaultAlt:
      'Close-up of the KF—01 diamond-knurled encoder, Charcoal keycaps and chamfered Forest aluminium enclosure.',
    variants: mkVariants(ART_002A_BASE, 'C02-desktop-closing', [
      [1280, 700],
      [1600, 875],
      [2560, 1400],
    ]),
    fallbackSrc: `${ART_002A_BASE}/webp/C02-desktop-closing-1280w.webp`,
  },
  C02Mobile: {
    shotId: 'C02Mobile',
    intrinsicWidth: 1520,
    intrinsicHeight: 1700,
    defaultAlt:
      'Close-up of the KF—01 diamond-knurled encoder, Charcoal keycaps and chamfered Forest aluminium enclosure.',
    variants: mkVariants(ART_002A_BASE, 'C02-mobile-closing', [
      [800, 895],
      [1200, 1342],
      [1520, 1700],
    ]),
    fallbackSrc: `${ART_002A_BASE}/webp/C02-mobile-closing-800w.webp`,
  },
  OR01: {
    shotId: 'OR01',
    intrinsicWidth: 2560,
    intrinsicHeight: 1440,
    defaultAlt: 'Illustrative KF—01 concept render in Forest aluminium and Charcoal PBT. Layout and legends differ from the canonical model.',
    variants: mkVariants(OWNER_BASE, 'OR01-provisional-desktop-hero', [
      [960, 540],
      [1600, 900],
      [2560, 1440],
    ]),
    fallbackSrc: `${OWNER_BASE}/webp/OR01-provisional-desktop-hero-1600w.webp`,
  },
  OR04: {
    shotId: 'OR04',
    intrinsicWidth: 1600,
    intrinsicHeight: 1200,
    defaultAlt: 'Illustrative macro of the recessed rear USB-C port.',
    variants: [
      {
        width: 960,
        height: 720,
        avif: `${OWNER_BASE}/avif/OR04-rear-usbc-960w.avif`,
        webp: `${OWNER_BASE}/webp/OR04-rear-usbc-960w.webp`,
      },
      {
        width: 1600,
        height: 1200,
        avif: `${OWNER_BASE}/avif/OR04-rear-usbc-1600w.avif`,
        webp: `${OWNER_BASE}/webp/OR04-rear-usbc-1600w.webp`,
      },
    ],
    fallbackSrc: `${OWNER_BASE}/webp/OR04-rear-usbc-960w.webp`,
  },
  OR05: {
    shotId: 'OR05',
    intrinsicWidth: 1600,
    intrinsicHeight: 1000,
    defaultAlt: 'Illustrative macro of a bead-blasted aluminium surface.',
    variants: [
      {
        width: 960,
        height: 600,
        avif: `${OWNER_BASE}/avif/OR05-mat-aluminium-960w.avif`,
        webp: `${OWNER_BASE}/webp/OR05-mat-aluminium-960w.webp`,
      },
      {
        width: 1600,
        height: 1000,
        avif: `${OWNER_BASE}/avif/OR05-mat-aluminium-1600w.avif`,
        webp: `${OWNER_BASE}/webp/OR05-mat-aluminium-1600w.webp`,
      },
    ],
    fallbackSrc: `${OWNER_BASE}/webp/OR05-mat-aluminium-960w.webp`,
  },
  OR07: {
    shotId: 'OR07',
    intrinsicWidth: 1600,
    intrinsicHeight: 1000,
    defaultAlt: 'Illustrative macro of sculpted Charcoal PBT keycaps.',
    variants: [
      {
        width: 960,
        height: 600,
        avif: `${OWNER_BASE}/avif/OR07-mat-charcoal-pbt-960w.avif`,
        webp: `${OWNER_BASE}/webp/OR07-mat-charcoal-pbt-960w.webp`,
      },
      {
        width: 1600,
        height: 1000,
        avif: `${OWNER_BASE}/avif/OR07-mat-charcoal-pbt-1600w.avif`,
        webp: `${OWNER_BASE}/webp/OR07-mat-charcoal-pbt-1600w.webp`,
      },
    ],
    fallbackSrc: `${OWNER_BASE}/webp/OR07-mat-charcoal-pbt-960w.webp`,
  },
  OR08: {
    shotId: 'OR08',
    intrinsicWidth: 1600,
    intrinsicHeight: 1200,
    defaultAlt: 'Illustrative macro of the Forest aluminium enclosure.',
    variants: [
      {
        width: 960,
        height: 720,
        avif: `${OWNER_BASE}/avif/OR08-enclosure-macro-960w.avif`,
        webp: `${OWNER_BASE}/webp/OR08-enclosure-macro-960w.webp`,
      },
      {
        width: 1600,
        height: 1200,
        avif: `${OWNER_BASE}/avif/OR08-enclosure-macro-1600w.avif`,
        webp: `${OWNER_BASE}/webp/OR08-enclosure-macro-1600w.webp`,
      },
    ],
    fallbackSrc: `${OWNER_BASE}/webp/OR08-enclosure-macro-960w.webp`,
  },
  OR09: {
    shotId: 'OR09',
    intrinsicWidth: 1600,
    intrinsicHeight: 1000,
    defaultAlt: 'Illustrative macro of the engraved internal brass weight.',
    variants: [
      {
        width: 960,
        height: 600,
        avif: `${OWNER_BASE}/avif/OR09-mat-brass-weight-960w.avif`,
        webp: `${OWNER_BASE}/webp/OR09-mat-brass-weight-960w.webp`,
      },
      {
        width: 1600,
        height: 1000,
        avif: `${OWNER_BASE}/avif/OR09-mat-brass-weight-1600w.avif`,
        webp: `${OWNER_BASE}/webp/OR09-mat-brass-weight-1600w.webp`,
      },
    ],
    fallbackSrc: `${OWNER_BASE}/webp/OR09-mat-brass-weight-960w.webp`,
  },
  OR10: {
    shotId: 'OR10',
    intrinsicWidth: 1920,
    intrinsicHeight: 1072,
    defaultAlt: 'Illustrative side profile of the KF—01 concept keyboard.',
    variants: [
      {
        width: 1200,
        height: 670,
        avif: `${OWNER_BASE}/avif/OR10-side-profile-1200w.avif`,
        webp: `${OWNER_BASE}/webp/OR10-side-profile-1200w.webp`,
      },
      {
        width: 1920,
        height: 1072,
        avif: `${OWNER_BASE}/avif/OR10-side-profile-1920w.avif`,
        webp: `${OWNER_BASE}/webp/OR10-side-profile-1920w.webp`,
      },
    ],
    fallbackSrc: `${OWNER_BASE}/webp/OR10-side-profile-1200w.webp`,
  },
  OR11: {
    shotId: 'OR11',
    intrinsicWidth: 1600,
    intrinsicHeight: 995,
    defaultAlt: 'Illustrative close-up of the switch plate and PCB assembly.',
    variants: [
      {
        width: 960,
        height: 597,
        avif: `${OWNER_BASE}/avif/OR11-acoustic-stack-960w.avif`,
        webp: `${OWNER_BASE}/webp/OR11-acoustic-stack-960w.webp`,
      },
      {
        width: 1600,
        height: 995,
        avif: `${OWNER_BASE}/avif/OR11-acoustic-stack-1600w.avif`,
        webp: `${OWNER_BASE}/webp/OR11-acoustic-stack-1600w.webp`,
      },
    ],
    fallbackSrc: `${OWNER_BASE}/webp/OR11-acoustic-stack-960w.webp`,
  },
  OR12: {
    shotId: 'OR12',
    intrinsicWidth: 2560,
    intrinsicHeight: 1429,
    defaultAlt: 'Illustrative KF—01 concept render of the encoder and Forest enclosure.',
    variants: mkVariants(OWNER_BASE, 'OR12-closing', [
      [1280, 714],
      [1920, 1072],
      [2560, 1429],
    ]),
    fallbackSrc: `${OWNER_BASE}/webp/OR12-closing-1280w.webp`,
  },
  OR13: {
    shotId: 'OR13',
    intrinsicWidth: 2560,
    intrinsicHeight: 1429,
    defaultAlt:
      'KEYFORM KF—01 studio photograph in Forest anodized 6063 aluminium with Charcoal PBT keycaps and diamond-knurled rotary dial.',
    variants: mkVariants(OWNER_BASE, 'OR13-desktop-hero', [
      [960, 536],
      [1600, 893],
      [2560, 1429],
    ]),
    fallbackSrc: `${OWNER_BASE}/webp/OR13-desktop-hero-1600w.webp`,
  },
  OR14: {
    shotId: 'OR14',
    intrinsicWidth: 1600,
    intrinsicHeight: 1600,
    defaultAlt:
      'KEYFORM KF—01 square studio photograph in Forest anodized 6063 aluminium with Charcoal PBT keycaps and diamond-knurled rotary dial.',
    variants: mkVariants(OWNER_BASE, 'OR14-mobile-hero', [
      [800, 800],
      [1280, 1280],
      [1600, 1600],
    ]),
    fallbackSrc: `${OWNER_BASE}/webp/OR14-mobile-hero-800w.webp`,
  },
};

export function buildSrcSet(asset: ProductionAsset, format: 'avif' | 'webp'): string {
  return asset.variants.map((v) => `${v[format]} ${v.width}w`).join(', ');
}
