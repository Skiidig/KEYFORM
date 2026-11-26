# KEYFORM — Creative Direction & Visual Identity

> **Status:** Preliminary Creative Brief (KF-001)  
> **Direction:** `FORM / FUNCTION × AFTER HOURS`  
> **Note:** Palette, typography, and motion parameters are strong candidates, not irreversibly locked decisions.

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
| `--kf-signal` | **Signal** | `#F0793B` | Single functional accent: active selection, Esc/Enter accent cap, primary CTA, tactile stem |
| `--kf-forest` | **Forest** | `#657C75` | Secondary hardware colorway (case & sub-modifiers), calm technical badge accent |

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

- **Mood:** *After Hours* — low-key architectural studio lighting. The keyboard emerges from `#151719` Obsidian shadow with deliberate rim light revealing CNC chamfers, keycap scoops, and knurling.
- **Lighting rig:** Soft overhead rectangular diffused key light (cool-neutral `5600K`) + subtle warm side accent (`3800K`) skimming metallic edges + controlled dark negative fill so aluminium reads dense and anodized rather than chrome-mirrored.
- **Material fidelity:**
  - *Anodized Aluminium:* Micro-bead-blasted metallic roughness (`~0.28–0.36`), subtle anisotropic edge highlights on chamfers.
  - *PBT Keycaps:* Fine matte micro-grain (`roughness ~0.55–0.65`), soft specular roll-off, crisp legends (never glossy ABS shine).
  - *Knurled Rotary Knob:* Distinct directional metallic glints that reward slight camera movement.
  - *Poron Foam & Silicone Gaskets:* Deep light-absorbing matte elastomer (`roughness ~0.85–0.92`) contrasting against machined metal and FR4 PCB traces.

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
