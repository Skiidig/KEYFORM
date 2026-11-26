# KF—01 Product Specification

> **Document Status:** KF-003A-R3 Alternative A canonical geometry frozen and approved (`4af6fdd`); KF-003B production assets complete (18 masters + 74 responsive AVIF/WebP derivatives) with unified Charcoal PBT default policy
>
> **Scope Rule:** Verified industry engineering standards are explicitly separated from fictional KF—01 product specifications. No certifications, laboratory test data, or measured acoustic figures are claimed.

## 1. Product Identity

- **Brand:** KEYFORM
- **Model:** KF—01
- **Category:** 75% ANSI Custom Gasket-Mount Mechanical Keyboard
- **Tagline:** *Precision in every press.*

## 2. Component References & Modeling Datums

The referenced parts and the nominal KF—01 modeling datums define the geometry used for review.

| Parameter | KF—01 Model | Reference Basis |
| :--- | :--- | :--- |
| Key pitch (1u center-to-center) | `19.05 mm` (`0.75 in`) | Conventional keyboard grid used for the KF—01 layout |
| Switch plate cutout | `14.00 × 14.00 mm` with `R0.27 mm` corners | [CHERRY MX drawing](https://media.digikey.com/pdf/Data%20Sheets/Cherry%20PDFs/MX%20Series.pdf) shows `0.551 ± 0.002 in`, max `R0.012 in` |
| Rigid switch plate thickness | `1.50 mm` | CHERRY MX drawing shows `0.060 ± 0.006 in` |
| PCB thickness and plate stack | `1.60 mm` FR4 and `5.00 mm` plate top to PCB top | Nominal KF—01 stack based on the MX mounting drawing |
| MX downstroke | `4.00 mm` | [CHERRY MX2A Red](https://www.cherry.de/fileadmin/media/Industrial/Switch/MX_RED/Data_sheet_MX2A_Red.pdf) specifies 4 mm total travel and 2 mm pretravel |
| Keycap shells | 1u base `18.00 × 18.00 mm`, `1.05 mm` minimum base gap | KF—01 Cherry-inspired profile candidate |
| Keycap crown heights | `R1 9.40`, `R2 9.00`, `R3 8.75`, `R4 8.10 mm` at center, measured from the installed cap datum | KF—01 sculpted rows, with a dedicated convex Space profile |
| PCB-mount stabilizer wire span | `23.8 mm` for 2u and 2.25u positions, `100.0 mm` for 6.25u | CHERRY drawing and [KiCad 6.25u PCB footprint](https://github.com/KiCad/kicad-footprints/blob/master/Button_Switch_Keyboard.pretty/SW_Cherry_MX_6.25u_PCB.kicad_mod) |
| Rotary encoder | `~11 × 11 mm` body, flat `Ø6 mm` shaft, `30` detents, `0.5 mm` push | [ALPS Alpine EC11E15244G1](https://tech.alpsalpine.com/e/products/detail/EC11E15244G1/) motion reference |
| USB-C receptacle and throat | `8.94 × 3.46 mm` represented shell and `9.70 × 4.22 mm` case throat | [GCT USB4085](https://gct.co/connector/usb4085) and [Unified Daughterboard case guidance](https://github.com/Unified-Daughterboard/Unified-Daughterboard.github.io/blob/main/info-designer-case.md) |

## 3. Fictional KF—01 Product Specifications

These specifications define the fictional KF—01 industrial design.

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

- **Stabilizers required (4 total):** Backspace (2u), Enter and left Shift (2.25u) use the `23.8 mm` short span. Space (6.25u) uses `100.0 mm`.
- **Arrow cluster alignment:** `Up` (`14.25u–15.25u`) sits directly above `Down` (`14.25u–15.25u`); `End` (`15.25u–16.25u`) aligns cleanly under the right-hand nav column (`Del`, `PgUp`, `PgDn`) and above `Right`.
- **Canonical coordinates:** `D:\Assets\KEYFORM\reference\kf01_layout.json` records every key, blocker, encoder, nominal unit width and center relative to the keybed. The same manifest is embedded in the Blender master.

### 3.2 Exterior Dimensions & Ergonomics (Fictional)

- **Keybed footprint:** `309.56 mm` (`16.25u`) × `119.06 mm` (`6.25u`)
- **Exterior width:** `327.0 mm` (`~8.72 mm` side bezels, subtle `1.2 mm` 45° top chamfer)
- **Exterior depth:** `138.0 mm` in desk-plane projection. The tilted 119.06 mm key field is centered on the case datum.
- **Typing angle:** `6.5°` rear rise with the case feet on the desk plane.
- **Front chin height:** `18.5 mm` (enclosure), `19.5 mm` (including `1.0 mm` proud recessed silicone feet)
- **Rear height:** `34.2 mm` (enclosure, excluding rotary knob protrusion)
- **Target assembled mass (fictional):** `~1,680 g` (CNC aluminium case + internal metal weight)

### 3.3 Construction & Materials (Fictional)

- **Enclosure:** Two-piece CNC-machined 6063 aluminium (top frame + bottom chassis) joined by `8× M2.5` recessed stainless Torx fasteners accessible from the underside.
- **Integrated deck candidate (KF-003A-R1):** Four function pockets, an integral navigation separator, and a stepped opening beside the arrow keys. Retained reliefs at the close-spaced rows kept the frame continuous at the specified cap travel.
- **Right-cluster candidate (KF-003A-R2, superseded):** Added locally raised chamfered shoulders around the navigation column and arrows while keeping shared openings across the `1.05 mm` throats.
- **Alternative A integrated deck candidate (KF-003A-R3):** Restores the clean flat R1 deck and relocates eight key centers per KF-LAYOUT-001 Alternative A (`Nav +1.45 mm X`; `Arrows −1.45 mm X, −2.85 mm Y`) to establish independent main typing, navigation column (`Delete`, `PgUp`, `PgDn`, `End`), and inverted-T arrow apertures separated by continuous aluminium webs (`2.46 mm` nominal / `2.22 mm` study flat minimum), backed by local front-right plate/PCB/foam extensions and a compact front-right silicone gasket sock.
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
  - Recessed rear-center **USB-C daughterboard** with a UDB-style harness so the gasket-mounted PCB can move independently of the port. KF-002 uses an editorial carrier and a split, stepped port aperture.
- **Internal Acoustic Stack (Fictional Layering):**
  - `3.5 mm` nominal open-cell Poron plate foam, modeled at `3.0 mm` installed thickness above the IXPE within the `3.5 mm` free stack
  - `0.5 mm` IXPE switch pad (atop PCB)
  - `2.0 mm` bottom-case Poron acoustic sheet (above internal weight pocket)
- **Rotary Encoder Knob:**
  - CNC-machined `Ø 20.0 mm × 15.5 mm` cylindrical aluminium/brass candidate with diamond knurling, chamfered top face and flat-shaft bore. The model uses `12°` detent steps and `0.5 mm` push.
- **Keycaps (KF-003B Canonical Color Policy):**
  - Approximately `1.5 mm` wall thickness, sculpted Cherry-inspired PBT, and dye-sublimated legends as a finish target.
  - **Default canonical visual configuration:** Forest anodized aluminium enclosure paired with **unified Charcoal PBT across all 81 keycaps (including `Esc`)** and consistent subtle off-white legends. The earlier contrasting Ivory `Esc` accent is removed from all default hero, engineering, exploded, macro, and website-facing imagery.
  - **Build Studio default & optional accents:** The default Build Studio state matches this unified Charcoal PBT treatment; optional accent key variations (Signal, Ivory, Forest) remain available only as user-selected Build Studio options.
  - The KF-003A candidate extends the hollow skirt `0.56 mm` below the installed KF-002 cap datum. Profile crown heights and the cap-to-stem mounting datum refer to that original datum. The skirt extends around the switch lid while the mount retains its original full-stroke clearance.

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
