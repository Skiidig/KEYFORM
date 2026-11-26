# KF—01 Product Specification

> **Document Status:** Preliminary Foundation (KF-001)  
> **Scope Rule:** Verified industry engineering standards are explicitly separated from fictional KF—01 product specifications. No certifications, laboratory test data, or measured acoustic figures are claimed.

## 1. Product Identity

- **Brand:** KEYFORM
- **Model:** KF—01
- **Category:** 75% ANSI Custom Gasket-Mount Mechanical Keyboard
- **Tagline:** *Precision in every press.*

## 2. Verified Engineering Standards

The following dimensions and mechanical interfaces follow documented industry standards and govern KF—01 CAD/Blender geometry so all parts mate coherently:

| Standard Parameter | Verified Value | Reference Basis |
| :--- | :--- | :--- |
| Key pitch (1u center-to-center) | `19.05 mm` (`0.75 in`) | Cherry MX / ANSI typewriter grid standard |
| Switch plate cutout | `14.00 × 14.00 mm` (`13.995 ± 0.05 mm`, max `R0.3 mm`) | Cherry MX datasheet snap-in retention spec |
| Rigid switch plate thickness | `1.50 mm` (`1.52 ± 0.10 mm`) | Cherry MX upper retention clip engagement |
| Standard PCB thickness | `1.60 mm` (FR4) | Standard mechanical keyboard PCB thickness |
| Plate top to PCB top distance | `5.00 mm` | Cherry MX datasheet standoff spacing |
| Standard MX switch total travel | `4.00 mm` (typical actuation ~`2.00 mm`) | Traditional Cherry MX travel envelope |
| 1u Cherry-profile keycap base | `~18.0–18.5 mm` square (~`12 × 13 mm` top), `~1.5 mm` wall | Standard Cherry-profile PBT/ABS geometry |
| Cherry-profile row heights (top-down) | `R1 ≈ 9.4 mm`, `R2 ≈ 9.0 mm`, `R3 ≈ 8.75 mm`, `R4 ≈ 8.1 mm` | Standard sculpted Cherry profile (GMK/ePBT convention) |
| PCB-mount stabilizer wire spacing | `2u = 23.8 mm`, `6.25u = 100.0 mm` | Cherry MX PCB-mount screw-in stabilizer spec |
| Rotary encoder body & shaft | `~11 × 11 mm` body, `Ø 6.0 mm` D-shaft (`4.5 mm` flat) | Alps EC11E series mechanical encoder spec |
| USB-C receptacle mating face | `8.94 × 3.26 mm` (`R1.2–1.3 mm` corners; `+0.3–0.5 mm` case clearance) | USB-C receptacle / Unified Daughterboard (UDB) convention |

## 3. Fictional KF—01 Product Specifications

These specifications define the fictional KF—01 industrial design and are built directly on top of the verified standards above:

### 3.1 Layout & Key Count (Exploded 75% ANSI)

KF—01 uses an **exploded 75% ANSI layout** (`16.25u` wide × `6.25u` deep including row/column separators) with **81 mechanical switches + 1 push-button rotary encoder (82 total inputs)**:

| Row | Profile | Key Arrangement (Left to Right) | Width Sum | Keys |
| :--- | :--- | :--- | :--- | :--- |
| Row 1 (F-Row) | R1 | `Esc` (1u), `0.5u` gap, `F1–F4` (4u), `0.25u` gap, `F5–F8` (4u), `0.25u` gap, `F9–F12` (4u), `0.5u` gap, **Rotary Encoder Zone** (`1.75u` bay, `Ø 20 mm` knob centered at `X = 15.375u`) | `16.25u` | 13 + Knob |
| *Gap* | — | `0.25u` (`4.76 mm`) horizontal separator below F-row | — | — |
| Row 2 (Numbers) | R1 | `` ` `` (1u), `1–0` (10u), `-` (1u), `=` (1u), `Backspace` (2u), `0.25u` blocker, `Del` (1u) | `16.25u` | 15 |
| Row 3 (QWERTY) | R2 | `Tab` (1.5u), `Q–P` (10u), `[` (1u), `]` (1u), `\` (1.5u), `0.25u` blocker, `PgUp` (1u) | `16.25u` | 15 |
| Row 4 (Home) | R3 | `Caps` (1.75u), `A–L` (9u), `;` (1u), `'` (1u), `Enter` (2.25u), `0.25u` blocker, `PgDn` (1u) | `16.25u` | 14 |
| Row 5 (Shift) | R4 | `LShift` (2.25u), `Z–/` (10u), `RShift` (1.75u), `0.25u` blocker, `Up` (1u), `End` (1u) | `16.25u` | 14 |
| Row 6 (Bottom) | R4 | `LCtrl` (1.25u), `Cmd/Win` (1.25u), `LAlt` (1.25u), `Space` (6.25u), `RAlt` (1u), `Fn` (1u), `RCtrl` (1u), `0.25u` blocker, `Left` (1u), `Down` (1u), `Right` (1u) | `16.25u` | 10 |

- **Stabilizers required (4 total):** `3× 2u` (`Backspace`, `Enter`, `LShift`) + `1× 6.25u` (`Space`).
- **Arrow cluster alignment:** `Up` (`14.25u–15.25u`) sits directly above `Down` (`14.25u–15.25u`); `End` (`15.25u–16.25u`) aligns cleanly under the right-hand nav column (`Del`, `PgUp`, `PgDn`) and above `Right`.

### 3.2 Exterior Dimensions & Ergonomics (Fictional)

- **Keybed footprint:** `309.56 mm` (`16.25u`) × `119.06 mm` (`6.25u`)
- **Exterior width:** `327.0 mm` (`~8.72 mm` side bezels, subtle `1.2 mm` 45° top chamfer)
- **Exterior depth:** `138.0 mm` (`10.5 mm` rear bezel, `8.44 mm` front bezel)
- **Typing angle:** `6.5°`
- **Front chin height:** `18.5 mm` (enclosure), `19.5 mm` (including `1.0 mm` proud recessed silicone feet)
- **Rear height:** `34.2 mm` (enclosure, excluding rotary knob protrusion)
- **Target assembled mass (fictional):** `~1,680 g` (CNC aluminium case + internal metal weight)

### 3.3 Construction & Materials (Fictional)

- **Enclosure:** Two-piece CNC-machined 6063 aluminium (top frame + bottom chassis) joined by `8× M2.5` recessed stainless Torx fasteners accessible from the underside.
- **Surface Finishes (Build Studio candidates):**
  - *Obsidian* — Bead-blasted dark charcoal anodization
  - *Carbon* — Fine matte graphite anodization
  - *Titanium* — Raw bead-blasted silver-grey anodization
  - *Forest* — Muted slate-pine anodization
- **Internal Weight:** Concealed / rear-accented CNC-machined solid weight (brushed brass or PVD dark stainless steel) secured to the bottom chassis via `4× M3` countersunk screws.
- **Mounting System:** Isolated silicone gasket-mount (`12×` perimeter silicone socks/strips seating plate tabs between top and bottom case channels; no rigid metal-to-metal screw path between plate and case).
- **Replaceable Switch Plates (`1.5 mm`):**
  - Brushed Aluminium (balanced rigidity)
  - FR4 (neutral matte black with subtle gold edge trace)
  - Polycarbonate (frosted translucent flex option)
  - Sandblasted Brass (firm, high-mass option)
- **PCB & Connectivity:**
  - `1.6 mm` matte-black hot-swap PCB with south-facing MX hot-swap sockets and per-key SMD cutouts (no RGB rainbow marketing; optional understated warm-white indicator LED on Caps Lock).
  - Recessed rear-center **USB-C Unified Daughterboard** connected via internal JST ribbon harness so the gasket-mounted PCB flexes independently of the port cutout.
- **Internal Acoustic Stack (Fictional Layering):**
  - `3.5 mm` open-cell Poron plate foam (between switch plate and PCB)
  - `0.5 mm` IXPE switch pad (atop PCB)
  - `2.0 mm` bottom-case Poron acoustic sheet (above internal weight pocket)
- **Rotary Encoder Knob:**
  - CNC-machined `Ø 20.0 mm × 15.5 mm` cylindrical aluminium/brass knob with fine diamond/straight knurling and chamfered top face, press-fit onto an EC11 D-shaft with tactile detents and push-to-mute action.
- **Keycaps:**
  - `1.5 mm` thick sculpted Cherry-profile dye-sublimated PBT with crisp, minimal Swiss-grotesque legends.

### 3.4 Switch Lab Lineup (Fictional KEYFORM Editions)

Designed as three distinct mechanical archetypes for interactive comparison in the Switch Lab and Build Studio (force/travel values are nominal design targets, not lab-tested measurements):

| Switch Name | Type | Housing / Stem Visual | Nominal Actuation | Nominal Total Travel | Character Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KF—Linear 45** | Linear | Smoked translucent top, obsidian bottom, *Porcelain* POM stem | `45 gf` @ `2.0 mm` | `4.0 mm` | Smooth, uninterrupted downstroke |
| **KF—Tactile 58** | Tactile | Matte carbon housing, *Signal* (`#F0793B`) POM stem | `58 gf` @ `2.0 mm` | `3.8 mm` | Pronounced early tactile bump |
| **KF—Silent 50** | Dampened Linear | Frosted smoke housing, *Forest* (`#657C75`) dampened stem | `50 gf` @ `1.9 mm` | `3.7 mm` | Cushioned bottom-out for late-night work |

## 4. Non-Claims & Boundaries

- No IP rating, drop-test certification, CE/FCC compliance badge, or real-world decibel (`dBA`) measurement is claimed.
- Any sound previews added in later phases must be clearly framed as stylized mechanical switch previews rather than acoustic lab recordings.
