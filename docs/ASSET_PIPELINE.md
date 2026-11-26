# KEYFORM — Mechanical Component Architecture & Asset Pipeline

> **Status:** KF-003A-R3 canonical geometry frozen and approved; entering KF-003B production lookdev and rendering

## 1. Workspace Separation

Production 3D files and uncompressed renders stay **outside** the Git repository:

```text
D:\Assets\KEYFORM\                 # External local production workspace (NOT in Git)
├── blender/
│   ├── kf01_master.blend          # Approved KF-002 geometry master
│   ├── kf01_kf003a.blend          # Editable lookdev derivative
│   ├── kf01_kf003a_r1.blend       # Integrated top frame review
│   ├── kf01_kf003a_r2.blend       # Tightened right-cluster review
│   ├── kf01_kf003a_r3.blend       # Alternative A layout & separated-cluster review
│   └── kf01_studio_export.blend   # Linked/baked GLB export staging file (optional)
├── backups/kf002-approved/        # Verified KF-002 recovery package
├── backups/kf003a-before-r1/      # Verified KF-003A recovery package
├── backups/kf003a-r1-before-r2/   # Verified R1 recovery package
├── backups/kf003a-r2-before-r3/   # Verified pre-R3 recovery package (R1/R2 masters, baseline manifest, scripts)
├── backups/kf003a-r3-approved/    # Verified approved R3 geometry-freeze recovery package
├── kf003a/                       # Reproduction source, reference layout and QA
├── kf003a-r1/                    # Top-frame source, measurements and QA
├── kf003a-r2/                    # Right-cluster source, measurements and QA
├── kf003a-r3/                    # Alternative A integration source, measurements and QA
├── layout-lab/kf-layout-001/     # Canonical layout feasibility study and blueprints
├── reference/                     # Canonical JSON layout (Alternative A candidate) and dimension audit
├── scripts/                       # Master generation, geometry validation and review rendering
├── validation/                    # Geometry, swept clearances and render timing
├── textures/                      # Raw PBR maps, keycap legend SVGs/PNGs, HDRIs
├── renders/
│   ├── kf002/                     # Eight neutral Cycles geometry reviews
│   ├── kf003a/                    # Seven Cycles lookdev reviews
│   ├── kf003a-r1/                 # Five top-frame reviews
│   ├── kf003a-r2/                 # Four right-cluster reviews
│   ├── kf003a-r3/                 # Six Alternative A integration reviews
│   ├── cycles-raw/                # 16-bit PNG / EXR masters
│   └── web-export/                # Staging for AVIF/WebP conversion
└── glb/
    └── kf01_studio.glb            # Exported & compressed GLB before copying to repo
```

Verified, budget-compliant web derivatives (`.glb`, `.avif`, `.webp`) may enter `public/` during `KF-003B` or `KF-004`.

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
- **Assemblies / Empties (Exploded Groups):** `GRP_<nn>_<PascalName>` (e.g., `GRP_01_Keycaps`, `GRP_04_SwitchPlate`)
- **Meshes:** `KF01_<SubAssembly>_<PartName>` (e.g., `KF01_Case_TopFrame`, `KF01_Knob_Body`)
- **Materials:** `MAT_<Group>_<Variant>` (e.g., `MAT_Case_Anodized`, `MAT_Keycap_Alpha`, `MAT_Keycap_Mod`, `MAT_Keycap_Accent`, `MAT_Plate_Active`, `MAT_Switch_Stem`)

## 4. Mechanical Component Hierarchy & Parent-Child Relationships

`KF01_Root` is at the desk plane. Its child `KF01_TiltPivot_6p5deg` rotates **+6.5°** around X so the rear rises with +Y. The nine layer empties use zero local offset assembled.

| Group | Parent | Full explode offset | Contents |
| --- | --- | --- | --- |
| `GRP_01_Keycaps` | Tilt pivot | Z +108 mm | Hollow R1–R4 caps, convex Space, ivory Esc, surface-conformed legends, mounts |
| `GRP_02_TopEnclosure` | Tilt pivot | Z +84 mm | Chamfered bezel, case screw bosses, geometric knurled knob |
| `GRP_03_Switches` | Tilt pivot | Z +64 mm | 81 linked copies of a base, lid, cross stem, spring and pin set |
| `GRP_04_SwitchPlate` | Tilt pivot | Z +42 mm | 81 MX openings plus stabilizer and encoder reliefs, 12 mounting tabs |
| `GRP_05_AcousticAndGaskets` | Tilt pivot | Z +20 mm | Perforated Poron and 12 silicone gaskets. Gaskets follow the plate via an extra +22 mm local offset. |
| `GRP_06_PCB_Assembly` | Tilt pivot | Datum | Drilled FR4, hot-swap sockets, IXPE, four PCB-mounted stabilizers and rotary encoder |
| `GRP_07_USB_Daughterboard` | Root | Y +20 mm, Z −18 mm | Carrier, USB-C shell and tongue, harness and mounting hardware |
| `GRP_08_InternalWeight` | Root | Z −33 mm | Recessed brass weight, countersunk fasteners, bottom foam |
| `GRP_09_BottomChassis` | Root | Z −50 mm | Lower cavity, case screws, silicone feet, gasket seats and carrier mounts |

The assembled keybed rests `2.2 mm` below the deck at the plate top. Plate top to PCB top is `5.0 mm`, including `1.5 mm` of plate and an installed `3.5 mm` foam stack. The KF-003A cap skirt starts `2.24 mm` above the deck and travels inside the bezel openings. The `2.80 mm` mounting datum and 4 mm press travel carry over from KF-002. Live Boolean tools preserve editable enclosure, plate, and encoder bore features.

The KF-003A-R1 candidate uses four function-row pockets and a continuous stepped typing and right-cluster aperture. The navigation web and the front arrow step are integral to the same top frame. The nominal wall offset from the measured keycap envelopes is `0.72 mm`, with `R0.80 mm` internal corners. The deck, encoder bore, plate, and gasket datums carry over from KF-003A.

R2 added locally raised, chamfered lands around the navigation column and arrows, retaining shared pockets across the `1.05 mm` key-to-key throats.

KF-003A-R3 removes the R2 raised shoulders, returns to the flat R1 deck datum, and integrates **KF-LAYOUT-001 Alternative A** (shifting the four navigation centers `+1.45 mm` in X and four arrow centers `-1.45 mm` in X / `-2.85 mm` in Y). The deck now defines seven physically independent apertures (main typing, navigation column, inverted-T arrows, and four function groups) with continuous aluminium separators (`2.46 mm` nominal / `2.22 mm` study flat web minimum, `0.72 mm` cap offset, `R0.80 mm` corners). Dependent lower parts add local front-right extensions (`+1.71 mm` plate stock, `+2.50 mm` PCB, `+2.55 mm` Poron/IXPE) and a compact `2.78 mm`-deep front-right gasket sock (`KF01_Gasket_Front_6`) and matched `3.02 mm` shelf (`KF01_Gasket_Shelf_-1_6`) tucked beneath the arrow front bezel wall.

## 5. Customizable Material Groups (Build Studio Slots)

Keeping material slots minimal allows instant zero-reload customization in Three.js:

| Material Slot | Assigned Meshes | Build Studio Options |
| :--- | :--- | :--- |
| `MAT_Case_Anodized` | `KF01_Case_TopFrame`, `KF01_Case_BottomFrame` | Obsidian (`#151719`), Carbon (`#25292D`), Titanium (`#ADB7C1`), Forest (`#657C75`) |
| `MAT_Weight_Metal` | `KF01_Weight_Main` | Brushed Brass, PVD Obsidian Stainless, Raw Titanium |
| `MAT_Knob_Metal` | `KF01_Knob_Rotary` | Independent master slot for review |
| `MAT_Keycap_Alpha` | `KF01_Caps_Alphas` | Obsidian Dark, Porcelain Light, Two-Tone Slate |
| `MAT_Keycap_Mod` | `KF01_Caps_Modifiers` | Matched or contrasting modifier tone |
| `MAT_Keycap_Accent` | `KF01_Cap_Esc` in the review master | Ivory in KF-002. Signal, Forest, and Matched remain Build Studio candidates. |
| `MAT_Plate_Active` | `KF01_Plate_Main` | Brushed Aluminium, Matte FR4, Frosted Polycarbonate, Sandblasted Brass |
| `MAT_Switch_Housing` | `KF01_Switch_Housings` | Smoked Translucent (Linear), Matte Carbon (Tactile), Frosted Smoke (Silent) |
| `MAT_Switch_Stem` | `KF01_Switch_Stems` | Porcelain (`#E9E7E0`), Signal (`#F0793B`), Forest (`#657C75`) |

## 6. Instancing & Optimization Strategy

To meet the `≤ 2.5 MB` GLB and `≤ 40` draw call targets without losing visual fidelity:

- **Cycles:** Use the KF-003A master for static photography. The *After Hours* and *Form / Function* scenes share one product collection. The isolated *Switch Review* scene holds the high-detail switch. Procedural finishes use object-space meters and AgX.
- **GLB:** Create a separate staging file. Preserve semantic groups, finish slots, per-key pivot/ID metadata and encoder pivot. Simplify spring, sockets, hardware, and fine chamfers according to camera visibility. Bake geometric knurling and cap legends for the web branch.
- **GPU instances:** Blender mesh sharing reduces duplicate data in the master. It can export as multiple glTF nodes referring to one mesh. Verify the shipped representation and actual draw calls. Use `EXT_mesh_gpu_instancing` where the assembler and viewer preserve group ownership, or batch shared geometry and material via Three.js `InstancedMesh`. Keep stable key-to-instance indexes so travel and picking remain individual. Prototype legend atlas sampling per instance before locking the cap export. [Khronos instancing specification](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_mesh_gpu_instancing)
- **Verification:** Check decoded axis, scale, material groups, exploded poses, instanced picking, and 4 mm press against the source manifest. Profile on target devices and measure `≤ 2.5 MB` and `≤ 40` draw calls. Benchmark mesh compression and texture formats on the staging file.

## 7. Keypress & Mechanical Animation Requirements

- **Switch Travel (Build Studio & Switch Lab):**
  - Individual test keys (e.g., `Esc`, `Enter`, `Space`, plus any clicked key if raycast-enabled) depress `-4.0 mm` along the local `-Z` axis of `KF01_TiltPivot_6p5deg`, moving both the target keycap and its paired switch stem together.
  - Timing: `~45 ms` downstroke, `~90 ms` damped return (adjustable per switch archetype in Switch Lab).
- **Rotary Encoder Knob:**
  - The `KF01_Encoder_Input` control drives both shaft and knob. The reference encoder uses `12°` per detent and a `0.5 mm` push.
- **Exploded Assembly Transition:**
  - For Blender review, use timeline frames `1 / 26 / 51 / 76 / 101` for assembled, 25%, 50%, 75%, and full. The daughterboard stays fixed through frame 12, withdraws through the opened seam by frame 24, then lowers. Preserve the staged motion if representing the daughterboard in the viewer. Drive viewer state procedurally from the assembly metadata.
