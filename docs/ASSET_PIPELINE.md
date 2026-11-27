# KEYFORM — Mechanical Component Architecture & Asset Pipeline

> **Status:** KF-003A-R3 canonical geometry frozen (`4af6fdd`); KF-003B production assets complete (18 OptiX PNG masters + 74 responsive AVIF/WebP web derivatives); KF-003C WebGL handoff architecture documented

## 1. Workspace Separation

Production 3D files and uncompressed renders stay **outside** the Git repository:

```text
<external-asset-workspace>/        # External local production workspace (NOT in Git)
├── blender/
│   ├── kf01_master.blend          # Approved KF-002 geometry master
│   ├── kf01_kf003a.blend          # Editable lookdev derivative
│   ├── kf01_kf003a_r1.blend       # Integrated top frame review
│   ├── kf01_kf003a_r2.blend       # Tightened right-cluster review
│   ├── kf01_kf003a_r3.blend       # Frozen & approved canonical digital product geometry (DO NOT OVERWRITE)
│   ├── kf01_kf003b_prod.blend     # Versioned KF-003B production lookdev & camera rig master
│   └── kf01_studio_export.blend   # Separate KF-003C real-time WebGL GLB staging master (planned)
├── backups/kf002-approved/        # Verified KF-002 recovery package
├── backups/kf003a-before-r1/      # Verified KF-003A recovery package
├── backups/kf003a-r1-before-r2/   # Verified R1 recovery package
├── backups/kf003a-r2-before-r3/   # Verified pre-R3 recovery package (R1/R2 masters, baseline manifest, scripts)
├── backups/kf003a-r3-approved/    # Verified approved R3 geometry-freeze recovery package
├── kf003a/                       # Reproduction source, reference layout and QA
├── kf003a-r1/                    # Top-frame source, measurements and QA
├── kf003a-r2/                    # Right-cluster source, measurements and QA
├── kf003a-r3/                    # Alternative A integration source, measurements and QA
├── kf003b/                       # Production lookdev builder, draft/benchmark runner, telemetry & README
├── layout-lab/kf-layout-001/     # Canonical layout feasibility study and blueprints
├── reference/                     # Canonical JSON layout (Alternative A) and dimension audit
├── scripts/                       # Master generation, geometry validation and review rendering
├── validation/                    # Geometry, swept clearances and render timing
├── textures/                      # Raw PBR maps, keycap legend SVGs/PNGs, HDRIs
├── renders/
│   ├── kf002/                     # Eight neutral Cycles geometry reviews
│   ├── kf003a/                    # Seven Cycles lookdev reviews
│   ├── kf003a-r1/                 # Five top-frame reviews
│   ├── kf003a-r2/                 # Four right-cluster reviews
│   ├── kf003a-r3/                 # Six Alternative A integration reviews
│   ├── kf003b-draft/              # Six economical OptiX lookdev drafts + 3x2 approval contact sheet
│   ├── kf003b-benchmark/          # Three representative full-res RTX 4060 OptiX benchmark frames
│   ├── cycles-raw/kf003b-prod/    # 18 full-resolution production PNG masters + 18-shot contact sheet
│   └── web-export/kf003b/         # 37 responsive AVIF + 37 WebP production web derivatives
└── glb/
    └── kf01_studio*.glb           # Partitioned & compressed KF-003C WebGL assets (planned)
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
| `GRP_01_Keycaps` | Tilt pivot | Z +108 mm | Hollow R1–R4 caps, convex Space, unified Charcoal PBT across all 81 keys (incl. `Esc`), surface-conformed off-white legends, mounts |
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
| `MAT_Keycap_Alpha` | `KF01_Caps_Alphas` | Unified Charcoal PBT (default), Porcelain Light, Two-Tone Slate |
| `MAT_Keycap_Mod` | `KF01_Caps_Modifiers` + `KF01_Cap_Esc` (default) | Unified Charcoal PBT (default, matching alphas across all 81 keys) or contrasting modifier tone |
| `MAT_Keycap_Accent` | Unused in default master (`use_fake_user=True`); dynamically assigned to `KF01_Cap_Esc` only when selected in Build Studio | Matched Charcoal PBT (default), optional Signal, Ivory, or Forest accent in Build Studio only |
| `MAT_Plate_Active` | `KF01_Plate_Main` | Brushed Aluminium, Matte FR4, Frosted Polycarbonate, Sandblasted Brass |
| `MAT_Switch_Housing` | `KF01_Switch_Housings` | Smoked Translucent (Linear), Matte Carbon (Tactile), Frosted Smoke (Silent) |
| `MAT_Switch_Stem` | `KF01_Switch_Stems` | Porcelain (`#E9E7E0`), Signal (`#F0793B`), Forest (`#657C75`) |

## 6. Production Rendering & KF-003C WebGL Handoff Strategy

### 6.1 KF-003B Cycles Production Stills
- **Master separation:** Keep frozen `kf01_kf003a_r3.blend` untouched as the canonical geometry master; author all material refinements, website cameras (`PROD_Cam_A01`–`A08`), and the dark *After Hours Switch* scene inside `kf01_kf003b_prod.blend`.
- **Lighting scenes:** *After Hours* (`A01` desktop hero, `A02` mobile hero, `A08` closing), *Product Studio / Form / Function* (`A03` beauty, `A04a–c` engineering macros/profile/USB-C, `A05` exploded anatomy, `A07a–d` material library), and *After Hours Switch* (`A06` Linear 45 / Tactile 58 / Silent 50).
- **Completed RTX 4060 OptiX production batch:** All `18` full-resolution PNG masters (`15` core shots `A01`–`A08` + `3` Build Studio static fallback enclosures `B01` Obsidian, `B02` Carbon, `B03` Titanium with uniform Charcoal PBT keycaps) rendered locally in `167.35 s` pure render (`194.73 s` wall time, peak board-wide VRAM `5,598 MiB` with concurrent desktop/WebGL-lab GPU activity flagged). All `74` responsive `AVIF` (`37`) + `WebP` (`37`) derivatives encoded via Pillow `13.0.0` (`Q74–76` AVIF / `Q86–88` WebP, minimum PSNR `41.98 dB` / `41.68 dB`, `0` budget exceptions) and inventoried with SHA-256 checksums in `kf003b\validation\production-asset-manifest.json`.

### 6.2 KF-003C Real-Time WebGL 2 Architecture (Planned Handoff)
To meet the `≤ 2.5 MB` (stretch `≤ 1.5 MB`) GLB and `≤ 40` draw-call budgets on integrated-GPU laptops and mid-range mobile devices while preserving mechanical accuracy:

- **Runtime target:** WebGL 2 via `three` + `@react-three/fiber` with `frameloop="demand"`, lazy dynamic import on viewport/user intent, and accessible static Cycles fallback imagery whenever WebGL is unavailable or Lite Mode is active.
- **Separate staging master (`kf01_studio_export.blend`):** Derived from frozen `kf01_kf003a_r3.blend` geometry and `kf01_kf003b_prod.blend` unified Charcoal PBT default finish calibration—never export the ~1.04M-triangle Cycles master directly.
- **Partitioned asset delivery:**
  1. *Exterior Build Studio GLB* — Top/bottom CNC enclosure, unified Charcoal PBT keycaps (plus optional accent slot), knurled encoder, desk feet (fast initial interactive load).
  2. *Internal Mechanical Stack GLB* — Switch plate, PCB + hot-swap sockets, Poron/IXPE + 12 silicone gaskets, rear USB-C daughterboard, brushed brass weight (loaded lazily for Exploded mode or Mechanical Anatomy).
  3. *Hero Switch GLB (optional)* — Standalone cutaway switch with Linear 45 / Tactile 58 / Silent 50 slots if live 3D Switch Lab is activated alongside static Cycles renders.
- **Canonical structure & deterministic motion:** Preserve exact Alternative A canonical key IDs (`kf01_layout.json`), all nine semantic groups (`GRP_01`–`GRP_09`), `4.0 mm` local `-Z` keypress travel, `12°` detent / `0.5 mm` push encoder controls, and staged daughterboard withdrawal (`frames 12→24`) driven procedurally from assembly metadata.
- **Measured GPU instancing:** Batch all 81 switches, repeated keycap profiles, fasteners, and gaskets via `EXT_mesh_gpu_instancing` or Three.js `InstancedMesh` while keeping stable key-to-instance indexes for individual raycast picking and press animation. Verify actual draw calls (`≤ 40`). [Khronos instancing specification](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_mesh_gpu_instancing)
- **Baked surface detail & compression candidates:** Replace high-poly geometric knurling and extruded legend meshes with baked tangent-space normal/roughness maps and a crisp legend texture atlas. Benchmark `EXT_meshopt_compression` (Meshopt) + `KHR_texture_basisu` (KTX2) alongside Draco on the staged GLBs before locking the export pipeline.
- **Verification gate:** Audit decoded glTF axis/scale, material slots, default unified Charcoal PBT state, exploded clearance, instanced key picking, `4.0 mm` travel, file weight, and frame pacing (`60 fps` desktop, `≥ 30 fps` iGPU/mobile).

## 7. Keypress & Mechanical Animation Requirements

- **Switch Travel (Build Studio & Switch Lab):**
  - Individual test keys (e.g., `Esc`, `Enter`, `Space`, plus any clicked key if raycast-enabled) depress `-4.0 mm` along the local `-Z` axis of `KF01_TiltPivot_6p5deg`, moving both the target keycap and its paired switch stem together.
  - Timing: `~45 ms` downstroke, `~90 ms` damped return (adjustable per switch archetype in Switch Lab).
- **Rotary Encoder Knob:**
  - The `KF01_Encoder_Input` control drives both shaft and knob. The reference encoder uses `12°` per detent and a `0.5 mm` push.
- **Exploded Assembly Transition:**
  - For Blender review, use timeline frames `1 / 26 / 51 / 76 / 101` for assembled, 25%, 50%, 75%, and full. The daughterboard stays fixed through frame 12, withdraws through the opened seam by frame 24, then lowers. Preserve the staged motion if representing the daughterboard in the viewer. Drive viewer state procedurally from the assembly metadata.
