# KEYFORM — Mechanical Component Architecture & Asset Pipeline

> **Status:** Planning Blueprint (KF-001)  
> **Rule:** Do not create Blender models or render images during KF-001. This document governs `KF-002` (Blender Master) and `KF-003` (Cycles & GLB Export).

## 1. Workspace Separation

Production 3D files and uncompressed renders stay **outside** the Git repository:

```text
D:\Assets\KEYFORM\                 # External local production workspace (NOT in Git)
├── blender/
│   ├── kf01_master.blend          # Editable non-destructive master scene
│   └── kf01_studio_export.blend   # Linked/baked GLB export staging file (optional)
├── textures/                      # Raw PBR maps, keycap legend SVGs/PNGs, HDRIs
├── renders/
│   ├── cycles-raw/                # 16-bit PNG / EXR masters
│   └── web-export/                # Staging for AVIF/WebP conversion
└── glb/
    └── kf01_studio.glb            # Exported & compressed GLB before copying to repo
```

Only verified, budget-compliant web derivatives (`.glb`, `.avif`, `.webp`) will be copied into `public/` inside `D:\GitHub\KEYFORM` during `KF-003`/`KF-004`.

## 2. Coordinate System & Master Scale

- **Real-world scale:** `1 Blender Unit = 1 meter` (`0.001` = `1 mm`), with Scene Unit Scale `1.0` and Display Units set to **Millimeters**.
- **Orientation (glTF-aligned):**
  - `+X`: Right (Esc → Rotary Knob)
  - `+Y`: Rear / Away from user (Spacebar → Function Row) in Blender *(maps cleanly to `-Z` in glTF on export with `+Y Up` enabled)*
  - `+Z`: Up (Bottom Feet → Keycaps) in Blender *(maps to `+Y` in glTF on export)*
- **Origin (`0, 0, 0`):** Centered in `X` and `Y` at the bottom resting plane of the silicone feet (`Z = 0`), with the `6.5°` typing incline applied inside the assembled chassis geometry (while internal sub-assemblies parent cleanly to an inclined keybed pivot `KF01_TiltPivot_6p5deg` so all Z-axis exploded translations stay perpendicular to the plate/PCB!).

## 3. Naming Conventions

Use strict, deterministic names so Blender collections, GLB scene-graph nodes, and React Three Fiber queries stay 1:1 synchronized:

- **Prefix:** `KF01_`
- **Assemblies / Empties (Exploded Groups):** `GRP_<nn>_<PascalName>` (e.g., `GRP_01_Keycaps`, `GRP_05_SwitchPlate`)
- **Meshes:** `KF01_<SubAssembly>_<PartName>` (e.g., `KF01_Case_TopFrame`, `KF01_Knob_Body`)
- **Materials:** `MAT_<Group>_<Variant>` (e.g., `MAT_Case_Anodized`, `MAT_Keycap_Alpha`, `MAT_Keycap_Mod`, `MAT_Keycap_Accent`, `MAT_Plate_Active`, `MAT_Switch_Stem`)

## 4. Mechanical Component Hierarchy & Parent-Child Relationships

```text
KF01_Root (Origin: X=0, Y=0, Z=0, Desk Resting Plane)
├── GRP_09_BottomChassis            [Explode Z: -28 mm]
│   ├── KF01_Case_BottomFrame       (CNC 6063 Aluminium lower housing + USB-C rear pocket)
│   ├── KF01_Feet_Silicone          (4× recessed silicone feet, instanced)
│   └── KF01_Fasteners_Case         (8× M2.5 Torx bottom fasteners, instanced)
├── GRP_08_InternalWeight           [Explode Z: -14 mm]
│   ├── KF01_Weight_Main            (CNC Brushed Brass / PVD Stainless weight block)
│   ├── KF01_Fasteners_Weight       (4× M3 countersunk screws, instanced)
│   └── KF01_Foam_CaseBottom        (2.0 mm Poron bottom acoustic sheet)
├── GRP_07_USB_Daughterboard        [Explode Z: -6 mm, Y: +12 mm rear]
│   ├── KF01_UDB_PCB                (Unified Daughterboard carrier PCB)
│   ├── KF01_UDB_USBC_Port          (8.94 × 3.26 mm metallic USB-C receptacle)
│   └── KF01_UDB_JST_Harness        (Internal flexible ribbon connector)
└── KF01_TiltPivot_6p5deg           (Local X-rotation = -6.5°; aligns keybed stack)
    ├── GRP_06_PCB_Assembly         [Explode Local Z: 0 mm (Datum Anchor)]
    │   ├── KF01_PCB_Main           (1.6 mm matte-black FR4 PCB + copper trace texture)
    │   ├── KF01_PCB_HotswapSockets (81× Kailh-style sockets underside, instanced)
    │   ├── KF01_Encoder_EC11       (11×11 mm Alps EC11 body + Ø6 mm D-shaft)
    │   └── KF01_Foam_IXPE          (0.5 mm IXPE switch pad on PCB top)
    ├── GRP_05_AcousticAndGaskets   [Explode Local Z: +14 mm]
    │   ├── KF01_Foam_PlatePoron    (3.5 mm perforated Poron plate foam)
    │   └── KF01_Gaskets_Silicone   (12× perimeter silicone gasket socks, instanced)
    ├── GRP_04_SwitchPlate          [Explode Local Z: +28 mm]
    │   ├── KF01_Plate_Main         (1.5 mm replaceable plate, 81× 14×14 mm cutouts)
    │   └── KF01_Stabilizers        (3× 2u @ 23.8 mm + 1× 6.25u @ 100 mm PCB-mount stabs)
    ├── GRP_03_Switches             [Explode Local Z: +46 mm]
    │   ├── KF01_Switch_Housings    (81× MX housings, instanced)
    │   └── KF01_Switch_Stems       (81× MX cross stems, instanced; animatable Z travel)
    ├── GRP_02_TopEnclosure         [Explode Local Z: +68 mm]
    │   ├── KF01_Case_TopFrame      (CNC 6063 Aluminium bezel + 1.2 mm top chamfer)
    │   └── KF01_Knob_Rotary        (Ø20 × 15.5 mm knurled CNC knob, animatable Z-spin & press)
    └── GRP_01_Keycaps              [Explode Local Z: +92 mm]
        ├── KF01_Caps_Alphas        (Sculpted Cherry PBT R1–R4 alpha keys)
        ├── KF01_Caps_Modifiers     (Sculpted Cherry PBT R1–R4 modifier & nav keys)
        └── KF01_Caps_Accents       (Esc 1u R1 + Enter 2.25u R3 — independent accent slot)
```

> **Note on Assembled Transforms:** In the assembled state, all `GRP_*` local explode offsets are `(0, 0, 0)`. Internal clearances follow verified standards: PCB top to Plate top = `5.0 mm`, Plate thickness = `1.5 mm`, PCB thickness = `1.6 mm`, Switch bottom flush on PCB top, Keycap base clearing top frame by `~1.0 mm`.

## 5. Customizable Material Groups (Build Studio Slots)

Keeping material slots minimal allows instant zero-reload customization in Three.js:

| Material Slot | Assigned Meshes | Build Studio Options |
| :--- | :--- | :--- |
| `MAT_Case_Anodized` | `KF01_Case_TopFrame`, `KF01_Case_BottomFrame` | Obsidian (`#151719`), Carbon (`#25292D`), Titanium (`#ADB7C1`), Forest (`#657C75`) |
| `MAT_Weight_Metal` | `KF01_Weight_Main`, `KF01_Knob_Rotary` *(or matched to case)* | Brushed Brass, PVD Obsidian Stainless, Raw Titanium |
| `MAT_Keycap_Alpha` | `KF01_Caps_Alphas` | Obsidian Dark, Porcelain Light, Two-Tone Slate |
| `MAT_Keycap_Mod` | `KF01_Caps_Modifiers` | Matched or contrasting modifier tone |
| `MAT_Keycap_Accent` | `KF01_Caps_Accents` (`Esc`, `Enter`) | Signal (`#F0793B`), Forest (`#657C75`), Matched |
| `MAT_Plate_Active` | `KF01_Plate_Main` | Brushed Aluminium, Matte FR4, Frosted Polycarbonate, Sandblasted Brass |
| `MAT_Switch_Housing` | `KF01_Switch_Housings` | Smoked Translucent (Linear), Matte Carbon (Tactile), Frosted Smoke (Silent) |
| `MAT_Switch_Stem` | `KF01_Switch_Stems` | Porcelain (`#E9E7E0`), Signal (`#F0793B`), Forest (`#657C75`) |

## 6. Instancing & Optimization Strategy

To meet the `≤ 2.5 MB` GLB and `≤ 40` draw call targets without losing visual fidelity:

- **Instanced in Blender (`Alt+D` Linked Data) & Exported as GPU Instances / `InstancedMesh`:**
  - `81×` switch housings (1 shared low-poly master mesh, ~250–350 tris)
  - `81×` switch stems (1 shared master mesh, ~120 tris)
  - `81×` hot-swap sockets (simple underside silhouette, ~40 tris — or baked into PCB underside normal map if unseen)
  - `12×` silicone gaskets, `8×` M2.5 Torx screws, `4×` M3 weight screws, `4×` silicone feet
  - `1u` keycap base geometry per row (`R1`, `R2`, `R3`, `R4`) with legend atlas UV offsets so 60+ 1u caps share 4 base meshes + 1 crisp `2K` alpha/legend texture atlas.
- **Dual-Detail Workflow (Cycles vs. GLB):**
  - Keep bevels, knurling, and subdivision modifiers **non-destructive** in `kf01_master.blend`.
  - **Cycles Render Profile:** High subdivision, geometric micro-knurling on the rotary knob, full chamfer fillets, procedural micro-anodizing roughness.
  - **GLB Export Profile:** Applied moderate bevels (`2–3` segments on hero chamfers), normal-mapped knob knurling, vertex-count target `60k–90k` total rendered triangles (before instancing compression), `Draco` + `Meshopt` compression, and `KTX2` / `WebP` embedded textures (`≤ 1024px` for roughness/normal, `2048px` monochrome legend atlas).

## 7. Keypress & Mechanical Animation Requirements

- **Switch Travel (Build Studio & Switch Lab):**
  - Individual test keys (e.g., `Esc`, `Enter`, `Space`, plus any clicked key if raycast-enabled) depress `-4.0 mm` along the local `-Z` axis of `KF01_TiltPivot_6p5deg`, moving both the target keycap and its paired switch stem together.
  - Timing: `~45 ms` downstroke, `~90 ms` damped return (adjustable per switch archetype in Switch Lab).
- **Rotary Encoder Knob:**
  - Supports discrete rotational detent steps (`15°` per step, 24 detents/rev) around local `Z` and a `-1.0 mm` push-switch depression.
- **Exploded Assembly Transition:**
  - Driven procedurally in code (not baked keyframe tracks) by interpolating each `GRP_01`–`GRP_09` container's local Z offset from `0` to its exploded target vector. This keeps the GLB tiny and lets users inspect any layer or combine Exploded Mode with live material/switch swapping.
