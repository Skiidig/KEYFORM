# KEYFORM — Creative Direction & Visual Identity

> **Status:** Active Art Direction — KF-003B Unified Charcoal Default Policy Applied  
> **Direction:** `FORM / FUNCTION × AFTER HOURS`  
> **Note:** Default hardware finish configuration (Forest aluminium + unified Charcoal PBT across all 81 keys including `Esc`) is locked by owner direction; UI typography pairing remains reversible until `KF-004`.

## 1. Brand Positioning

KEYFORM sits at the intersection of **Swiss industrial rationality** (*FORM / FUNCTION*) and **late-night studio tactility** (*AFTER HOURS*).

- **Reference lineage:** Braun / Dieter Rams grid restraint, Leica anodized metallurgy, Teenage Engineering's unapologetic component honesty, Mode Designs' architectural hardware photography.
- **Emotional tone:** Quiet authority, machined precision, warm tungsten-meets-cool-slate studio atmosphere, zero hype.
- **Voice & Copywriting:** Sparse, technical without jargon bloat, declarative. Short hardware designations (`KF—01`, `6.5°`, `19.05 mm`, `6063-T6`) paired with crisp one-line statements.

## 2. Candidate Color System

All hex values below are candidates subject to contrast and Cycles material calibration in `KF-002`/`KF-003`.

| Token | Name | Hex | Proposed Role |
| :--- | :--- | :--- | :--- |
| `--kf-obsidian` | **Obsidian** | `#151719` | Primary page canvas, deep studio backdrop |
| `--kf-carbon` | **Carbon** | `#25292D` | Elevated bento tiles, structural panels, dark hardware anodizing |
| `--kf-titanium` | **Titanium** | `#ADB7C1` | Secondary text, hairline dividers (`10%–16%` opacity), machined metal accents |
| `--kf-porcelain` | **Porcelain** | `#E9E7E0` | Primary high-contrast typography, light keycap colorway, spec callouts |
| `--kf-signal` | **Signal** | `#F0793B` | Single functional accent: active selection, optional Build Studio accent cap, primary CTA, tactile stem |
| `--kf-forest` | **Forest** | `#657C75` | Flagship default enclosure colorway (bead-blasted Forest anodized aluminium), calm technical badge accent |

### Default Product Colorway Policy (KF-003B)
- **Flagship default renders & default Build Studio state:** Forest anodized aluminium enclosure, **unified Charcoal PBT across all 81 keycaps (including `Esc`)**, consistent subtle off-white legends, approved knurled encoder finish, and brushed brass internal weight.
- **No default accent keycaps:** Contrasting Ivory, Signal, or Forest accent keycaps are excluded from default hero, engineering, exploded, macro, and website-facing renders. Optional accent variations remain available solely inside the interactive Build Studio.

### Contrast & Surface Discipline
- Primary body text (`#E9E7E0` on `#151719` ≈ `14.1:1`; on `#25292D` ≈ `11.1:1`) comfortably exceeds WCAG AA (`4.5:1`).
- Secondary text (`#ADB7C1` on `#151719` ≈ `8.8:1`; on `#25292D` ≈ `6.9:1`) remains legible without harsh pure-white glare.
- **Signal (`#F0793B`)** is reserved strictly for functional focus, active states, and physical accent keys — never for large background fills or decorative glows.
- Avoid pure `#000000` or pure `#FFFFFF` in UI surfaces; `#151719` and `#E9E7E0` preserve tonal richness under studio lighting.

## 3. Typography Direction

Swiss-inspired neo-grotesque clarity paired with technical monospace precision:

| Role | Candidate Family | Fallback | Usage |
| :--- | :--- | :--- | :--- |
| **Display & Headings** | `Space Grotesk` or `Inter Tight` / `Plus Jakarta Sans` *(self-hosted variable `.woff2`)* | `system-ui, sans-serif` | Hero statements, section titles, large numeral callouts (`KF—01`) |
| **UI & Editorial Body** | `Inter` (variable) | `-apple-system, BlinkMacSystemFont, sans-serif` | Concise descriptions, configurator labels, spec prose (`16px` base, `1.5` line-height) |
| **Technical Spec / Mono** | `JetBrains Mono` or `IBM Plex Mono` | `ui-monospace, monospace` | Dimensions (`327.0 × 138.0 mm`), actuation specs (`45 gf`), layer indices (`01 / 09`), config codes |

### Typographic Rules
- Use `tabular-nums` (`font-variant-numeric: tabular-nums`) on all dimensions, weights, switch forces, and layer counters.
- Tight tracking (`-0.02em` to `-0.03em`) on large display headers; slightly wide tracking (`+0.08em` to `+0.12em`) on uppercase micro-labels (`11px–12px` mono).
- Keep line lengths to `50–65ch` in editorial blocks; avoid orphan headings (`text-wrap: balance`).

## 4. Layout & Surface Language

- **Grid:** 12-column Swiss editorial grid with disciplined `1px` hairlines (`rgba(173, 183, 193, 0.12)`) and consistent spacing rhythm (`8px` base unit).
- **Corner Radii:** Sharp, machined feel — `2px`–`4px` for cards/buttons, `0px` for technical dividers and full-bleed photography. No bubbly `24px+` SaaS cards.
- **Selective Glassmorphism:** Used *only* on floating HUD controls overlaid on top of the 3D Build Studio viewport or Anatomy stage (e.g., `rgba(21, 23, 25, 0.72)` with `backdrop-filter: blur(12px)` and a `1px` top specular hairline). Never apply glass effects to static bento tiles or text sections.
- **Iconography:** Custom thin-stroke geometric SVG icons (`1.25px–1.5px` stroke, `currentColor`). Never use emojis as UI icons.

## 5. Photographic Lighting & Material Character (Blender Cycles)

- **Mood:** *After Hours* — low-key architectural studio lighting. The keyboard emerges from `#050606`–`#151719` Obsidian shadow with deliberate rim light revealing CNC chamfers, keycap scoops, and knurling, paired with *Form / Function* neutral light studio photography for engineering macros, exploded anatomy, and material cards, plus a dedicated dark *After Hours Switch* macro rig matching the Switch Lab stage.
- **Lighting rig:** Soft overhead rectangular diffused key light (cool-neutral `5600K`) + controlled warm grazing strip (`3800K`) skimming metallic edges + disciplined dark negative fill so Forest aluminium reads dense and anodized rather than chrome-mirrored or washed out.
- **Material fidelity (clean, newly finished — zero artificial wear, scratches, dust, or fingerprints):**
  - *Forest Anodized Aluminium:* Fine bead-blasted metallic roughness (`~0.33–0.40`), controlled clearcoat (`0.08`), `7.5 µm` microrelief, recognizable dark Forest hue under both studios.
  - *Unified Charcoal PBT Keycaps:* Identical matte charcoal (`#171C1B–#1C2220`) across all 81 caps including `Esc`, fine tactile micro-grain (`roughness ~0.56–0.64`, `7.0 µm` relief), controlled crown highlights, crisp subtle off-white legends (`#C4CAC1–#D1D7CE`).
  - *Knurled Rotary Knob:* Distinct separation between machined 48-tooth diamond-knurled side barrel (`roughness 0.24–0.32`) and directional brushed top face (`roughness 0.35–0.43`, anisotropic).
  - *Brushed Brass Weight:* Directional brushed metallic response (`roughness 0.31–0.40`, anisotropy `0.42`) with high-contrast dark engraving, avoiding mirror-like or overly orange glare.
  - *Switch Archetypes:* Smoked translucent polycarbonate upper housing (`transmission 0.72`), Porcelain POM cross stem, polished steel variable-pitch spring, and stamped copper contact leaves (with dedicated Tactile 58 and Silent 50 material slots prepared for the full batch).
  - *Poron Foam & Silicone Gaskets:* Deep light-absorbing matte elastomer (`roughness ~0.66–0.92`) contrasting against machined metal and FR4 PCB traces.

## 6. Motion Principles

Motion must feel **mechanical, damped, and purposeful** — like a well-lubed switch or a precision detent, never floaty or springy-cartoonish.

- **Easing:** Crisp mechanical deceleration (`cubic-bezier(0.22, 1, 0.36, 1)`) for UI transitions; slightly snappier exit than entrance.
- **Tactile micro-interactions:**
  - `120–180ms` state changes on swatch selectors, plate toggles, and spec tabs.
  - Keypress simulation in Switch Lab / Build Studio mirrors physical `4.0 mm` travel (`~45ms` downstroke, `~90ms` damped return).
  - Exploded view transition moves sub-assemblies along the vertical Z-axis in staggered mechanical strata (`600–800ms` total).
- **Reduced Motion:** Full compliance with `prefers-reduced-motion: reduce` — disable scroll-linked parallax, replace animated exploded sweeps with instant/cross-faded state switches, and disable auto-turntable rotation.

## 7. Explicit Anti-Patterns (Do Not Introduce)

- Multi-color SaaS mesh gradients or purple/cyan neon glows.
- Glowing hover borders on every bento card.
- Glassmorphism stacked on opaque solid backgrounds.
- Fake live telemetry charts, pulsing "online" dots, or decorative dashboards.
- Auto-playing loud audio or unsolicited scroll-jacking.
